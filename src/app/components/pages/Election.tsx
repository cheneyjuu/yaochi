import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionCard, StatusChip, Stepper, ProgressRing, EmptyState, type Tone } from "../gov/common";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, UserPlus, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import {
  listVotingSubjects,
  getSubjectProgress,
  type AdminSubject,
  type SubjectProgress,
  type SubjectStatus,
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
} from "../../lib/election";

const STEPS = [
  { key: "apply", label: "申报" },
  { key: "qualify", label: "资格审查" },
  { key: "setup", label: "立项" },
  { key: "vote", label: "投票" },
  { key: "count", label: "计票" },
  { key: "publish", label: "公示" },
];

// 换届步进条当前索引（current = 已完成步数，首个未完成步为 active；CANCELLED 无对应步骤）。
// 申报 / 资格审查是「候选人子流程」，按 candidate 状态推进；立项 / 投票 / 计票 / 公示按议题状态推进。
// 这样新建立项（DRAFT、尚无候选人）时不会把申报/资格审查误判为已完成。
function deriveStep(status: SubjectStatus, candidates: Candidate[]): number {
  if (status === "CANCELLED") return -1;
  const hasCandidates = candidates.length > 0;
  const anyPending = candidates.some(
    (c) =>
      c.qualificationStatus === "PENDING_PARTY_REVIEW" ||
      c.qualificationStatus === "PENDING_COMMITTEE_REVIEW",
  );
  const reviewed = hasCandidates && !anyPending; // 全部候选人审查均有结论
  const published =
    status === "PUBLISHED" || status === "VOTING" || status === "CLOSED" || status === "SETTLED";
  const voteFinished = status === "CLOSED" || status === "SETTLED";
  const settled = status === "SETTLED";

  let step = 0; // 0=申报（active）
  if (hasCandidates) step = 1; // 申报完成 → 资格审查
  if (step === 1 && reviewed) step = 2; // 资格审查完成 → 立项
  if (step === 2 && published) step = 3; // 立项（公示）完成 → 投票
  if (step === 3 && voteFinished) step = 4; // 投票完成 → 计票
  if (step === 4 && settled) step = 5; // 计票完成 → 公示
  return step;
}

// 候选人资格状态 → 展示标签 / 色调。
const CAND_STATUS: Record<CandidateStatus, { label: string; tone: Tone }> = {
  PENDING_PARTY_REVIEW: { label: "待党组审查", tone: "warning" },
  PENDING_COMMITTEE_REVIEW: { label: "待居委会审查", tone: "warning" },
  APPROVED: { label: "资格通过", tone: "success" },
  REJECTED: { label: "未通过", tone: "danger" },
  WITHDRAWN: { label: "已退选", tone: "neutral" },
};

