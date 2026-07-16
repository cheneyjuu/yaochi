// 关联业务：施工单位查看锁定维修范围，逐项填写报价明细并以报价原件完成在线确认。
import { useEffect, useMemo, useState } from "react";
import { FileCheck2, Inbox, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RichTextView } from "../../common/RichTextEditor";
import { SectionCard, StatusChip } from "../../gov/common";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  listSupplierRepairProjectQuoteOpportunities,
  submitSupplierRepairProjectQuote,
  type RepairProjectAttachment,
  type RepairSupplierQuoteOpportunity,
} from "../../../lib/repair-project";
import { RepairProjectFileUpload } from "./RepairProjectFileUpload";
import {
  calculateRepairQuoteTotal,
  createRepairQuoteDraftLines,
  RepairProjectQuoteDetail,
  RepairProjectQuoteEditor,
  toRepairQuoteLineInputs,
  validateRepairQuoteDraft,
  type RepairQuoteLineDraft,
} from "./RepairProjectQuoteEditor";

function plannedPeriodDays(start: string, completion: string): number {
  const startAt = new Date(`${start}T00:00:00`).getTime();
  const completionAt = new Date(`${completion}T00:00:00`).getTime();
  if (!Number.isFinite(startAt) || !Number.isFinite(completionAt)) return 1;
  return Math.max(1, Math.round((completionAt - startAt) / 86_400_000) + 1);
}

