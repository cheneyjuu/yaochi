import { useState } from "react";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Vote,
  Wallet,
  Wrench,
  ShieldCheck,
  TrendingUp,
  Users,
  Download,
  FileText,
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";

type ReportType =
  | "participation"
  | "finance"
  | "workorder"
  | "certification"
  | "revenue"
  | "election";

interface ReportCard {
  id: ReportType;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  desc: string;
  iconColor: string;
  iconBg: string;
  tag: string;
  tagTone: "primary" | "success" | "tech" | "warning" | "info" | "neutral";
}

const REPORT_CARDS: ReportCard[] = [
  {
    id: "participation",
    icon: Vote,
    name: "表决参与率报表",
    desc: "统计近期各议题表决参与率趋势，用于评估业主自治活跃度与 G 端合规审核。",
    iconColor: "#1b4f9c",
    iconBg: "#e8f0fb",
    tag: "表决",
    tagTone: "primary",
  },
  {
    id: "finance",
    icon: Wallet,
    name: "财务收支报表",
    desc: "汇总专项维修资金、物业费、公共收益的收支结构，供年审与监管备案。",
    iconColor: "#0e6e88",
    iconBg: "#e6f6fa",
    tag: "财务",
    tagTone: "tech",
  },
  {
    id: "workorder",
    icon: Wrench,
    name: "工单时效报表",
    desc: "分析维修工单从创建到结单的时效分布，追踪物业服务响应能力。",
    iconColor: "#8a6406",
    iconBg: "#fcf3da",
    tag: "工单",
    tagTone: "warning",
  },
  {
    id: "certification",
    icon: ShieldCheck,
    name: "实名认证率报表",
    desc: "按楼栋统计 L1~L3 实名认证完成情况，确保表决分母有效性。",
    iconColor: "#1f7a45",
    iconBg: "#e8f6ee",
    tag: "认证",
    tagTone: "success",
  },
  {
    id: "revenue",
    icon: TrendingUp,
    name: "公共收益分配报表",
    desc: "电梯广告、停车场等公共收益的入账与分配明细，穿透至各业主权益账户。",
    iconColor: "#3a6fbf",
    iconBg: "#eef2f8",
    tag: "收益",
    tagTone: "info",
  },
  {
    id: "election",
    icon: Users,
    name: "换届选举报表",
    desc: "候选人得票统计、参选资格核验、换届过程合规性审计，供街道办存档。",
    iconColor: "#1b4f9c",
    iconBg: "#e8f0fb",
    tag: "选举",
    tagTone: "primary",
  },
];

// --- Mock chart data ---

const participationData = [
  { month: "1月", 参与率: 58, 目标: 66.7 },
  { month: "2月", 参与率: 62, 目标: 66.7 },
  { month: "3月", 参与率: 67, 目标: 66.7 },
  { month: "4月", 参与率: 71, 目标: 66.7 },
  { month: "5月", 参与率: 69, 目标: 66.7 },
  { month: "6月", 参与率: 74, 目标: 66.7 },
];

const financeData = [
  { month: "1月", 收入: 48, 支出: 32 },
  { month: "2月", 收入: 42, 支出: 28 },
  { month: "3月", 收入: 55, 支出: 41 },
  { month: "4月", 收入: 60, 支出: 38 },
  { month: "5月", 收入: 52, 支出: 45 },
  { month: "6月", 收入: 68, 支出: 36 },
];

const workorderData = [
  { range: "0-1天", 工单数: 18 },
  { range: "1-3天", 工单数: 34 },
  { range: "3-7天", 工单数: 22 },
  { range: "7-14天", 工单数: 11 },
  { range: "14天+", 工单数: 5 },
];

const certificationData = [
  { building: "1号楼", L3: 78, L2: 12, L1: 8, 未认证: 2 },
  { building: "2号楼", L3: 82, L2: 10, L1: 5, 未认证: 3 },
  { building: "3号楼", L3: 71, L2: 15, L1: 9, 未认证: 5 },
  { building: "4号楼", L3: 88, L2: 8, L1: 3, 未认证: 1 },
  { building: "5号楼", L3: 65, L2: 18, L1: 12, 未认证: 5 },
];

const revenueData = [
  { month: "1月", 停车费: 18, 广告位: 4, 其他: 2 },
  { month: "2月", 停车费: 16, 广告位: 4, 其他: 1.5 },
  { month: "3月", 停车费: 19, 广告位: 5, 其他: 3 },
  { month: "4月", 停车费: 21, 广告位: 4, 其他: 2.5 },
  { month: "5月", 停车费: 20, 广告位: 6, 其他: 2 },
  { month: "6月", 停车费: 22, 广告位: 4.8, 其他: 2.2 },
];

