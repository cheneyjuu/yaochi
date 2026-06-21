import type { ReactNode } from "react";
import { cn } from "../ui/utils";
import { Card } from "../ui/card";
import { CheckCircle2, FileText, Link2, ShieldCheck, Inbox } from "lucide-react";
import type { PropertyMode } from "../../lib/types";
import { MODE_META } from "../../lib/types";

/* ---------------- Tone 系统 ---------------- */
export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "tech" | "neutral";

const TONE: Record<Tone, { bg: string; fg: string; ring: string }> = {
  primary: { bg: "#e8f0fb", fg: "#143c78", ring: "#1b4f9c" },
  success: { bg: "#e8f6ee", fg: "#1f7a45", ring: "#2e9e5b" },
  warning: { bg: "#fcf3da", fg: "#8a6406", ring: "#e0a310" },
  danger: { bg: "#fbe9e9", fg: "#a32f2f", ring: "#d14343" },
  info: { bg: "#e8f0fb", fg: "#2a4f8a", ring: "#3a6fbf" },
  tech: { bg: "#e6f6fa", fg: "#0e6e88", ring: "#19a0c4" },
  neutral: { bg: "#eef2f8", fg: "#5a6677", ring: "#9aa5b5" },
};

/* ---------------- 状态 Chip ---------------- */
export function StatusChip({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs", className)}
      style={{ backgroundColor: t.bg, color: t.fg, fontWeight: 500 }}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ backgroundColor: t.ring }} />}
      {children}
    </span>
  );
}

