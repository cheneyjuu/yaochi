import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionCard, StatusChip, ProgressRing, Stepper, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Eye, EyeOff, Info, Clock, Loader2, Plus, Megaphone, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import { loadSession } from "../../lib/auth";
import {
  listVotingSubjects,
  getSubjectProgress,
  listVoteDetails,
  proposeSubject,
  publishSubject,
  cancelSubject,
  type AdminSubject,
  type ProposeSubjectInput,
  type SubjectProgress,
  type SubjectStatus,
  type SubjectType,
  type VoteChoice,
  type VoteDetail,
  type VotingScope,
} from "../../lib/voting";

const STEPS = [
  { key: "draft", label: "草稿" },
  { key: "public", label: "公示" },
  { key: "voting", label: "投票中" },
  { key: "closed", label: "已截止" },
  { key: "settled", label: "已结算" },
];

// 议题状态 → 步进条当前索引（CANCELLED 为终态，无对应步骤，返回 -1）。
const STATUS_STEP: Record<SubjectStatus, number> = {
  DRAFT: 0,
  PUBLISHED: 1,
  VOTING: 2,
  CLOSED: 3,
  SETTLED: 4,
  CANCELLED: -1,
};

// 议题类型 → 展示标签与色调。
const TYPE_META: Record<SubjectType, { label: string; tone: Tone }> = {
  ELECTION: { label: "选举", tone: "tech" },
  MAJOR: { label: "重大决议", tone: "danger" },
  GENERAL: { label: "一般决议", tone: "primary" },
};

const STATUS_LABEL: Record<SubjectStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "公示中",
  VOTING: "投票中",
  CLOSED: "已截止",
  SETTLED: "已结算",
  CANCELLED: "已撤回",
};

// 投票选项 → 展示标签 / 色调。
const CHOICE_LABEL: Record<VoteChoice, string> = {
  SUPPORT: "赞成",
  AGAINST: "反对",
  ABSTAIN: "弃权",
};
const CHOICE_TONE: Record<VoteChoice, Tone> = {
  SUPPORT: "primary",
  AGAINST: "danger",
  ABSTAIN: "neutral",
};

const DETAIL_SIZE = 20;

// COMMUNITY → 全局议题（全小区分母）；BUILDING/UNIT → 局部议题。
function isGlobalScope(scope: VotingScope): boolean {
  return scope === "COMMUNITY";
}