const electionData = [
  { name: "王志远", 有效票: 512, 楼栋支持: 8 },
  { name: "李秀兰", 有效票: 476, 楼栋支持: 7 },
  { name: "张明华", 有效票: 398, 楼栋支持: 6 },
  { name: "刘建国", 有效票: 351, 楼栋支持: 5 },
  { name: "陈丽华", 有效票: 289, 楼栋支持: 4 },
];

function ParticipationChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={participationData} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19a0c4" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} unit="%" />
        <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
        <Legend />
        <Line
          type="monotone"
          dataKey="目标"
          stroke="#d14343"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="参与率"
          stroke="#19a0c4"
          strokeWidth={2.5}
          fill="url(#rGrad1)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FinanceChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={financeData} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rGrad2a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19a0c4" />
            <stop offset="100%" stopColor="#1b4f9c" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} unit="万" />
        <Tooltip formatter={(v: number) => [`¥${v}万`, ""]} />
        <Legend />
        <Bar dataKey="收入" fill="url(#rGrad2a)" radius={[3, 3, 0, 0]} barSize={18} />
        <Bar dataKey="支出" fill="#e0a310" radius={[3, 3, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function WorkorderChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={workorderData} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rGrad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#19a0c4" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
        <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} unit="单" />
        <Tooltip formatter={(v: number) => [`${v}单`, "工单数"]} />
        <Bar dataKey="工单数" fill="url(#rGrad3)" radius={[4, 4, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CertificationChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={certificationData} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3e8f0" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="户" />
        <YAxis type="category" dataKey="building" tickLine={false} axisLine={false} fontSize={12} width={48} />
        <Tooltip />
        <Legend />
        <Bar dataKey="L3" stackId="a" fill="#1b4f9c" />
        <Bar dataKey="L2" stackId="a" fill="#19a0c4" />
        <Bar dataKey="L1" stackId="a" fill="#2dd4bf" />
        <Bar dataKey="未认证" stackId="a" fill="#e3e8f0" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={revenueData} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rGradRev1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b4f9c" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#1b4f9c" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="rGradRev2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19a0c4" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#19a0c4" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="rGradRev3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} unit="万" />
        <Tooltip formatter={(v: number) => [`¥${v}万`, ""]} />
        <Legend />
        <Area type="monotone" dataKey="停车费" stroke="#1b4f9c" strokeWidth={2} fill="url(#rGradRev1)" />
        <Area type="monotone" dataKey="广告位" stroke="#19a0c4" strokeWidth={2} fill="url(#rGradRev2)" />
        <Area type="monotone" dataKey="其他" stroke="#2dd4bf" strokeWidth={2} fill="url(#rGradRev3)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ElectionChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={electionData} layout="vertical" margin={{ left: 8, right: 32, top: 8 }}>
        <defs>
          <linearGradient id="rGradEl" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1b4f9c" />
            <stop offset="100%" stopColor="#19a0c4" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3e8f0" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="票" />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={52} />
        <Tooltip formatter={(v: number) => [`${v}票`, "有效票"]} />
        <Bar dataKey="有效票" fill="url(#rGradEl)" radius={[0, 4, 4, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const CHART_MAP: Record<ReportType, { chart: React.ReactNode; title: string; desc: string }> = {
  participation: {
    chart: <ParticipationChart />,
    title: "表决参与率趋势",
    desc: "近 6 个月各月平均参与率（%），红虚线为双过半法定红线 66.7%",
  },
  finance: {
    chart: <FinanceChart />,
    title: "财务收支结构",
    desc: "近 6 个月各月收入与支出（万元）对比",
  },
  workorder: {
    chart: <WorkorderChart />,
    title: "工单时效分布",
    desc: "按工单从创建到结单的天数区间统计（单）",
  },
  certification: {
    chart: <CertificationChart />,
    title: "实名认证率（按楼栋）",
    desc: "各楼栋 L1~L3 实名认证完成情况堆叠分布",
  },
  revenue: {
    chart: <RevenueChart />,
    title: "公共收益来源趋势",
    desc: "近 6 个月按停车费 / 广告位 / 其他分类的收益（万元）",
  },
  election: {
    chart: <ElectionChart />,
    title: "换届选举候选人得票",
    desc: "本届选举有效票数排名，前 5 名候选人",
  },
};

export function Reports() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [timeRange, setTimeRange] = useState("2026-q2");
  const [communityRange, setCommunityRange] = useState("all");
  const [exportFormat, setExportFormat] = useState("excel");

  function handleExport(type?: ReportType) {
    const t = type ?? selectedType;
    if (!t) {
      toast.error("请先选择报表类型");
      return;
    }
    const card = REPORT_CARDS.find((c) => c.id === t)!;
    const formatLabel = exportFormat === "excel" ? "Excel" : exportFormat === "pdf" ? "PDF" : "CSV";
    toast.success(`正在导出「${card.name}」· ${formatLabel} 格式，请稍候…`);
  }

  const selectedChart = selectedType ? CHART_MAP[selectedType] : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="统计报表导出"
        desc="导出治理运营报表（表决参与率、财务收支、工单时效、认证率等），供 G 端监管与年审备案，支持 Excel / PDF / CSV 格式。"
        actions={
          <Button
            onClick={() => handleExport()}
            disabled={!selectedType}
          >
            <Download className="size-4" />
            导出选中报表
          </Button>
        }
      />

      {/* 报表类型卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedType === card.id;
          return (
            <div
              key={card.id}
              className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                isSelected
                  ? "border-[#1b4f9c] bg-[#e8f0fb]"
                  : "border-border bg-card hover:border-[#1b4f9c]/40 hover:shadow-sm"
              }`}
              onClick={() => setSelectedType(card.id)}
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className="grid place-items-center size-10 rounded-lg shrink-0"
                  style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                >
                  <Icon className="size-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{card.name}</span>
                    <StatusChip tone={card.tagTone}>{card.tag}</StatusChip>
                  </div>
                  {isSelected && (
                    <span className="text-xs mt-0.5 inline-block" style={{ color: "#1b4f9c", fontWeight: 500 }}>
                      已选中 · 预览中
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{card.desc}</p>
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType(card.id);
                  handleExport(card.id);
                }}
              >
                <Download className="size-3.5" />
                导出此报表
              </Button>
            </div>
          );
        })}
      </div>

      {/* 报表预览区 */}
      {selectedChart ? (
        <SectionCard
          title={
            <div className="flex items-center gap-2">
              <BarChart2 className="size-4" style={{ color: "#19a0c4" }} />
              <span>{selectedChart.title}</span>
              <span
                className="ml-1 inline-block rounded px-2 py-0.5 text-xs font-normal"
                style={{ background: "linear-gradient(135deg, #1b4f9c 0%, #19a0c4 100%)", color: "#fff" }}
              >
                数据预览
              </span>
            </div>
          }
          desc={selectedChart.desc}
          extra={
            <StatusChip tone="tech" dot>
              看板科技风
            </StatusChip>
          }
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, #f0f5ff 0%, #e6f6fa 50%, #f0fbfa 100%)",
              border: "1px solid #d0e4f5",
            }}
          >
            {selectedChart.chart}
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="报表预览">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <FileText className="size-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">点击上方卡片选择报表类型，此处将显示数据预览图表</p>
          </div>
        </SectionCard>
      )}

      {/* 导出参数区 */}
      <SectionCard
        title="导出参数"
        desc="配置时间范围、小区范围与文件格式后点击导出"
        extra={
          <Button onClick={() => handleExport()} disabled={!selectedType}>
            <Download className="size-4" />
            导出
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">时间范围</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-q2">2026 年 Q2（4–6月）</SelectItem>
                <SelectItem value="2026-q1">2026 年 Q1（1–3月）</SelectItem>
                <SelectItem value="2025-annual">2025 年全年</SelectItem>
                <SelectItem value="2026-h1">2026 年上半年</SelectItem>
                <SelectItem value="custom">自定义时间段</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">小区范围</label>
            <Select value={communityRange} onValueChange={setCommunityRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全小区</SelectItem>
                <SelectItem value="a-zone">A区（1–3号楼）</SelectItem>
                <SelectItem value="b-zone">B区（4–6号楼）</SelectItem>
                <SelectItem value="c-zone">C区（7–8号楼）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">导出格式</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel（.xlsx）</SelectItem>
                <SelectItem value="pdf">PDF（.pdf）</SelectItem>
                <SelectItem value="csv">CSV（.csv）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {!selectedType && (
          <div
            className="mt-4 rounded-md px-3 py-2 text-xs flex items-center gap-2"
            style={{ backgroundColor: "#fcf3da", color: "#8a6406", border: "1px solid #e0a310aa" }}
          >
            <FileText className="size-3.5 shrink-0" />
            请先在上方选择报表类型，再配置参数导出。
          </div>
        )}
      </SectionCard>
    </div>
  );
}
