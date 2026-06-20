import { useState } from "react";
import { PageHeader, SectionCard, StatusChip, KpiCard } from "../gov/common";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Progress } from "../ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import { Send, Target, Globe, Building2, Users, CheckCircle2 } from "lucide-react";

type PushScope = "全网" | "楼栋";

interface PushRecord {
  id: string;
  subject: string;
  relatedIssue: string;
  scope: PushScope;
  building?: string;
  targetCount: number;
  deliveryRate: number;
  time: string;
  unlockedWorkers: { name: string; role: string }[];
  reachedBuildings: { name: string; count: number; isTarget: boolean }[];
}

const COMMUNITY_TOTAL = 1240;

const PUSH_RECORDS: PushRecord[] = [
  {
    id: "PUSH-2026-089",
    subject: "1号楼屋面漏水维修议案表决推送",
    relatedIssue: "T-2026-033 · 一般决议",
    scope: "楼栋",
    building: "1号楼",
    targetCount: 86,
    deliveryRate: 96.5,
    time: "2026-06-18 09:15",
    unlockedWorkers: [
      { name: "张建国", role: "楼栋长" },
      { name: "李慧敏", role: "网格员" },
    ],
    reachedBuildings: [
      { name: "1号楼", count: 86, isTarget: true },
      { name: "2号楼", count: 0, isTarget: false },
      { name: "3号楼", count: 0, isTarget: false },
      { name: "4号楼", count: 0, isTarget: false },
    ],
  },
  {
    id: "PUSH-2026-087",
    subject: "主干道翻修专项表决（¥15万）",
    relatedIssue: "T-2026-031 · 重大决议",
    scope: "全网",
    targetCount: 1240,
    deliveryRate: 94.8,
    time: "2026-06-15 10:00",
    unlockedWorkers: [
      { name: "王建军", role: "网格员" },
      { name: "陈秀芳", role: "网格员" },
      { name: "刘明达", role: "网格员" },
      { name: "张建国", role: "楼栋长" },
    ],
    reachedBuildings: [
      { name: "1号楼", count: 86, isTarget: true },
      { name: "2号楼", count: 112, isTarget: true },
      { name: "3号楼", count: 98, isTarget: true },
      { name: "4号楼", count: 143, isTarget: true },
    ],
  },
  {
    id: "PUSH-2026-083",
    subject: "B区地下车库改造施工通知",
    relatedIssue: "工单 WO-2026-058",
    scope: "楼栋",
    building: "B区（4-6号楼）",
    targetCount: 286,
    deliveryRate: 91.3,
    time: "2026-06-10 16:20",
    unlockedWorkers: [
      { name: "孙丽华", role: "楼栋长" },
      { name: "赵强", role: "楼栋长" },
      { name: "周晓明", role: "网格员" },
    ],
    reachedBuildings: [
      { name: "4号楼", count: 143, isTarget: true },
      { name: "5号楼", count: 98, isTarget: true },
      { name: "6号楼", count: 45, isTarget: true },
      { name: "其他楼栋", count: 0, isTarget: false },
    ],
  },
  {
    id: "PUSH-2026-079",
    subject: "二季度公共收益分配公示推送",
    relatedIssue: "ANN-2026-041 · 全网公告",
    scope: "全网",
    targetCount: 1240,
    deliveryRate: 97.2,
    time: "2026-06-08 09:00",
    unlockedWorkers: [],
    reachedBuildings: [
      { name: "1号楼", count: 86, isTarget: true },
      { name: "2号楼", count: 112, isTarget: true },
      { name: "3号楼", count: 98, isTarget: true },
      { name: "4号楼", count: 143, isTarget: true },
    ],
  },
  {
    id: "PUSH-2026-075",
    subject: "3号楼电梯维保催缴通知",
    relatedIssue: "工单 WO-2026-049",
    scope: "楼栋",
    building: "3号楼",
    targetCount: 98,
    deliveryRate: 88.8,
    time: "2026-06-05 14:30",
    unlockedWorkers: [
      { name: "刘志远", role: "楼栋长" },
    ],
    reachedBuildings: [
      { name: "3号楼", count: 98, isTarget: true },
      { name: "其他楼栋", count: 0, isTarget: false },
    ],
  },
  {
    id: "PUSH-2026-071",
    subject: "换届选举候选人公示",
    relatedIssue: "选举 EL-2026-003",
    scope: "全网",
    targetCount: 1240,
    deliveryRate: 92.6,
    time: "2026-06-01 08:00",
    unlockedWorkers: [
      { name: "王建军", role: "网格员" },
      { name: "陈秀芳", role: "网格员" },
    ],
    reachedBuildings: [
      { name: "1号楼", count: 86, isTarget: true },
      { name: "2号楼", count: 112, isTarget: true },
      { name: "3号楼", count: 98, isTarget: true },
      { name: "4号楼", count: 143, isTarget: true },
    ],
  },
  {
    id: "PUSH-2026-065",
    subject: "5号楼消防隐患整改通知",
    relatedIssue: "工单 WO-2026-041",
    scope: "楼栋",
    building: "5号楼",
    targetCount: 98,
    deliveryRate: 85.7,
    time: "2026-05-25 11:00",
    unlockedWorkers: [
      { name: "孙丽华", role: "楼栋长" },
    ],
    reachedBuildings: [
      { name: "5号楼", count: 98, isTarget: true },
      { name: "其他楼栋", count: 0, isTarget: false },
    ],
  },
  {
    id: "PUSH-2026-058",
    subject: "业委会5月份财务公告",
    relatedIssue: "ANN-2026-028 · 全网公告",
    scope: "全网",
    targetCount: 1240,
    deliveryRate: 89.4,
    time: "2026-05-18 16:00",
    unlockedWorkers: [],
    reachedBuildings: [
      { name: "1号楼", count: 86, isTarget: true },
      { name: "2号楼", count: 112, isTarget: true },
      { name: "3号楼", count: 98, isTarget: true },
      { name: "4号楼", count: 143, isTarget: true },
    ],
  },
  {
    id: "PUSH-2026-052",
    subject: "2号楼雨污分流改造通知",
    relatedIssue: "工单 WO-2026-036",
    scope: "楼栋",
    building: "2号楼",
    targetCount: 112,
    deliveryRate: 93.8,
    time: "2026-05-12 09:30",
    unlockedWorkers: [
      { name: "陈文明", role: "楼栋长" },
      { name: "周晓明", role: "网格员" },
    ],
    reachedBuildings: [
      { name: "2号楼", count: 112, isTarget: true },
      { name: "其他楼栋", count: 0, isTarget: false },
    ],
  },
];

