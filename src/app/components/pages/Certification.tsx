"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  PageHeader,
  KpiCard,
  SectionCard,
  StatusChip,
  type Tone,
} from "../gov/common";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  UserCheck,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

/* ─── 类型 ─── */
type CertLevel = "L1" | "L3" | "L4" | "未认证";

interface CertRecord {
  date: string;
  level: CertLevel;
  method: string;
  result: "成功" | "失败";
}

interface OwnerCert {
  id: string;
  name: string;
  currentLevel: CertLevel;
  certTime: string;
  meetsQuorum: boolean;
  history: CertRecord[];
}

/* ─── Mock 数据 ─── */
const OWNER_CERTS: OwnerCert[] = [
  {
    id: "C001",
    name: "张伟",
    currentLevel: "L4",
    certTime: "2024-06-10",
    meetsQuorum: true,
    history: [
      { date: "2024-01-15", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-03-20", level: "L3", method: "人脸核身", result: "成功" },
      { date: "2024-06-10", level: "L4", method: "政务链核查", result: "成功" },
    ],
  },
  {
    id: "C002",
    name: "李秀英",
    currentLevel: "L3",
    certTime: "2024-04-12",
    meetsQuorum: true,
    history: [
      { date: "2024-02-08", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-04-12", level: "L3", method: "人脸核身", result: "成功" },
    ],
  },
  {
    id: "C003",
    name: "王建国",
    currentLevel: "L3",
    certTime: "2024-01-18",
    meetsQuorum: true,
    history: [
      { date: "2023-11-05", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-01-18", level: "L3", method: "人脸核身", result: "成功" },
    ],
  },
  {
    id: "C004",
    name: "刘梅",
    currentLevel: "L1",
    certTime: "2024-05-30",
    meetsQuorum: false,
    history: [
      { date: "2024-05-30", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-06-15", level: "L3", method: "人脸核身", result: "失败" },
    ],
  },
  {
    id: "C005",
    name: "陈志强",
    currentLevel: "L3",
    certTime: "2023-10-22",
    meetsQuorum: true,
    history: [
      { date: "2023-09-14", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2023-10-22", level: "L3", method: "人脸核身", result: "成功" },
    ],
  },
  {
    id: "C006",
    name: "某开发商(存量)",
    currentLevel: "L1",
    certTime: "2022-06-01",
    meetsQuorum: false,
    history: [
      { date: "2022-06-01", level: "L1", method: "系统导入", result: "成功" },
    ],
  },
  {
    id: "C007",
    name: "赵雨欣",
    currentLevel: "L3",
    certTime: "2024-03-28",
    meetsQuorum: true,
    history: [
      { date: "2024-03-01", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-03-28", level: "L3", method: "人脸核身", result: "成功" },
    ],
  },
  {
    id: "C008",
    name: "孙浩然",
    currentLevel: "L4",
    certTime: "2024-02-14",
    meetsQuorum: true,
    history: [
      { date: "2023-07-10", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2023-08-05", level: "L3", method: "人脸核身", result: "成功" },
      { date: "2024-02-14", level: "L4", method: "政务链核查", result: "成功" },
    ],
  },
  {
    id: "C009",
    name: "周婷婷",
    currentLevel: "L1",
    certTime: "2024-07-12",
    meetsQuorum: false,
    history: [
      { date: "2024-07-12", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-08-01", level: "L3", method: "人脸核身", result: "失败" },
      { date: "2024-09-10", level: "L3", method: "人脸核身", result: "失败" },
    ],
  },
  {
    id: "C010",
    name: "吴光明",
    currentLevel: "L3",
    certTime: "2024-01-10",
    meetsQuorum: true,
    history: [
      { date: "2023-12-01", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-01-10", level: "L3", method: "人脸核身", result: "成功" },
    ],
  },
  {
    id: "C011",
    name: "郑丽华",
    currentLevel: "L3",
    certTime: "2024-05-15",
    meetsQuorum: true,
    history: [
      { date: "2024-04-02", level: "L1", method: "手机号注册", result: "成功" },
      { date: "2024-05-15", level: "L3", method: "人脸核身", result: "成功" },
    ],
  },
  {
    id: "C012",
    name: "黄鑫",
    currentLevel: "L1",
    certTime: "2024-08-20",
    meetsQuorum: false,
    history: [
      { date: "2024-08-20", level: "L1", method: "手机号注册", result: "成功" },
    ],
  },
];

/* ─── 颜色常量 ─── */
const LEVEL_COLORS: Record<string, string> = {
  L1: "#9aa5b5",
  L3: "#1b4f9c",
  L4: "#e0a310",
  未认证: "#e3e8f0",
};

/* ─── 辅助 ─── */
function levelTone(level: CertLevel): Tone {
  if (level === "L4") return "warning";
  if (level === "L3") return "primary";
  if (level === "未认证") return "danger";
  return "neutral";
}

function levelLabel(level: CertLevel) {
  if (level === "L4") return "L4 高级";
  if (level === "L3") return "L3 实名";
  if (level === "未认证") return "未认证";
  return "L1 基础";
}

function levelIcon(level: CertLevel) {
  if (level === "L4") return <ShieldCheck className="size-3.5" />;
  if (level === "L3") return <ShieldCheck className="size-3.5" />;
  if (level === "未认证") return <ShieldOff className="size-3.5" />;
  return <ShieldAlert className="size-3.5" />;
}

/* ─── 认证时间轴 ─── */
function CertTimeline({ history }: { history: CertRecord[] }) {
  return (
    <div className="space-y-0">
      {history.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className="size-2.5 rounded-full mt-1 shrink-0 border-2 border-white"
              style={{
                backgroundColor:
                  item.result === "成功"
                    ? LEVEL_COLORS[item.level] ?? "#9aa5b5"
                    : "#d14343",
                boxShadow: "0 0 0 2px " + (item.result === "成功" ? (LEVEL_COLORS[item.level] ?? "#9aa5b5") + "40" : "#d1434340"),
              }}
            />
            {i < history.length - 1 && (
              <div className="w-px bg-border flex-1 min-h-[28px] mt-0.5" />
            )}
          </div>
          <div className="pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusChip tone={item.result === "成功" ? levelTone(item.level) : "danger"}>
                {item.result === "成功" ? levelLabel(item.level) : "认证失败"}
              </StatusChip>
              <span className="text-xs text-muted-foreground font-mono-num">{item.date}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{item.method}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 主页面 ─── */
export function Certification() {
  const [selectedOwner, setSelectedOwner] = useState<OwnerCert | null>(null);

  // 统计
  const totalOwners = OWNER_CERTS.length;
  const l1Count = OWNER_CERTS.filter((o) => o.currentLevel === "L1").length;
  const l3Count = OWNER_CERTS.filter((o) => o.currentLevel === "L3").length;
  const l4Count = OWNER_CERTS.filter((o) => o.currentLevel === "L4").length;
  const uncertCount = OWNER_CERTS.filter((o) => o.currentLevel === "未认证").length;
  const quorumCount = OWNER_CERTS.filter((o) => o.meetsQuorum).length;
  const quorumRate = ((quorumCount / totalOwners) * 100).toFixed(1);
  const uncertRate = (((uncertCount + l1Count) / totalOwners) * 100).toFixed(1);

  const pieData = [
    { name: "L1 基础", value: l1Count, color: LEVEL_COLORS.L1 },
    { name: "L3 实名", value: l3Count, color: LEVEL_COLORS.L3 },
    { name: "L4 高级", value: l4Count, color: LEVEL_COLORS.L4 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="实名认证等级管理"
        desc="L1 基础 / L3 人脸核身 / L4 更高级 — 重大决议须 L3 及以上方可投票"
      />

      {/* KPI 行 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="L1 基础认证"
          value={l1Count}
          unit="人"
          icon={<ShieldAlert className="size-4" />}
          tone="neutral"
        />
        <KpiCard
          label="L3 实名认证"
          value={l3Count}
          unit="人"
          icon={<ShieldCheck className="size-4" />}
          tone="primary"
        />
        <KpiCard
          label="L4 高级认证"
          value={l4Count}
          unit="人"
          icon={<ShieldCheck className="size-4" />}
          tone="warning"
        />
        <KpiCard
          label="未完成认证占比"
          value={uncertRate}
          unit="%"
          icon={<ShieldOff className="size-4" />}
          tone="danger"
        />
        <KpiCard
          label="重大决议可投票率"
          value={quorumRate}
          unit="%"
          icon={<UserCheck className="size-4" />}
          tone="tech"
          trend={{ value: `${quorumCount} 人满足 L3+ 门槛`, up: true }}
        />
      </div>

      {/* 图表 + 列表 */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* 饼图 */}
        <div className="lg:col-span-4">
          <SectionCard title="认证等级分布" desc="各等级业主占比">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number, name: string) => [
                    `${value} 人`,
                    name,
                  ]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-2 space-y-2 text-sm border-t pt-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-semibold">{d.value}</span>
                    <span className="text-muted-foreground text-xs">
                      {((d.value / totalOwners) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* 认证列表 + 时间轴 */}
        <div className="lg:col-span-8">
          <div className="grid gap-4" style={{ gridTemplateColumns: selectedOwner ? "1fr 1fr" : "1fr" }}>
            {/* 列表 */}
            <SectionCard title="业主认证列表" bodyClassName="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>业主</TableHead>
                    <TableHead>当前等级</TableHead>
                    <TableHead>认证时间</TableHead>
                    <TableHead className="text-center">重大决议资格</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {OWNER_CERTS.map((owner) => {
                    const active = selectedOwner?.id === owner.id;
                    return (
                      <TableRow
                        key={owner.id}
                        className="cursor-pointer"
                        style={{
                          backgroundColor: active ? "#e8f0fb" : undefined,
                        }}
                        onClick={() =>
                          setSelectedOwner(active ? null : owner)
                        }
                      >
                        <TableCell className="font-medium">
                          {owner.name}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={levelTone(owner.currentLevel)}>
                            {levelIcon(owner.currentLevel)}
                            {levelLabel(owner.currentLevel)}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="font-mono-num text-sm">
                          {owner.certTime}
                        </TableCell>
                        <TableCell className="text-center">
                          {owner.meetsQuorum ? (
                            <div className="flex items-center justify-center gap-1 text-green-600">
                              <CheckCircle2 className="size-4" />
                              <StatusChip tone="success">满足</StatusChip>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-red-500">
                              <XCircle className="size-4" />
                              <StatusChip tone="danger">不满足</StatusChip>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight
                            className="size-4 text-muted-foreground"
                            style={{ color: active ? "#1b4f9c" : undefined }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </SectionCard>

            {/* 认证时间轴抽出 */}
            {selectedOwner && (
              <SectionCard
                title={`${selectedOwner.name} · 认证记录`}
                desc={`共 ${selectedOwner.history.length} 条记录`}
                extra={
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedOwner(null)}
                  >
                    ✕ 关闭
                  </button>
                }
              >
                <div className="mb-4 p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground mb-1">当前等级</div>
                  <StatusChip tone={levelTone(selectedOwner.currentLevel)}>
                    {levelIcon(selectedOwner.currentLevel)}
                    {levelLabel(selectedOwner.currentLevel)}
                  </StatusChip>
                  <div className="mt-2 text-xs text-muted-foreground">
                    重大决议资格：
                    {selectedOwner.meetsQuorum ? (
                      <span className="text-green-600 font-medium ml-1">满足 L3+ 门槛 ✓</span>
                    ) : (
                      <span className="text-red-500 font-medium ml-1">不满足，需升级至 L3 ✗</span>
                    )}
                  </div>
                </div>
                <CertTimeline history={selectedOwner.history} />
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
