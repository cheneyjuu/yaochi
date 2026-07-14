// 关联业务：按已生效的物业管理模式展示公共资金公示和财务监督信息。
import { PageHeader, SectionCard, StatusChip, Money, KpiCard, ModeChip, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useStore } from "../../lib/store";
import { MODE_META } from "../../lib/types";
import { FileDown, Link2 } from "lucide-react";

type Flow = { id: string; date: string; subject: string; amount: number; type: "in" | "out"; party: string; tx?: string };
const FLOWS: Flow[] = [
  { id: "F1", date: "2026-06-12", subject: "信托资金动用 · 保安劳务", amount: 86400, type: "out", party: "嘉和物业", tx: "0x7f3a…2a5b" },
  { id: "F2", date: "2026-06-08", subject: "电梯广告位收益", amount: 48000, type: "in", party: "分众传媒", tx: "0x91be…c4d0" },
  { id: "F3", date: "2026-06-05", subject: "中央监控升级款", amount: 156000, type: "out", party: "安防工程", tx: "0x3c2d…8e6c" },
  { id: "F4", date: "2026-06-01", subject: "地面车位租金", amount: 128000, type: "in", party: "业主自管", tx: "0xa15c…b3e9" },
];

const CHAIN = [
  { tx: "0x7f3a9c2e1b4d8f60a5e7c9d2f1b3a8e6c4d7f9a0b2e5c8d1f4a7b3e9c6d0f2a5b", amount: 86400, time: "2026-06-12 14:09", tone: "success" as Tone, label: "已确认" },
  { tx: "0x3c2d8f1a9b4e6c0d7f2a5b8e1c4d9f6a3b0e7c2d5f8a1b4e9c6d3f0a7b2e5c8d", amount: 156000, time: "2026-06-05 10:31", tone: "success" as Tone, label: "已确认" },
  { tx: "0x91be4c7d2a0f8b3e6c1d9f4a7b2e5c8d0f3a6b9e2c5d8f1a4b7e0c3d6f9a2b5e", amount: 48000, time: "2026-06-08 16:02", tone: "tech" as Tone, label: "打包中" },
];

export function Finance() {
  const { mode, hasPermission, setPage } = useStore();
  const m = MODE_META[mode];

  if (mode === "unconfigured") {
    const canSubmit = hasPermission("property:management-mode:submit");
    return (
      <div className="space-y-5">
        <PageHeader
          title="财务监督 / 公共收益公示"
          desc="当前小区尚未完成物业管理模式配置，暂不展示按模式解释的资金规则。"
          actions={<ModeChip mode={mode} />}
        />
        <SectionCard
          title="等待物业管理模式生效"
          desc="模式必须经小区注册审核确认，或由业委会主任提交业主大会决议后经街道办执行。"
          extra={canSubmit ? <Button onClick={() => setPage("community-settings")}>前往配置申请</Button> : <StatusChip tone="warning">待配置</StatusChip>}
        >
          <div className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-sm text-muted-foreground">
            未配置时不以包干制、酬金制或信托制的任一规则默认展示资金流和审批入口。
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="财务监督 / 公共收益公示"
        desc="资金流水、公共收益分配、第三方审计导出、司法链存证记录。包干制仅公示季度/年度分配，信托制逐笔实时穿透。"
        actions={<Button variant="outline"><FileDown className="size-4" /> 导出全部内账</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="公共收益总额" value="38.60" unit="万元" tone="tech" trend={{ value: "同比 +12.4%", up: true }} />
        <KpiCard label="本期支出" value="24.24" unit="万元" tone="primary" trend={{ value: "环比 -4.1%", up: false }} />
        <KpiCard label="结余" value="14.36" unit="万元" tone="success" />
        <KpiCard label="待审支出" value="3" unit="笔" tone="warning" />
      </div>

      <SectionCard
        title="资金流水"
        desc={`逐笔收支 · 当前模式：${m.label}`}
        extra={<StatusChip tone="info">{mode === "trust" ? "逐笔实时穿透上链" : mode === "reward" ? "委员会审核可见" : "季度/年度公示"}</StatusChip>}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>科目</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>对手方</TableHead>
              {mode === "trust" && <TableHead>上链 TxHash</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {FLOWS.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono-num text-sm">{f.date}</TableCell>
                <TableCell style={{ fontWeight: 500 }}>{f.subject}</TableCell>
                <TableCell className="text-right">
                  <span className="font-mono-num text-sm" style={{ color: f.type === "in" ? "#2e9e5b" : "#d14343" }}>
                    {f.type === "in" ? "+" : "−"}¥{f.amount.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.party}</TableCell>
                {mode === "trust" && (
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-mono-num text-xs" style={{ color: "#0e6e88" }}>
                      <Link2 className="size-3" /> {f.tx} ✓
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="公共收益分配公示">
          <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: m.bg, color: m.color }}>
            {mode === "package" && "包干制：按季度 / 年度公示公共收益分配总览，物业内部行政开支不予公示。"}
            {mode === "reward" && "酬金制：公共收益与物业费开支均纳入委员会审核，按季度分配公示。"}
            {mode === "trust" && "信托制：逐笔发票切片 + 实时穿透，每笔支出即时公示于业主端 C 端看板。"}
          </div>
          <div className="mt-4 space-y-2">
            {[
              { q: "2026 Q2 公共收益分配", amt: 386000 },
              { q: "2026 Q1 公共收益分配", amt: 342000 },
            ].map((r) => (
              <div key={r.q} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>{r.q}</span>
                <div className="flex items-center gap-3">
                  <Money value={r.amt} />
                  <StatusChip tone="success">已公示</StatusChip>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="司法链存证记录" desc="上链交易列表 · 哈希回执">
          <div className="space-y-2.5">
            {CHAIN.map((c) => (
              <div key={c.tx} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <Money value={c.amount} className="text-sm" />
                  <StatusChip tone={c.tone}>{c.label}</StatusChip>
                </div>
                <div className="font-mono-num text-xs text-muted-foreground break-all">{c.tx}</div>
                <div className="font-mono-num text-[11px] text-muted-foreground mt-1">链上时间 {c.time}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
