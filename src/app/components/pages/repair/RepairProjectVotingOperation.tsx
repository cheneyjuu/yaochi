// 关联业务：办理维修方案的相关业主表决，统一承接纸质、线上实名和纸质线上并行收票。
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileCheck2, Loader2, Play, RefreshCw, Vote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { StatusChip } from "../../gov/common";
import { NonResponseTallySummary } from "../../voting/NonResponseTallySummary";
import {
  getRepairProjectVoting,
  getRepairVotingPreparationOptions,
  getRepairVotingWorkbench,
  openRepairProjectVoting,
  prepareRepairProjectVoting,
  recordRepairVotingDelivery,
  registerRepairVotingPaperBallot,
  reviewRepairVotingDelivery,
  reviewRepairVotingPaperBallotEntry,
  settleRepairProjectVoting,
  submitRepairVotingPaperBallotEntry,
  type RepairProjectAttachment,
  type RepairProjectDetails,
  type RepairProjectVotingDetails,
  type RepairVotingCollectionMode,
  type RepairVotingDeliveryMethod,
  type RepairVotingPreparationOptions,
  type RepairVotingWorkbench,
  type VotingProxyAuthorization,
} from "../../../lib/repair-project";
import { RepairProjectFileUpload } from "./RepairProjectFileUpload";
import { RepairVotingProxyAuthorizationPanel } from "./RepairVotingProxyAuthorizationPanel";

const MODE_LABEL: Record<RepairVotingCollectionMode, string> = {
  PAPER: "纸质书面表决",
  ONLINE_WITH_PAPER_ASSISTANCE: "线上实名表决（可申请纸质协助）",
  PAPER_AND_ONLINE: "纸质与线上并行",
};

const DELIVERY_LABEL: Record<RepairVotingDeliveryMethod, string> = {
  DOOR_TO_DOOR: "上门送达",
  POSTAL: "邮寄送达",
  ELECTRONIC: "电子送达",
  PUBLIC_NOTICE_BOARD: "公告栏送达",
};

type VotingPreparationValidation = {
  canGovern: boolean;
  projectStatus: string;
  mode: RepairVotingCollectionMode | "";
  paperBallotTemplateAttachmentId: number | null;
  startAt: string;
  endAt: string;
  earliestVoteStartAt: string | null;
  optionsReady: boolean;
};

