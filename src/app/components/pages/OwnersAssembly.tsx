// 关联业务：按本小区生效议事规则办理业主大会筹备、公示、线上/纸质收票、双人核对与计票。
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FileUp,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Send,
  Vote,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip, Stepper, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useStore } from "../../lib/store";
import type { SubjectType } from "../../lib/voting";
import {
  confirmOwnersAssemblyArrangement,
  createOwnersAssemblySession,
  createOwnersAssemblySubjectDraft,
  getOwnersAssemblyPreparationOptions,
  getOwnersAssemblyVotingWorkbench,
  getOwnersAssemblyWorkspace,
  listOwnersAssemblies,
  publishOwnersAssemblyArrangement,
  recordOwnersAssemblyPaperDelivery,
  registerOwnersAssemblyPaperBallot,
  reviewOwnersAssemblyPaperBallotEntry,
  reviewOwnersAssemblyPaperDelivery,
  settleOwnersAssembly,
  startOwnersAssemblyVoting,
  submitOwnersAssemblyPaperBallotEntry,
  uploadOwnersAssemblyMaterial,
  type OwnersAssemblyDeliveryMethod,
  type OwnersAssemblyMaterial,
  type OwnersAssemblyMaterialType,
  type OwnersAssemblyPreparationMode,
  type OwnersAssemblyPreparationOptions,
  type OwnersAssemblySession,
  type OwnersAssemblyVotingWorkbench,
  type OwnersAssemblyWorkspace,
  type PaperEntryItem,
  type PaperInvalidReason,
  type PaperVoteChoice,
} from "../../lib/owners-assembly";

const MODE_LABEL: Record<OwnersAssemblyPreparationMode, string> = {
  WRITTEN_DECISION: "纸质书面表决",
  INTERNET_DECISION: "线上实名表决（可申请纸质协助）",
  ONLINE_AND_OFFLINE: "纸质与线上并行",
};

const DELIVERY_LABEL: Record<OwnersAssemblyDeliveryMethod, string> = {
  DOOR_TO_DOOR: "上门送达",
  POSTAL: "邮寄送达",
  ELECTRONIC: "电子送达",
  PUBLIC_NOTICE_BOARD: "公告栏送达",
};

const SUBJECT_TYPE_LABEL: Record<Extract<SubjectType, "GENERAL" | "MAJOR">, string> = {
  GENERAL: "一般共同决定事项",
  MAJOR: "特别重大共同决定事项",
};

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  PREPARING: { label: "材料筹备中", tone: "neutral" },
  PACKAGE_DRAFT: { label: "待发布", tone: "warning" },
  PUBLIC_NOTICE: { label: "公告与通知中", tone: "tech" },
  VOTING: { label: "表决进行中", tone: "primary" },
  SETTLED: { label: "结果已形成", tone: "success" },
  VOIDED: { label: "已终止", tone: "danger" },
};

const STEPS = [
  { key: "prepare", label: "事项与材料" },
  { key: "confirm", label: "确认安排" },
  { key: "notice", label: "公告与通知" },
  { key: "vote", label: "收集表决" },
  { key: "result", label: "形成结果" },
];

const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function currentStep(workspace: OwnersAssemblyWorkspace | null) {
  const status = workspace?.arrangement?.status ?? workspace?.assembly.status;
  if (status === "SETTLED") return 4;
  if (status === "VOTING") return 3;
  if (status === "PUBLIC_NOTICE") return 2;
  if (status === "PACKAGE_DRAFT") return 1;
  return 0;
}

function latestMaterial(materials: OwnersAssemblyMaterial[], type: OwnersAssemblyMaterialType) {
  return materials.filter((item) => item.materialType === type).at(-1) ?? null;
}

function listMaterials(materials: OwnersAssemblyMaterial[], type: OwnersAssemblyMaterialType) {
  return materials.filter((item) => item.materialType === type);
}

function propertyLabel(item: OwnersAssemblyVotingWorkbench["electorate"][number]) {
  return [item.buildingName, item.unitName, item.roomName].filter(Boolean).join(" ");
}

