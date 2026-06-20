import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionCard, StatusChip, ProgressRing, Stepper, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Eye, EyeOff, Info, Megaphone, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listVotingSubjects,
  type AdminSubject,
  type SubjectStatus,
  type SubjectType,
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

// TODO(M4-下一刀): 双过半进度环 + 逐人投票明细依赖「结算/进度查询接口」，本刀尚未接入，
// 以下为占位 mock，待结算数据接口落地后替换为真实计票分母与投票记录。
const MOCK_PROGRESS = {
  areaRate: 64.2,
  headRate: 61.5,
  threshold: 66.7,
  totalArea: 156800,
  totalHouse: 1240,
};

const MOCK_VOTE_ROWS = [
  { n: "李建华", h: "1-2-301", a: 89.5, voted: true, choice: "赞成", l3: true },
  { n: "王秀英", h: "1-3-102", a: 112.0, voted: true, choice: "反对", l3: true },
  { n: "张伟", h: "1-1-501", a: 96.3, voted: false, choice: "-", l3: false },
  { n: "刘洋", h: "1-2-204", a: 78.6, voted: true, choice: "赞成", l3: true },
  { n: "陈静", h: "1-4-806", a: 134.2, voted: false, choice: "-", l3: true },
];

export function Voting() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);
  const [adminView, setAdminView] = useState(true);

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

  const t = subjects[sel];
  const global = t ? isGlobalScope(t.scope) : true;
  const typeMeta = t ? TYPE_META[t.subjectType] : null;

  // 进度看板使用占位数据（见 MOCK_PROGRESS 注释）。
  const { areaRate, headRate, threshold, totalArea, totalHouse } = MOCK_PROGRESS;
  const passedArea = areaRate >= threshold;
  const passedHead = headRate >= threshold;
  const bothPass = passedArea && passedHead;

  const buildingLabel = useMemo(
    () => (t && !global ? `楼栋 #${t.scopeReferenceId ?? "—"}` : ""),
    [t, global],
  );

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
        />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            当前小区暂无议题。可在「立项」流程创建后于此查看。
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="议题表决看板"
        desc='遵循“双过半”红线（参与专有面积 ≥2/3 且 人数 ≥2/3），分母随议题范围动态变化。'
        actions={
          <Tabs value={String(sel)} onValueChange={(v) => setSel(Number(v))}>
            <TabsList>
              {subjects.map((x, i) => (
                <TabsTrigger key={x.subjectId} value={String(i)}>
                  {isGlobalScope(x.scope) ? "全局议题" : "局部议题"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
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
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" /> 截止 {fmtDeadline(t.voteEndAt)}
          </span>
        </div>
        <Stepper steps={STEPS} current={STATUS_STEP[t.status]} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 核心进度看板（占位数据，待结算接口接入） */}
        <SectionCard
          title="双过半进度看板"
          desc={`议题编号 T-${t.subjectId} · 截止 ${fmtDeadline(t.voteEndAt)}`}
          className="lg:col-span-2"
        >
          <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            进度与计票数据为占位示例，待结算/进度查询接口接入（下一里程碑）。
          </div>
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
        </SectionCard>

        {/* 动态分母说明卡（范围真实，分母数值待接入） */}
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

      {/* 投票明细表（占位数据，待结算接口接入） */}
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
        <div className="px-4 pt-3 text-xs text-amber-700">
          逐人投票明细为占位示例，待结算/明细查询接口接入（下一里程碑）。
        </div>
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
            {MOCK_VOTE_ROWS.map((r) => (
              <TableRow key={r.h}>
                <TableCell style={{ fontWeight: 500 }}>{r.n}</TableCell>
                <TableCell className="font-mono-num text-sm">{r.h}</TableCell>
                <TableCell className="text-right font-mono-num text-sm">{r.a.toFixed(1)} ㎡</TableCell>
                <TableCell>
                  {r.voted ? <StatusChip tone="success">已投</StatusChip> : <StatusChip tone="neutral">未投</StatusChip>}
                </TableCell>
                <TableCell>
                  {adminView ? (
                    r.voted ? <StatusChip tone={r.choice === "赞成" ? "primary" : "danger"}>{r.choice}</StatusChip> : <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="text-muted-foreground">表决中保密</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.l3 ? <StatusChip tone="tech">L3 刷脸</StatusChip> : <StatusChip tone="warning">未核身</StatusChip>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