/* ---------------- 物业模式 Chip ---------------- */
export function ModeChip({ mode, className }: { mode: PropertyMode; className?: string }) {
  const m = MODE_META[mode];
  return (
    <span
      title={m.desc}
      className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs cursor-help", className)}
      style={{ backgroundColor: m.bg, color: m.color, fontWeight: 600 }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

/* ---------------- 范围 Chip（局部 vs 公共） ---------------- */
export function ScopeChip({ scope, building }: { scope: "local" | "global"; building?: string }) {
  return scope === "local" ? (
    <StatusChip tone="warning">🏠 局部 · {building ?? "楼栋"}</StatusChip>
  ) : (
    <StatusChip tone="tech">🌐 公共 · 全局</StatusChip>
  );
}

/* ---------------- 等宽金额 ---------------- */
export function Money({
  value,
  prefix = "¥",
  className,
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={cn("font-mono-num", className)}>
      {prefix}
      {value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

/* ---------------- 进度环 ---------------- */
export function ProgressRing({
  value, // 0-100
  threshold, // 红线刻度 0-100
  label,
  sub,
  size = 200,
  passed,
}: {
  value: number;
  threshold?: number;
  label?: string;
  sub?: string;
  size?: number;
  passed?: boolean;
}) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * c;
  const ringColor = passed ? "#2e9e5b" : "url(#govTech)";
  // 红线角度
  const thAngle = threshold != null ? (threshold / 100) * 360 - 90 : null;
  const cx = size / 2;
  const tick =
    thAngle != null
      ? {
          x1: cx + (r - stroke / 2) * Math.cos((thAngle * Math.PI) / 180),
          y1: cx + (r - stroke / 2) * Math.sin((thAngle * Math.PI) / 180),
          x2: cx + (r + stroke / 2) * Math.cos((thAngle * Math.PI) / 180),
          y2: cx + (r + stroke / 2) * Math.sin((thAngle * Math.PI) / 180),
        }
      : null;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="govTech" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#19a0c4" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eef2f8" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
        {tick && (
          <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#d14343" strokeWidth={3} />
        )}
      </svg>
      <div className="-mt-[60%] mb-[40%] flex flex-col items-center" style={{ height: 0 }}>
        <div className="font-mono-num" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, color: passed ? "#2e9e5b" : "#0e6e88" }}>
          {value.toFixed(1)}%
        </div>
        {label && <div className="text-xs text-muted-foreground mt-0.5">{label}</div>}
        {threshold != null && (
          <div className="text-[11px] mt-0.5" style={{ color: "#d14343" }}>
            红线 {threshold.toFixed(1)}%
          </div>
        )}
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ---------------- KPI 卡 ---------------- */
export function KpiCard({
  label,
  value,
  unit,
  trend,
  tone = "primary",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: string; up?: boolean };
  tone?: Tone;
  icon?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <Card className="p-4 gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && (
          <span className="grid place-items-center size-7 rounded-md" style={{ backgroundColor: t.bg, color: t.ring }}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="font-mono-num" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: t.ring }}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
      </div>
      {trend && (
        <div className="text-xs" style={{ color: trend.up ? "#2e9e5b" : "#d14343" }}>
          {trend.up ? "▲" : "▼"} {trend.value}
        </div>
      )}
    </Card>
  );
}

/* ---------------- 状态机步骤条 ---------------- */
export interface Step {
  key: string;
  label: string;
}
export function Stepper({
  steps,
  current,
  rejected,
  locked,
}: {
  steps: Step[];
  current: number; // 已完成到第几步（index）
  rejected?: boolean;
  locked?: number; // 被锁定的步骤 index
}) {
  return (
    <div className="flex items-center w-full">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const isLocked = locked === i;
        const color = isLocked ? "#d14343" : rejected && i === current ? "#d14343" : done ? "#2e9e5b" : active ? "#1b4f9c" : "#cbd4e1";
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className="grid place-items-center size-7 rounded-full text-xs text-white"
                style={{ backgroundColor: color }}
              >
                {done ? <CheckCircle2 className="size-4" /> : isLocked ? "🔒" : i + 1}
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: active || done ? "#1f2733" : "#9aa5b5", fontWeight: active ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-5" style={{ backgroundColor: i < current ? "#2e9e5b" : "#e3e8f0" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 哈希回执卡 ---------------- */
export function HashReceipt({
  txHash,
  timestamp,
  amount,
}: {
  txHash: string;
  timestamp: string;
  amount?: number;
}) {
  return (
    <div className="rounded-lg p-4 text-white gov-tech-gradient">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="size-4" />
        <span className="text-sm" style={{ fontWeight: 600 }}>已写入最高院司法链</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[11px]">
          <span className="size-1.5 rounded-full bg-white gov-pulse" /> 链上确认
        </span>
      </div>
      <div className="text-[11px] opacity-80 mb-1">交易哈希 TxHash</div>
      <div className="font-mono-num text-sm break-all bg-black/15 rounded px-2 py-1.5 mb-3">{txHash}</div>
      <div className="flex items-center justify-between text-[11px] opacity-90">
        <span>链上时间戳 {timestamp}</span>
        {amount != null && <span className="font-mono-num">¥{amount.toLocaleString("zh-CN")}</span>}
      </div>
      <button className="mt-3 inline-flex items-center gap-1 text-[11px] underline opacity-90 hover:opacity-100">
        <Link2 className="size-3" /> 查看存证详情
      </button>
    </div>
  );
}

/* ---------------- 文件预览卡 ---------------- */
export function FileCard({ name, meta }: { name: string; meta?: string }) {
  return (
    <button className="flex items-center gap-3 w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 transition-colors">
      <span className="grid place-items-center size-10 rounded-md bg-[#e8f0fb] text-primary shrink-0">
        <FileText className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm truncate" style={{ fontWeight: 500 }}>{name}</span>
        {meta && <span className="block text-xs text-muted-foreground truncate">{meta}</span>}
      </span>
      <span className="text-xs text-primary shrink-0">预览</span>
    </button>
  );
}

/* ---------------- 区块卡 ---------------- */
export function SectionCard({
  title,
  desc,
  extra,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  desc?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("p-0 overflow-hidden", className)}>
      {(title || extra) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border">
          <div>
            {title && <h3 style={{ fontWeight: 600 }}>{title}</h3>}
            {desc && <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>}
          </div>
          {extra && <div className="shrink-0">{extra}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

/* ---------------- 页面标题 ---------------- */
export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, lineHeight: "32px" }}>{title}</h1>
        {desc && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ---------------- 空状态 ---------------- */
export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="grid place-items-center size-14 rounded-full bg-muted text-muted-foreground mb-3">
        <Inbox className="size-7" />
      </span>
      <p style={{ fontWeight: 500 }}>{title}</p>
      {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
    </div>
  );
}

/* ---------------- 只读遮罩提示条 ---------------- */
export function ReadonlyNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#e0a310]/40 bg-[#fcf3da] px-3 py-2 text-xs" style={{ color: "#8a6406" }}>
      <span>🔒</span>
      {children ?? "当前角色对本模块为只读权限，操作按钮已禁用。"}
    </div>
  );
}
