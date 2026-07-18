// 关联业务：以真实业主大会办理顺序完成事项拟定、材料归档、公示、纸质送达、投票和计票，不暴露内部标识。
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FileUp,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Vote,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip, Stepper, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useStore } from "../../lib/store";
import type { SubjectType, VoteChoice } from "../../lib/voting";
import {
  castOwnersAssemblyPaperVote,
  confirmOwnersAssemblyArrangement,
  createOwnersAssemblySession,
  createOwnersAssemblySubjectDraft,
  getOwnerPropertyOptions,
  getOwnersAssemblyWorkspace,
  listOwnersAssemblies,
  publishOwnersAssemblyArrangement,
  recordOwnersAssemblyPaperDelivery,
  searchOwnersByPhone,
  settleOwnersAssembly,
  startOwnersAssemblyVoting,
  uploadOwnersAssemblyMaterial,
  type OwnerListItem,
  type OwnerPropertyOption,
  type OwnersAssemblyMaterial,
  type OwnersAssemblyMaterialType,
  type OwnersAssemblySession,
  type OwnersAssemblyWorkspace,
} from "../../lib/owners-assembly";

const ASSEMBLY_STATUS: Record<string, { label: string; tone: Tone }> = {
  PREPARING: { label: "筹备中", tone: "neutral" },
  PACKAGE_DRAFT: { label: "待发布公示", tone: "warning" },
  PUBLIC_NOTICE: { label: "公示中", tone: "tech" },
  VOTING: { label: "投票中", tone: "primary" },
  SETTLED: { label: "结果已形成", tone: "success" },
  VOIDED: { label: "已终止", tone: "danger" },
};

const MODE_LABEL: Record<string, string> = {
  WRITTEN_DECISION: "书面征求意见",
  OFFLINE_MEETING: "历史线下会议记录",
  ONLINE_AND_OFFLINE: "历史线上线下记录",
};

const SUBJECT_TYPE_LABEL: Record<Extract<SubjectType, "GENERAL" | "MAJOR">, string> = {
  GENERAL: "一般决议",
  MAJOR: "重大决议",
};

const STEPS = [
  { key: "assembly", label: "发起大会" },
  { key: "subjects", label: "拟定事项" },
  { key: "arrangement", label: "确认安排" },
  { key: "notice", label: "发布公示" },
  { key: "voting", label: "投票与回收" },
  { key: "result", label: "形成结果" },
];

const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";

