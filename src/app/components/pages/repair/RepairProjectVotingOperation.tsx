// 关联业务：办理维修方案的相关业主表决，统一承接纸质、线上实名和纸质线上并行收票。
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileCheck2, Loader2, Play, RefreshCw, Vote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { StatusChip } from "../../gov/common";
import {
  getRepairProjectVoting,
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
  type RepairVotingWorkbench,
} from "../../../lib/repair-project";
import { RepairProjectFileUpload } from "./RepairProjectFileUpload";

const MODE_LABEL: Record<RepairVotingCollectionMode, string> = {
  PAPER: "纸质书面表决",
  ONLINE_WITH_PAPER_ASSISTANCE: "线上实名表决（可申请纸质协助）",
  PAPER_AND_ONLINE: "纸质与线上并行",
};

function localDateTime(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
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
  const [workbench, setWorkbench] = useState<RepairVotingWorkbench | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<RepairVotingCollectionMode>("PAPER_AND_ONLINE");
  const [startAt, setStartAt] = useState(localDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(localDateTime(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)));
  const [opid, setOpid] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [deliveryFile, setDeliveryFile] = useState<RepairProjectAttachment | null>(null);
  const [ballotNumber, setBallotNumber] = useState("");
  const [ballotFile, setBallotFile] = useState<RepairProjectAttachment | null>(null);

  const canGovern = ["COMMITTEE_DIRECTOR", "COMMITTEE_MEMBER"].includes(roleKey ?? "")
    && hasPermission("repair:workorder:governance");
  const canHandlePaper = hasPermission("voting:subject:audit");
  const acceptsPaper = voting?.executionPackage.collectionMode !== "ONLINE_WITH_PAPER_ASSISTANCE"
    || (workbench?.paperAssistanceRequests.length ?? 0) > 0;
  const subjectId = voting?.subject.subjectId;
  const selectedElectorate = useMemo(
    () => workbench?.electorate.find((item) => String(item.representativeOpid) === opid),
    [opid, workbench],
  );

  async function reload() {
    setLoading(true);
    try {
      const next = await getRepairProjectVoting(project.projectId);
      setVoting(next);
      setMode(next.executionPackage.collectionMode);
      if (next.voting.status === "VOTING") {
        setWorkbench(await getRepairVotingWorkbench(project.projectId));
      } else {
        setWorkbench(null);
      }
    } catch {
      setVoting(null);
      setWorkbench(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [project.projectId, project.status, project.version]);

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
        <div className="mt-4 grid gap-4 border-y py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <Label htmlFor="repair-voting-mode">本次表决方式</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as RepairVotingCollectionMode)}>
              <SelectTrigger id="repair-voting-mode" className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MODE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="repair-voting-start">开始时间</Label><Input id="repair-voting-start" className="mt-2" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></div>
            <div><Label htmlFor="repair-voting-end">截止时间</Label><Input id="repair-voting-end" className="mt-2" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></div>
          </div>
          <div className="self-end">
            <Button disabled={!canGovern || busy !== null || project.status !== "AUTHORIZATION_IN_PROGRESS"} onClick={() => void run(
              "prepare-voting",
              () => prepareRepairProjectVoting(project.projectId, {
                expectedProjectVersion: project.version,
                collectionMode: mode,
                voteStartAt: new Date(startAt).toISOString(),
                voteEndAt: new Date(endAt).toISOString(),
              }),
              "相关业主表决安排已确认",
            )}><Vote className="mr-1 size-4" />准备表决</Button>
          </div>
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
            <Button className="mt-4" disabled={!canGovern || busy !== null || Date.now() < new Date(voting.executionPackage.voteStartAt).getTime()} onClick={() => void run(
              "open-voting",
              () => openRepairProjectVoting(project.projectId, voting.voting.version),
              "相关业主表决已开始",
            )}><Play className="mr-1 size-4" />开始表决</Button>
          )}

          {voting.voting.status === "VOTING" && workbench && (
            <>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div><div className="text-xs text-muted-foreground">应表决专有部分</div><div className="mt-1 text-lg font-semibold">{workbench.electorate.length}</div></div>
                <div><div className="text-xs text-muted-foreground">线上已提交</div><div className="mt-1 text-lg font-semibold">{workbench.online.acceptedSubmissionCount}</div></div>
                <div><div className="text-xs text-muted-foreground">纸票已完成</div><div className="mt-1 text-lg font-semibold">{workbench.paper.ballots.filter((item) => item.ballot.status === "COMPLETED").length}</div></div>
                <div><div className="text-xs text-muted-foreground">纸质协助申请</div><div className="mt-1 text-lg font-semibold">{workbench.paperAssistanceRequests.length}</div></div>
              </div>

              {canHandlePaper && acceptsPaper && (
                <div className="mt-5 grid gap-6 border-y py-5 lg:grid-cols-2">
                  <div>
                    <h5 className="text-sm font-medium">登记纸质材料送达</h5>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div><Label>专有部分</Label><Select value={opid} onValueChange={setOpid}><SelectTrigger className="mt-2"><SelectValue placeholder="选择专有部分" /></SelectTrigger><SelectContent>{workbench.electorate.map((item) => <SelectItem key={item.representativeOpid} value={String(item.representativeOpid)}>房屋 {item.roomId} · {item.certifiedArea} ㎡</SelectItem>)}</SelectContent></Select></div>
                      <div><Label htmlFor="repair-voting-recipient">签收人</Label><Input id="repair-voting-recipient" className="mt-2" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></div>
                    </div>
                    <div className="mt-3"><RepairProjectFileUpload projectId={project.projectId} label="送达凭证" value={deliveryFile} onUploaded={setDeliveryFile} /></div>
                    <Button className="mt-3" variant="outline" disabled={busy !== null || !selectedElectorate || !recipientName.trim() || !deliveryFile} onClick={() => void run(
                      "record-delivery",
                      () => recordRepairVotingDelivery(project.projectId, { opid: Number(opid), recipientName: recipientName.trim(), deliveryMethod: "DOOR_TO_DOOR", evidenceAttachmentId: deliveryFile!.attachmentId, deliveredAt: new Date().toISOString() }),
                      "送达情况已登记，等待核对",
                    )}>登记送达</Button>
                    <div className="mt-4 space-y-2">{workbench.paper.deliveries.map((item) => <div key={item.paperDeliveryId} className="flex items-center justify-between gap-3 border-t pt-2 text-sm"><span>房屋权利编号 {item.opid} · {item.recipientName}</span>{item.status === "PENDING_REVIEW" ? <Button size="sm" variant="outline" onClick={() => void run("review-delivery-" + item.paperDeliveryId, () => reviewRepairVotingDelivery(project.projectId, item.paperDeliveryId, "CONFIRM"), "送达情况已核对")}>核对通过</Button> : <StatusChip tone={item.status === "CONFIRMED" ? "success" : "danger"}>{item.status === "CONFIRMED" ? "已核对" : "已退回"}</StatusChip>}</div>)}</div>
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
                      () => registerRepairVotingPaperBallot(project.projectId, { opid: Number(opid), ballotNumber: ballotNumber.trim(), attachmentId: ballotFile!.attachmentId, receivedAt: new Date().toISOString() }),
                      "纸质表决票已登记",
                    )}>登记选票</Button>
                    <div className="mt-4 space-y-3">{workbench.paper.ballots.map((item) => <div key={item.ballot.paperBallotId} className="border-t pt-3 text-sm"><div className="flex items-center justify-between gap-3"><span>{item.ballot.ballotNumber} · 房屋权利编号 {item.ballot.opid}</span><StatusChip tone={item.ballot.status === "COMPLETED" ? "success" : "warning"}>{item.ballot.status === "RECEIVED" ? "待录入" : item.ballot.status === "IN_ENTRY" ? "待核对" : item.ballot.status === "COMPLETED" ? "已完成" : "已作废"}</StatusChip></div>{item.ballot.status === "RECEIVED" && subjectId && <div className="mt-2 flex gap-2">{(["AGREE", "DISAGREE", "ABSTAIN"] as const).map((choice) => <Button key={choice} size="sm" variant="outline" onClick={() => void run("entry-" + item.ballot.paperBallotId, () => submitRepairVotingPaperBallotEntry(project.projectId, item.ballot.paperBallotId, subjectId, choice), "纸票录入已提交，等待另一名工作人员核对")}>{choice === "AGREE" ? "录入同意" : choice === "DISAGREE" ? "录入不同意" : "录入弃权"}</Button>)}</div>}{item.latestEntry?.status === "PENDING_REVIEW" && <Button className="mt-2" size="sm" variant="outline" onClick={() => void run("review-entry-" + item.latestEntry!.entryId, () => reviewRepairVotingPaperBallotEntry(project.projectId, item.ballot.paperBallotId, item.latestEntry!.entryId, "CONFIRM"), "纸质表决票已核对并计入")}>核对录入</Button>}</div>)}</div>
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
            <div className="mt-4 flex items-start gap-3 border-y py-4 text-sm"><CheckCircle2 className={`mt-0.5 size-5 ${voting.result.passed ? "text-emerald-600" : "text-red-600"}`} /><div><div className="font-medium">{voting.result.passed ? "相关业主表决通过" : "相关业主表决未通过"}</div><div className="mt-1 text-muted-foreground">参与 {voting.result.participatedOwnerCount} 户，同意 {voting.result.agreeOwnerCount} 户。</div></div></div>
          )}
        </>
      )}
    </section>
  );
}
