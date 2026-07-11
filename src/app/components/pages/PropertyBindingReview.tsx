"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw, FileImage } from "lucide-react";
import { PageHeader, SectionCard, StatusChip, EmptyState, KpiCard } from "../gov/common";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  approvePropertyClaim,
  listPropertyClaims,
  rejectPropertyClaim,
  type PropertyClaim,
} from "../../lib/property-binding";

const STATUS_LABEL: Record<PropertyClaim["claimStatus"], string> = {
  AUTO_APPROVED: "自动通过",
  PENDING_VERIFY: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回",
};

const REJECT_REASONS = [
  { code: "MATERIAL_BLURRY", label: "照片不清晰，无法核对姓名与房号" },
  { code: "OWNER_NAME_MISMATCH", label: "产权人姓名不符" },
  { code: "ROOM_MISMATCH", label: "证件房号与申报房号不一致" },
  { code: "MATERIAL_INCOMPLETE", label: "证明材料缺失关键页" },
];

export function PropertyBindingReview() {
  const [status, setStatus] = useState("PENDING_VERIFY");
  const [items, setItems] = useState<PropertyClaim[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [rejectReasonCode, setRejectReasonCode] = useState(REJECT_REASONS[1].code);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[1].label);

  const selected = useMemo(
    () => items.find((item) => item.claimId === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );
  const images = useMemo(() => extractImages(selected?.proofMaterialJson), [selected]);

  async function load() {
    setLoading(true);
    try {
      const page = await listPropertyClaims(status);
      setItems(page.items);
      setSelectedId((current) => current && page.items.some((item) => item.claimId === current) ? current : page.items[0]?.claimId ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function approve() {
    if (!selected) return;
    setActing(true);
    try {
      await approvePropertyClaim(selected.claimId);
      toast.success("审核通过");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setActing(false);
    }
  }

  async function reject() {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.error("驳回原因不能为空");
      return;
    }
    setActing(true);
    try {
      await rejectPropertyClaim(selected.claimId, rejectReason, rejectReasonCode);
      toast.success("已驳回");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="房产绑定审核"
        desc="人工核销 C 端提交的房产申报材料，通过后写入 MANUAL 核验来源。"
        actions={
          <>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_VERIFY">待审核</SelectItem>
                <SelectItem value="APPROVED">已通过</SelectItem>
                <SelectItem value="REJECTED">已驳回</SelectItem>
                <SelectItem value="ALL">全部</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="size-4 mr-2" />
              刷新
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="当前列表" value={items.length} tone="primary" />
        <KpiCard label="待办状态" value={status === "ALL" ? "全部" : status} tone="neutral" />
        <KpiCard label="当前单据" value={selected?.claimId ?? "-"} tone="tech" />
      </div>

      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] gap-6">
        <SectionCard title="审核队列" bodyClassName="p-0">
          {items.length === 0 ? (
            <EmptyState title="暂无房产绑定申报" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>单据</TableHead>
                  <TableHead>房产</TableHead>
                  <TableHead>申请人</TableHead>
                  <TableHead>名册登记</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.claimId}
                    className={selected?.claimId === item.claimId ? "bg-muted/60" : "cursor-pointer"}
                    onClick={() => setSelectedId(item.claimId)}
                  >
                    <TableCell className="font-mono-num">#{item.claimId}</TableCell>
                    <TableCell>{item.buildingName} {item.unitName} {item.roomName}</TableCell>
                    <TableCell>
                      <div>{item.applicantRealName}</div>
                      <div className="text-xs text-muted-foreground font-mono-num">{item.applicantPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div>{item.rosterOwnerName ?? "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono-num">{item.rosterOwnerPhone ?? "-"}</div>
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={item.claimStatus === "PENDING_VERIFY" ? "warning" : item.claimStatus === "APPROVED" ? "success" : "neutral"} dot>
                        {STATUS_LABEL[item.claimStatus]}
                      </StatusChip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard title="证据核销" desc={selected ? `${selected.buildingName} ${selected.unitName} ${selected.roomName}` : undefined}>
          {!selected ? (
            <EmptyState title="请选择单据" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="申请人" value={`${selected.applicantRealName} / ${selected.applicantPhone}`} />
                <Info label="名册登记" value={`${selected.rosterOwnerName ?? "-"} / ${selected.rosterOwnerPhone ?? "-"}`} />
                <Info label="对账结果" value={selected.matchResult} />
                <Info label="共有产权" value={selected.jointOwnership ? "是" : "否"} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <FileImage className="size-4" />
                  证明材料
                </div>
                {images.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">
                    未提交图片材料
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((image, index) => (
                      <img
                        key={`${image.sha256}-${index}`}
                        src={image.base64.startsWith("data:") ? image.base64 : `data:image/jpeg;base64,${image.base64}`}
                        className="w-full aspect-[4/3] object-cover rounded-md border"
                        alt="property proof"
                      />
                    ))}
                  </div>
                )}
              </div>

              {selected.claimStatus === "PENDING_VERIFY" && (
                <div className="space-y-3 pt-2 border-t">
                  <Select
                    value={rejectReasonCode}
                    onValueChange={(value) => {
                      const reason = REJECT_REASONS.find((item) => item.code === value);
                      setRejectReasonCode(value);
                      if (reason) setRejectReason(reason.label);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REJECT_REASONS.map((reason) => (
                        <SelectItem key={reason.code} value={reason.code}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={reject} disabled={acting}>
                      <XCircle className="size-4 mr-2" />
                      驳回
                    </Button>
                    <Button onClick={approve} disabled={acting}>
                      <CheckCircle2 className="size-4 mr-2" />
                      审核通过
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium break-all">{value}</div>
    </div>
  );
}

function extractImages(raw?: string | null): Array<{ sha256: string; base64: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { images?: Array<{ sha256?: string; base64?: string }> };
    return (parsed.images ?? [])
      .filter((item) => item.base64)
      .map((item) => ({ sha256: item.sha256 ?? item.base64!, base64: item.base64! }));
  } catch {
    return [];
  }
}
