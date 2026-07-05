import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionCard, StatusChip, EmptyState, type Tone } from "../gov/common";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { RichTextView } from "../common/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Loader2,
  Plus,
  UserPlus,
  Check,
  X,
  Search,
  Megaphone,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import { loadSession } from "../../lib/auth";
import {
  listVotingSubjects,
  publishSubject,
  submitSubjectForReview,
  committeeReviewSubject,
  streetReviewSubject,
  confirmHandover,
  cancelSubject,
  type AdminSubject,
  type SubjectStatus,
  type SubjectType,
  type VotingScope,
} from "../../lib/voting";
import {
  listCandidates,
  nominateCandidate,
  partyReviewCandidate,
  reviewCandidate,
  searchOwners,
  type Candidate,
  type CandidateStatus,
  type OwnerOption,
  type RejectEvidenceInput,
  type RejectReasonCode,
} from "../../lib/election";

/**
 * 议题筹备 —— 把原本分散在「投票管理」（立项 / 公示 / 撤回）和
 * 「选举投票看板」（候选人提名 / 党组审查 / 居委会资格审查）的"公示之前的全部工作"
 * 整合到一处，让筹备阶段的操作流程统一。
 *
 * 页面节奏：
 * 1. 顶栏「+ 立项议题」按钮触发立项 Dialog（同 Voting.tsx 原逻辑）
 * 2. 主从布局：左侧议题列表（仅 DRAFT/PUBLISHED，已开票/已截止/已结算/已撤回的议题不在此页）
 * 3. 右侧详情：议题基本信息 + 公示 / 撤回（DRAFT/PUBLISHED 状态机操作）
 *               + 候选人面板（仅 ELECTION 显示提名 + 党组审查 + 居委会审查）
 *
 * 后端约束（M4 新增）：ELECTION 议题在 publish 时必须至少有 1 名 APPROVED 候选人，
 * 否则后端返回 ELECTION_NO_APPROVED_CANDIDATE 错误，前端在「公示」按钮上以提示兜底。
 */

const TYPE_META: Record<SubjectType, { label: string; tone: Tone }> = {
  ELECTION: { label: "选举", tone: "tech" },
  MAJOR: { label: "重大决议", tone: "danger" },
  GENERAL: { label: "一般决议", tone: "primary" },
};

const STATUS_LABEL: Record<SubjectStatus, string> = {
  DRAFT: "草稿",
  PENDING_COMMITTEE: "待居委会初审",
  PENDING_STREET: "待街道办终审",
  PUBLISHED: "公示中",
  VOTING: "投票中",
  CLOSED: "已截止",
  SETTLED: "已结算",
  CANCELLED: "已撤回",
};
const STATUS_TONE: Record<SubjectStatus, Tone> = {
  DRAFT: "neutral",
  PENDING_COMMITTEE: "warning",
  PENDING_STREET: "warning",
  PUBLISHED: "tech",
  VOTING: "primary",
  CLOSED: "warning",
  SETTLED: "success",
  CANCELLED: "danger",
};

const CAND_STATUS: Record<CandidateStatus, { label: string; tone: Tone }> = {
  PENDING_PARTY_REVIEW: { label: "待党组审查", tone: "warning" },
  PENDING_COMMITTEE_REVIEW: { label: "待居委会审查", tone: "warning" },
  APPROVED: { label: "资格通过", tone: "success" },
  REJECTED: { label: "未通过", tone: "danger" },
  WITHDRAWN: { label: "已退选", tone: "neutral" },
};

