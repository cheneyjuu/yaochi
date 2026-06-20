import { useStore, ROLES } from "../../lib/store";
import { KpiCard, SectionCard, StatusChip, PageHeader, Money } from "../gov/common";
import { Button } from "../ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { AlertTriangle, Vote, FileCheck2, Wrench, Megaphone } from "lucide-react";

const trend = [
  { m: "1月", 参与率: 58, 收益: 12 },
  { m: "2月", 参与率: 62, 收益: 9 },
  { m: "3月", 参与率: 67, 收益: 14 },
  { m: "4月", 参与率: 71, 收益: 11 },
  { m: "5月", 参与率: 69, 收益: 16 },
  { m: "6月", 参与率: 74, 收益: 18 },
];

const todos = [
  { id: 1, icon: Vote, text: "“主干道翻修 15 万元”议题表决中，当前专有面积通过率 64%", tone: "primary" as const, tag: "议题" },
  { id: 2, icon: FileCheck2, text: "信托资金核销待您第二签：保安公司月度劳务费 ¥86,400", tone: "danger" as const, tag: "待双签" },
  { id: 3, icon: Wrench, text: "1 号楼顶层漏水维修工单待表决（局部 · 仅本楼栋）", tone: "warning" as const, tag: "工单" },
  { id: 4, icon: Megaphone, text: "二季度公共收益分配公示已发布，触达 1240 户", tone: "info" as const, tag: "公示" },
];

export function Overview() {
  const { role, community, lockdown, setLockdown, setPage } = useStore();
  const roleMeta = ROLES.find((r) => r.id === role)!;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${roleMeta.name}工作台`}
        desc={`欢迎回来 · 当前${community.name} · 数据范围：${roleMeta.scope}。以下为角色自适应的待办、关键指标与最新公示。`}
        actions={
          <Button variant="outline" onClick={() => setLockdown(!lockdown)}>
            {lockdown ? "解除换届熔断（演示）" : "模拟换届熔断（演示）"}
          </Button>
        }
      />

      {lockdown && (
        <div className="flex items-center gap-2 rounded-lg p-4 gov-lock-stripes border border-[#d14343]/40" style={{ color: "#a32f2f" }}>
          <AlertTriangle className="size-5" />
          <div>
            <div style={{ fontWeight: 600 }}>本小区处于换届熔断期</div>
            <div className="text-sm">大额资金划拨接口已死锁，所有放行操作被锁定，直至换届纠纷处置完成。</div>
          </div>
          <Button variant="destructive" className="ml-auto" onClick={() => setPage("term-management")}>
            进入处置页
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="进行中议题" value="3" unit="项" tone="primary" icon={<Vote className="size-4" />} trend={{ value: "较上月 +1", up: true }} />
        <KpiCard label="待我审批" value="5" unit="项" tone="danger" icon={<FileCheck2 className="size-4" />} />
        <KpiCard label="本期公共收益" value="38.6" unit="万元" tone="tech" icon={<Megaphone className="size-4" />} trend={{ value: "同比 +12.4%", up: true }} />
        <KpiCard label="未结维修工单" value="8" unit="单" tone="warning" icon={<Wrench className="size-4" />} trend={{ value: "较上月 -3", up: false }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="我的待办" desc="按角色与数据范围过滤" className="lg:col-span-2">
          <div className="space-y-2.5">
            {todos.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40 transition-colors">
                  <span className="grid place-items-center size-9 rounded-md bg-muted text-primary shrink-0">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="flex-1 text-sm">{t.text}</span>
                  <StatusChip tone={t.tone}>{t.tag}</StatusChip>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="换届熔断提醒" desc="HANDOVER_LOCK 全局态">
          {lockdown ? (
            <div className="rounded-lg p-4 gov-lock-stripes border border-[#d14343]/40 text-sm" style={{ color: "#a32f2f" }}>
              <div style={{ fontWeight: 600 }}>⚠ 熔断生效中</div>
              <p className="mt-1">大额资金划拨已锁定，需完成换届纠纷处置后由街道办/书记解除。</p>
            </div>
          ) : (
            <div className="rounded-lg p-4 border border-[#2e9e5b]/30 bg-[#e8f6ee] text-sm" style={{ color: "#1f7a45" }}>
              <div style={{ fontWeight: 600 }}>✓ 当前无熔断</div>
              <p className="mt-1">委员会运行正常，资金通道开放。</p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="表决参与率趋势" desc="近 6 个月（%）">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ left: -16, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gPart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#19a0c4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="参与率" stroke="#19a0c4" strokeWidth={2} fill="url(#gPart)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="公共收益（万元/月）" desc="近 6 个月">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
              <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="收益" fill="#1b4f9c" radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="最新公示" desc="穿透至业主端 C 端公示">
        <div className="divide-y divide-border">
          {[
            { t: "二季度公共收益分配公示", d: "2026-06-18", amt: 386000 },
            { t: "电梯广告位招商收益入账公示", d: "2026-06-12", amt: 48000 },
            { t: "1 号楼屋面防水维修资金使用公示", d: "2026-06-05", amt: 62000 },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-4 py-3">
              <span className="text-sm flex-1">{r.t}</span>
              <Money value={r.amt} className="text-sm" />
              <span className="text-xs text-muted-foreground w-24 text-right font-mono-num">{r.d}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