/** 将服务端时间向上取整到本地分钟，避免 datetime-local 丢失秒数后早于规则时点。 */
export function toVotingDateTimeLocalValue(value: string, roundUpToMinute = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (roundUpToMinute && (date.getSeconds() > 0 || date.getMilliseconds() > 0)) {
    date.setMinutes(date.getMinutes() + 1);
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 返回按钮不可办理的唯一、可行动业务原因；返回 null 表示表单已经可以提交。 */
export function votingPreparationBlocker(input: VotingPreparationValidation): string | null {
  if (!input.canGovern) return "当前身份只能核对材料，表决安排由业委会确认。";
  if (input.projectStatus !== "AUTHORIZATION_IN_PROGRESS") return "当前项目状态不能确认表决安排，请刷新后查看最新办理进度。";
  if (!input.optionsReady) return "本小区当前表决依据尚未满足发起条件。";
  if (!input.mode) return "请选择本次实际表决方式。";
  if (!input.paperBallotTemplateAttachmentId) return "请上传本次纸质表决票模板。";
  if (!input.startAt) return "请填写表决开始时间。";
  const startTime = new Date(input.startAt).getTime();
  const earliestTime = input.earliestVoteStartAt ? new Date(input.earliestVoteStartAt).getTime() : Number.NaN;
  if (Number.isNaN(startTime)) return "表决开始时间格式不正确。";
  if (!Number.isNaN(earliestTime) && startTime < earliestTime) {
    return `开始时间早于本小区规则允许的最早时间，请调整为 ${new Date(input.earliestVoteStartAt!).toLocaleString("zh-CN", { hour12: false })} 之后。`;
  }
  if (!input.endAt) return "请填写表决截止时间。";
  const endTime = new Date(input.endAt).getTime();
  if (Number.isNaN(endTime)) return "表决截止时间格式不正确。";
  if (endTime <= startTime) return "表决截止时间必须晚于开始时间。";
  return null;
}

/** 已确认安排会由后台按计划自动开始；只有到时仍未开启时，业委会才显示人工补充入口。 */
export function votingOpeningAction(canGovern: boolean, voteStartAt: string, now = Date.now()): {
  canStartNow: boolean;
  message: string | null;
} {
  const startTime = new Date(voteStartAt).getTime();
  if (Number.isNaN(startTime)) {
    return { canStartNow: false, message: "表决开始时间无法识别，请刷新后重试。" };
  }
  if (now < startTime) {
    return {
      canStartNow: false,
      message: `系统将于 ${new Date(voteStartAt).toLocaleString("zh-CN", { hour12: false })} 自动开始表决，无需人工操作。`,
    };
  }
  if (!canGovern) {
    return { canStartNow: false, message: "已到开始时间，系统正在自动开启表决，请稍后刷新查看进度。" };
  }
  return { canStartNow: true, message: null };
}

function propertyLabel(item: RepairVotingWorkbench["electorate"][number] | undefined): string {
  if (!item) return "本次名册房屋";
  return [item.buildingName, item.unitName, item.roomName].filter(Boolean).join(" · ");
}

export function RepairProjectVotingOperation({
  details,
  roleKey,
  hasPermission,
  onChanged,
}: {
  details: RepairProjectDetails;
  roleKey: string | null;
  hasPermission: (permission: string) => boolean;
  onChanged: () => Promise<void>;
}) {
  const project = details.project;
  const [voting, setVoting] = useState<RepairProjectVotingDetails | null>(null);
  const [preparationOptions, setPreparationOptions] = useState<RepairVotingPreparationOptions | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<RepairVotingWorkbench | null>(null);
  const [workbenchError, setWorkbenchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<RepairVotingCollectionMode | "">("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [paperBallotTemplate, setPaperBallotTemplate] = useState<RepairProjectAttachment | null>(null);
  const [opid, setOpid] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<RepairVotingDeliveryMethod | "">("");
  const [deliveryFile, setDeliveryFile] = useState<RepairProjectAttachment | null>(null);
  const [ballotNumber, setBallotNumber] = useState("");
  const [ballotFile, setBallotFile] = useState<RepairProjectAttachment | null>(null);
  const [invalidReasonCode, setInvalidReasonCode] = useState<"BLANK" | "MULTIPLE_MARKS" | "UNREADABLE" | "WRONG_TEMPLATE" | "OTHER">("BLANK");
  const [invalidReasonDescription, setInvalidReasonDescription] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [proxyAuthorizations, setProxyAuthorizations] = useState<VotingProxyAuthorization[]>([]);
  const [proxyAuthorizationId, setProxyAuthorizationId] = useState("");

  const canGovern = ["COMMITTEE_DIRECTOR", "COMMITTEE_MEMBER"].includes(roleKey ?? "")
    && hasPermission("repair:workorder:governance");
  const canHandlePaper = hasPermission("voting:subject:audit");
  const paperElectorate = useMemo(() => {
    if (!workbench || !voting) return [];
    if (voting.executionPackage.collectionMode !== "ONLINE_WITH_PAPER_ASSISTANCE") {
      return workbench.electorate;
    }
    const requested = new Set(workbench.paperAssistanceRequests
      .filter((item) => item.status !== "WITHDRAWN")
      .map((item) => item.opid));
    const represented = new Set(proxyAuthorizations
      .filter((item) => item.status === "CONFIRMED")
      .map((item) => item.principalOpid));
    return workbench.electorate.filter((item) => requested.has(item.representativeOpid)
      || represented.has(item.representativeOpid));
  }, [proxyAuthorizations, voting, workbench]);
  const acceptsPaper = paperElectorate.length > 0;
  const subjectId = voting?.subject.subjectId;
  const selectedElectorate = useMemo(
    () => paperElectorate.find((item) => String(item.representativeOpid) === opid),
    [opid, paperElectorate],
  );
  const selectedProxy = useMemo(
    () => proxyAuthorizations.find((item) => item.status === "CONFIRMED"
      && String(item.authorizationId) === proxyAuthorizationId),
    [proxyAuthorizationId, proxyAuthorizations],
  );
  const availableProxies = useMemo(
    () => proxyAuthorizations.filter((item) => item.status === "CONFIRMED" && String(item.principalOpid) === opid),
    [opid, proxyAuthorizations],
  );
  const earliestStartInput = preparationOptions?.earliestVoteStartAt
    ? toVotingDateTimeLocalValue(preparationOptions.earliestVoteStartAt, true)
    : "";
  const preparationBlocker = votingPreparationBlocker({
    canGovern,
    projectStatus: project.status,
    mode,
    paperBallotTemplateAttachmentId: paperBallotTemplate?.attachmentId ?? null,
    startAt,
    endAt,
    earliestVoteStartAt: preparationOptions?.earliestVoteStartAt ?? null,
    optionsReady: preparationOptions?.ready ?? false,
  });
  const openingAction = voting?.voting.status === "PREPARED"
    ? votingOpeningAction(canGovern, voting.executionPackage.voteStartAt)
    : null;

  async function reload() {
    setLoading(true);
    try {
      const next = await getRepairProjectVoting(project.projectId);
      setVoting(next);
      setMode(next.executionPackage.collectionMode);
      setPreparationOptions(null);
      setPreparationError(null);
      if (next.voting.status === "VOTING" && canHandlePaper) {
        try {
          setWorkbench(await getRepairVotingWorkbench(project.projectId));
          setWorkbenchError(null);
        } catch {
          setWorkbench(null);
          setWorkbenchError("纸质材料办理区暂时无法读取，请刷新后重试；已发起的表决不受影响。");
        }
      } else {
        setWorkbench(null);
        setWorkbenchError(null);
      }
    } catch {
      setVoting(null);
      setWorkbench(null);
      setWorkbenchError(null);
      try {
        const options = await getRepairVotingPreparationOptions(project.projectId);
        setPreparationOptions(options);
        setPreparationError(null);
        setMode((current) => current && options.allowedModes.includes(current) ? current : "");
      } catch (error) {
        setPreparationOptions(null);
        setPreparationError(error instanceof Error ? error.message : "当前还不能准备相关业主表决");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [project.projectId, project.status, project.version]);

  useEffect(() => {
    if (!earliestStartInput) return;
    setStartAt((current) => current || earliestStartInput);
  }, [earliestStartInput]);

  async function run(key: string, action: () => Promise<unknown>, message: string) {
    setBusy(key);
    try {
      await action();
      toast.success(message);
      await Promise.all([reload(), onChanged()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 border-t py-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在读取相关业主表决</div>;
  }

  return (
    <section className="border-t py-5" aria-labelledby="repair-voting-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 id="repair-voting-heading" className="text-sm font-semibold">相关业主表决</h4>
          <p className="mt-1 text-xs text-muted-foreground">表决范围以本方案已经确认的费用承担房屋为准。</p>
        </div>
        <Button type="button" variant="ghost" size="icon" title="刷新" onClick={() => void reload()}>
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {!voting ? (
        <div className="mt-4 border-y py-4">
          {preparationError ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{preparationError}</div>
          ) : preparationOptions ? (
            <>
              <div className="mb-4 text-sm leading-6">
                <span className="font-medium">本次依据：</span>{preparationOptions.ruleName} · {preparationOptions.ruleVersion}
                {preparationOptions.earliestVoteStartAt && <span className="ml-4 text-muted-foreground">最早可于 {new Date(preparationOptions.earliestVoteStartAt).toLocaleString("zh-CN", { hour12: false })} 开始表决</span>}
              </div>
              {!preparationOptions.ready ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                  <div className="font-medium">发起表决前还需一次性完成以下事项</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{preparationOptions.blockingItems.map((item) => <li key={item.code}>{item.message}</li>)}</ul>
                </div>
              ) : (
              <>
              {preparationOptions.proxyVotingPolicy === "WRITTEN_AUTHORIZATION_REQUIRED" && (
                <div className="mb-4 border-y bg-muted/20 px-4 py-3 text-sm leading-6">
                  业主可本人线上或纸质表决；确实无法本人办理时，可在表决开始后登记书面委托，由另一名工作人员核对后交代理人办理纸票。
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Label htmlFor="repair-voting-mode">本次实际表决方式 *</Label>
                  <Select value={mode} onValueChange={(value) => setMode(value as RepairVotingCollectionMode)}>
                    <SelectTrigger id="repair-voting-mode" className="mt-2"><SelectValue placeholder="从本小区生效规则允许的方式中选择" /></SelectTrigger>
                    <SelectContent>
                      {preparationOptions.allowedModes.map((value) => <SelectItem key={value} value={value}>{MODE_LABEL[value]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <RepairProjectFileUpload
                  projectId={project.projectId}
                  label={`${preparationOptions.paperBallotSealRequired ? "已按规则用印的" : "本次"}纸质表决票模板 *`}
                  accept=".pdf,application/pdf"
                  value={paperBallotTemplate}
                  onUploaded={setPaperBallotTemplate}
                />
                <div><Label htmlFor="repair-voting-start">开始时间 *</Label><Input id="repair-voting-start" className="mt-2" type="datetime-local" min={earliestStartInput || undefined} value={startAt} onChange={(event) => setStartAt(event.target.value)} /></div>
                <div><Label htmlFor="repair-voting-end">截止时间 *</Label><Input id="repair-voting-end" className="mt-2" type="datetime-local" min={startAt || earliestStartInput || undefined} value={endAt} onChange={(event) => setEndAt(event.target.value)} /></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {preparationBlocker && <span className="text-xs text-amber-800">{preparationBlocker}</span>}
                <Button disabled={busy !== null || preparationBlocker !== null} onClick={() => void run(
                  "prepare-voting",
                  () => prepareRepairProjectVoting(project.projectId, {
                    expectedProjectVersion: project.version,
                    collectionMode: mode as RepairVotingCollectionMode,
                    paperBallotTemplateAttachmentId: paperBallotTemplate!.attachmentId,
                    voteStartAt: new Date(startAt).toISOString(),
                    voteEndAt: new Date(endAt).toISOString(),
                  }),
                  "相关业主表决安排已确认",
                )}><Vote className="mr-1 size-4" />确认本次表决安排</Button>
              </div>
              </>
              )}
            </>
          ) : null}
        </div>
      ) : (
        <>
          <dl className="mt-4 grid gap-3 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">办理方式</dt><dd className="mt-1 font-medium">{MODE_LABEL[voting.executionPackage.collectionMode]}</dd></div>
            <div><dt className="text-xs text-muted-foreground">依据</dt><dd className="mt-1">{voting.ruleName} · {voting.ruleVersion}</dd></div>
            <div><dt className="text-xs text-muted-foreground">表决时间</dt><dd className="mt-1">{new Date(voting.executionPackage.voteStartAt).toLocaleString("zh-CN", { hour12: false })}<br />至 {new Date(voting.executionPackage.voteEndAt).toLocaleString("zh-CN", { hour12: false })}</dd></div>
            <div><dt className="text-xs text-muted-foreground">办理进度</dt><dd className="mt-1"><StatusChip tone={voting.voting.status === "SETTLED" ? (voting.voting.result === "PASSED" ? "success" : "danger") : "warning"}>{voting.voting.status === "PREPARED" ? "等待开始" : voting.voting.status === "VOTING" ? "正在表决" : voting.voting.result === "PASSED" ? "表决通过" : "表决未通过"}</StatusChip></dd></div>
          </dl>

          {voting.voting.status === "PREPARED" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {openingAction?.message && <p className="text-xs text-muted-foreground">{openingAction.message}</p>}
              {openingAction?.canStartNow && (
                <Button disabled={busy !== null} onClick={() => void run(
                  "open-voting",
                  () => openRepairProjectVoting(project.projectId, voting.voting.version),
                  "相关业主表决已开始",
                )}><Play className="mr-1 size-4" />立即开始表决</Button>
              )}
            </div>
          )}

          {voting.voting.status === "VOTING" && !workbench && (
            <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              {canHandlePaper
                ? workbenchError ?? "正在读取纸质材料办理情况"
                : "当前身份可查看表决进度；纸质材料登记与核对由具备相应办理权限的工作人员操作。"}
            </div>
          )}

          {voting.voting.status === "VOTING" && workbench && (
            <>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div><div className="text-xs text-muted-foreground">应表决专有部分</div><div className="mt-1 text-lg font-semibold">{workbench.electorate.length}</div></div>
                <div><div className="text-xs text-muted-foreground">线上已提交</div><div className="mt-1 text-lg font-semibold">{workbench.online.completedPropertyCount}</div></div>
                <div><div className="text-xs text-muted-foreground">纸票已完成</div><div className="mt-1 text-lg font-semibold">{workbench.paper.ballots.filter((item) => item.ballot.status === "COMPLETED").length}</div></div>
                <div><div className="text-xs text-muted-foreground">纸质协助申请</div><div className="mt-1 text-lg font-semibold">{workbench.paperAssistanceRequests.length}</div></div>
              </div>

              {canHandlePaper && voting.proxyVotingPolicy === "WRITTEN_AUTHORIZATION_REQUIRED" && (
                <RepairVotingProxyAuthorizationPanel
                  packageId={voting.executionPackage.packageId}
                  electorate={workbench.electorate}
                  currentActorUserId={workbench.currentActorUserId}
                  voteStartAt={voting.executionPackage.voteStartAt}
                  voteEndAt={voting.executionPackage.voteEndAt}
                  onChanged={(items) => {
                    setProxyAuthorizations(items);
                    if (proxyAuthorizationId && !items.some((item) => item.status === "CONFIRMED"
                      && String(item.authorizationId) === proxyAuthorizationId)) {
                      setProxyAuthorizationId("");
                    }
                  }}
                />
              )}

              {canHandlePaper && acceptsPaper && (
                <div className="mt-5 border-y py-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div><span className="font-medium">本次纸质表决票模板：</span>{workbench.paperBallotTemplate.originalFileName}</div>
                    <StatusChip tone="success">{workbench.paperBallotSealRequired ? "已按生效规则确认用印原件" : "已锁定原件"}</StatusChip>
                  </div>
                  <div className="mb-5 max-w-xl">
                    <Label htmlFor="repair-voting-review-note">核对说明</Label>
                    <Input
                      id="repair-voting-review-note"
                      className="mt-2"
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="核对通过时选填；退回时请说明需要更正的内容"
                    />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h5 className="text-sm font-medium">登记纸质材料送达</h5>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div><Label>专有部分 *</Label><Select value={opid} onValueChange={(value) => { setOpid(value); setProxyAuthorizationId(""); }}><SelectTrigger className="mt-2"><SelectValue placeholder="选择专有部分" /></SelectTrigger><SelectContent>{paperElectorate.map((item) => <SelectItem key={item.representativeOpid} value={String(item.representativeOpid)}>{propertyLabel(item)} · {item.certifiedArea} ㎡</SelectItem>)}</SelectContent></Select></div>
                      <div><Label htmlFor="repair-voting-recipient">签收人</Label><Input id="repair-voting-recipient" className="mt-2" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></div>
                      {availableProxies.length > 0 && <div className="sm:col-span-2"><Label>纸票办理人 *</Label><Select value={proxyAuthorizationId || "__OWNER__"} onValueChange={(value) => { setProxyAuthorizationId(value === "__OWNER__" ? "" : value); const proxy = proxyAuthorizations.find((item) => String(item.authorizationId) === value); if (proxy) setRecipientName(proxy.agentName); }}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__OWNER__">业主本人办理</SelectItem>{availableProxies.map((item) => <SelectItem key={item.authorizationId} value={String(item.authorizationId)}>代理人 {item.agentName} · {item.agentIdentityNumberMasked}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">选择代理人后，送达和纸票均会绑定已核对的书面委托，计票仍归入原业主房屋。</p></div>}
                      <div className="sm:col-span-2"><Label>实际送达方式 *</Label><Select value={deliveryMethod} onValueChange={(value) => setDeliveryMethod(value as RepairVotingDeliveryMethod)}><SelectTrigger className="mt-2"><SelectValue placeholder="按本次实际办理情况选择" /></SelectTrigger><SelectContent>{workbench.validDeliveryMethods.map((item) => <SelectItem key={item} value={item}>{DELIVERY_LABEL[item]}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="mt-3"><RepairProjectFileUpload projectId={project.projectId} label="送达凭证" value={deliveryFile} onUploaded={setDeliveryFile} /></div>
                    <Button className="mt-3" variant="outline" disabled={busy !== null || !selectedElectorate || !recipientName.trim() || !deliveryMethod || !deliveryFile} onClick={() => void run(
                      "record-delivery",
                      () => recordRepairVotingDelivery(project.projectId, { opid: Number(opid), proxyAuthorizationId: selectedProxy?.authorizationId, recipientName: recipientName.trim(), deliveryMethod: deliveryMethod as RepairVotingDeliveryMethod, evidenceAttachmentId: deliveryFile!.attachmentId, deliveredAt: new Date().toISOString() }),
                      "送达情况已登记，等待核对",
                    )}>登记送达</Button>
                    <div className="mt-4 space-y-2">{workbench.paper.deliveries.map((item) => <div key={item.paperDeliveryId} className="flex items-center justify-between gap-3 border-t pt-2 text-sm"><span>{propertyLabel(workbench.electorate.find((candidate) => candidate.representativeOpid === item.opid))} · {item.recipientName} · {DELIVERY_LABEL[item.deliveryMethod as RepairVotingDeliveryMethod] ?? item.deliveryMethod}</span>{item.status === "PENDING_REVIEW" ? item.deliveredByUserId === workbench.currentActorUserId ? <span className="text-xs text-muted-foreground">需由另一名工作人员核对</span> : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void run("review-delivery-confirm-" + item.paperDeliveryId, () => reviewRepairVotingDelivery(project.projectId, item.paperDeliveryId, "CONFIRM", reviewNote.trim() || undefined), "送达情况已核对")}>核对通过</Button><Button size="sm" variant="outline" disabled={!reviewNote.trim()} onClick={() => void run("review-delivery-reject-" + item.paperDeliveryId, () => reviewRepairVotingDelivery(project.projectId, item.paperDeliveryId, "REJECT", reviewNote.trim()), "送达登记已退回")}>退回</Button></div> : <StatusChip tone={item.status === "CONFIRMED" ? "success" : "danger"}>{item.status === "CONFIRMED" ? "已核对" : "已退回"}</StatusChip>}</div>)}</div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium">登记并核对纸质表决票</h5>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div><Label htmlFor="repair-voting-ballot-no">选票编号</Label><Input id="repair-voting-ballot-no" className="mt-2" value={ballotNumber} onChange={(event) => setBallotNumber(event.target.value)} /></div>
                      <div className="self-end text-xs text-muted-foreground">使用上方已选专有部分</div>
                    </div>
                    <div className="mt-3"><RepairProjectFileUpload projectId={project.projectId} label="纸质表决票原件" value={ballotFile} onUploaded={setBallotFile} /></div>
                    <Button className="mt-3" variant="outline" disabled={busy !== null || !selectedElectorate || !ballotNumber.trim() || !ballotFile} onClick={() => void run(
                      "register-ballot",
                      () => registerRepairVotingPaperBallot(project.projectId, { opid: Number(opid), proxyAuthorizationId: selectedProxy?.authorizationId, ballotNumber: ballotNumber.trim(), attachmentId: ballotFile!.attachmentId, receivedAt: new Date().toISOString() }),
                      "纸质表决票已登记",
                    )}>登记选票</Button>
                    <div className="mt-4 space-y-3">{workbench.paper.ballots.map((item) => <div key={item.ballot.paperBallotId} className="border-t pt-3 text-sm"><div className="flex items-center justify-between gap-3"><span>{item.ballot.ballotNumber} · {propertyLabel(workbench.electorate.find((candidate) => candidate.representativeOpid === item.ballot.opid))}</span><StatusChip tone={item.ballot.status === "COMPLETED" ? "success" : "warning"}>{item.ballot.status === "RECEIVED" ? "待录入" : item.ballot.status === "IN_ENTRY" ? "待核对" : item.ballot.status === "COMPLETED" ? "已完成" : "已作废"}</StatusChip></div>{item.ballot.status === "RECEIVED" && subjectId && <div className="mt-3 space-y-3"><div className="flex flex-wrap gap-2">{(["SUPPORT", "AGAINST", "ABSTAIN"] as const).map((choice) => <Button key={choice} size="sm" variant="outline" onClick={() => void run("entry-" + item.ballot.paperBallotId, () => submitRepairVotingPaperBallotEntry(project.projectId, item.ballot.paperBallotId, subjectId, { determination: "VALID", choice }), "纸票录入已提交，等待另一名工作人员核对")}>{choice === "SUPPORT" ? "录入同意" : choice === "AGAINST" ? "录入不同意" : "录入弃权"}</Button>)}</div><div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]"><Select value={invalidReasonCode} onValueChange={(value) => setInvalidReasonCode(value as typeof invalidReasonCode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BLANK">空白票</SelectItem><SelectItem value="MULTIPLE_MARKS">多选</SelectItem><SelectItem value="UNREADABLE">无法辨认</SelectItem><SelectItem value="WRONG_TEMPLATE">非本次选票</SelectItem><SelectItem value="OTHER">其他</SelectItem></SelectContent></Select><Input placeholder="补充说明（其他原因时必填）" value={invalidReasonDescription} onChange={(event) => setInvalidReasonDescription(event.target.value)} /><Button size="sm" variant="outline" disabled={invalidReasonCode === "OTHER" && !invalidReasonDescription.trim()} onClick={() => void run("entry-invalid-" + item.ballot.paperBallotId, () => submitRepairVotingPaperBallotEntry(project.projectId, item.ballot.paperBallotId, subjectId, { determination: "INVALID", invalidReasonCode, invalidReasonDescription: invalidReasonDescription.trim() || undefined }), "无效票认定已录入，等待另一名工作人员核对")}>录入无效票</Button></div></div>}{item.latestEntry?.status === "PENDING_REVIEW" && (item.latestEntry.enteredByUserId === workbench.currentActorUserId ? <p className="mt-2 text-xs text-muted-foreground">需由另一名工作人员核对录入内容</p> : <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => void run("review-entry-confirm-" + item.latestEntry!.entryId, () => reviewRepairVotingPaperBallotEntry(project.projectId, item.ballot.paperBallotId, item.latestEntry!.entryId, "CONFIRM", reviewNote.trim() || undefined), "纸质表决票已核对并完成处理")}>核对通过</Button><Button size="sm" variant="outline" disabled={!reviewNote.trim()} onClick={() => void run("review-entry-reject-" + item.latestEntry!.entryId, () => reviewRepairVotingPaperBallotEntry(project.projectId, item.ballot.paperBallotId, item.latestEntry!.entryId, "REJECT", reviewNote.trim()), "纸票录入已退回")}>退回录入</Button></div>)}{item.outcomes.length > 0 && <p className="mt-2 text-xs text-muted-foreground">处理结果：{item.outcomes.map((outcome) => outcome.status === "COUNTED" ? "已计入本次表决" : outcome.status === "DUPLICATE" ? "与另一渠道重复，未重复计票" : "已认定为无效票").join("；")}</p>}</div>)}</div>
                  </div>
                  </div>
                </div>
              )}

              <Button className="mt-4" disabled={!canGovern || busy !== null || Date.now() < new Date(voting.executionPackage.voteEndAt).getTime()} onClick={() => void run(
                "settle-voting",
                () => settleRepairProjectVoting(project.projectId, voting.voting.version),
                "已完成计票并形成表决结果",
              )}><FileCheck2 className="mr-1 size-4" />截止并计票</Button>
            </>
          )}

          {voting.voting.status === "SETTLED" && voting.result && (
            <div className="mt-4 flex items-start gap-3 border-y py-4 text-sm"><CheckCircle2 className={`mt-0.5 size-5 ${voting.result.passed ? "text-emerald-600" : "text-red-600"}`} /><div className="min-w-0 flex-1"><div className="font-medium">{voting.result.passed ? "相关业主表决通过" : voting.result.quorumSatisfied ? "相关业主表决未通过" : "参与人数或面积未达到规定比例"}</div><div className="mt-1 text-muted-foreground">参与 {voting.result.participatingOwnerCount} / {voting.result.totalOwnerCount} 人，{voting.result.participatingArea} / {voting.result.totalArea} ㎡。</div>{voting.result.supportOwnerCount != null && <div className="mt-1 text-muted-foreground">同意 {voting.result.supportOwnerCount} 人 / {voting.result.supportArea} ㎡，不同意 {voting.result.againstOwnerCount} 人 / {voting.result.againstArea} ㎡，弃权 {voting.result.abstainOwnerCount} 人 / {voting.result.abstainArea} ㎡。</div>}<NonResponseTallySummary summary={voting.result.nonResponse} /></div></div>
          )}
        </>
      )}
    </section>
  );
}