function collectRejectEvidence(candidate: Candidate, stage: "party" | "committee"): RejectEvidenceInput | null {
  const rawCode = window.prompt("请输入驳回理由码：C1 / C2 / C3 / C4 / C5", "C1")?.trim().toUpperCase();
  if (!rawCode || !["C1", "C2", "C3", "C4", "C5"].includes(rawCode)) {
    toast.error("驳回必须选择 C1-C5 理由码");
    return null;
  }
  const note = window.prompt("请输入证据链说明", "")?.trim();
  if (!note) {
    toast.error("驳回必须填写证据链说明");
    return null;
  }
  return {
    rejectReasonCode: rawCode as RejectReasonCode,
    rejectEvidence: {
      note,
      source: "yaochi",
      stage: stage === "party" ? "PARTY_REVIEW" : "COMMITTEE_REVIEW",
      candidateId: candidate.candidateId,
      candidateName: candidate.name,
      recordedAt: new Date().toISOString(),
    },
  };
}

function isPreparationStatus(subject: AdminSubject): boolean {
  if (["DRAFT", "PENDING_COMMITTEE", "PENDING_STREET", "PUBLISHED"].includes(subject.status)) {
    return true;
  }
  return subject.subjectType === "ELECTION" && subject.status === "SETTLED";
}