export function Election() {
  const { hasPermission } = useStore();

  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(true);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candLoading, setCandLoading] = useState(false);
  // bump → 触发候选人名册重拉（写动作成功后刷新）。
  const [candRefresh, setCandRefresh] = useState(0);

  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [progLoading, setProgLoading] = useState(false);

  // 写动作（提名 / 党组审查 / 居委会资格审查）状态。
  const [acting, setActing] = useState(false);
  const [nominateOpen, setNominateOpen] = useState(false);
  // 提名表单：手机号定位业主 → 自动带入隐藏 uid（selectedOwner）；姓名手填。
  const [nomPhone, setNomPhone] = useState("");
  const [ownerHits, setOwnerHits] = useState<OwnerOption[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerOption | null>(null);
  const [nomName, setNomName] = useState("");
  const [nomParty, setNomParty] = useState("false");
  // 审查确认弹窗：null=关闭；否则承载目标候选人 + 通过/驳回 + 审查阶段。
  const [review, setReview] = useState<
    { candidate: Candidate; approve: boolean; stage: "party" | "committee" } | null
  >(null);

  const canNominate = hasPermission("candidate:nominate");
  const canPartyReview = hasPermission("candidate:review:party");
  const canCommitteeReview = hasPermission("candidate:approve");

  // 加载 ELECTION 类型议题列表（换届选举议题）。
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listVotingSubjects({ page: 1, size: 50, type: "ELECTION" })
      .then((res) => {
        if (!alive) return;
        // 过滤已撤回议题（CANCELLED 为终态，不应出现在换届选举切换列表）。
        setSubjects(res.items.filter((x) => x.status !== "CANCELLED"));
        setSel(0);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "换届选举议题加载失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const t = subjects[sel];
  const subjectId = t?.subjectId;

  // 选中议题变化 → 拉取候选人名册。
  useEffect(() => {
    if (subjectId == null) {
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
  }, [subjectId, candRefresh]);
  useEffect(() => {
    if (subjectId == null) {
      setProgress(null);
      return;
    }
    let alive = true;
    setProgLoading(true);
    getSubjectProgress(subjectId)
      .then((p) => {
        if (alive) setProgress(p);
      })
      .catch((err) => {
        if (!alive) return;
        setProgress(null);
        toast.error(err instanceof Error ? err.message : "选举进度加载失败");
      })
      .finally(() => {
        if (alive) setProgLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [subjectId]);

  // 提名框手机号搜索：300ms 防抖，≥3 位才查（与后端守卫一致）。已选中业主后不再重复检索。
  useEffect(() => {
    if (!nominateOpen) return;
    const phone = nomPhone.trim();
    if (selectedOwner != null) return;
    if (phone.length < 3) {
      setOwnerHits([]);
      setOwnerSearching(false);
      return;
    }
    let alive = true;
    setOwnerSearching(true);
    const timer = setTimeout(() => {
      searchOwners(phone)
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
  }, [nomPhone, selectedOwner, nominateOpen]);

  // 双过半进度：参与率 vs 法定门槛（thresholdNumerator/thresholdDenominator = 2/3）。
  const threshold = progress
    ? (progress.thresholdNumerator / progress.thresholdDenominator) * 100
    : 66.7;
  const areaRate = progress ? progress.participatingAreaRatio * 100 : 0;
  const headRate = progress ? progress.participatingOwnerRatio * 100 : 0;
  const passedArea = areaRate >= threshold;
  const passedHead = headRate >= threshold;
  const quorum = progress ? progress.quorumSatisfied : false;
  const settled = progress ? progress.settled : false;

  // 资格通过候选人数（仅 APPROVED 计入候选人池与选举结算）。
  const approvedCount = useMemo(
    () => candidates.filter((c) => c.qualificationStatus === "APPROVED").length,
    [candidates],
  );

  // 提名候选人：仅 ELECTION 且议题 DRAFT/PUBLISHED 时可提名（与后端状态机一致）。
  const canNominateNow =
    canNominate && (t?.status === "DRAFT" || t?.status === "PUBLISHED");

  // 关闭/成功后重置提名表单全部字段。
  function resetNominateForm() {
    setNomPhone("");
    setOwnerHits([]);
    setOwnerSearching(false);
    setSelectedOwner(null);
    setNomName("");
    setNomParty("false");
  }

  async function handleNominate() {
    const name = nomName.trim();
    if (selectedOwner == null || !name) return;
    if (subjectId == null) return;
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
    setActing(true);
    try {
      if (stage === "party") {
        await partyReviewCandidate(candidate.candidateId, approve);
        toast.success(approve ? "党组审查已通过，转居委会资格审查" : "党组审查已驳回");
      } else {
        await reviewCandidate(candidate.candidateId, approve);
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
        <Loader2 className="size-5 mr-2 animate-spin" /> 换届选举议题加载中…
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="选举投票看板（换届）"
          desc="组织业委会换届选举：候选人申报、资格审查、选举立项、选举投票、当选公示。注：本模块对物业角色整组隐藏。"
        />
        <SectionCard>
          <EmptyState
            title="暂无换届选举议题"
            desc="可在「议题表决」以类型=选举立项后，于此查看候选人名册与选举进度。"
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="选举投票看板（换届）"
        desc="组织业委会换届选举：候选人申报、资格审查、选举立项、选举投票、当选公示。注：本模块对物业角色整组隐藏。"
        actions={
          subjects.length > 1 ? (
            <Select value={String(sel)} onValueChange={(v) => setSel(Number(v))}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((x, i) => (
                  <SelectItem key={x.subjectId} value={String(i)}>
                    {x.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <SectionCard title="换届进度总览" desc={`${t.title} · 进度由议题状态与候选人审查情况派生`}>
        <Stepper steps={STEPS} current={deriveStep(t.status, candidates)} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard
          title="选举投票看板"
          desc="复用双过半进度逻辑（参与专有面积 ≥2/3 且 人数 ≥2/3）"
          className="lg:col-span-2"
        >
          {settled && (
            <div className="mb-3 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
              数据来源：法定结算快照（已结算）。
            </div>
          )}
          {progLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 mr-2 animate-spin" /> 选举进度加载中…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center">
                  <ProgressRing value={areaRate} threshold={threshold} label="参与专有面积率" passed={passedArea} />
                </div>
                <div className="flex flex-col items-center">
                  <ProgressRing value={headRate} threshold={threshold} label="参与人数率" passed={passedHead} />
                </div>
              </div>
              <div
                className="mt-4 rounded-lg px-4 py-3 text-center text-sm"
                style={{
                  backgroundColor: quorum ? "#e8f6ee" : "#eef2f8",
                  color: quorum ? "#1f7a45" : "#5a6677",
                  fontWeight: 600,
                }}
              >
                {quorum
                  ? "✓ 参与率达标 —— 可进入计票公示"
                  : "○ 参与率未达标 —— 需面积与人数同时 ≥ 2/3"}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="当选公示" desc="计票结果与当选名单（结算后公示）">
          {settled ? (
            <div className="space-y-3">
              <div
                className="rounded-lg px-4 py-3 text-center text-sm"
                style={{
                  backgroundColor: progress?.passed ? "#e8f6ee" : "#fdecec",
                  color: progress?.passed ? "#1f7a45" : "#b42318",
                  fontWeight: 600,
                }}
              >
                {progress?.passed ? "✓ 选举有效 · 已结算" : "○ 未通过法定门槛"}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">资格通过候选人</span>
                <span className="font-mono-num" style={{ color: "#19a0c4" }}>{approvedCount} 人</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                注：候选人逐项得票与当选名单排序由结算引擎内部计算，暂未经 HTTP 接口暴露（数据缺口），故此处不展示得票排名。
              </p>
            </div>
          ) : (
            <EmptyState title="计票未完成" desc="选举进行中，得票与当选名单将在结算后公示。" />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="候选人名册 / 资格审查"
        desc="提名 → 党组前置审查 → 居委会资格审查（按权限显示操作）"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((c) => {
              const meta = CAND_STATUS[c.qualificationStatus];
              // 审查按钮门控：党组审查针对 PENDING_PARTY_REVIEW；居委会资格审查针对 PENDING_COMMITTEE_REVIEW。
              const showParty =
                canPartyReview && c.qualificationStatus === "PENDING_PARTY_REVIEW";
              const showCommittee =
                canCommitteeReview && c.qualificationStatus === "PENDING_COMMITTEE_REVIEW";
              const stage: "party" | "committee" = showParty ? "party" : "committee";
              return (
                <div key={c.candidateId} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11">
                      <AvatarFallback className="gov-primary-gradient text-white">{c.name.slice(0, 1)}</AvatarFallback>
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
                        onClick={() => setReview({ candidate: c, approve: true, stage })}
                      >
                        <Check className="size-4" /> {showParty ? "党组通过" : "资格通过"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={acting}
                        onClick={() => setReview({ candidate: c, approve: false, stage })}
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
              输入业主手机号定位业主（自动关联 uid），再填写候选人姓名。提名后进入「待党组审查」。仅选举议题、且处于草稿 / 公示阶段可提名。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nom-phone">业主手机号</Label>
              {selectedOwner ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-mono-num">{selectedOwner.phoneMasked}</div>
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
                      id="nom-phone"
                      className="pl-8"
                      inputMode="numeric"
                      placeholder="输入手机号（≥3 位检索）"
                      value={nomPhone}
                      onChange={(e) => setNomPhone(e.target.value)}
                    />
                  </div>
                  {nomPhone.trim().length >= 3 && (
                    <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-auto">
                      {ownerSearching ? (
                        <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                          <Loader2 className="size-4 mr-1.5 animate-spin" /> 检索中…
                        </div>
                      ) : ownerHits.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">未找到匹配业主</div>
                      ) : (
                        ownerHits.map((o) => (
                          <button
                            key={o.uid}
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                            onClick={() => {
                              setSelectedOwner(o);
                              setOwnerHits([]);
                            }}
                          >
                            <span className="text-sm font-mono-num">{o.phoneMasked}</span>
                            <span className="text-xs text-muted-foreground">
                              业主 #{o.uid}
                              {o.buildingId != null && ` · 楼栋 ${o.buildingId}`}
                              {o.roomId != null && ` · 房号 ${o.roomId}`}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
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

      {/* 资格审查确认弹窗（党组 / 居委会两段共用） */}
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
