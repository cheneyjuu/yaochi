// 关联业务：施工单位统一处理维修邀价，以及已签约维修工程的施工、材料和结算任务。
import { useEffect, useState } from "react";
import { BriefcaseBusiness, FileText, Inbox, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SupplierProjectWorkbench } from "./repair/SupplierProjectWorkbench";
import { SupplierProjectQuoteWorkbench } from "./repair/SupplierProjectQuoteWorkbench";
import {
  listSupplierRepairWorkOrders,
  deleteSupplierQuoteAttachment,
  submitSupplierWorkbenchQuote,
  uploadSupplierQuoteAttachment,
  type RepairAttachment,
  type RepairSupplierWorkOrder,
} from "../../lib/repair";

export function SupplierWorkbench() {
  return (
    <div className="space-y-5">
      <PageHeader title="供应商工作台" />
      <Tabs defaultValue="project-quotes" className="gap-4">
        <TabsList className="rounded-md">
          <TabsTrigger value="project-quotes" className="rounded-sm">工程邀价</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-sm">施工项目</TabsTrigger>
          <TabsTrigger value="legacy-quotes" className="rounded-sm">历史工单邀价</TabsTrigger>
        </TabsList>
        <TabsContent value="project-quotes"><SupplierProjectQuoteWorkbench /></TabsContent>
        <TabsContent value="projects"><SupplierProjectWorkbench /></TabsContent>
        <TabsContent value="legacy-quotes"><SupplierQuoteWorkbench /></TabsContent>
      </Tabs>
    </div>
  );
}

function SupplierQuoteWorkbench() {
  const [orders, setOrders] = useState<RepairSupplierWorkOrder[]>([]);
  const [selected, setSelected] = useState<RepairSupplierWorkOrder | null>(null);
  const [amount, setAmount] = useState("");
  const [summary, setSummary] = useState("");
  const [attachment, setAttachment] = useState<RepairAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
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
    if (!selected || !attachment) return;
    setSubmitting(true);
    try {
      await submitSupplierWorkbenchQuote(selected.workOrderId, {
        quoteAmount: Number(amount),
        quoteSummary: summary,
        attachmentId: attachment.attachmentId,
        originalSource: "SUPPLIER_PDF",
      });
      toast.success("报价已提交");
      setAmount("");
      setSummary("");
      setAttachment(null);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadQuoteDocument(file: File) {
    if (!selected) return;
    setUploading(true);
    try {
      if (attachment) {
        await deleteSupplierQuoteAttachment(selected.workOrderId, attachment.attachmentId);
      }
      setAttachment(await uploadSupplierQuoteAttachment(selected.workOrderId, file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价原件上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void reload()} disabled={loading}>
          <RefreshCw className="mr-1 size-4" />刷新
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title="待报价工单" bodyClassName="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />加载中
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <Inbox className="mb-3 size-8 text-muted-foreground/60" />
              <div className="text-sm font-medium text-foreground">尚未收到维修邀价</div>
              <div className="mt-1 text-xs text-muted-foreground">账号已开通，当前没有物业发给本企业的待报价工单</div>
            </div>
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
                {selected.publicCeilingPrice != null && (
                  <div className="mt-2 text-sm font-medium text-foreground">
                    公开最高限价：¥{Number(selected.publicCeilingPrice).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </div>
                )}
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
                <Label htmlFor="supplier-quote-file">报价原件</Label>
                <Input
                  id="supplier-quote-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadQuoteDocument(file);
                    event.target.value = "";
                  }}
                  disabled={uploading}
                />
                <div className="mt-1 flex min-h-5 items-center text-xs text-muted-foreground">
                  {uploading ? <><Loader2 className="mr-1 size-3.5 animate-spin" />正在上传</> : attachment ? (
                    <><FileText className="mr-1 size-3.5" />{attachment.originalFileName}</>
                  ) : "支持 PDF、图片、Word、Excel，单个文件不超过 20MB"}
                </div>
              </div>
              <Button className="w-full" onClick={() => void submitQuote()} disabled={submitting || uploading || !amount || !attachment}>
                {submitting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                提交报价
              </Button>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