function fmtDeadline(iso: string | null): string {
  if (!iso) return "未设置";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 认证等级 → chip（auth_level：3=L3 刷脸 / 2=L2 实名 / 1=L1 注册 / null=未核身）。
function authChip(level: number | null) {
  if (level === 3) return <StatusChip tone="tech">L3 刷脸</StatusChip>;
  if (level === 2) return <StatusChip tone="success">L2 实名</StatusChip>;
  if (level === 1) return <StatusChip tone="warning">L1 注册</StatusChip>;
  return <StatusChip tone="neutral">未核身</StatusChip>;
}

export function Voting() {
  const { hasPermission } = useStore();
  const currentUserId = loadSession()?.user.active_identity_id ?? null;

  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);
  const [adminView, setAdminView] = useState(true);

  // 写动作（立项 / 公示 / 撤回）状态。
  const [acting, setActing] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  // bump → 触发进度 / 明细重拉（写成功后刷新看板）。
  const [refreshKey, setRefreshKey] = useState(0);

  const [progress, setProgress] = useState<SubjectProgress | null>(null);
  const [progLoading, setProgLoading] = useState(false);

  const [detailItems, setDetailItems] = useState<VoteDetail[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listVotingSubjects({ page: 1, size: 50 })
      .then((res) => {
        if (!alive) return;
        setSubjects(res.items);
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

  // 写成功后刷新列表：保留（或定位到）目标议题，并触发进度 / 明细重拉。
  async function reload(preserveSubjectId?: number) {
    try {
      const res = await listVotingSubjects({ page: 1, size: 50 });
      setSubjects(res.items);
      const idx =
        preserveSubjectId != null
          ? res.items.findIndex((x) => x.subjectId === preserveSubjectId)
          : -1;
      setSel(idx >= 0 ? idx : 0);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "议题列表刷新失败");
    }
  }

  async function handlePropose(input: ProposeSubjectInput) {
    setActing(true);
    try {
      const created = await proposeSubject(input);
      toast.success("议题已草稿落库，待公示");
      setProposeOpen(false);
      await reload(created.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "立项失败");
    } finally {
      setActing(false);
    }
  }

  async function handlePublish(subject: AdminSubject) {
    setActing(true);
    try {
      await publishSubject(subject.subjectId);
      toast.success("议题已公示");
      await reload(subject.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "公示失败");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel(subject: AdminSubject) {
    const reason = cancelReason.trim();
    if (!reason) return;
    setActing(true);
    try {
      await cancelSubject(subject.subjectId, reason);
      toast.success("议题已撤回");
      setCancelOpen(false);
      setCancelReason("");
      await reload(subject.subjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤回失败");
    } finally {
      setActing(false);
    }
  }

  const t = subjects[sel];
  const subjectId = t?.subjectId;
  const global = t ? isGlobalScope(t.scope) : true;
  const typeMeta = t ? TYPE_META[t.subjectType] : null;

  // 选中议题变化 → 拉取双过半进度。
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
        toast.error(err instanceof Error ? err.message : "进度加载失败");
      })
      .finally(() => {
        if (alive) setProgLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [subjectId, refreshKey]);

  // 选中议题 / 翻页变化 → 拉取逐户明细。
  useEffect(() => {
    if (subjectId == null) {
      setDetailItems([]);
      setDetailTotal(0);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    listVoteDetails(subjectId, { page: detailPage, size: DETAIL_SIZE })
      .then((res) => {
        if (!alive) return;
        setDetailItems(res.items);
        setDetailTotal(res.total);
      })
      .catch((err) => {
        if (!alive) return;
        setDetailItems([]);
        setDetailTotal(0);
        toast.error(err instanceof Error ? err.message : "投票明细加载失败");
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [subjectId, detailPage, refreshKey]);

  // 双过半进度：参与率 vs 法定门槛（thresholdNumerator/thresholdDenominator = 2/3）。
  const threshold = progress
    ? (progress.thresholdNumerator / progress.thresholdDenominator) * 100
    : 66.7;
  const areaRate = progress ? progress.participatingAreaRatio * 100 : 0;
  const headRate = progress ? progress.participatingOwnerRatio * 100 : 0;
  const passedArea = areaRate >= threshold;
  const passedHead = headRate >= threshold;
  const bothPass = progress ? progress.quorumSatisfied : false;
  const totalArea = progress ? progress.totalArea : 0;
  const totalHouse = progress ? progress.totalOwnerCount : 0;

  const detailPages = Math.max(1, Math.ceil(detailTotal / DETAIL_SIZE));

  const buildingLabel = useMemo(
    () => (t && !global ? `楼栋 #${t.scopeReferenceId ?? "—"}` : ""),
    [t, global],
  );

  function switchSubject(i: number) {
    setSel(i);
    setDetailPage(1);
  }

  // 写动作门控（与后端 service 准入对齐，确保按钮永不触发 403）：
  //   公示：DRAFT 且有 publish 权限。
  //   撤回：DRAFT(政府 或 立项本人) / PUBLISHED(仅政府)；VOTING+ 一律不可。
  const canCreate = hasPermission("voting:subject:create");
  const canPublish = hasPermission("voting:subject:publish");
  const canGovCancel = hasPermission("voting:subject:cancel");
  const isProposer = t != null && currentUserId != null && t.proposedByUserId === currentUserId;
  const showPublish = t?.status === "DRAFT" && canPublish;
  const showCancel =
    t != null &&
    ((t.status === "DRAFT" && (canGovCancel || (canCreate && isProposer))) ||
      (t.status === "PUBLISHED" && canGovCancel));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-5 mr-2 animate-spin" /> 议题列表加载中…
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="议题表决看板"
          desc='遵循“双过半”红线（参与专有面积 ≥2/3 且 人数 ≥2/3），分母随议题范围动态变化。'
          actions={
            canCreate ? (
              <Button size="sm" onClick={() => setProposeOpen(true)}>
                <Plus className="size-4" /> 立项
              </Button>
            ) : undefined
          }
        />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            当前小区暂无议题。{canCreate ? "可点击右上角「立项」创建。" : "可在「立项」流程创建后于此查看。"}
          </div>
        </SectionCard>
        <ProposeDialog
          open={proposeOpen}
          onOpenChange={setProposeOpen}
          onSubmit={handlePropose}
          submitting={acting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="议题表决看板"
        desc='遵循“双过半”红线（参与专有面积 ≥2/3 且 人数 ≥2/3），分母随议题范围动态变化。'
        actions={
          <div className="flex items-center gap-3">
            <Tabs value={String(sel)} onValueChange={(v) => switchSubject(Number(v))}>
              <TabsList>
                {subjects.map((x, i) => (
                  <TabsTrigger key={x.subjectId} value={String(i)}>
                    {isGlobalScope(x.scope) ? "全局议题" : "局部议题"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {canCreate && (
              <Button size="sm" onClick={() => setProposeOpen(true)}>
                <Plus className="size-4" /> 立项
              </Button>
            )}
          </div>
        }
      />

      <ProposeDialog
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        onSubmit={handlePropose}
        submitting={acting}
      />

      {/* 顶部议题信息条（真实数据） */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {typeMeta && <StatusChip tone={typeMeta.tone}>{typeMeta.label}</StatusChip>}
          {global ? (
            <StatusChip tone="tech">全局表决</StatusChip>
          ) : (
            <StatusChip tone="warning">局部共有 · 局部表决 · 局部分摊</StatusChip>
          )}
          <StatusChip tone="neutral">{STATUS_LABEL[t.status]}</StatusChip>
          <h2 style={{ fontWeight: 600 }}>{t.title}</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" /> 截止 {fmtDeadline(t.voteEndAt)}
            </span>
            {showPublish && (
              <Button size="sm" onClick={() => handlePublish(t)} disabled={acting}>
                <Megaphone className="size-4" /> 公示
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
                        handleCancel(t);
                      }}
                    >
                      {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认撤回
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <Stepper steps={STEPS} current={STATUS_STEP[t.status]} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 核心进度看板（真实进度 / 结算快照） */}
        <SectionCard
          title="双过半进度看板"
          desc={`议题编号 T-${t.subjectId} · 截止 ${fmtDeadline(t.voteEndAt)}`}
          className="lg:col-span-2"
        >
          {progress?.settled && (
            <div className="mb-3 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
              数据来源：法定结算快照（已结算）。
            </div>
          )}
          {progLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 mr-2 animate-spin" /> 进度加载中…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center">
                  <ProgressRing value={areaRate} threshold={threshold} label="专有面积通过率" passed={passedArea} />
                </div>
                <div className="flex flex-col items-center">
                  <ProgressRing value={headRate} threshold={threshold} label="人数通过率" passed={passedHead} />
                </div>
              </div>
              <div
                className="mt-4 rounded-lg px-4 py-3 text-center text-sm"
                style={{
                  backgroundColor: bothPass ? "#e8f6ee" : "#eef2f8",
                  color: bothPass ? "#1f7a45" : "#5a6677",
                  fontWeight: 600,
                }}
              >
                {bothPass ? "✓ 双过半已达成 —— 议题可进入结算" : "○ 双过半未达成 —— 需面积与人数同时 ≥ 2/3"}
              </div>
            </>
          )}
        </SectionCard>

        {/* 动态分母说明卡（范围 + 真实分母） */}
        <SectionCard title="投票分母说明" desc="本议题的法定计票分母来源">
          <div className="rounded-lg border border-[#3a6fbf]/30 bg-[#e8f0fb] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#143c78", fontWeight: 600 }}>
              <Info className="size-4" />
              {global ? "全局议题 · 全小区分母" : "局部议题 · 仅本楼栋分母"}
            </div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">计票总面积</span>
                <span className="font-mono-num">{totalArea.toLocaleString()} ㎡</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">计票总户数</span>
                <span className="font-mono-num">{totalHouse} 户</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#2a4f8a" }}>
              {global
                ? "公共维修 / 全局议题：分母 = 全小区总面积 + 总户数，全体业主参与表决。"
                : `局部维修 / 单栋议题：分母 = 仅 ${buildingLabel} 面积 + 户数。仅该楼栋业主参与，其他楼栋无关、不分摊。`}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* 投票明细表（真实分页数据） */}
      <SectionCard
        title="投票明细"
        desc={adminView ? "管理端可见具体票数倾向" : "业主端视角：仅显示已投/未投，不暴露倾向"}
        extra={
          <Button variant="outline" size="sm" onClick={() => setAdminView(!adminView)}>
            {adminView ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {adminView ? "管理端视角" : "业主端视角"}
          </Button>
        }
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>业主</TableHead>
              <TableHead>房号</TableHead>
              <TableHead className="text-right">专有面积</TableHead>
              <TableHead>是否已投</TableHead>
              <TableHead>{adminView ? "投票选项" : "倾向"}</TableHead>
              <TableHead>认证</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detailLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="size-5 mr-2 animate-spin" /> 明细加载中…
                  </div>
                </TableCell>
              </TableRow>
            ) : detailItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-10 text-center text-muted-foreground">该范围暂无应投房产。</div>
                </TableCell>
              </TableRow>
            ) : (
              detailItems.map((r) => (
                <TableRow key={r.opid}>
                  <TableCell style={{ fontWeight: 500 }}>业主 #{r.uid}</TableCell>
                  <TableCell className="font-mono-num text-sm">
                    {r.buildingId}-{r.roomId}
                  </TableCell>
                  <TableCell className="text-right font-mono-num text-sm">{r.propertyArea.toFixed(1)} ㎡</TableCell>
                  <TableCell>
                    {r.voted ? <StatusChip tone="success">已投</StatusChip> : <StatusChip tone="neutral">未投</StatusChip>}
                  </TableCell>
                  <TableCell>
                    {adminView ? (
                      r.voted && r.choice ? (
                        <StatusChip tone={CHOICE_TONE[r.choice]}>{CHOICE_LABEL[r.choice]}</StatusChip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">表决中保密</span>
                    )}
                  </TableCell>
                  <TableCell>{authChip(r.authLevel)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页脚 */}
        <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
          <span>
            共 {detailTotal} 户 · 第 {detailPage}/{detailPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={detailPage <= 1 || detailLoading}
              onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={detailPage >= detailPages || detailLoading}
              onClick={() => setDetailPage((p) => Math.min(detailPages, p + 1))}
            >
              下一页
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// 议题立项对话框（自管表单 state；提交转 ISO 时间，校验 ELECTION 名额 / BUILDING 楼栋）。
function ProposeDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: ProposeSubjectInput) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType>("GENERAL");
  const [scope, setScope] = useState<VotingScope>("COMMUNITY");
  const [buildingId, setBuildingId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [partyFloor, setPartyFloor] = useState("");
  const [maxWinners, setMaxWinners] = useState("");

  // 每次打开重置表单。
  useEffect(() => {
    if (open) {
      setTitle("");
      setSubjectType("GENERAL");
      setScope("COMMUNITY");
      setBuildingId("");
      setStart("");
      setEnd("");
      setPartyFloor("");
      setMaxWinners("");
    }
  }, [open]);

  const isElection = subjectType === "ELECTION";
  const isBuilding = scope === "BUILDING";

  const valid =
    title.trim().length > 0 &&
    start !== "" &&
    end !== "" &&
    (!isBuilding || buildingId.trim() !== "") &&
    (!isElection || (maxWinners.trim() !== "" && Number(maxWinners) >= 1));

  function submit() {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      subjectType,
      scope,
      scopeReferenceId: isBuilding ? Number(buildingId) : null,
      voteStartAt: new Date(start).toISOString(),
      voteEndAt: new Date(end).toISOString(),
      partyRatioFloor: partyFloor.trim() !== "" ? Number(partyFloor) : null,
      maxWinners: isElection ? Number(maxWinners) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发起议题立项</DialogTitle>
          <DialogDescription>草稿落库后需公示方可进入投票。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="propose-title">议题标题</Label>
            <Input
              id="propose-title"
              placeholder="如：小区电梯更新改造专项维修资金使用"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>议题类型</Label>
              <Select value={subjectType} onValueChange={(v) => setSubjectType(v as SubjectType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">一般决议</SelectItem>
                  <SelectItem value="MAJOR">重大决议</SelectItem>
                  <SelectItem value="ELECTION">选举</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>表决范围</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as VotingScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMUNITY">全小区</SelectItem>
                  <SelectItem value="BUILDING">单栋</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isBuilding && (
            <div className="space-y-1.5">
              <Label htmlFor="propose-building">楼栋 ID</Label>
              <Input
                id="propose-building"
                type="number"
                placeholder="目标楼栋 building_id"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="propose-start">投票开始</Label>
              <Input
                id="propose-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propose-end">投票截止</Label>
              <Input
                id="propose-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="propose-party">党员比例下限（可空）</Label>
              <Input
                id="propose-party"
                type="number"
                step="0.01"
                placeholder="如 0.5"
                value={partyFloor}
                onChange={(e) => setPartyFloor(e.target.value)}
              />
            </div>
            {isElection && (
              <div className="space-y-1.5">
                <Label htmlFor="propose-winners">应选名额</Label>
                <Input
                  id="propose-winners"
                  type="number"
                  min={1}
                  placeholder="≥1"
                  value={maxWinners}
                  onChange={(e) => setMaxWinners(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={submit} disabled={!valid || submitting}>
            {submitting && <Loader2 className="size-4 mr-1 animate-spin" />} 提交立项
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
