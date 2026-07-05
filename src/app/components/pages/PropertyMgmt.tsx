import { PageHeader, SectionCard, StatusChip, Money, ModeChip, KpiCard } from "../gov/common";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useStore } from "../../lib/store";
import { MODE_META } from "../../lib/types";
import { Lock, Plus, ArrowRight } from "lucide-react";

const income = [
  { id: "IN-201", item: "地面车位租金", amount: 128000, party: "业主自管车位", date: "2026-06-01" },
  { id: "IN-202", item: "电梯轿厢广告位", amount: 48000, party: "分众传媒", date: "2026-06-05" },
  { id: "IN-203", item: "外墙广告位", amount: 36000, party: "本地广告商", date: "2026-06-08" },
  { id: "IN-204", item: "充电桩场地分成", amount: 12600, party: "特来电", date: "2026-06-12" },
];

export function PropertyMgmt() {
  const { mode, setMode, setPage } = useStore();
  const m = MODE_META[mode];

  return (
    <div className="space-y-5">
      <PageHeader
        title="财务监督 · 收益与开支录入"
        desc="录入公共收益与治理模式相关开支，后续进入公示、开支审批或双签核销流程。下方“模式驱动差异化”随当前小区模式切换。"
        actions={
          <div className="flex items-center gap-1.5 rounded-md border border-border p-1">
            {(["package", "reward", "trust"] as const).map((md) => (
              <button
                key={md}
                onClick={() => setMode(md)}
                className={`rounded px-3 py-1 text-sm transition-colors ${mode === md ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                {MODE_META[md].label}
              </button>
            ))}
          </div>
        }
      />

      {/* 模式说明条 */}
      <div className="flex items-start gap-3 rounded-lg border p-4" style={{ borderColor: m.color + "55", backgroundColor: m.bg }}>
        <ModeChip mode={mode} />
        <p className="text-sm flex-1" style={{ color: m.color }}>{m.desc}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="本期公共收益" value="22.46" unit="万元" tone="tech" />
        <KpiCard label="车位类收益" value="14.06" unit="万元" tone="primary" />
        <KpiCard label="广告类收益" value="8.40" unit="万元" tone="info" />
        <KpiCard label="待分配结余" value="18.92" unit="万元" tone="success" />
      </div>

      {/* 公共收益录入区（三模式都有） */}
      <SectionCard
        title="公共收益录入"
        desc="物业代收的、归属业委会的公共收益（车位费、电梯广告等）"
        extra={<Button size="sm"><Plus className="size-4" /> 录入收益</Button>}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>编号</TableHead>
              <TableHead>收益项目</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>对手方</TableHead>
              <TableHead>入账日期</TableHead>
              {mode === "trust" && <TableHead>上链</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {income.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono-num text-sm">{r.id}</TableCell>
                <TableCell style={{ fontWeight: 500 }}>{r.item}</TableCell>
                <TableCell className="text-right"><Money value={r.amount} className="text-sm" /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.party}</TableCell>
                <TableCell className="font-mono-num text-sm">{r.date}</TableCell>
                {mode === "trust" && <TableCell><StatusChip tone="tech">已穿透 ✓</StatusChip></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {/* 包干制：物业费内账区灰显 */}
      {mode === "package" && (
        <SectionCard title="物业费内部行政开支 / 外包合同明细">
          <div className="relative">
            <div className="opacity-40 pointer-events-none select-none space-y-2">
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted w-3/4" />
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex items-center gap-2 rounded-md bg-card border border-border px-4 py-2.5 text-sm shadow-sm">
                <Lock className="size-4 text-muted-foreground" />
                <span>包干制下此区域隐藏 —— 保障物业企业商业隐私与自主经营权</span>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* 酬金制：物业费开支单区 */}
      {mode === "reward" && (
        <SectionCard
          title="物业费开支单"
          desc="酬金制下物业经理可发起开支单，进入“待业委会初审”状态机"
          extra={<Button variant="outline" size="sm" onClick={() => setPage("expense-approval")}>前往开支审批 <ArrowRight className="size-4" /></Button>}
        >
          <div className="rounded-lg border border-[#3a6fbf]/30 bg-[#e8f0fb] p-4 text-sm" style={{ color: "#2a4f8a" }}>
            当前小区为<b>酬金制</b>：全小区财务对委员会只读，物业经理被次级扩权可发起物业费开支单。每笔开支须经业委会主任初审核销。
          </div>
        </SectionCard>
      )}

      {/* 信托制：信托资金动用入口 */}
      {mode === "trust" && (
        <SectionCard
          title="信托资金动用申请"
          desc="信托制下物业为职业经理人，每笔支出实时穿透至业主端 C 端看板"
          extra={<Button variant="outline" size="sm" onClick={() => setPage("dual-sign")}>前往双签核销台 <ArrowRight className="size-4" /></Button>}
        >
          <div className="rounded-lg border border-[#19a0c4]/30 bg-[#e6f6fa] p-4 text-sm" style={{ color: "#0e6e88" }}>
            当前小区为<b>信托制</b>：物业关联信托公共共有基金账户。每笔信托资金动用须双密码双签并写入司法链，实时穿透公示。
          </div>
        </SectionCard>
      )}
    </div>
  );
}