export function OwnersAssembly() {
  const { hasPermission } = useStore();
  const canCreate = hasPermission("voting:subject:create");
  const canAudit = hasPermission("voting:subject:audit");
  const canFormalManage = hasPermission("owners-assembly:formal:manage");
  const canPrepare = canCreate || canFormalManage;

  const [sessions, setSessions] = useState<OwnersAssemblySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<OwnersAssemblyWorkspace | null>(null);
  const [preparationOptions, setPreparationOptions] = useState<OwnersAssemblyPreparationOptions | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<OwnersAssemblyVotingWorkbench | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [sessionTitle, setSessionTitle] = useState("");
  const [preparationMode, setPreparationMode] = useState<OwnersAssemblyPreparationMode | "">("");
  const [subjectType, setSubjectType] = useState<Extract<SubjectType, "GENERAL" | "MAJOR"> | "">("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectContent, setSubjectContent] = useState("");
  const [voteStartAt, setVoteStartAt] = useState("");
  const [voteEndAt, setVoteEndAt] = useState("");

  const arrangement = workspace?.arrangement ?? null;
  const status = arrangement?.status ?? workspace?.assembly.status ?? "";
  const publicNotice = workspace ? latestMaterial(workspace.materials, "PUBLIC_NOTICE") : null;
  const ballotTemplate = workspace ? latestMaterial(workspace.materials, "PAPER_BALLOT_TEMPLATE") : null;
  const planAttachments = workspace ? listMaterials(workspace.materials, "PLAN_ATTACHMENT") : [];
  const statusMeta = STATUS_META[status] ?? { label: "办理中", tone: "neutral" as Tone };

  async function loadOptions() {
    if (!canPrepare) return;
    try {
      const options = await getOwnersAssemblyPreparationOptions();
      setPreparationOptions(options);
      setPreparationError(null);
      setPreparationMode((current) => current && options.allowedPreparationModes.includes(current) ? current : "");
    } catch (error) {
      setPreparationOptions(null);
      setPreparationError(error instanceof Error ? error.message : "当前还不能发起正式业主大会");
    }
  }

  async function loadWorkspace(sessionId: number) {
    const next = await getOwnersAssemblyWorkspace(sessionId);
    setWorkspace(next);
    if (next.arrangement?.status === "VOTING" && canAudit) {
      setWorkbench(await getOwnersAssemblyVotingWorkbench(sessionId));
    } else {
      setWorkbench(null);
    }
  }

  async function refresh(preferredSessionId?: number) {
    setLoading(true);
    try {
      const nextSessions = await listOwnersAssemblies();
      setSessions(nextSessions);
      const nextId = preferredSessionId ?? selectedSessionId ?? nextSessions[0]?.sessionId ?? null;
      setSelectedSessionId(nextId);
      if (nextId) await loadWorkspace(nextId);
      else {
        setWorkspace(null);
        setWorkbench(null);
        setShowCreate(true);
      }
      await loadOptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取业主大会失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function run<T>(key: string, action: () => Promise<T>, success: string) {
    setActing(key);
    try {
      const result = await action();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
      return null;
    } finally {
      setActing(null);
    }
  }

  async function onCreate() {
    if (!sessionTitle.trim() || !preparationMode) return;
    const created = await run("create", () => createOwnersAssemblySession({
      title: sessionTitle.trim(),
      preparationMode,
    }), "业主大会筹备已建立");
    if (!created) return;
    setSessionTitle("");
    setPreparationMode("");
    setShowCreate(false);
    await refresh(created.sessionId);
  }

  async function onAddSubject() {
    if (!workspace || !subjectType || !subjectTitle.trim()) return;
    const created = await run("subject", () => createOwnersAssemblySubjectDraft(workspace.assembly.sessionId, {
      subjectType,
      title: subjectTitle.trim(),
      content: subjectContent.trim() || null,
    }), "表决事项已加入本次会议");
    if (!created) return;
    setSubjectType("");
    setSubjectTitle("");
    setSubjectContent("");
    await loadWorkspace(workspace.assembly.sessionId);
  }

  async function onUpload(type: OwnersAssemblyMaterialType, file: File) {
    if (!workspace) throw new Error("请先建立本次业主大会");
    const material = await uploadOwnersAssemblyMaterial(workspace.assembly.sessionId, type, file);
    await loadWorkspace(workspace.assembly.sessionId);
    return material;
  }

  async function onConfirmArrangement() {
    if (!workspace || !publicNotice || !ballotTemplate || !voteStartAt || !voteEndAt) return;
    if (new Date(voteEndAt).getTime() <= new Date(voteStartAt).getTime()) {
      toast.error("表决截止时间必须晚于开始时间");
      return;
    }
    const result = await run("arrangement", () => confirmOwnersAssemblyArrangement(workspace.assembly.sessionId, {
      voteStartAt: new Date(voteStartAt).toISOString(),
      voteEndAt: new Date(voteEndAt).toISOString(),
      publicNoticeMaterialId: publicNotice.materialId,
      planAttachmentMaterialIds: planAttachments.map((item) => item.materialId),
      ballotTemplateMaterialId: ballotTemplate.materialId,
    }), "公示与表决安排已确认");
    if (result) await refresh(workspace.assembly.sessionId);
  }

  async function runSessionAction(
    key: string,
    action: (sessionId: number) => Promise<unknown>,
    message: string,
  ) {
    if (!workspace) return;
    const result = await run(key, () => action(workspace.assembly.sessionId), message);
    if (result) await refresh(workspace.assembly.sessionId);
  }

  if (!canPrepare && !canAudit && !canFormalManage) {
    return <PageHeader title="业主大会办理" desc="当前工作身份没有业主大会办理权限。" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="业主大会办理"
        desc="按本小区生效议事规则准备事项、发布公告和会议通知，并统一办理纸质、线上或混合表决。"
        actions={(
          <>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />刷新
            </Button>
            {canPrepare && <Button size="sm" onClick={() => setShowCreate((value) => !value)}><Plus className="size-4" />新建会次</Button>}
          </>
        )}
      />

      {showCreate && canPrepare && (
        <SectionCard title="新建业主大会" desc="办理方式只能从本小区当前生效规则允许的范围中选择，建立后不可改为另一种方式。">
          {preparationError ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{preparationError}</div>
          ) : preparationOptions ? (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">当前依据：</span>{preparationOptions.ruleName} · {preparationOptions.ruleVersion}
                <span className="ml-4 text-muted-foreground">最早可于 {formatDateTime(preparationOptions.earliestVoteStartAt)} 开始表决</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)_auto] lg:items-end">
                <div><Label>会议标题 *</Label><Input className="mt-2" value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} placeholder="填写本次业主大会的正式名称" /></div>
                <div><Label>本次实际表决方式 *</Label><Select value={preparationMode} onValueChange={(value) => setPreparationMode(value as OwnersAssemblyPreparationMode)}><SelectTrigger className="mt-2"><SelectValue placeholder="请选择" /></SelectTrigger><SelectContent>{preparationOptions.allowedPreparationModes.map((mode) => <SelectItem key={mode} value={mode}>{MODE_LABEL[mode]}</SelectItem>)}</SelectContent></Select></div>
                <Button onClick={() => void onCreate()} disabled={acting !== null || !sessionTitle.trim() || !preparationMode}>{acting === "create" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}建立筹备</Button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      )}

      {sessions.length > 0 && (
        <SectionCard title="当前办理会次" extra={workspace ? <StatusChip tone={statusMeta.tone} dot>{statusMeta.label}</StatusChip> : null}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
            <div><Label>选择会次</Label><Select value={selectedSessionId ? String(selectedSessionId) : ""} onValueChange={(value) => { const id = Number(value); setSelectedSessionId(id); void loadWorkspace(id).catch((error) => toast.error(error instanceof Error ? error.message : "读取失败")); }}><SelectTrigger className="mt-2"><SelectValue placeholder="选择会次" /></SelectTrigger><SelectContent>{sessions.map((item) => <SelectItem key={item.sessionId} value={String(item.sessionId)}>{item.title}</SelectItem>)}</SelectContent></Select></div>
            <Info label="本次方式" value={workspace ? MODE_LABEL[workspace.assembly.preparationMode] : "读取中"} />
            <Info label="建立时间" value={workspace ? formatDateTime(workspace.assembly.createTime) : "读取中"} />
          </div>
          <div className="mt-5 border-t pt-5"><Stepper steps={STEPS} current={currentStep(workspace)} /></div>
        </SectionCard>
      )}

      {workspace?.assembly.status === "PREPARING" && (
        <>
          <SectionCard title="拟定表决事项" desc="每一项都要明确属于一般还是特别重大共同决定事项，系统将按对应的冻结计票口径结算。">
            {canPrepare && (
              <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div><Label>事项类型 *</Label><Select value={subjectType} onValueChange={(value) => setSubjectType(value as Extract<SubjectType, "GENERAL" | "MAJOR">)}><SelectTrigger className="mt-2"><SelectValue placeholder="请选择" /></SelectTrigger><SelectContent><SelectItem value="GENERAL">一般共同决定事项</SelectItem><SelectItem value="MAJOR">特别重大共同决定事项</SelectItem></SelectContent></Select></div>
                <div><Label>事项标题 *</Label><Input className="mt-2" value={subjectTitle} onChange={(event) => setSubjectTitle(event.target.value)} placeholder="填写业主需要作出决定的完整事项" /></div>
                <div className="lg:col-span-2"><Label>事项说明</Label><Textarea className="mt-2" rows={4} value={subjectContent} onChange={(event) => setSubjectContent(event.target.value)} placeholder="说明方案范围、费用、执行安排和需要业主决定的内容" /></div>
                <div className="lg:col-span-2"><Button onClick={() => void onAddSubject()} disabled={acting !== null || !subjectType || !subjectTitle.trim()}>{acting === "subject" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}加入本次会议</Button></div>
              </div>
            )}
            <SubjectList workspace={workspace} />
          </SectionCard>

          <SectionCard title="准备正式材料和时间安排" desc="公告、方案附件和本次纸质票样会在确认安排时一起冻结；互联网表决也要保留纸质票样，供确有困难的业主申请使用。">
            <div className="grid gap-5 lg:grid-cols-3">
              <MaterialUpload type="PUBLIC_NOTICE" label="公告与会议通知原件 *" help="上传拟向相关业主发布的正式公告。" value={publicNotice} onUpload={onUpload} />
              <MaterialUpload type="PLAN_ATTACHMENT" label="表决方案附件 *" help="逐份上传方案、预算、图纸和其他供业主判断的材料。" values={planAttachments} onUpload={onUpload} />
              <MaterialUpload type="PAPER_BALLOT_TEMPLATE" label={`${workspace.ruleSnapshot?.paperBallotSealRequired ? "已按规则用印的" : "正式"}纸质表决票样 *`} help="必须与本次事项和选择项一致。" value={ballotTemplate} accept=".pdf,application/pdf" onUpload={onUpload} />
            </div>
            <div className="mt-5 grid gap-4 border-t pt-5 lg:grid-cols-2">
              <div><Label>计划开始表决 *</Label><Input className="mt-2" type="datetime-local" value={voteStartAt} onChange={(event) => setVoteStartAt(event.target.value)} /></div>
              <div><Label>计划截止表决 *</Label><Input className="mt-2" type="datetime-local" value={voteEndAt} onChange={(event) => setVoteEndAt(event.target.value)} /></div>
            </div>
            {preparationOptions && <p className="mt-3 text-sm text-muted-foreground">方案公示 {preparationOptions.planPublicityDays} 天，会议通知 {preparationOptions.meetingNoticeDays} 天；两项可同期进行，但表决开始时间必须满足较长期限。最早可选 {formatDateTime(preparationOptions.earliestVoteStartAt)}。</p>}
            <div className="mt-4 flex justify-end">{canFormalManage ? <Button onClick={() => void onConfirmArrangement()} disabled={acting !== null || workspace.draftSubjects.length === 0 || !publicNotice || planAttachments.length === 0 || !ballotTemplate || !voteStartAt || !voteEndAt}><CalendarClock className="size-4" />确认正式安排</Button> : <span className="text-sm text-muted-foreground">材料可由经办人员准备，正式安排由当前届主任或副主任确认。</span>}</div>
          </SectionCard>
        </>
      )}

      {arrangement?.status === "PACKAGE_DRAFT" && (
        <SectionCard title="发布公告和会议通知" desc="发布后，本次事项、材料、规则版本、表决范围和办理方式不再变更。">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">计划表决时间：{formatDateTime(arrangement.voteStartAt)} 至 {formatDateTime(arrangement.voteEndAt)}。</p>{canFormalManage ? <Button onClick={() => void runSessionAction("publish", publishOwnersAssemblyArrangement, "公告和会议通知已发布")} disabled={acting !== null}><Send className="size-4" />发布</Button> : <span className="text-sm text-muted-foreground">由当前届主任或副主任发布。</span>}</div>
        </SectionCard>
      )}

      {arrangement?.status === "PUBLIC_NOTICE" && (
        <SectionCard title="公告与会议通知进行中" desc="到达规则要求的期限和计划开始时间后，才能开放本次表决。">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">期限至 {formatDateTime(arrangement.publicNoticeEndAt)}，计划开始 {formatDateTime(arrangement.voteStartAt)}。</p>{canFormalManage ? <Button onClick={() => void runSessionAction("start", startOwnersAssemblyVoting, "本次表决已开始")} disabled={acting !== null || !arrangement.publicNoticeEndAt || Date.now() < Math.max(new Date(arrangement.publicNoticeEndAt).getTime(), new Date(arrangement.voteStartAt).getTime())}><Play className="size-4" />开始表决</Button> : <span className="text-sm text-muted-foreground">由当前届主任或副主任在期限届满后开始。</span>}</div>
        </SectionCard>
      )}

      {arrangement?.status === "VOTING" && (
        <>
          <SectionCard title="表决办理进度" desc="线上选择不会向经办人员公开；纸质选票必须保留原件，并由不同工作人员录入和核对。">
            {workbench ? <VotingSummary workbench={workbench} mode={workspace.assembly.preparationMode} /> : <p className="text-sm text-muted-foreground">当前身份只能查看会次状态，纸质办理明细需要核验权限。</p>}
          </SectionCard>
          {workbench && canAudit && workspace.ruleSnapshot && (
            <PaperWorkbench
              workspace={workspace}
              workbench={workbench}
              deliveryMethods={workspace.ruleSnapshot.validDeliveryMethods}
              onUpload={onUpload}
              acting={acting}
              run={run}
              onChanged={() => loadWorkspace(workspace.assembly.sessionId)}
            />
          )}
          <SectionCard title="截止并计票" desc="到达截止时间后，统一按冻结名册、有效票和本次规则形成结果。">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">截止时间：{formatDateTime(arrangement.voteEndAt)}</p>{canFormalManage ? <Button onClick={() => void runSessionAction("settle", settleOwnersAssembly, "计票完成，表决结果已形成")} disabled={acting !== null || Date.now() < new Date(arrangement.voteEndAt).getTime()}><Vote className="size-4" />截止并计票</Button> : <span className="text-sm text-muted-foreground">由当前届主任或副主任办理计票。</span>}</div>
          </SectionCard>
        </>
      )}

      {arrangement?.status === "SETTLED" && (
        <SectionCard title="表决结果已形成" desc={`结果按本次冻结规则形成，并按规则要求至少公示 ${workspace.ruleSnapshot?.resultAnnouncementDays ?? "规定"} 天。`}>
          <SubjectList workspace={workspace} />
        </SectionCard>
      )}
    </div>
  );
}

function VotingSummary({ workbench, mode }: { workbench: OwnersAssemblyVotingWorkbench; mode: OwnersAssemblyPreparationMode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Info label="应表决专有部分" value={`${workbench.electorate.length} 户`} />
      <Info label="线上已完成" value={`${workbench.online.completedPropertyCount} 户`} />
      <Info label="纸票已完成" value={`${workbench.ballots.filter((item) => item.ballot.status === "COMPLETED").length} 份`} />
      <Info label="待提供纸票" value={`${workbench.paperAssistance.filter((item) => item.stage === "PENDING_PAPER_PROVISION").length} 户`} />
      <Info label="重复材料未计票" value={`${workbench.duplicatePaperDecisionCount} 项`} />
      <div className="sm:col-span-2 lg:col-span-5 text-sm text-muted-foreground">本次方式：{MODE_LABEL[mode]}。跨渠道同一专有部分只保留先形成的一组有效票。</div>
    </div>
  );
}

function PaperWorkbench({
  workspace,
  workbench,
  deliveryMethods,
  onUpload,
  acting,
  run,
  onChanged,
}: {
  workspace: OwnersAssemblyWorkspace;
  workbench: OwnersAssemblyVotingWorkbench;
  deliveryMethods: OwnersAssemblyDeliveryMethod[];
  onUpload: (type: OwnersAssemblyMaterialType, file: File) => Promise<OwnersAssemblyMaterial>;
  acting: string | null;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<T | null>;
  onChanged: () => Promise<void>;
}) {
  const [opid, setOpid] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<OwnersAssemblyDeliveryMethod | "">("");
  const [deliveryEvidence, setDeliveryEvidence] = useState<OwnersAssemblyMaterial | null>(null);
  const [ballotNumber, setBallotNumber] = useState("");
  const [ballotMaterial, setBallotMaterial] = useState<OwnersAssemblyMaterial | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const allowedElectorate = useMemo(() => {
    if (workspace.assembly.preparationMode !== "INTERNET_DECISION") return workbench.electorate;
    const requested = new Set(workbench.paperAssistance.filter((item) => item.stage !== "WITHDRAWN").map((item) => item.opid));
    return workbench.electorate.filter((item) => requested.has(item.representativeOpid));
  }, [workbench, workspace.assembly.preparationMode]);

  async function changed<T>(result: T | null) {
    if (result === null) return;
    await onChanged();
  }

  async function recordDelivery() {
    const result = await run(
      "delivery",
      () => recordOwnersAssemblyPaperDelivery(workspace.assembly.sessionId, {
        opid: Number(opid),
        recipientName: recipientName.trim(),
        deliveryMethod: deliveryMethod as OwnersAssemblyDeliveryMethod,
        evidenceMaterialId: deliveryEvidence!.materialId,
        deliveredAt: new Date().toISOString(),
      }),
      "送达情况已登记，等待另一名工作人员核对",
    );
    await changed(result);
  }

  async function reviewDelivery(deliveryId: number, decision: "CONFIRM" | "REJECT") {
    const result = await run(
      `delivery-${decision.toLowerCase()}-${deliveryId}`,
      () => reviewOwnersAssemblyPaperDelivery(
        workspace.assembly.sessionId,
        deliveryId,
        decision,
        decision === "REJECT" ? reviewNote.trim() : undefined,
      ),
      decision === "CONFIRM" ? "送达情况已核对" : "送达登记已退回",
    );
    await changed(result);
  }

  async function registerBallot() {
    const result = await run(
      "ballot",
      () => registerOwnersAssemblyPaperBallot(workspace.assembly.sessionId, {
        opid: Number(opid),
        ballotNumber: ballotNumber.trim(),
        ballotMaterialId: ballotMaterial!.materialId,
        receivedAt: new Date().toISOString(),
      }),
      "纸质表决票已登记",
    );
    await changed(result);
  }

  if (allowedElectorate.length === 0) {
    return <SectionCard title="纸质办理" desc="本次以线上实名表决为主；当前没有业主申请纸质协助。"><p className="text-sm text-muted-foreground">收到纸质协助申请后，系统会在此列出对应房屋。</p></SectionCard>;
  }

  return (
    <>
      <SectionCard title="登记和核对纸质材料送达" desc="先登记实际送达事实和原始凭证，再由另一名工作人员核对。">
        <div className="grid gap-4 lg:grid-cols-2">
          <div><Label>对应房屋 *</Label><Select value={opid} onValueChange={setOpid}><SelectTrigger className="mt-2"><SelectValue placeholder="从本次冻结名册中选择" /></SelectTrigger><SelectContent>{allowedElectorate.map((item) => <SelectItem key={item.snapshotItemId} value={String(item.representativeOpid)}>{propertyLabel(item)} · {item.certifiedArea} ㎡</SelectItem>)}</SelectContent></Select></div>
          <div><Label>签收人 *</Label><Input className="mt-2" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></div>
          <div><Label>实际送达方式 *</Label><Select value={deliveryMethod} onValueChange={(value) => setDeliveryMethod(value as OwnersAssemblyDeliveryMethod)}><SelectTrigger className="mt-2"><SelectValue placeholder="请选择" /></SelectTrigger><SelectContent>{deliveryMethods.map((method) => <SelectItem key={method} value={method}>{DELIVERY_LABEL[method]}</SelectItem>)}</SelectContent></Select></div>
          <MaterialUpload type="DELIVERY_EVIDENCE" label="送达凭证 *" help="上传签收单、现场照片、邮寄凭证或规则认可的电子送达记录。" value={deliveryEvidence} onUpload={onUpload} onUploaded={setDeliveryEvidence} />
        </div>
        <Button className="mt-4" variant="outline" disabled={acting !== null || !opid || !recipientName.trim() || !deliveryMethod || !deliveryEvidence} onClick={() => void recordDelivery()}>登记送达</Button>
        <div className="mt-5 space-y-3 border-t pt-4">
          <Input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="核对说明；退回时必填" />
          {workbench.deliveries.length === 0 ? <p className="text-sm text-muted-foreground">尚无送达记录。</p> : workbench.deliveries.map((item) => {
            const electorate = workbench.electorate.find((candidate) => candidate.representativeOpid === item.opid);
            return <div key={item.paperDeliveryId} className="flex flex-col gap-3 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium">{electorate ? propertyLabel(electorate) : "本次名册房屋"}</div><div className="mt-1 text-muted-foreground">{item.recipientName} · {DELIVERY_LABEL[item.deliveryMethod]} · {formatDateTime(item.deliveredAt)}</div></div>{item.status === "PENDING_REVIEW" ? item.deliveredByUserId === workbench.currentActorUserId ? <span className="text-xs text-muted-foreground">需由另一名工作人员核对</span> : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void reviewDelivery(item.paperDeliveryId, "CONFIRM")}>核对通过</Button><Button size="sm" variant="outline" disabled={!reviewNote.trim()} onClick={() => void reviewDelivery(item.paperDeliveryId, "REJECT")}>退回</Button></div> : <StatusChip tone={item.status === "CONFIRMED" ? "success" : "danger"}>{item.status === "CONFIRMED" ? "已核对" : "已退回"}</StatusChip>}</div>;
          })}
        </div>
      </SectionCard>

      <SectionCard title="登记、录入和核对纸质表决票" desc="回收原件后登记票号；一名工作人员逐项录入，另一名工作人员对照原件核对。">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
          <div><Label>对应房屋 *</Label><Select value={opid} onValueChange={setOpid}><SelectTrigger className="mt-2"><SelectValue placeholder="选择房屋" /></SelectTrigger><SelectContent>{allowedElectorate.map((item) => <SelectItem key={item.snapshotItemId} value={String(item.representativeOpid)}>{propertyLabel(item)}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>选票编号 *</Label><Input className="mt-2" value={ballotNumber} onChange={(event) => setBallotNumber(event.target.value)} /></div>
          <MaterialUpload type="PAPER_BALLOT" label="回收选票原件 *" help="上传清晰扫描件或照片。" value={ballotMaterial} onUpload={onUpload} onUploaded={setBallotMaterial} />
        </div>
        <Button className="mt-4" variant="outline" disabled={acting !== null || !opid || !ballotNumber.trim() || !ballotMaterial} onClick={() => void registerBallot()}>登记回收选票</Button>
        <div className="mt-5 space-y-5 border-t pt-4">
          {workbench.ballots.length === 0 ? <p className="text-sm text-muted-foreground">尚无回收选票。</p> : workbench.ballots.map((item) => <PaperBallotBlock key={item.ballot.paperBallotId} workspace={workspace} workbench={workbench} item={item} acting={acting} reviewNote={reviewNote} run={run} onChanged={onChanged} />)}
        </div>
      </SectionCard>
    </>
  );
}

function PaperBallotBlock({ workspace, workbench, item, acting, reviewNote, run, onChanged }: {
  workspace: OwnersAssemblyWorkspace;
  workbench: OwnersAssemblyVotingWorkbench;
  item: OwnersAssemblyVotingWorkbench["ballots"][number];
  acting: string | null;
  reviewNote: string;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<T | null>;
  onChanged: () => Promise<void>;
}) {
  const [entries, setEntries] = useState<Record<number, { kind: "" | "VALID" | "INVALID"; choice: PaperVoteChoice | ""; reason: PaperInvalidReason | ""; description: string }>>(() => Object.fromEntries(workspace.formalSubjects.map((subject) => [subject.subjectId, { kind: "", choice: "", reason: "", description: "" }])));
  const electorate = workbench.electorate.find((candidate) => candidate.representativeOpid === item.ballot.opid);
  const complete = workspace.formalSubjects.every((subject) => {
    const value = entries[subject.subjectId];
    return value?.kind === "VALID" ? Boolean(value.choice) : value?.kind === "INVALID" ? Boolean(value.reason) && (value.reason !== "OTHER" || Boolean(value.description.trim())) : false;
  });

  async function submit() {
    const items: PaperEntryItem[] = workspace.formalSubjects.map((subject) => {
      const value = entries[subject.subjectId];
      return value.kind === "VALID"
        ? { subjectId: subject.subjectId, determination: "VALID", choice: value.choice as PaperVoteChoice }
        : { subjectId: subject.subjectId, determination: "INVALID", invalidReasonCode: value.reason as PaperInvalidReason, invalidReasonDescription: value.description.trim() || undefined };
    });
    const result = await run(`entry-${item.ballot.paperBallotId}`, () => submitOwnersAssemblyPaperBallotEntry(workspace.assembly.sessionId, item.ballot.paperBallotId, items), "纸票录入已提交，等待另一名工作人员核对");
    if (result) await onChanged();
  }

  async function review(decision: "CONFIRM" | "REJECT") {
    if (!item.latestEntry) return;
    const result = await run(`review-${item.latestEntry.entryId}-${decision}`, () => reviewOwnersAssemblyPaperBallotEntry(workspace.assembly.sessionId, item.ballot.paperBallotId, item.latestEntry!.entryId, decision, reviewNote.trim() || undefined), decision === "CONFIRM" ? "纸质表决票已核对" : "纸票录入已退回");
    if (result) await onChanged();
  }

  return (
    <div className="border-t pt-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{item.ballot.ballotNumber} · {electorate ? propertyLabel(electorate) : "本次名册房屋"}</div><div className="mt-1 text-muted-foreground">回收于 {formatDateTime(item.ballot.receivedAt)}</div></div><StatusChip tone={item.ballot.status === "COMPLETED" ? "success" : item.ballot.status === "VOIDED" ? "danger" : "warning"}>{item.ballot.status === "RECEIVED" ? "待录入" : item.ballot.status === "IN_ENTRY" ? "待另一人核对" : item.ballot.status === "COMPLETED" ? "已完成" : "已作废"}</StatusChip></div>
      {item.ballot.status === "RECEIVED" && (
        <div className="mt-4 space-y-4">
          {workspace.formalSubjects.map((subject) => {
            const value = entries[subject.subjectId];
            return <div key={subject.subjectId} className="grid gap-3 border-t pt-3 lg:grid-cols-[minmax(220px,1fr)_180px_minmax(240px,1fr)]"><div><div className="font-medium">{subject.title}</div><div className="mt-1 text-xs text-muted-foreground">{SUBJECT_TYPE_LABEL[subject.subjectType]}</div></div><Select value={value.kind} onValueChange={(kind) => setEntries((current) => ({ ...current, [subject.subjectId]: { ...current[subject.subjectId], kind: kind as "VALID" | "INVALID", choice: "", reason: "" } }))}><SelectTrigger><SelectValue placeholder="票面是否有效" /></SelectTrigger><SelectContent><SelectItem value="VALID">有效选择</SelectItem><SelectItem value="INVALID">无效票</SelectItem></SelectContent></Select>{value.kind === "VALID" ? <Select value={value.choice} onValueChange={(choice) => setEntries((current) => ({ ...current, [subject.subjectId]: { ...current[subject.subjectId], choice: choice as PaperVoteChoice } }))}><SelectTrigger><SelectValue placeholder="录入票面选择" /></SelectTrigger><SelectContent><SelectItem value="SUPPORT">同意</SelectItem><SelectItem value="AGAINST">不同意</SelectItem><SelectItem value="ABSTAIN">弃权</SelectItem></SelectContent></Select> : value.kind === "INVALID" ? <div className="grid gap-2 sm:grid-cols-2"><Select value={value.reason} onValueChange={(reason) => setEntries((current) => ({ ...current, [subject.subjectId]: { ...current[subject.subjectId], reason: reason as PaperInvalidReason } }))}><SelectTrigger><SelectValue placeholder="无效原因" /></SelectTrigger><SelectContent><SelectItem value="BLANK">空白票</SelectItem><SelectItem value="MULTIPLE_MARKS">多选</SelectItem><SelectItem value="UNREADABLE">无法辨认</SelectItem><SelectItem value="WRONG_TEMPLATE">非本次选票</SelectItem><SelectItem value="OTHER">其他</SelectItem></SelectContent></Select><Input value={value.description} onChange={(event) => setEntries((current) => ({ ...current, [subject.subjectId]: { ...current[subject.subjectId], description: event.target.value } }))} placeholder="补充说明" /></div> : <span className="text-sm text-muted-foreground">请选择票面情况</span>}</div>;
          })}
          <Button variant="outline" disabled={acting !== null || !complete} onClick={() => void submit()}>提交录入</Button>
        </div>
      )}
      {item.latestEntry?.status === "PENDING_REVIEW" && item.latestEntry.enteredByUserId !== workbench.currentActorUserId && (
        <div className="mt-4 border-t pt-3"><p className="text-sm text-muted-foreground">录入已完成，必须由另一名工作人员对照原件核对。</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => void review("CONFIRM")}>核对通过</Button><Button size="sm" variant="outline" disabled={!reviewNote.trim()} onClick={() => void review("REJECT")}>退回录入</Button></div></div>
      )}
      {item.latestEntry?.status === "PENDING_REVIEW" && item.latestEntry.enteredByUserId === workbench.currentActorUserId && (
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">该录入由当前账号提交，需由另一名工作人员核对。</p>
      )}
      {item.outcomes.length > 0 && <div className="mt-3 text-xs text-muted-foreground">{item.outcomes.map((outcome) => outcome.status === "COUNTED" ? "已计入" : outcome.status === "DUPLICATE" ? "重复材料，未重复计票" : `无效票：${outcome.reason ?? "按复核结论"}`).join("；")}</div>}
    </div>
  );
}

function MaterialUpload({ type, label, help, value, values, accept = FILE_ACCEPT, onUpload, onUploaded }: {
  type: OwnersAssemblyMaterialType;
  label: string;
  help: string;
  value?: OwnersAssemblyMaterial | null;
  values?: OwnersAssemblyMaterial[];
  accept?: string;
  onUpload: (type: OwnersAssemblyMaterialType, file: File) => Promise<OwnersAssemblyMaterial>;
  onUploaded?: (material: OwnersAssemblyMaterial) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const names = values?.map((item) => item.originalFileName) ?? (value ? [value.originalFileName] : []);
  return (
    <div><Label>{label}</Label><p className="mt-1 text-xs text-muted-foreground">{help}</p><label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 border border-dashed px-3 text-sm hover:bg-muted/40">{uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4 text-muted-foreground" />}<span className="min-w-0 flex-1 truncate">{names.length ? names.join("、") : "选择并上传原始文件"}</span><Input className="hidden" type="file" accept={accept} disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setUploading(true); onUpload(type, file).then((material) => { onUploaded?.(material); toast.success(`${label}已归档`); }).catch((error) => toast.error(error instanceof Error ? error.message : "文件上传失败")).finally(() => setUploading(false)); }} /></label></div>
  );
}