export function SupplierProjectQuoteWorkbench() {
  const [opportunities, setOpportunities] = useState<RepairSupplierQuoteOpportunity[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<RepairQuoteLineDraft[]>([]);
  const [constructionPeriodDays, setConstructionPeriodDays] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("");
  const [summary, setSummary] = useState("");
  const [attachment, setAttachment] = useState<RepairProjectAttachment | null>(null);
  const [originalAmountConfirmed, setOriginalAmountConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const selected = opportunities.find((item) => item.invitation.invitationId === selectedId) ?? null;

  async function reload() {
    setLoading(true);
    try {
      const data = await listSupplierRepairProjectQuoteOpportunities();
      setOpportunities(data);
      setSelectedId((current) => data.some((item) => item.invitation.invitationId === current)
        ? current
        : data[0]?.invitation.invitationId ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "工程邀价加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!selected) {
      setLines([]);
      setConstructionPeriodDays("");
      setWarrantyDays("");
      return;
    }
    setLines(createRepairQuoteDraftLines(selected.items));
    setConstructionPeriodDays(String(plannedPeriodDays(selected.plannedStartDate, selected.plannedCompletionDate)));
    setWarrantyDays(String(selected.warrantyDays ?? 0));
    setSummary("");
    setAttachment(null);
    setOriginalAmountConfirmed(false);
  }, [selectedId, selected?.planId]);

  const draftError = useMemo(
    () => selected ? validateRepairQuoteDraft(lines, selected.items) : "请选择工程邀价",
    [lines, selected],
  );
  const total = useMemo(() => calculateRepairQuoteTotal(lines), [lines]);
  const periodValid = constructionPeriodDays.trim() !== "" && Number.isInteger(Number(constructionPeriodDays))
    && Number(constructionPeriodDays) > 0
    && Number(constructionPeriodDays) <= 3650;
  const warrantyValid = warrantyDays.trim() !== "" && Number.isInteger(Number(warrantyDays))
    && Number(warrantyDays) >= 0
    && Number(warrantyDays) <= 3650;

  async function submitQuote() {
    if (!selected || !attachment || selected.invitation.status !== "PENDING"
      || draftError || !periodValid || !warrantyValid || !originalAmountConfirmed) return;
    setSubmitting(true);
    try {
      await submitSupplierRepairProjectQuote(selected.projectId, {
        invitationId: selected.invitation.invitationId,
        quoteAmount: total,
        quoteSummary: summary.trim() || undefined,
        attachmentId: attachment.attachmentId,
        constructionPeriodDays: Number(constructionPeriodDays),
        warrantyDays: Number(warrantyDays),
        originalAmountConfirmed,
        quoteLines: toRepairQuoteLineInputs(lines),
      });
      toast.success("工程报价已提交并完成在线确认");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "工程报价提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard title="维修工程邀价" extra={<Button size="icon" variant="ghost" title="刷新工程邀价" onClick={() => void reload()} disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}</Button>} bodyClassName="p-0">
        {loading && opportunities.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />加载中</div>
        ) : opportunities.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center"><Inbox className="mb-3 size-8 text-muted-foreground/60" /><div className="text-sm font-medium">当前没有维修工程邀价</div><div className="mt-1 text-xs text-muted-foreground">物业发出项目邀价或报价修订要求后会显示在这里</div></div>
        ) : (
          <div className="divide-y">{opportunities.map((opportunity) => (
            <button key={opportunity.invitation.invitationId} type="button" onClick={() => setSelectedId(opportunity.invitation.invitationId)} className={`w-full px-4 py-3 text-left hover:bg-muted/40 ${selectedId === opportunity.invitation.invitationId ? "bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{opportunity.projectName}</div><div className="mt-1 text-xs text-muted-foreground">{opportunity.projectNo} · 第 {opportunity.invitation.invitationRound} 轮</div></div><StatusChip tone={opportunity.invitation.status === "PENDING" ? "warning" : "success"}>{opportunity.invitation.status === "PENDING" ? opportunity.invitation.invitationType === "REVISION" ? "待修订" : "待报价" : "已提交"}</StatusChip></div>
              <div className="mt-2 text-xs text-muted-foreground">截止 {opportunity.invitation.deadline ? new Date(opportunity.invitation.deadline).toLocaleString("zh-CN", { hour12: false }) : "未设置"}</div>
            </button>
          ))}</div>
        )}
      </SectionCard>

      <SectionCard title={selected?.projectName ?? "工程报价"} desc={selected ? `${selected.projectNo} · 第 ${selected.invitation.invitationRound} 轮报价` : undefined} bodyClassName="min-h-[420px]">
        {!selected ? <div className="py-20 text-center text-sm text-muted-foreground">请选择一条工程邀价</div> : (
          <div className="space-y-6">
            <div className="grid gap-3 border-b pb-5 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">报价轮次：</span>第 {selected.invitation.invitationRound} 轮</div><div><span className="text-muted-foreground">计划开工：</span>{selected.plannedStartDate}</div><div><span className="text-muted-foreground">计划完工：</span>{selected.plannedCompletionDate}</div></div>
            <div><div className="mb-2 text-sm font-medium">问题与维修方案</div><RichTextView html={selected.planDescription} /></div>
            <div className="overflow-x-auto border-y"><table className="w-full min-w-[640px] text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">编号</th><th className="p-2 text-left">位置</th><th className="p-2 text-left">工作内容</th><th className="p-2 text-right">数量</th></tr></thead><tbody>{selected.items.map((item) => <tr key={item.itemId} className="border-t"><td className="p-2">{item.itemNo}</td><td className="p-2">{item.locationText}</td><td className="p-2">{item.workContent}</td><td className="p-2 text-right">{item.quantity} {item.unit}</td></tr>)}</tbody></table></div>
            <div className="grid gap-4 text-sm md:grid-cols-2"><div><div className="mb-1 text-muted-foreground">施工管理要求</div><RichTextView html={selected.constructionManagementRequirements} /></div><div><div className="mb-1 text-muted-foreground">安全要求</div><RichTextView html={selected.safetyRequirements} /></div></div>

            {selected.latestQuote && (
              <div className="space-y-3 border-y bg-muted/20 px-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><div><span className="font-medium">最近报价 ¥{Number(selected.latestQuote.quoteAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span><span className="ml-3 text-muted-foreground">第 {selected.latestQuote.revisionNo} 版</span></div><StatusChip tone={selected.latestQuote.quoteStatus === "REVISION_REQUESTED" ? "warning" : "success"}>{selected.latestQuote.quoteStatus === "REVISION_REQUESTED" ? "物业要求修订" : "已在线确认"}</StatusChip></div>
                <RepairProjectQuoteDetail quote={selected.latestQuote} />
              </div>
            )}

            {selected.invitation.status === "PENDING" ? (
              <div className="space-y-5 border-t pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>施工工期（天）</Label><Input type="number" min="1" max="3650" step="1" value={constructionPeriodDays} onChange={(event) => setConstructionPeriodDays(event.target.value)} /></div>
                  <div><Label>质保期（天）</Label><Input type="number" min="0" max="3650" step="1" value={warrantyDays} onChange={(event) => setWarrantyDays(event.target.value)} /></div>
                </div>
                <div><div className="mb-2 text-sm font-medium">报价明细</div><RepairProjectQuoteEditor items={selected.items} lines={lines} onChange={setLines} /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <RepairProjectFileUpload projectId={selected.projectId} label="盖章报价原件" value={attachment} onUploaded={setAttachment} />
                  <div><Label>报价说明</Label><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="填写工期、税费、主要材料及报价边界" /></div>
                </div>
                <label className="flex items-start gap-3 border-y px-3 py-3 text-sm"><Checkbox className="mt-0.5" checked={originalAmountConfirmed} onCheckedChange={(checked) => setOriginalAmountConfirmed(checked === true)} /><span>我已核对线上报价明细含税合计与上传的盖章报价原件总额一致。</span></label>
                <div className="flex flex-wrap items-center justify-between gap-3"><div className={`text-sm ${draftError || !periodValid || !warrantyValid ? "text-amber-700" : "text-muted-foreground"}`}>{draftError ?? (!periodValid ? "施工工期应为 1 至 3650 天" : !warrantyValid ? "质保期应为 0 至 3650 天" : `待提交含税总额 ¥${total.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`)}</div><Button disabled={submitting || Boolean(draftError) || !periodValid || !warrantyValid || !attachment || !originalAmountConfirmed} onClick={() => void submitQuote()}>{submitting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <FileCheck2 className="mr-1 size-4" />}提交并确认报价</Button></div>
              </div>
            ) : <div className="py-5 text-center text-sm text-muted-foreground">本轮报价已提交，等待物业比价；如需修订，物业会发出新的修订轮次。</div>}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