function fmtDeadline(iso: string | null): string {
  if (!iso) return "未设置";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function SubjectProposal() {
  const { hasPermission, roleKey, setPage } = useStore();
  const sessionUser = loadSession()?.user;
  const currentUserId = sessionUser?.active_identity_id ?? null;
  const currentDeptType = sessionUser?.dept_type ?? null;

  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);

  // 写动作（立项 / 公示 / 撤回 / 提名 / 审查）共享 acting 开关。
  const [acting, setActing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [subjectReview, setSubjectReview] = useState<
    { stage: "committee" | "street"; decision: "APPROVE" | "REJECT" } | null
  >(null);
  const [subjectReviewReason, setSubjectReviewReason] = useState("");

  // 候选人列表与刷新计数。
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoading] = useState(false);
  const [candRefresh, setCandRefresh] = useState(0);

  // 提名表单：关键词定位业主 → 自动带入隐藏 uid（selectedOwner）；姓名手填覆盖。
  const [nominateOpen, setNominateOpen] = useState(false);
  const [nomKeyword, setNomKeyword] = useState("");
  const [ownerHits, setOwnerHits] = useState<OwnerOption[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerOption | null>(null);
  const [nomName, setNomName] = useState("");
  const [nomParty, setNomParty] = useState("false");

  // 审查确认弹窗。
  const [review, setReview] = useState<
    { candidate: Candidate; approve: boolean; stage: "party" | "committee" } | null
  >(null);

  const canCreate = hasPermission("voting:subject:create");
  const canCreateElection = hasPermission("voting:subject:create:election");
  const canPublish = hasPermission("voting:subject:publish");
  const canGovCancel = hasPermission("voting:subject:cancel");
  const canNominate = hasPermission("candidate:nominate");
  const canSubjectCommitteeReview = hasPermission("voting:subject:review:committee");
  const canSubjectStreetReview = hasPermission("voting:subject:review:street");
  const canPartyReview = hasPermission("candidate:review:party");
  const canCommitteeReview = hasPermission("candidate:approve");
  // 选举议题立项白名单（与后端 SubjectAdminController + ProposalLifecycleService 护栏对齐）。
  // 业委会 / 党组书记可以立一般决议，但不能立选举议题——前端立项 Dialog 隐藏 ELECTION 选项。
  const canProposeElection = canCreateElection
      && roleKey === "GOV_OPERATOR"
      && (currentDeptType === 2 || currentDeptType === 5);
  // 与后端 ElectionCandidateService.nominate 护栏对齐：旧 candidate:nominate 权限点不足以提名。
  const canNominateElection = canNominate && canProposeElection;

  // 加载议题列表：拉全部 50 条，再前端过滤出筹备态；SETTLED 选举保留作换届备案入口。
  // 后端没有 status 多值过滤，分次请求 / 大列表筛选取舍：前端过滤更简单稳。
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listVotingSubjects({ page: 1, size: 50 })
      .then((res) => {
        if (!alive) return;
        const items = res.items.filter(isPreparationStatus);
        setSubjects(items);
        setSel(0);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "议题列表加载失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 写成功后刷新议题列表，并尽量保留当前选中项。
  async function reload(preserveSubjectId?: number) {
    try {
      const res = await listVotingSubjects({ page: 1, size: 50 });
      const items = res.items.filter(isPreparationStatus);
      setSubjects(items);
      const idx =
        preserveSubjectId != null ? items.findIndex((x) => x.subjectId === preserveSubjectId) : -1;
      setSel(idx >= 0 ? idx : 0);
      setCandRefresh((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "议题列表刷新失败");
    }
  }

  const t = subjects[sel];
  const subjectId = t?.subjectId;
  const isElection = t?.subjectType === "ELECTION";

  // 选中议题变化 → 拉候选人（仅 ELECTION 才需要）。
  useEffect(() => {
    if (subjectId == null || !isElection) {
      setCandidates([]);
      return;
    }
    let alive = true;
    setCandLoading(true);
    listCandidates(subjectId)
      .then((list) => {
        if (alive) setCandidates(list);
      })
      .catch((err) => {
        if (!alive) return;
        setCandidates([]);
        toast.error(err instanceof Error ? err.message : "候选人名册加载失败");
      })
      .finally(() => {
        if (alive) setCandLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [subjectId, isElection, candRefresh]);

  // 提名搜索：300ms 防抖。后端按 keyword 分流：
  //   - 全数字 → ≥3 位才生效（手机号）
  //   - 含中文/字母 → ≥1 位即可（姓名/拼音/首字母）
  // 已选中业主后不再重复检索。
  useEffect(() => {
    if (!nominateOpen) return;
    const kw = nomKeyword.trim();
    if (selectedOwner != null) return;
    if (kw.length === 0) {
      setOwnerHits([]);
      setOwnerSearching(false);
      return;
    }
    const allDigits = /^\d+$/.test(kw);
    if (allDigits && kw.length < 3) {
      setOwnerHits([]);
      setOwnerSearching(false);
      return;
    }
    let alive = true;
    setOwnerSearching(true);
    const timer = setTimeout(() => {
      searchOwners(kw)
        .then((hits) => {
          if (alive) setOwnerHits(hits);
        })
        .catch((err) => {
          if (!alive) return;
          setOwnerHits([]);
          toast.error(err instanceof Error ? err.message : "业主检索失败");
        })
        .finally(() => {
          if (alive) setOwnerSearching(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [nomKeyword, selectedOwner, nominateOpen]);

  const approvedCount = useMemo(
    () => candidates.filter((c) => c.qualificationStatus === "APPROVED").length,
    [candidates],
  );

  // 写动作门控：GENERAL/MAJOR 仍可直接公示；ELECTION 必须走双签。
  const isProposer = t != null && currentUserId != null && t.proposedByUserId === currentUserId;
  const showPublish = t?.status === "DRAFT" && t.subjectType !== "ELECTION" && canPublish;
  const showSubmitReview = isElection && t?.status === "DRAFT" && canProposeElection && (isProposer || roleKey === "GOV_OPERATOR");
  const showCommitteeReview = isElection && t?.status === "PENDING_COMMITTEE" && canSubjectCommitteeReview;
  const showStreetReview = isElection && t?.status === "PENDING_STREET" && canSubjectStreetReview;
  const showConfirmHandover = isElection && t?.status === "SETTLED" && canSubjectStreetReview;
  const showCancel =
    t != null &&
    ((t.status === "DRAFT" && (canGovCancel || (canCreate && isProposer))) ||
      (t.status === "PUBLISHED" && canGovCancel));
  // 提名仅 ELECTION + DRAFT/PUBLISHED 阶段可见。
  const canNominateNow = isElection && canNominateElection;

  async function handleSubmitForReview() {
    if (!t) return;
    setActing(true);
    try {
      await submitSubjectForReview(t.subjectId);
      toast.success("议题已提交居委会初审");
      await reload(t.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交初审失败");
    } finally {
      setActing(false);
    }
  }

  async function handleSubjectReview(stage: "committee" | "street", decision: "APPROVE" | "REJECT", reason?: string) {
    if (!t) return;
    setActing(true);
    try {
      if (stage === "committee") {
        await committeeReviewSubject(t.subjectId, decision, reason);
        toast.success(decision === "APPROVE" ? "居委会初审已通过" : "居委会已驳回议题");
      } else {
        await streetReviewSubject(t.subjectId, decision, reason);
        toast.success(decision === "APPROVE" ? "街道办终审已通过并公示" : "街道办已驳回议题");
      }
      setSubjectReview(null);
      setSubjectReviewReason("");
      await reload(t.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "审批处理失败");
    } finally {
      setActing(false);
    }
  }

  async function handlePublish() {
    if (!t) return;
    // ELECTION 议题在公示前必须至少有 1 名 APPROVED 候选人（后端校验，前端给提示）。
    if (t.subjectType === "ELECTION" && approvedCount === 0) {
      toast.error("选举议题至少需要 1 名通过资格审查的候选人才能公示");
      return;
    }
    setActing(true);
    try {
      await publishSubject(t.subjectId);
      toast.success("议题已公示");
      await reload(t.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "公示失败");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!t) return;
    const reason = cancelReason.trim();
    if (!reason) return;
    setActing(true);
    try {
      await cancelSubject(t.subjectId, reason);
      toast.success("议题已撤回");
      setCancelOpen(false);
      setCancelReason("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤回失败");
    } finally {
      setActing(false);
    }
  }

  async function handleConfirmHandover() {
    setActing(true);
    try {
      await confirmHandover();
      toast.success("换届备案已通过，租户任期状态已恢复");
      await reload(t?.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "换届备案确认失败");
    } finally {
      setActing(false);
    }
  }

  function resetNominateForm() {
    setNomKeyword("");
    setOwnerHits([]);
    setOwnerSearching(false);
    setSelectedOwner(null);
    setNomName("");
    setNomParty("false");
  }

  async function handleNominate() {
    const name = nomName.trim();
    if (selectedOwner == null || !name || subjectId == null) return;
    setActing(true);
    try {
      await nominateCandidate(subjectId, {
        uid: selectedOwner.uid,
        name,
        partyMember: nomParty === "true",
      });
      toast.success("候选人已提名，待资格审查");
      setNominateOpen(false);
      resetNominateForm();
      setCandRefresh((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提名失败");
    } finally {
      setActing(false);
    }
  }

  async function handleReview() {
    if (!review) return;
    const { candidate, approve, stage } = review;
    const rejectEvidence = approve ? undefined : collectRejectEvidence(candidate, stage);
    if (!approve && !rejectEvidence) return;
    setActing(true);
    try {
      if (stage === "party") {
        await partyReviewCandidate(candidate.candidateId, approve, rejectEvidence);
        toast.success(approve ? "党组审查已通过，转居委会资格审查" : "党组审查已驳回");
      } else {
        await reviewCandidate(candidate.candidateId, approve, rejectEvidence);
        toast.success(approve ? "候选人资格已通过" : "候选人资格已驳回");
      }
      setReview(null);
      setCandRefresh((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "审查失败");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-5 mr-2 animate-spin" /> 议题筹备列表加载中…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="议题筹备"
        desc="集中处理「立项 → 候选人提名 / 资格审查 → 公示」之前的全部筹备工作。公示后，一般/重大议题进入「议题投票看板」，选举议题进入「选举投票看板」。"
        actions={
          (canCreate || canProposeElection) ? (
            <Button size="sm" onClick={() => setPage("subject-proposal-editor")}>
              <Plus className="size-4" /> 立项议题
            </Button>
          ) : undefined
        }
      />

      {subjects.length === 0 ? (
        <SectionCard>
          <EmptyState
            title="暂无筹备中的议题"
            desc={
              canCreate
                ? "可点击右上角「立项议题」创建草稿；已公示/已开票的一般/重大议题请前往「议题投票看板」，选举议题请前往「选举投票看板」。"
                : "已公示/已开票的一般/重大议题请前往「议题投票看板」，选举议题请前往「选举投票看板」。"
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 左：议题列表 */}
          <SectionCard
            title="筹备中议题"
            desc={`${subjects.length} 项 · 草稿 / 初审 / 终审 / 公示中`}
            className="lg:col-span-1"
          >
            <div className="flex flex-col gap-2">
              {subjects.map((s, i) => {
                const meta = TYPE_META[s.subjectType];
                const on = i === sel;
                return (
                  <button
                    key={s.subjectId}
                    type="button"
                    onClick={() => setSel(i)}
                    className="text-left rounded-lg border p-3 transition-colors"
                    style={{
                      borderColor: on ? "var(--primary, #1B4F9C)" : "var(--border)",
                      background: on ? "rgba(27,79,156,0.05)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
                      <StatusChip tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</StatusChip>
                    </div>
                    <div className="text-sm" style={{ fontWeight: 600 }}>
                      {s.title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      截止 {fmtDeadline(s.voteEndAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* 右：详情面板 */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* 议题信息 + 状态机操作 */}
            <SectionCard
              title="议题信息"
              extra={
                <div className="flex items-center gap-2">
                  {showSubmitReview && (
                    <Button size="sm" onClick={handleSubmitForReview} disabled={acting}>
                      <Megaphone className="size-4" /> 提交初审
                    </Button>
                  )}
                  {showCommitteeReview && (
                    <>
                      <Button size="sm" onClick={() => handleSubjectReview("committee", "APPROVE")} disabled={acting}>
                        <Check className="size-4" /> 初审通过
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSubjectReview({ stage: "committee", decision: "REJECT" })} disabled={acting}>
                        <X className="size-4" /> 驳回
                      </Button>
                    </>
                  )}
                  {showStreetReview && (
                    <>
                      <Button size="sm" onClick={() => handleSubjectReview("street", "APPROVE")} disabled={acting}>
                        <Megaphone className="size-4" /> 终审通过并公示
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSubjectReview({ stage: "street", decision: "REJECT" })} disabled={acting}>
                        <X className="size-4" /> 驳回
                      </Button>
                    </>
                  )}
                  {showPublish && (
                    <Button size="sm" onClick={handlePublish} disabled={acting}>
                      <Megaphone className="size-4" /> 公示
                    </Button>
                  )}
                  {showConfirmHandover && (
                    <Button size="sm" onClick={handleConfirmHandover} disabled={acting}>
                      <Check className="size-4" /> 备案通过
                    </Button>
                  )}
                  {showCancel && (
                    <AlertDialog
                      open={cancelOpen}
                      onOpenChange={(v) => {
                        setCancelOpen(v);
                        if (!v) setCancelReason("");
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={acting}>
                          <Undo2 className="size-4" /> 撤回
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>撤回议题「{t.title}」？</AlertDialogTitle>
                          <AlertDialogDescription>
                            撤回为终态、不可恢复。请填写撤回理由（必填）。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea
                          placeholder="撤回理由…"
                          value={cancelReason}
                          maxLength={500}
                          onChange={(e) => setCancelReason(e.target.value)}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={acting}>取消</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={!cancelReason.trim() || acting}
                            onClick={(e) => {
                              e.preventDefault();
                              handleCancel();
                            }}
                          >
                            {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认撤回
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={TYPE_META[t.subjectType].tone}>
                    {TYPE_META[t.subjectType].label}
                  </StatusChip>
                  <StatusChip tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusChip>
                  {t.scope === "COMMUNITY" ? (
                    <StatusChip tone="tech">全小区</StatusChip>
                  ) : (
                    <StatusChip tone="warning">单栋 #{t.scopeReferenceId ?? "—"}</StatusChip>
                  )}
                </div>
                <h2 style={{ fontWeight: 600 }}>{t.title}</h2>
                {t.content && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <RichTextView html={t.content} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>开始：{fmtDeadline(t.voteStartAt)}</div>
                  <div>截止：{fmtDeadline(t.voteEndAt)}</div>
                  {isElection && (
                    <div>
                      应选名额：{t.maxWinners ?? "—"} · 已通过候选人 {approvedCount}
                    </div>
                  )}
                </div>
                {isElection && t.status === "DRAFT" && approvedCount === 0 && (
                  <div
                    className="rounded-md border px-3 py-2 text-xs"
                    style={{
                      background: "#fff7ed",
                      borderColor: "#fed7aa",
                      color: "#9a3412",
                    }}
                  >
                    选举议题至少需要 1 名通过资格审查的候选人才能公示，请先在下方提名并完成两级审查。
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 候选人面板（仅 ELECTION） */}
            {isElection ? (
              <SectionCard
                title="候选人名册 / 资格审查"
                desc="提名后进入「待党组审查」；在筹备阶段完成党组 → 居委会两级审查，通过后进入选举公示流程"
                extra={
                  canNominateNow ? (
                    <Button size="sm" onClick={() => setNominateOpen(true)}>
                      <UserPlus className="size-4" /> 提名候选人
                    </Button>
                  ) : undefined
                }
              >
                {candLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="size-5 mr-2 animate-spin" /> 候选人名册加载中…
                  </div>
                ) : candidates.length === 0 ? (
                  <EmptyState title="暂无候选人" desc="该选举议题尚无提名候选人。" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    {candidates.map((c) => {
                      const meta = CAND_STATUS[c.qualificationStatus];
                      const showParty =
                        canPartyReview && c.qualificationStatus === "PENDING_PARTY_REVIEW";
                      const showCommittee =
                        canCommitteeReview && c.qualificationStatus === "PENDING_COMMITTEE_REVIEW";
                      const stage: "party" | "committee" = showParty ? "party" : "committee";
                      return (
                        <div key={c.candidateId} className="rounded-lg border border-border p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-11">
                              <AvatarFallback className="gov-primary-gradient text-white">
                                {c.name.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span style={{ fontWeight: 600 }}>{c.name}</span>
                                {c.partyMember && <StatusChip tone="danger">党员</StatusChip>}
                              </div>
                              <div className="text-xs text-muted-foreground">业主 #{c.uid}</div>
                            </div>
                            <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
                          </div>
                          {(showParty || showCommittee) && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                disabled={acting}
                                onClick={() =>
                                  setReview({ candidate: c, approve: true, stage })
                                }
                              >
                                <Check className="size-4" /> {showParty ? "党组通过" : "资格通过"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                disabled={acting}
                                onClick={() =>
                                  setReview({ candidate: c, approve: false, stage })
                                }
                              >
                                <X className="size-4" /> 驳回
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            ) : (
              <SectionCard title="无候选人流程">
                <p className="text-sm text-muted-foreground">
                  一般决议 / 重大决议无需候选人，可直接公示进入投票。
                </p>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={subjectReview != null}
        onOpenChange={(open) => {
          if (!open) {
            setSubjectReview(null);
            setSubjectReviewReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subjectReview?.stage === "committee" ? "居委会驳回" : "街道办驳回"}</DialogTitle>
            <DialogDescription>驳回会把选举议题退回草稿，请填写明确理由。</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="请输入驳回理由…"
            value={subjectReviewReason}
            maxLength={500}
            onChange={(e) => setSubjectReviewReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectReview(null)} disabled={acting}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={acting || !subjectReviewReason.trim() || subjectReview == null}
              onClick={() => {
                if (subjectReview) {
                  handleSubjectReview(subjectReview.stage, "REJECT", subjectReviewReason);
                }
              }}
            >
              {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提名候选人对话框 */}
      <Dialog
        open={nominateOpen}
        onOpenChange={(o) => {
          setNominateOpen(o);
          if (!o) resetNominateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提名候选人</DialogTitle>
            <DialogDescription>
              输入业主姓名或手机号（前缀 / 中段 / 尾号均可）定位业主，自动关联 uid，再填写候选人显示姓名。提名后进入「待党组审查」。仅选举议题、且处于草稿 / 公示阶段可提名。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nom-keyword">搜索业主</Label>
              {selectedOwner ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm">
                      {selectedOwner.name ? (
                        <>
                          <span style={{ fontWeight: 600 }}>{selectedOwner.name}</span>
                          <span className="font-mono-num text-muted-foreground"> · {selectedOwner.phoneMasked}</span>
                        </>
                      ) : (
                        <span className="font-mono-num">{selectedOwner.phoneMasked}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      业主 #{selectedOwner.uid}
                      {selectedOwner.buildingId != null && ` · 楼栋 ${selectedOwner.buildingId}`}
                      {selectedOwner.roomId != null && ` · 房号 ${selectedOwner.roomId}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedOwner(null);
                      setOwnerHits([]);
                    }}
                  >
                    重选
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="nom-keyword"
                      className="pl-8"
                      placeholder="姓名 或 手机号（≥3 位）"
                      value={nomKeyword}
                      onChange={(e) => setNomKeyword(e.target.value)}
                    />
                  </div>
                  {(() => {
                    const kw = nomKeyword.trim();
                    const allDigits = /^\d+$/.test(kw);
                    const showHits = kw.length > 0 && (!allDigits || kw.length >= 3);
                    if (!showHits) return null;
                    return (
                      <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-auto">
                        {ownerSearching ? (
                          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                            <Loader2 className="size-4 mr-1.5 animate-spin" /> 检索中…
                          </div>
                        ) : ownerHits.length === 0 ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            未找到匹配业主
                          </div>
                        ) : (
                          ownerHits.map((o) => (
                            <button
                              key={o.uid}
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                              onClick={() => {
                                setSelectedOwner(o);
                                setOwnerHits([]);
                                // 候选人姓名默认填业主真名，管理员可改写为别名/化名。
                                if (o.name && !nomName.trim()) setNomName(o.name);
                              }}
                            >
                              <span className="text-sm">
                                {o.name ? (
                                  <>
                                    <span style={{ fontWeight: 600 }}>{o.name}</span>
                                    <span className="font-mono-num text-muted-foreground"> · {o.phoneMasked}</span>
                                  </>
                                ) : (
                                  <span className="font-mono-num">{o.phoneMasked}</span>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                业主 #{o.uid}
                                {o.buildingId != null && ` · 楼栋 ${o.buildingId}`}
                                {o.roomId != null && ` · 房号 ${o.roomId}`}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom-name">候选人姓名</Label>
              <Input
                id="nom-name"
                maxLength={64}
                placeholder="姓名"
                value={nomName}
                onChange={(e) => setNomName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>是否党员</Label>
              <Select value={nomParty} onValueChange={setNomParty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">非党员</SelectItem>
                  <SelectItem value="true">党员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNominateOpen(false);
                resetNominateForm();
              }}
              disabled={acting}
            >
              取消
            </Button>
            <Button
              onClick={handleNominate}
              disabled={acting || selectedOwner == null || !nomName.trim()}
            >
              {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认提名
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 资格审查确认弹窗 */}
      <AlertDialog open={review != null} onOpenChange={(o) => !o && setReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {review?.stage === "party" ? "党组前置审查" : "居委会资格审查"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {review
                ? review.approve
                  ? review.stage === "party"
                    ? `确认通过候选人「${review.candidate.name}」的党组前置审查？通过后转入居委会资格审查。`
                    : `确认通过候选人「${review.candidate.name}」的资格审查？通过后纳入候选人池。`
                  : `确认驳回候选人「${review.candidate.name}」？驳回为终态（REJECTED），不可恢复。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReview} disabled={acting}>
              {acting && <Loader2 className="size-4 mr-1 animate-spin" />}
              {review?.approve ? "确认通过" : "确认驳回"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
