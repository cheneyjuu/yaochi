import { useEffect, useState } from "react";
import { BriefcaseBusiness, ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  listSupplierRepairWorkOrders,
  submitSupplierWorkbenchQuote,
  type RepairWorkOrder,
} from "../../lib/repair";

export function SupplierWorkbench() {
  const [orders, setOrders] = useState<RepairWorkOrder[]>([]);
  const [selected, setSelected] = useState<RepairWorkOrder | null>(null);
  const [amount, setAmount] = useState("");
  const [summary, setSummary] = useState("");
  const [attachmentHash, setAttachmentHash] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const data = await listSupplierRepairWorkOrders();
      setOrders(data);
      setSelected((current) => data.find((item) => item.workOrderId === current?.workOrderId) ?? data[0] ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "待报价工单加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function submitQuote() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await submitSupplierWorkbenchQuote(selected.workOrderId, {
        quoteAmount: Number(amount),
        quoteSummary: summary,
        attachmentHash,
        originalAttachmentHash: attachmentHash,
        originalSource: "SUPPLIER_PDF",
      });
      toast.success("报价已提交");
      setAmount("");
      setSummary("");
      setAttachmentHash("");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="供应商工作台"
        desc="本企业收到的维修邀价与报价提交"
        actions={(
          <Button variant="outline" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className="mr-1 size-4" />刷新
          </Button>
        )}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title="待报价工单" bodyClassName="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />加载中
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">暂无待报价工单</div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <button
                  key={order.workOrderId}
                  type="button"
                  onClick={() => setSelected(order)}
                  className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-muted/40 ${selected?.workOrderId === order.workOrderId ? "bg-primary/5" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{order.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{order.orderNo} · 楼栋 {order.buildingId ?? "-"}</div>
                  </div>
                  <StatusChip tone="warning">待报价</StatusChip>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="提交报价" desc={selected?.orderNo ?? "请选择工单"}>
          {!selected ? (
            <div className="py-10 text-center text-sm text-muted-foreground">请选择一条邀价</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BriefcaseBusiness className="size-4" />{selected.title}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{selected.surveySummary || "物业尚未填写现场勘验摘要"}</div>
              </div>
              <div>
                <Label>含税总价</Label>
                <Input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </div>
              <div>
                <Label>报价说明</Label>
                <Textarea rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="维修范围、材料、工期与保修承诺" />
              </div>
              <div>
                <Label>盖章报价单</Label>
                <Input value={attachmentHash} onChange={(event) => setAttachmentHash(event.target.value)} placeholder="已上传报价单的文件标识" />
              </div>
              <Button className="w-full" onClick={() => void submitQuote()} disabled={submitting || !amount || !attachmentHash}>
                {submitting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ClipboardList className="mr-1 size-4" />}
                提交报价
              </Button>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
