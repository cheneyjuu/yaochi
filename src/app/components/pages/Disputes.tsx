"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Gavel, Loader2, RefreshCw } from "lucide-react";
import { PageHeader, SectionCard, StatusChip, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { listGovDisputes, type Dispute, type DisputeStatus } from "../../lib/dispute";
import { useStore } from "../../lib/store";

const STATUS_LABEL: Record<DisputeStatus, string> = {
  RAISED: "待受理",
  UNDER_REVIEW_LEVEL_1: "一级审查",
  DECIDED_LEVEL_1_UPHELD: "一级支持",
  DECIDED_LEVEL_1_REJECTED: "一级驳回",
  DECIDED_LEVEL_1_PARTIAL: "一级部分支持",
  UNDER_REVIEW_LEVEL_2: "二级审查",
  DECIDED_LEVEL_2_UPHELD: "二级支持",
  DECIDED_LEVEL_2_REJECTED: "二级驳回",
  DECIDED_LEVEL_2_PARTIAL: "二级部分支持",
  UNDER_REVIEW_LEVEL_3: "三级审查",
  DECIDED_LEVEL_3_UPHELD: "三级支持",
  DECIDED_LEVEL_3_REJECTED: "三级驳回",
  DECIDED_LEVEL_3_PARTIAL: "三级部分支持",
  UNDER_REVIEW_LEVEL_4: "四级审查",
  DECIDED_LEVEL_4_UPHELD: "四级支持",
  DECIDED_LEVEL_4_REJECTED: "四级驳回",
  DECIDED_LEVEL_4_PARTIAL: "四级部分支持",
  LITIGATION_FILED: "行政诉讼",
  CLOSED_FINAL: "已结案",
  WITHDRAWN: "已撤回",
};

const STATUS_TONE: Record<DisputeStatus, Tone> = {
  RAISED: "warning",
  UNDER_REVIEW_LEVEL_1: "tech",
  DECIDED_LEVEL_1_UPHELD: "success",
  DECIDED_LEVEL_1_REJECTED: "danger",
  DECIDED_LEVEL_1_PARTIAL: "warning",
  UNDER_REVIEW_LEVEL_2: "tech",
  DECIDED_LEVEL_2_UPHELD: "success",
  DECIDED_LEVEL_2_REJECTED: "danger",
  DECIDED_LEVEL_2_PARTIAL: "warning",
  UNDER_REVIEW_LEVEL_3: "tech",
  DECIDED_LEVEL_3_UPHELD: "success",
  DECIDED_LEVEL_3_REJECTED: "danger",
  DECIDED_LEVEL_3_PARTIAL: "warning",
  UNDER_REVIEW_LEVEL_4: "tech",
  DECIDED_LEVEL_4_UPHELD: "success",
  DECIDED_LEVEL_4_REJECTED: "danger",
  DECIDED_LEVEL_4_PARTIAL: "warning",
  LITIGATION_FILED: "primary",
  CLOSED_FINAL: "neutral",
  WITHDRAWN: "neutral",
};

const KIND_LABEL: Record<string, string> = {
  EXPENSE_VOUCHER_DISPUTE: "费用凭证异议",
  PROPOSAL_QUALITY_DISPUTE: "议题质量异议",
  OFFLINE_VOTE_DISPUTE: "线下投票异议",
  ADMINISTRATIVE_REJECTION_DISPUTE: "行政驳回异议",
};

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Disputes() {
  const { hasPermission } = useStore();
  const canRead = hasPermission("dispute:audit");
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<Dispute | null>(null);

  async function reload() {
    if (!canRead) return;
    setLoading(true);
    try {
      const next = await listGovDisputes({
        level: level === "ALL" ? undefined : Number(level),
        status,
        limit: 100,
      });
      setItems(next);
      setSelected((current) => {
        if (current == null) return next[0] ?? null;
        return next.find((item) => item.disputeId === current.disputeId) ?? next[0] ?? null;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "矛盾调解列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [canRead]);

  const stats = useMemo(() => {
    const reviewing = items.filter((item) => item.status.startsWith("UNDER_REVIEW")).length;
    const raised = items.filter((item) => item.status === "RAISED").length;
    const closed = items.filter((item) => item.status === "CLOSED_FINAL" || item.status === "WITHDRAWN").length;
    return { total: items.length, raised, reviewing, closed };
  }, [items]);

  if (!canRead) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader title="矛盾调解" desc="当前账号没有矛盾调解查看权限" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="矛盾调解"
        desc="业主异议受理、层级审查和调解结果跟踪"
        actions={
          <Button variant="outline" onClick={() => void reload()} disabled={loading}>
            {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <RefreshCw className="size-4 mr-1" />}
            刷新
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="全部" value={stats.total} />
        <Metric label="待受理" value={stats.raised} tone="warning" />
        <Metric label="审查中" value={stats.reviewing} tone="tech" />
        <Metric label="已关闭" value={stats.closed} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <SectionCard title="调解列表" bodyClassName="p-0">
          <div className="flex flex-col gap-3 border-b p-3 md:flex-row">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部层级</SelectItem>
                <SelectItem value="1">一级</SelectItem>
                <SelectItem value="2">二级</SelectItem>
                <SelectItem value="3">三级</SelectItem>
                <SelectItem value="4">四级</SelectItem>
                <SelectItem value="5">行政诉讼</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="RAISED">待受理</SelectItem>
                <SelectItem value="UNDER_REVIEW_LEVEL_1">一级审查</SelectItem>
                <SelectItem value="UNDER_REVIEW_LEVEL_2">二级审查</SelectItem>
                <SelectItem value="UNDER_REVIEW_LEVEL_3">三级审查</SelectItem>
                <SelectItem value="UNDER_REVIEW_LEVEL_4">四级审查</SelectItem>
                <SelectItem value="LITIGATION_FILED">行政诉讼</SelectItem>
                <SelectItem value="CLOSED_FINAL">已结案</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void reload()}>查询</Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> 加载中
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">暂无调解事项</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>事项</TableHead>
                  <TableHead>层级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发起时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.disputeId}
                    className={selected?.disputeId === item.disputeId ? "bg-primary/5" : "cursor-pointer hover:bg-muted/40"}
                    onClick={() => setSelected(item)}
                  >
                    <TableCell>
                      <div className="font-medium">{KIND_LABEL[item.disputeKind] ?? item.disputeKind}</div>
                      <div className="font-mono-num text-xs text-muted-foreground">#{item.disputeId}</div>
                    </TableCell>
                    <TableCell className="font-mono-num">{item.currentReviewLevel}</TableCell>
                    <TableCell>
                      <StatusChip tone={STATUS_TONE[item.status]} dot>{STATUS_LABEL[item.status]}</StatusChip>
                    </TableCell>
                    <TableCell className="font-mono-num text-sm">{fmtDate(item.raisedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        {selected ? (
          <SectionCard title="事项详情" desc={`#${selected.disputeId}`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{KIND_LABEL[selected.disputeKind] ?? selected.disputeKind}</div>
                  <div className="mt-1 text-sm text-muted-foreground">业主 #{selected.raisedByOwnerId}</div>
                </div>
                <StatusChip tone={STATUS_TONE[selected.status]} dot>{STATUS_LABEL[selected.status]}</StatusChip>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="小区 tenant" value={String(selected.tenantId)} />
                <Detail label="关联房产" value={selected.relatedPropertyOpid ? `opid ${selected.relatedPropertyOpid}` : "-"} />
                <Detail label="业务类型" value={selected.relatedEntityType ?? "-"} />
                <Detail label="业务编号" value={selected.relatedEntityId != null ? String(selected.relatedEntityId) : "-"} />
              </div>
              {selected.relatedPropertyOpid == null && (
                <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  该事项缺少关联房产，网格员身份不会看到此事项。
                </div>
              )}
              <pre className="max-h-56 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                {selected.businessPayloadJson || "{}"}
              </pre>
            </div>
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Gavel className="mx-auto mb-3 size-8 opacity-40" />
              请选择一条调解事项。
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "primary" }: { label: string; value: number; tone?: Tone }) {
  return (
    <div className="rounded-md border px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        <StatusChip tone={tone}>件</StatusChip>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value}</div>
    </div>
  );
}