function localDateTime(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toInstant(value: string) {
  return new Date(value).toISOString();
}

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

function statusMeta(status: string | null | undefined) {
  return ASSEMBLY_STATUS[status ?? ""] ?? { label: "办理中", tone: "neutral" as Tone };
}

function preparationModeLabel(mode: string) {
  return MODE_LABEL[mode] ?? "历史会议记录";
}

function currentStep(workspace: OwnersAssemblyWorkspace | null) {
  if (!workspace) return 0;
  const status = workspace.arrangement?.status ?? workspace.assembly.status;
  if (status === "SETTLED") return 5;
  if (status === "VOTING") return 4;
  if (status === "PUBLIC_NOTICE") return 3;
  if (status === "PACKAGE_DRAFT") return 2;
  return workspace.draftSubjects.length > 0 ? 1 : 0;
}

function latestMaterial(materials: OwnersAssemblyMaterial[], type: OwnersAssemblyMaterialType) {
  const matches = materials.filter((material) => material.materialType === type);
  return matches[matches.length - 1] ?? null;
}

function materialList(materials: OwnersAssemblyMaterial[], type: OwnersAssemblyMaterialType) {
  return materials.filter((material) => material.materialType === type);
}

export function OwnersAssembly() {
  const { hasPermission, setPage } = useStore();
  const canCreate = hasPermission("voting:subject:create");
  const canAudit = hasPermission("voting:subject:audit");
  const canFormalManage = hasPermission("owners-assembly:formal:manage");
  const canPrepare = canCreate || canFormalManage;

  const [sessions, setSessions] = useState<OwnersAssemblySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<OwnersAssemblyWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [sessionTitle, setSessionTitle] = useState("");
  const [subjectType, setSubjectType] = useState<Extract<SubjectType, "GENERAL" | "MAJOR">>("MAJOR");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectContent, setSubjectContent] = useState("");
  const [voteStartAt, setVoteStartAt] = useState(localDateTime(7));
  const [voteEndAt, setVoteEndAt] = useState(localDateTime(14));

  const [ownerPhonePrefix, setOwnerPhonePrefix] = useState("");
  const [ownerCandidates, setOwnerCandidates] = useState<OwnerListItem[]>([]);
  const [ownerProperties, setOwnerProperties] = useState<{
    owner: OwnerListItem;
    properties: OwnerPropertyOption[];
  } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<OwnerPropertyOption | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState("上门送达");
  const [paperChoice, setPaperChoice] = useState<VoteChoice>("SUPPORT");
  const [paperSubjectId, setPaperSubjectId] = useState("");

  const arrangement = workspace?.arrangement ?? null;
  const status = arrangement?.status ?? workspace?.assembly.status ?? null;
  const statusInfo = statusMeta(status);
  const publicNotice = workspace ? latestMaterial(workspace.materials, "PUBLIC_NOTICE") : null;
  const ballotTemplate = workspace ? latestMaterial(workspace.materials, "PAPER_BALLOT_TEMPLATE") : null;
  const planAttachments = workspace ? materialList(workspace.materials, "PLAN_ATTACHMENT") : [];
  const deliveryEvidence = workspace ? latestMaterial(workspace.materials, "DELIVERY_EVIDENCE") : null;
  const paperBallot = workspace ? latestMaterial(workspace.materials, "PAPER_BALLOT") : null;
  const votingCanStart = Boolean(arrangement?.publicNoticeEndAt && new Date(arrangement.publicNoticeEndAt).getTime() <= Date.now());

  const selectedPropertyLabel = useMemo(() => {
    if (!selectedProperty || !ownerProperties) return "尚未选择房屋";
    const place = [selectedProperty.buildingName, selectedProperty.unitName, selectedProperty.roomName]
      .filter(Boolean)
      .join(" ");
    return `${ownerProperties.owner.realName || "业主"} · ${place}`;
  }, [ownerProperties, selectedProperty]);

  useEffect(() => {
    void refreshSessions();
  }, []);

  async function refreshSessions(preferredSessionId?: number) {
    setLoading(true);
    try {
      const nextSessions = await listOwnersAssemblies();
      setSessions(nextSessions);
      const nextSessionId = preferredSessionId
        ?? selectedSessionId
        ?? nextSessions[0]?.sessionId
        ?? null;
      setSelectedSessionId(nextSessionId);
      if (nextSessionId) {
        await refreshWorkspace(nextSessionId);
      } else {
        setWorkspace(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载业主大会失败");
    } finally {
      setLoading(false);
    }
  }

  async function refreshWorkspace(sessionId = selectedSessionId) {
    if (!sessionId) return;
    const nextWorkspace = await getOwnersAssemblyWorkspace(sessionId);
    setWorkspace(nextWorkspace);
    setPaperSubjectId((current) => {
      if (nextWorkspace.formalSubjects.some((subject) => String(subject.subjectId) === current)) return current;
      return nextWorkspace.formalSubjects[0] ? String(nextWorkspace.formalSubjects[0].subjectId) : "";
    });
  }

  async function run<T>(key: string, work: () => Promise<T>, success: string) {
    setActing(key);
    try {
      const result = await work();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
      return null;
    } finally {
      setActing(null);
    }
  }

  async function onCreateSession() {
    const next = await run(
      "create-session",
      () => createOwnersAssemblySession({ title: sessionTitle.trim() }),
      "业主大会已发起",
    );
    if (!next) return;
    setSessionTitle("");
    await refreshSessions(next.sessionId);
  }

  async function onAddSubject() {
    if (!workspace) return;
    const next = await run(
      "add-subject",
      () => createOwnersAssemblySubjectDraft(workspace.assembly.sessionId, {
        subjectType,
        title: subjectTitle.trim(),
        content: subjectContent.trim() || null,
      }),
      "表决事项已加入本次业主大会",
    );
    if (!next) return;
    setSubjectTitle("");
    setSubjectContent("");
    await refreshWorkspace();
  }

  async function onUploadMaterial(type: OwnersAssemblyMaterialType, file: File) {
    if (!workspace) throw new Error("请先发起业主大会");
    const material = await uploadOwnersAssemblyMaterial(workspace.assembly.sessionId, type, file);
    await refreshWorkspace();
    return material;
  }

  async function onConfirmArrangement() {
    if (!workspace || !publicNotice || !ballotTemplate || planAttachments.length === 0) return;
    const next = await run(
      "confirm-arrangement",
      () => confirmOwnersAssemblyArrangement(workspace.assembly.sessionId, {
        voteStartAt: toInstant(voteStartAt),
        voteEndAt: toInstant(voteEndAt),
        publicNoticeMaterialId: publicNotice.materialId,
        planAttachmentMaterialIds: planAttachments.map((material) => material.materialId),
        ballotTemplateMaterialId: ballotTemplate.materialId,
      }),
      "公示与表决安排已确认",
    );
    if (next) await refreshSessions(workspace.assembly.sessionId);
  }

  async function onPublish() {
    if (!workspace) return;
    const next = await run(
      "publish",
      () => publishOwnersAssemblyArrangement(workspace.assembly.sessionId),
      "公示已发布",
    );
    if (next) await refreshSessions(workspace.assembly.sessionId);
  }

  async function onStartVoting() {
    if (!workspace) return;
    const next = await run(
      "start-voting",
      () => startOwnersAssemblyVoting(workspace.assembly.sessionId),
      "投票已开始",
    );
    if (next) await refreshSessions(workspace.assembly.sessionId);
  }

  async function onSettle() {
    if (!workspace) return;
    const next = await run(
      "settle",
      () => settleOwnersAssembly(workspace.assembly.sessionId),
      "已完成计票并形成结果",
    );
    if (next) await refreshSessions(workspace.assembly.sessionId);
  }

  async function onSearchOwner() {
    const normalized = ownerPhonePrefix.trim();
    if (!/^\d{3,}$/.test(normalized)) {
      toast.error("请输入至少 3 位手机号码进行检索");
      return;
    }
    const results = await run("search-owner", () => searchOwnersByPhone(normalized), "已找到匹配业主");
    if (results) {
      setOwnerCandidates(results);
      setOwnerProperties(null);
      setSelectedProperty(null);
    }
  }

  async function onSelectOwner(owner: OwnerListItem) {
    const details = await run("select-owner", () => getOwnerPropertyOptions(owner.uid), "请选择本次送达的房屋");
    if (!details) return;
    setOwnerProperties({ owner: details.profile, properties: details.properties });
    setSelectedProperty(null);
  }

  async function onRecordDelivery() {
    if (!workspace || !selectedProperty || !deliveryEvidence) return;
    const result = await run(
      "record-delivery",
      () => recordOwnersAssemblyPaperDelivery(workspace.assembly.sessionId, {
        opid: selectedProperty.opid,
        deliveryMethod,
        evidenceMaterialId: deliveryEvidence.materialId,
      }),
      "纸质选票送达记录已保存",
    );
    if (result !== null) await refreshWorkspace();
  }

  async function onCastPaperVote() {
    if (!workspace || !selectedProperty || !paperBallot || !paperSubjectId) return;
    const result = await run(
      "record-paper-vote",
      () => castOwnersAssemblyPaperVote(workspace.assembly.sessionId, {
        subjectId: Number(paperSubjectId),
        opid: selectedProperty.opid,
        choice: paperChoice,
        ballotMaterialId: paperBallot.materialId,
      }),
      "纸质选票已录入",
    );
    if (result !== null) await refreshWorkspace();
  }

  if (!canPrepare && !canAudit && !canFormalManage) {
    return (
      <div className="space-y-5">
        <PageHeader title="业主大会办理" desc="当前角色没有业主大会办理权限。" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="业主大会办理"
        desc="用于小区整体公共事项的书面征询、公示、纸质选票送达与回收、投票和计票。楼栋或单元维修接龙在维修工程流程中办理。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void refreshSessions()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> 刷新
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage("subject-proposal")}>
              返回议题筹备
            </Button>
          </>
        }
      />

      <SectionCard title="办理进度" desc="先拟定事项和归档材料，再确认公示与表决安排；所有记录会持续保留。">
        <Stepper steps={STEPS} current={currentStep(workspace)} />
      </SectionCard>

      {sessions.length > 0 && (
        <SectionCard title="本次业主大会" extra={status ? <StatusChip tone={statusInfo.tone} dot>{statusInfo.label}</StatusChip> : null}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <Label>选择业主大会</Label>
              <Select
                value={selectedSessionId ? String(selectedSessionId) : ""}
                onValueChange={(value) => {
                  const nextSessionId = Number(value);
                  setSelectedSessionId(nextSessionId);
                  setOwnerCandidates([]);
                  setOwnerProperties(null);
                  setSelectedProperty(null);
                  void refreshWorkspace(nextSessionId).catch((error) => toast.error(error instanceof Error ? error.message : "加载业主大会失败"));
                }}
              >
                <SelectTrigger><SelectValue placeholder="选择业主大会" /></SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => <SelectItem key={session.sessionId} value={String(session.sessionId)}>{session.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Info label="会议形式" value={workspace ? preparationModeLabel(workspace.assembly.preparationMode) : "加载中"} />
            <Info label="发起时间" value={workspace ? formatDateTime(workspace.assembly.createTime) : "加载中"} />
          </div>
          {workspace && (
            <div className="mt-4 grid gap-3 border-t pt-4 text-sm md:grid-cols-3">
              <Info label="表决事项" value={`${workspace.draftSubjects.length || workspace.formalSubjects.length} 项`} />
              <Info label="表决范围" value="小区全体业主" />
              <Info label="表决渠道" value={arrangement ? "盖章纸质选票" : "待确认"} />
            </div>
          )}
        </SectionCard>
      )}

      {!workspace && canPrepare && (
        <SectionCard title="1. 发起业主大会" desc="先建立本次会议，再依次拟定表决事项和公示材料。">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-end">
            <div>
              <Label>业主大会标题</Label>
              <Input value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} placeholder="如：2026 年小区公共区域改造业主大会" />
            </div>
            <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
              <div className="font-medium">会议形式</div>
              <div className="text-muted-foreground">书面征求意见（盖章纸质选票）</div>
            </div>
            <Button onClick={() => void onCreateSession()} disabled={acting === "create-session" || !sessionTitle.trim()}>
              {acting === "create-session" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} 发起业主大会
            </Button>
          </div>
        </SectionCard>
      )}

      {workspace && (
        <div className="space-y-5">
          {workspace.assembly.status === "PREPARING" && canPrepare && (
            <div className="grid gap-5 xl:grid-cols-2">
              <SectionCard title="2. 拟定表决事项" desc="业主大会只处理小区整体公共事项；楼栋和单元维修不在此处发起。">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div>
                      <Label>事项类型</Label>
                      <Select value={subjectType} onValueChange={(value) => setSubjectType(value as Extract<SubjectType, "GENERAL" | "MAJOR">)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAJOR">重大决议</SelectItem>
                          <SelectItem value="GENERAL">一般决议</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>表决事项标题</Label>
                      <Input value={subjectTitle} onChange={(event) => setSubjectTitle(event.target.value)} placeholder="如：小区排水井及管网修复改造方案" />
                    </div>
                  </div>
                  <div>
                    <Label>事项说明与方案摘要</Label>
                    <Textarea value={subjectContent} onChange={(event) => setSubjectContent(event.target.value)} rows={5} placeholder="说明拟表决的方案、主要内容和附件索引。" />
                  </div>
                  <Button onClick={() => void onAddSubject()} disabled={acting === "add-subject" || !subjectTitle.trim()}>
                    {acting === "add-subject" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} 新增表决事项
                  </Button>
                </div>
                <SubjectList drafts={workspace.draftSubjects} formalSubjects={workspace.formalSubjects} />
              </SectionCard>

              <SectionCard title="3. 准备并确认公示与表决安排" desc="先归档正式材料；主任或副主任确认时，系统按已生效议事规则冻结公示期与表决规则。">
                <div className="space-y-4">
                  <AssemblyMaterialUpload
                    sessionId={workspace.assembly.sessionId}
                    type="PUBLIC_NOTICE"
                    label="公示公告"
                    help="上传拟发布的公告原件。"
                    value={publicNotice}
                    onUpload={onUploadMaterial}
                  />
                  <AssemblyMaterialUpload
                    sessionId={workspace.assembly.sessionId}
                    type="PLAN_ATTACHMENT"
                    label="方案附件"
                    help="可逐份上传方案、预算、图纸等附件。"
                    values={planAttachments}
                    onUpload={onUploadMaterial}
                  />
                  <AssemblyMaterialUpload
                    sessionId={workspace.assembly.sessionId}
                    type="PAPER_BALLOT_TEMPLATE"
                    label="盖章纸质选票模板"
                    help="用于向业主送达和回收的选票样式。"
                    value={ballotTemplate}
                    onUpload={onUploadMaterial}
                  />
                  <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                    <div>
                      <Label>计划开始投票</Label>
                      <Input type="datetime-local" value={voteStartAt} onChange={(event) => setVoteStartAt(event.target.value)} />
                    </div>
                    <div>
                      <Label>计划结束投票</Label>
                      <Input type="datetime-local" value={voteEndAt} onChange={(event) => setVoteEndAt(event.target.value)} />
                    </div>
                  </div>
                  {canFormalManage ? (
                    <Button
                      onClick={() => void onConfirmArrangement()}
                      disabled={acting === "confirm-arrangement" || workspace.draftSubjects.length === 0 || !publicNotice || !ballotTemplate || planAttachments.length === 0}
                    >
                      {acting === "confirm-arrangement" ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} 确认公示与表决安排
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">材料准备完成后，由主任或副主任确认正式安排。</p>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {workspace.assembly.status === "PACKAGE_DRAFT" && (
            <SectionCard title="4. 确认并发布公示" desc="发布后，事项、选票模板和公示材料将按当前版本留档，后续不能替换。">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">公示期为 {arrangement?.publicNoticeDays ?? "-"} 天，计划投票时间：{formatDateTime(arrangement?.voteStartAt)} 至 {formatDateTime(arrangement?.voteEndAt)}。</div>
                {canFormalManage ? (
                  <Button onClick={() => void onPublish()} disabled={acting === "publish"}>
                    {acting === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} 确认并发布公示
                  </Button>
                ) : <span className="text-sm text-muted-foreground">由主任或副主任发布正式公示。</span>}
              </div>
            </SectionCard>
          )}

          {arrangement?.status === "PUBLIC_NOTICE" && (
            <SectionCard title="4. 公示期" desc="公示材料和盖章纸质选票模板已公开；公示期届满后，由主任或副主任开启纸质投票。">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <div className="text-sm font-medium">公示截至</div>
                  <div className="mt-1 text-sm text-muted-foreground">{formatDateTime(arrangement.publicNoticeEndAt)}。公示结束后，才可发放纸质选票、登记送达和回收选票。</div>
                </div>
                {canFormalManage ? (
                  <Button onClick={() => void onStartVoting()} disabled={acting === "start-voting" || !votingCanStart} title={votingCanStart ? undefined : "公示期未满，暂不能开始投票"}>
                    {acting === "start-voting" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} 开始投票
                  </Button>
                ) : <span className="text-sm text-muted-foreground">由主任或副主任在公示期满后开启投票。</span>}
              </div>
            </SectionCard>
          )}

          {arrangement?.status === "VOTING" && (
            <SectionCard title="5. 纸质选票送达、回收与录入" desc={`投票截止时间：${formatDateTime(arrangement.voteEndAt)}。物业按已发放的盖章纸质选票登记送达，并录入已回收选票。`}>
              {canAudit ? <PaperHandling workspace={workspace} selectedPropertyLabel={selectedPropertyLabel} ownerPhonePrefix={ownerPhonePrefix} onPhonePrefixChange={setOwnerPhonePrefix} ownerCandidates={ownerCandidates} ownerProperties={ownerProperties} selectedProperty={selectedProperty} onSearchOwner={onSearchOwner} onSelectOwner={onSelectOwner} onSelectProperty={setSelectedProperty} deliveryMethod={deliveryMethod} onDeliveryMethodChange={setDeliveryMethod} deliveryEvidence={deliveryEvidence} onUpload={onUploadMaterial} onRecordDelivery={onRecordDelivery} acting={acting} showVoteForm paperSubjectId={paperSubjectId} onPaperSubjectChange={setPaperSubjectId} paperChoice={paperChoice} onPaperChoiceChange={setPaperChoice} paperBallot={paperBallot} onCastPaperVote={onCastPaperVote} /> : <span className="text-sm text-muted-foreground">需由具备核验权限的角色办理纸质送达和选票录入。</span>}
            </SectionCard>
          )}

          {arrangement?.status === "VOTING" && (
            <SectionCard title="6. 计票并形成结果" desc="投票截止后，由主任或副主任对本次业主大会全部事项统一计票并形成结果。">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">{new Date(arrangement.voteEndAt).getTime() <= Date.now() ? "投票已截止，可以办理计票。" : `投票尚未截止，截止时间为 ${formatDateTime(arrangement.voteEndAt)}。`}</span>
                {canFormalManage ? <Button onClick={() => void onSettle()} disabled={acting === "settle" || new Date(arrangement.voteEndAt).getTime() > Date.now()}>{acting === "settle" ? <Loader2 className="size-4 animate-spin" /> : <Vote className="size-4" />} 计票并形成结果</Button> : <span className="text-sm text-muted-foreground">由主任或副主任办理计票并形成结果。</span>}
              </div>
            </SectionCard>
          )}

          {arrangement?.status === "SETTLED" && (
            <SectionCard title="表决结果已形成" desc="本次业主大会的事项、材料、公示安排、送达和投票记录已进入归档状态。">
              <SubjectList drafts={workspace.draftSubjects} formalSubjects={workspace.formalSubjects} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

function AssemblyMaterialUpload({
  sessionId,
  type,
  label,
  help,
  value,
  values,
  onUpload,
}: {
  sessionId: number;
  type: OwnersAssemblyMaterialType;
  label: string;
  help: string;
  value?: OwnersAssemblyMaterial | null;
  values?: OwnersAssemblyMaterial[];
  onUpload: (type: OwnersAssemblyMaterialType, file: File) => Promise<OwnersAssemblyMaterial>;
}) {
  const [uploading, setUploading] = useState(false);
  const materialNames = values?.map((material) => material.originalFileName) ?? (value ? [value.originalFileName] : []);

  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm hover:bg-muted/40">
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">{materialNames.length ? materialNames.join("、") : "选择并上传原始文件"}</span>
        <Input
          className="hidden"
          type="file"
          accept={FILE_ACCEPT}
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setUploading(true);
            onUpload(type, file)
              .then(() => toast.success(`${label}已归档`))
              .catch((error) => toast.error(error instanceof Error ? error.message : "文件上传失败"))
              .finally(() => setUploading(false));
          }}
        />
      </label>
    </div>
  );
}

function SubjectList({
  drafts,
  formalSubjects,
}: {
  drafts: OwnersAssemblyWorkspace["draftSubjects"];
  formalSubjects: OwnersAssemblyWorkspace["formalSubjects"];
}) {
  const items = formalSubjects.length > 0 ? formalSubjects : drafts;
  if (items.length === 0) return <p className="mt-5 text-sm text-muted-foreground">尚未新增表决事项。</p>;
  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-sm font-medium">已拟定事项</div>
      <div className="space-y-2">
        {items.map((subject) => (
          <div key={"subjectId" in subject ? subject.subjectId : subject.draftId} className="flex items-start justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0">
            <div className="min-w-0">
              <div className="font-medium">{subject.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{SUBJECT_TYPE_LABEL[subject.subjectType]}</div>
            </div>
            {"status" in subject && <StatusChip tone="tech">{subject.status === "DRAFT" ? "待发布" : subject.status === "PUBLISHED" ? "公示中" : subject.status === "VOTING" ? "投票中" : subject.status === "SETTLED" ? "已形成结果" : subject.status}</StatusChip>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaperHandling({
  workspace,
  selectedPropertyLabel,
  ownerPhonePrefix,
  onPhonePrefixChange,
  ownerCandidates,
  ownerProperties,
  selectedProperty,
  onSearchOwner,
  onSelectOwner,
  onSelectProperty,
  deliveryMethod,
  onDeliveryMethodChange,
  deliveryEvidence,
  onUpload,
  onRecordDelivery,
  acting,
  showVoteForm,
  paperSubjectId,
  onPaperSubjectChange,
  paperChoice,
  onPaperChoiceChange,
  paperBallot,
  onCastPaperVote,
}: {
  workspace: OwnersAssemblyWorkspace;
  selectedPropertyLabel: string;
  ownerPhonePrefix: string;
  onPhonePrefixChange: (value: string) => void;
  ownerCandidates: OwnerListItem[];
  ownerProperties: { owner: OwnerListItem; properties: OwnerPropertyOption[] } | null;
  selectedProperty: OwnerPropertyOption | null;
  onSearchOwner: () => Promise<void>;
  onSelectOwner: (owner: OwnerListItem) => Promise<void>;
  onSelectProperty: (property: OwnerPropertyOption) => void;
  deliveryMethod: string;
  onDeliveryMethodChange: (value: string) => void;
  deliveryEvidence: OwnersAssemblyMaterial | null;
  onUpload: (type: OwnersAssemblyMaterialType, file: File) => Promise<OwnersAssemblyMaterial>;
  onRecordDelivery: () => Promise<void>;
  acting: string | null;
  showVoteForm: boolean;
  paperSubjectId: string;
  onPaperSubjectChange: (value: string) => void;
  paperChoice: VoteChoice;
  onPaperChoiceChange: (value: VoteChoice) => void;
  paperBallot: OwnersAssemblyMaterial | null;
  onCastPaperVote: () => Promise<void>;
}) {
  return (
    <div className="mt-5 grid gap-5 border-t pt-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium">选择送达房屋</div>
          <div className="mt-2 flex gap-2">
            <Input value={ownerPhonePrefix} inputMode="numeric" onChange={(event) => onPhonePrefixChange(event.target.value)} placeholder="输入至少 3 位业主手机号码" />
            <Button variant="outline" size="icon" title="检索业主" onClick={() => void onSearchOwner()} disabled={acting === "search-owner"}>
              {acting === "search-owner" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
          {ownerCandidates.length > 0 && (
            <div className="mt-2 divide-y border-y">
              {ownerCandidates.map((owner) => (
                <button key={owner.uid} type="button" className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-sm hover:bg-muted/40" onClick={() => void onSelectOwner(owner)}>
                  <span>{owner.realName || "未登记姓名"}</span>
                  <span className="text-xs text-muted-foreground">{owner.phoneMasked}</span>
                </button>
              ))}
            </div>
          )}
          {ownerProperties && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ownerProperties.properties.map((property) => {
                const label = [property.buildingName, property.unitName, property.roomName].filter(Boolean).join(" ");
                const selected = selectedProperty?.opid === property.opid;
                return <Button key={property.opid} type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => onSelectProperty(property)}>{label}</Button>;
              })}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">已选择：{selectedPropertyLabel}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>送达方式</Label>
            <Select value={deliveryMethod} onValueChange={onDeliveryMethodChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="上门送达">上门送达</SelectItem>
                <SelectItem value="邮寄送达">邮寄送达</SelectItem>
                <SelectItem value="物业前台领取">物业前台领取</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AssemblyMaterialUpload sessionId={workspace.assembly.sessionId} type="DELIVERY_EVIDENCE" label="送达凭证" help="上传签收单、送达照片或快递凭证。" value={deliveryEvidence} onUpload={onUpload} />
        </div>
        <Button variant="outline" onClick={() => void onRecordDelivery()} disabled={acting === "record-delivery" || !selectedProperty || !deliveryEvidence}>
          {acting === "record-delivery" ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} 登记纸质选票送达
        </Button>
      </div>

      {showVoteForm && (
        <div className="space-y-4 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <div className="text-sm font-medium">录入回收的纸质选票</div>
          <div>
            <Label>表决事项</Label>
            <Select value={paperSubjectId} onValueChange={onPaperSubjectChange}>
              <SelectTrigger><SelectValue placeholder="选择表决事项" /></SelectTrigger>
              <SelectContent>
                {workspace.formalSubjects.map((subject) => <SelectItem key={subject.subjectId} value={String(subject.subjectId)}>{subject.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>业主选择</Label>
            <Select value={paperChoice} onValueChange={(value) => onPaperChoiceChange(value as VoteChoice)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPPORT">赞成</SelectItem>
                <SelectItem value="AGAINST">反对</SelectItem>
                <SelectItem value="ABSTAIN">弃权</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AssemblyMaterialUpload sessionId={workspace.assembly.sessionId} type="PAPER_BALLOT" label="回收选票原件" help="上传本户回收选票的扫描件或照片。" value={paperBallot} onUpload={onUpload} />
          <Button onClick={() => void onCastPaperVote()} disabled={acting === "record-paper-vote" || !selectedProperty || !paperSubjectId || !paperBallot}>
            {acting === "record-paper-vote" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} 录入纸质选票
          </Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