function SubjectList({ workspace }: { workspace: OwnersAssemblyWorkspace }) {
  const items = workspace.formalSubjects.length ? workspace.formalSubjects : workspace.draftSubjects;
  if (!items.length) return <p className="mt-5 text-sm text-muted-foreground">尚未加入表决事项。</p>;
  return <div className="mt-5 space-y-3 border-t pt-4">{items.map((subject) => <div key={"subjectId" in subject ? subject.subjectId : subject.draftId} className="flex flex-col gap-3 border-t pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-sm font-medium">{subject.title}</div><div className="mt-1 text-xs text-muted-foreground">{SUBJECT_TYPE_LABEL[subject.subjectType]}</div>{"result" in subject && subject.result && <div className="mt-2 text-sm"><span className={subject.result.passed ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>{subject.result.passed ? "表决通过" : subject.result.quorumSatisfied ? "未通过" : "参与人数或面积未达到规定比例"}</span><span className="ml-3 text-muted-foreground">参与 {subject.result.participatingOwnerCount} / {subject.result.totalOwnerCount} 人，{subject.result.participatingArea} / {subject.result.totalArea} ㎡</span>{subject.result.supportOwnerCount != null && <div className="mt-1 text-muted-foreground">同意 {subject.result.supportOwnerCount} 人 / {subject.result.supportArea} ㎡，不同意 {subject.result.againstOwnerCount} 人 / {subject.result.againstArea} ㎡，弃权 {subject.result.abstainOwnerCount} 人 / {subject.result.abstainArea} ㎡</div>}</div>}</div>{"status" in subject && <StatusChip tone={subject.result ? subject.result.passed ? "success" : "warning" : "tech"}>{subject.status === "SETTLED" ? "结果已形成" : subject.status === "VOTING" ? "表决中" : "已发布"}</StatusChip>}</div>)}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>;
}