const CHART_COLORS = {
  target: "#1b4f9c",
  community: "#e3e8f0",
  targetLabel: "#19a0c4",
};

export function PushRecords() {
  const [selectedId, setSelectedId] = useState<string | null>(PUSH_RECORDS[0].id);

  const selected = PUSH_RECORDS.find((r) => r.id === selectedId) ?? null;

  // 本月统计
  const thisMonth = PUSH_RECORDS.filter((r) => r.time.startsWith("2026-06"));
  const monthPushCount = thisMonth.length;
  const avgDelivery =
    Math.round((thisMonth.reduce((s, r) => s + r.deliveryRate, 0) / thisMonth.length) * 10) / 10;
  const targetedCount = thisMonth.filter((r) => r.scope === "楼栋").length;
  const globalCount = thisMonth.filter((r) => r.scope === "全网").length;

  // 画像图表数据
  const chartData = selected
    ? [
        {
          name: "本次触达",
          户数: selected.targetCount,
          fill: CHART_COLORS.target,
        },
        {
          name: "全小区",
          户数: COMMUNITY_TOTAL,
          fill: CHART_COLORS.community,
        },
      ]
    : [];

  const reachedPercent = selected
    ? Math.round((selected.targetCount / COMMUNITY_TOTAL) * 1000) / 10
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="定向推送记录"
        desc="系统通过消息队列实现千人千面精准推送——局部维修议案仅推给该楼栋业主，全网公告覆盖全小区。回看每次推送的精准触达画像与工作台解锁情况。"
      />

      {/* KPI 行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="本月推送次数"
          value={monthPushCount}
          unit="次"
          tone="primary"
          icon={<Send className="size-4" />}
          trend={{ value: "较上月 +2", up: true }}
        />
        <KpiCard
          label="平均送达率"
          value={`${avgDelivery}%`}
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
          trend={{ value: "较上月 +1.2%", up: true }}
        />
        <KpiCard
          label="定向推送占比"
          value={`${Math.round((targetedCount / monthPushCount) * 100)}%`}
          tone="tech"
          icon={<Target className="size-4" />}
        />
        <KpiCard
          label="全网推送次数"
          value={globalCount}
          unit="次"
          tone="info"
          icon={<Globe className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 推送记录列表 */}
        <SectionCard
          title="推送记录"
          desc="点击行查看单次推送画像"
          className="lg:col-span-3"
          bodyClassName="p-0"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>推送主题</TableHead>
                <TableHead>范围</TableHead>
                <TableHead className="text-right">目标户数</TableHead>
                <TableHead className="w-36">送达率</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PUSH_RECORDS.map((rec) => (
                <TableRow
                  key={rec.id}
                  className={`cursor-pointer transition-colors ${
                    selectedId === rec.id ? "bg-[#e8f0fb]" : "hover:bg-muted/40"
                  }`}
                  onClick={() => setSelectedId(rec.id)}
                >
                  <TableCell>
                    <div style={{ fontWeight: selectedId === rec.id ? 600 : 400 }} className="text-sm">
                      {rec.subject}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{rec.relatedIssue}</div>
                  </TableCell>
                  <TableCell>
                    {rec.scope === "全网" ? (
                      <StatusChip tone="tech" dot>
                        全网
                      </StatusChip>
                    ) : (
                      <StatusChip tone="primary" dot>
                        {rec.building ?? "楼栋"}
                      </StatusChip>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono-num text-sm">{rec.targetCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Progress value={rec.deliveryRate} className="h-1.5 flex-1" />
                      <span className="font-mono-num text-xs w-10 text-right">{rec.deliveryRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono-num text-xs text-muted-foreground whitespace-nowrap">
                    {rec.time.slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        {/* 单次推送画像 */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              {/* 精准 vs 全网对比图 */}
              <SectionCard
                title="触达范围画像"
                desc={`${selected.scope === "楼栋" ? "定向推送" : "全网推送"} · ${selected.subject}`}
              >
                <div className="mb-3">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {selected.scope === "楼栋" ? (
                      <StatusChip tone="warning" dot>
                        精准定向
                      </StatusChip>
                    ) : (
                      <StatusChip tone="success" dot>
                        全网覆盖
                      </StatusChip>
                    )}
                    <span className="text-sm text-muted-foreground">
                      本次触达{" "}
                      <span className="font-mono-num" style={{ color: "#1b4f9c", fontWeight: 700 }}>
                        {selected.targetCount}
                      </span>{" "}
                      户 / 全小区{" "}
                      <span className="font-mono-num">{COMMUNITY_TOTAL}</span> 户
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">覆盖比</span>
                    <Progress value={reachedPercent} className="h-2 flex-1" />
                    <span className="font-mono-num text-xs w-12 text-right" style={{ color: "#1b4f9c" }}>
                      {reachedPercent}%
                    </span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 8, right: 32, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3e8f0" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={56} />
                    <Tooltip
                      formatter={(v: number) => [`${v.toLocaleString()} 户`, "户数"]}
                    />
                    <Bar dataKey="户数" radius={[0, 4, 4, 0]} barSize={28}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? "#1b4f9c" : "#e3e8f0"}
                          stroke={i === 0 ? "#143c78" : "#c8d3e0"}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {selected.scope === "楼栋" && (
                  <div
                    className="mt-2 rounded-md px-3 py-2 text-xs"
                    style={{ backgroundColor: "#e8f0fb", color: "#143c78" }}
                  >
                    仅 <span className="font-mono-num font-semibold">{selected.building}</span>{" "}
                    {selected.targetCount} 户收到此推送，其他楼栋业主不受打扰——千人千面精准触达。
                  </div>
                )}
              </SectionCard>

              {/* 送达率 */}
              <SectionCard title="送达情况">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">消息送达率</span>
                    <span
                      className="font-mono-num font-semibold"
                      style={{ color: selected.deliveryRate >= 90 ? "#2e9e5b" : "#e0a310" }}
                    >
                      {selected.deliveryRate}%
                    </span>
                  </div>
                  <Progress value={selected.deliveryRate} className="h-2.5" />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono-num">
                    <span>送达 {Math.round(selected.targetCount * selected.deliveryRate / 100)} 户</span>
                    <span>未达 {Math.round(selected.targetCount * (1 - selected.deliveryRate / 100))} 户</span>
                  </div>
                </div>
              </SectionCard>

              {/* 解锁催票工作台 */}
              {selected.unlockedWorkers.length > 0 && (
                <SectionCard title="已解锁催票工作台" desc="因本次推送而获得催票权限的网格员 / 楼栋长">
                  <div className="space-y-2">
                    {selected.unlockedWorkers.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                      >
                        <span
                          className="grid place-items-center size-7 rounded-full text-white text-xs shrink-0"
                          style={{ backgroundColor: "#1b4f9c" }}
                        >
                          {w.name[0]}
                        </span>
                        <span className="flex-1 text-sm" style={{ fontWeight: 500 }}>
                          {w.name}
                        </span>
                        <StatusChip tone={w.role === "网格员" ? "tech" : "primary"}>
                          {w.role}
                        </StatusChip>
                        <StatusChip tone="success" dot>
                          已解锁
                        </StatusChip>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {selected.unlockedWorkers.length === 0 && (
                <SectionCard title="已解锁催票工作台">
                  <div className="text-sm text-muted-foreground text-center py-3">
                    全网公告无需解锁独立工作台，全体网格员默认可见。
                  </div>
                </SectionCard>
              )}
            </>
          ) : (
            <SectionCard title="单次推送画像">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">点击左侧推送记录查看精准触达画像</p>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
