import { useMemo, useState } from "react";
import { PageHeader, SectionCard, StatusChip, type Tone } from "../gov/common";
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
import { CheckCircle2, ClipboardList, FileSignature, Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import type { SubjectType, VoteChoice, VotingScope } from "../../lib/voting";
import {
  addOwnersAssemblySubject,
  castOwnersAssemblyPaperVote,
  createOwnersAssemblyPackage,
  createOwnersAssemblySession,
  lockOwnersAssemblyPackage,
  openOwnersAssemblyVoting,
  recordOwnersAssemblyDelivery,
  settleOwnersAssemblyPackage,
  type OwnersAssemblyPackage,
  type OwnersAssemblyPreparationMode,
  type OwnersAssemblySession,
  type OwnersAssemblyVotingChannelPolicy,
} from "../../lib/owners-assembly";

const PACKAGE_STATUS: Record<string, { label: string; tone: Tone }> = {
  PACKAGE_DRAFT: { label: "草稿", tone: "neutral" },
  PUBLIC_NOTICE: { label: "公示中", tone: "tech" },
  VOTING: { label: "投票中", tone: "primary" },
  SETTLED: { label: "已结算", tone: "success" },
};

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

function statusMeta(pkg: OwnersAssemblyPackage | null) {
  return pkg ? PACKAGE_STATUS[pkg.status] ?? { label: pkg.status, tone: "neutral" as Tone } : null;
}

export function OwnersAssembly() {
  const { hasPermission, setPage } = useStore();
  const canCreate = hasPermission("voting:subject:create");
  const canPublish = hasPermission("voting:subject:publish");
  const canAudit = hasPermission("voting:subject:audit");

  const [session, setSession] = useState<OwnersAssemblySession | null>(null);
  const [pkg, setPkg] = useState<OwnersAssemblyPackage | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [acting, setActing] = useState("");

  const [sessionTitle, setSessionTitle] = useState("");
  const [preparationMode, setPreparationMode] = useState<OwnersAssemblyPreparationMode>("WRITTEN_DECISION");

  const [packageSessionId, setPackageSessionId] = useState("");
  const [policy, setPolicy] = useState<OwnersAssemblyVotingChannelPolicy>("PAPER_ONLY");
  const [noticeDays, setNoticeDays] = useState("7");
  const [voteStartAt, setVoteStartAt] = useState(localDateTime(7));
  const [voteEndAt, setVoteEndAt] = useState(localDateTime(14));
  const [announcementHash, setAnnouncementHash] = useState("");
  const [attachmentHash, setAttachmentHash] = useState("");
  const [ballotHash, setBallotHash] = useState("");
  const [sealHash, setSealHash] = useState("");

  const [packageIdForSubject, setPackageIdForSubject] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType>("MAJOR");
  const [scope, setScope] = useState<VotingScope>("COMMUNITY");
  const [scopeReferenceId, setScopeReferenceId] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectContent, setSubjectContent] = useState("");
  const [partyRatioFloor, setPartyRatioFloor] = useState("");

  const [deliveryPackageId, setDeliveryPackageId] = useState("");
  const [deliveryOpid, setDeliveryOpid] = useState("");
  const [deliveryChannel, setDeliveryChannel] = useState("PAPER");
  const [deliveryMethod, setDeliveryMethod] = useState("DOOR_TO_DOOR");
  const [deliveryEvidenceHash, setDeliveryEvidenceHash] = useState("");
  const [paperSubjectId, setPaperSubjectId] = useState("");
  const [paperOpid, setPaperOpid] = useState("");
  const [paperChoice, setPaperChoice] = useState<VoteChoice>("SUPPORT");
  const [paperBallotHash, setPaperBallotHash] = useState("");

  const meta = useMemo(() => statusMeta(pkg), [pkg]);

  async function run<T>(key: string, work: () => Promise<T>, success: string) {
    setActing(key);
    try {
      const result = await work();
      toast.success(success);
      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
      return null;
    } finally {
      setActing("");
    }
  }

  async function onCreateSession() {
    const next = await run("session", () => createOwnersAssemblySession({
      title: sessionTitle,
      preparationMode,
    }), "业主大会已创建");
    if (next) {
      setSession(next);
      setPackageSessionId(String(next.sessionId));
    }
  }

  async function onCreatePackage() {
    const sessionId = Number(packageSessionId || session?.sessionId || 0);
    const next = await run("package", () => createOwnersAssemblyPackage(sessionId, {
      votingChannelPolicy: policy,
      publicNoticeDays: Number(noticeDays || 7),
      announcementHash,
      attachmentManifestHash: attachmentHash,
      ballotTemplateHash: ballotHash,
      electronicSealHash: sealHash || null,
      voteStartAt: toInstant(voteStartAt),
      voteEndAt: toInstant(voteEndAt),
    }), "表决包已创建");
    if (next) {
      setPkg(next);
      setPackageIdForSubject(String(next.packageId));
      setDeliveryPackageId(String(next.packageId));
    }
  }

  async function onAddSubject() {
    const packageId = Number(packageIdForSubject || pkg?.packageId || 0);
    const next = await run("subject", () => addOwnersAssemblySubject(packageId, {
      subjectType,
      scope,
      scopeReferenceId: scope === "COMMUNITY" ? null : Number(scopeReferenceId || 0),
      title: subjectTitle,
      content: subjectContent || null,
      partyRatioFloor: partyRatioFloor ? Number(partyRatioFloor) : null,
    }), "表决事项已加入表决包");
    if (next) {
      setSubjectId(String(next.subjectId));
      setPaperSubjectId(String(next.subjectId));
    }
  }

  async function onPackageAction(action: "lock" | "open" | "settle") {
    const packageId = Number(pkg?.packageId || packageIdForSubject || deliveryPackageId || 0);
    const work = action === "lock"
      ? () => lockOwnersAssemblyPackage(packageId)
      : action === "open"
        ? () => openOwnersAssemblyVoting(packageId)
        : () => settleOwnersAssemblyPackage(packageId);
    const label = action === "lock" ? "表决包已锁定并进入公示" : action === "open" ? "表决包已进入投票" : "表决包已结算";
    const next = await run(action, work, label);
    if (next) setPkg(next);
  }

  async function onRecordDelivery() {
    await run("delivery", () => recordOwnersAssemblyDelivery(Number(deliveryPackageId || pkg?.packageId || 0), {
      opid: Number(deliveryOpid || 0),
      deliveryChannel,
      deliveryMethod,
      evidenceHash: deliveryEvidenceHash,
    }), "送达留痕已记录");
  }

  async function onCastPaperVote() {
    await run("paper", () => castOwnersAssemblyPaperVote(Number(deliveryPackageId || pkg?.packageId || 0), {
      subjectId: Number(paperSubjectId || subjectId || 0),
      opid: Number(paperOpid || 0),
      choice: paperChoice,
      ballotFileHash: paperBallotHash,
    }), "纸质选票已录入");
  }

  if (!canCreate && !canAudit && !canPublish) {
    return (
      <div className="space-y-5">
        <PageHeader title="业主大会表决包" desc="当前角色没有业主大会表决管理权限" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="业主大会表决包"
        desc="用于小区整体事项的公告、纸质/线上选票、送达留痕、回收录票与结算；楼栋单元维修接龙不在这里处理。"
        actions={
          <Button variant="outline" size="sm" onClick={() => setPage("subject-proposal")}>
            返回议题筹备
          </Button>
        }
      />

      <SectionCard title="当前表决包">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="业主大会" value={session ? `${session.sessionId} · ${session.title}` : "-"} />
          <Info label="表决包" value={pkg ? `${pkg.packageId} · V${pkg.packageVersion}` : "-"} />
          <Info label="表决事项" value={subjectId || "-"} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">状态</span>
            {meta ? <StatusChip tone={meta.tone} dot>{meta.label}</StatusChip> : <span>-</span>}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {canCreate && (
          <>
            <SectionCard title="1. 创建业主大会">
              <div className="space-y-3">
                <div>
                  <Label>业主大会标题</Label>
                  <Input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="如：2026年公共区域改造业主大会" />
                </div>
                <div>
                  <Label>会议形式</Label>
                  <Select value={preparationMode} onValueChange={(v) => setPreparationMode(v as OwnersAssemblyPreparationMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WRITTEN_DECISION">书面征求意见</SelectItem>
                      <SelectItem value="OFFLINE_MEETING">线下会议</SelectItem>
                      <SelectItem value="ONLINE_AND_OFFLINE">线上线下结合</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={onCreateSession} disabled={acting === "session" || !sessionTitle}>
                  {acting === "session" ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ClipboardList className="size-4 mr-1" />}
                  创建业主大会
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="2. 创建表决包">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>业主大会 ID</Label>
                    <Input value={packageSessionId} onChange={(e) => setPackageSessionId(e.target.value)} placeholder="sessionId" />
                  </div>
                  <div>
                    <Label>投票渠道</Label>
                    <Select value={policy} onValueChange={(v) => setPolicy(v as OwnersAssemblyVotingChannelPolicy)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAPER_ONLY">仅纸质</SelectItem>
                        <SelectItem value="PAPER_AND_ONLINE">纸质 + 线上</SelectItem>
                        <SelectItem value="ONLINE_ONLY">仅线上</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} placeholder="公示天数" />
                  <Input type="datetime-local" value={voteStartAt} onChange={(e) => setVoteStartAt(e.target.value)} />
                  <Input type="datetime-local" value={voteEndAt} onChange={(e) => setVoteEndAt(e.target.value)} />
                </div>
                <Input value={announcementHash} onChange={(e) => setAnnouncementHash(e.target.value)} placeholder="公告文件哈希" />
                <Input value={attachmentHash} onChange={(e) => setAttachmentHash(e.target.value)} placeholder="方案附件清单哈希" />
                <Input value={ballotHash} onChange={(e) => setBallotHash(e.target.value)} placeholder="盖章选票模板哈希" />
                <Input value={sealHash} onChange={(e) => setSealHash(e.target.value)} placeholder="电子公章哈希（线上/混合渠道填写）" />
                <Button
                  onClick={onCreatePackage}
                  disabled={acting === "package" || !packageSessionId || !announcementHash || !attachmentHash || !ballotHash}
                >
                  {acting === "package" ? <Loader2 className="size-4 mr-1 animate-spin" /> : <FileSignature className="size-4 mr-1" />}
                  创建表决包
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="3. 加入表决事项">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Input value={packageIdForSubject} onChange={(e) => setPackageIdForSubject(e.target.value)} placeholder="packageId" />
                  <Select value={subjectType} onValueChange={(v) => setSubjectType(v as SubjectType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAJOR">重大决议</SelectItem>
                      <SelectItem value="GENERAL">一般决议</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={scope} onValueChange={(v) => setScope(v as VotingScope)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMUNITY">小区整体</SelectItem>
                      <SelectItem value="BUILDING">楼栋</SelectItem>
                      <SelectItem value="UNIT">单元</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scope !== "COMMUNITY" && (
                  <Input value={scopeReferenceId} onChange={(e) => setScopeReferenceId(e.target.value)} placeholder="范围 ID" />
                )}
                <Input value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)} placeholder="表决事项标题" />
                <Textarea value={subjectContent} onChange={(e) => setSubjectContent(e.target.value)} rows={5} placeholder="表决事项正文、方案摘要、附件索引" />
                <Input value={partyRatioFloor} onChange={(e) => setPartyRatioFloor(e.target.value)} placeholder="党员比例下限（选填）" />
                <Button onClick={onAddSubject} disabled={acting === "subject" || !packageIdForSubject || !subjectTitle}>
                  {acting === "subject" ? <Loader2 className="size-4 mr-1 animate-spin" /> : <CheckCircle2 className="size-4 mr-1" />}
                  加入表决包
                </Button>
              </div>
            </SectionCard>
          </>
        )}

        {(canPublish || canAudit) && (
          <SectionCard title="4. 公示、开票与结算">
            <div className="flex flex-wrap gap-2">
              {canPublish && (
                <>
                  <Button variant="outline" onClick={() => onPackageAction("lock")} disabled={acting === "lock"}>
                    <FileSignature className="size-4 mr-1" /> 锁定并公示
                  </Button>
                  <Button variant="outline" onClick={() => onPackageAction("open")} disabled={acting === "open"}>
                    <Play className="size-4 mr-1" /> 开启投票
                  </Button>
                </>
              )}
              {canAudit && (
                <Button variant="outline" onClick={() => onPackageAction("settle")} disabled={acting === "settle"}>
                  <RefreshCw className="size-4 mr-1" /> 结算表决包
                </Button>
              )}
            </div>
          </SectionCard>
        )}

        {canAudit && (
          <SectionCard title="5. 纸质送达与回收">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={deliveryPackageId} onChange={(e) => setDeliveryPackageId(e.target.value)} placeholder="packageId" />
                  <Input value={deliveryOpid} onChange={(e) => setDeliveryOpid(e.target.value)} placeholder="业主房产 opid" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={deliveryChannel} onValueChange={setDeliveryChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAPER">纸质送达</SelectItem>
                      <SelectItem value="ONLINE">线上送达</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} placeholder="送达方式" />
                </div>
                <Input value={deliveryEvidenceHash} onChange={(e) => setDeliveryEvidenceHash(e.target.value)} placeholder="送达证据哈希" />
                <Button variant="outline" onClick={onRecordDelivery} disabled={acting === "delivery" || !deliveryOpid || !deliveryEvidenceHash}>
                  <ClipboardList className="size-4 mr-1" /> 记录送达
                </Button>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <Input value={paperSubjectId} onChange={(e) => setPaperSubjectId(e.target.value)} placeholder="subjectId" />
                  <Input value={paperOpid} onChange={(e) => setPaperOpid(e.target.value)} placeholder="opid" />
                  <Select value={paperChoice} onValueChange={(v) => setPaperChoice(v as VoteChoice)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPORT">赞成</SelectItem>
                      <SelectItem value="AGAINST">反对</SelectItem>
                      <SelectItem value="ABSTAIN">弃权</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input value={paperBallotHash} onChange={(e) => setPaperBallotHash(e.target.value)} placeholder="回收纸质选票哈希" />
                <Button onClick={onCastPaperVote} disabled={acting === "paper" || !paperSubjectId || !paperOpid || !paperBallotHash}>
                  <CheckCircle2 className="size-4 mr-1" /> 录入纸质选票
                </Button>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
