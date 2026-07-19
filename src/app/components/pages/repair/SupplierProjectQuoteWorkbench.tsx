// 关联业务：施工单位查看锁定维修范围，逐项填写报价明细并以报价原件完成在线确认。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, FileCheck2, Inbox, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RichTextView } from "../../common/RichTextEditor";
import { SectionCard, StatusChip } from "../../gov/common";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
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

function money(value: number): string {
  return `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function workPointLocation(point: RepairSupplierQuoteOpportunity["workPoints"][number]): string {
  const reference = point.locationType === "REFERENCE_ROOM"
    ? "关联房屋（档案已关联）"
    : point.commonAreaName || "公共部位";
  return [point.buildingId ? `${point.buildingId} 号楼` : "", point.unitName || "", reference, point.spaceName, point.component, point.specificPart]
    .filter(Boolean)
    .join(" · ");
}

function QuoteFormStep({
  step,
  title,
  description,
  status,
  last = false,
  children,
}: {
  step: number;
  title: string;
  description: string;
  status?: ReactNode;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pt-6 first:pt-0">
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
          {step}
        </span>
        {!last && <span className="my-2 w-px flex-1 bg-border" />}
      </div>
      <div className={last ? "min-w-0" : "min-w-0 border-b pb-6"}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-base font-semibold leading-5">{title}</h4>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
          {status && <div className="shrink-0">{status}</div>}
        </header>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

export function SupplierProjectQuoteWorkbench() {
  const [opportunities, setOpportunities] = useState<RepairSupplierQuoteOpportunity[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<RepairQuoteLineDraft[]>([]);
  const [taxRate, setTaxRate] = useState("9");
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
      setTaxRate("9");
      setConstructionPeriodDays("");
      setWarrantyDays("");
      return;
    }
    setLines(createRepairQuoteDraftLines());
    setTaxRate("9");
    setConstructionPeriodDays("");
    setWarrantyDays("");
    setSummary("");
    setAttachment(null);
    setOriginalAmountConfirmed(false);
  }, [selectedId, selected?.planId]);

  const draftError = useMemo(
    () => selected ? validateRepairQuoteDraft(lines, selected.workPoints, taxRate) : "请选择工程邀价",
    [lines, selected, taxRate],
  );
  const total = useMemo(() => calculateRepairQuoteTotal(lines, taxRate), [lines, taxRate]);
  const periodValid = constructionPeriodDays.trim() !== "" && Number.isInteger(Number(constructionPeriodDays))
    && Number(constructionPeriodDays) > 0
    && Number(constructionPeriodDays) <= 3650;
  const warrantyValid = warrantyDays.trim() !== "" && Number.isInteger(Number(warrantyDays))
    && Number(warrantyDays) >= 0
    && Number(warrantyDays) <= 3650;
  const completionIssues = selected?.invitation.status === "PENDING"
    ? [
        draftError,
        periodValid ? null : "填写 1 至 3650 天的施工工期",
        warrantyValid ? null : "填写 0 至 3650 天的质保期",
        attachment ? null : "上传盖章报价原件",
        originalAmountConfirmed ? null : "确认线上金额与报价原件一致",
      ].filter((issue): issue is string => Boolean(issue))
    : [];
  const canSubmit = selected?.invitation.status === "PENDING" && completionIssues.length === 0;

  async function submitQuote() {
    if (!selected || !attachment || selected.invitation.status !== "PENDING"
      || !canSubmit) return;
    setSubmitting(true);
    try {
      await submitSupplierRepairProjectQuote(selected.projectId, {
        invitationId: selected.invitation.invitationId,
        quoteAmount: total,
        taxRate: Number(taxRate),
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
            <button key={opportunity.invitation.invitationId} type="button" onClick={() => setSelectedId(opportunity.invitation.invitationId)} className={`w-full border-l-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${selectedId === opportunity.invitation.invitationId ? "border-l-primary bg-primary/5" : "border-l-transparent"}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{opportunity.projectName}</div><div className="mt-1 text-xs text-muted-foreground">{opportunity.projectNo} · 第 {opportunity.invitation.invitationRound} 轮</div></div><StatusChip tone={opportunity.invitation.status === "PENDING" ? "warning" : "success"}>{opportunity.invitation.status === "PENDING" ? opportunity.invitation.invitationType === "REVISION" ? "待修订" : "待报价" : "已提交"}</StatusChip></div>
              <div className="mt-2 text-xs text-muted-foreground">截止 {opportunity.invitation.deadline ? new Date(opportunity.invitation.deadline).toLocaleString("zh-CN", { hour12: false }) : "未设置"}</div>
            </button>
          ))}</div>
        )}
      </SectionCard>

      <SectionCard title={selected?.projectName ?? "工程报价"} desc={selected ? `${selected.projectNo} · 第 ${selected.invitation.invitationRound} 轮报价` : undefined} bodyClassName="min-h-[420px]">
        {!selected ? <div className="py-20 text-center text-sm text-muted-foreground">请选择一条工程邀价</div> : (
          <div className="space-y-6">
            <Collapsible key={selected.invitation.invitationId} defaultOpen className="border-y">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-3">
                <div>
                  <h4 className="text-base font-semibold">工程范围与要求</h4>
                  <p className="mt-1 text-sm text-muted-foreground">报价前核对物业锁定的方案、工程量和施工要求。</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone="neutral">维修点位 {selected.workPoints.length} 个</StatusChip>
                  <CollapsibleTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" title="展开或收起工程范围" className="transition-transform data-[state=open]:rotate-180">
                      <ChevronDown className="size-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
                <div className="grid divide-y border-t text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="px-4 py-3"><div className="text-xs text-muted-foreground">报价轮次</div><div className="mt-1 font-medium">第 {selected.invitation.invitationRound} 轮</div></div>
                  <div className="px-4 py-3"><div className="text-xs text-muted-foreground">维修点位</div><div className="mt-1 font-medium">{selected.workPoints.length} 个</div></div>
                  <div className="px-4 py-3"><div className="text-xs text-muted-foreground">项目通用明细</div><div className="mt-1 font-medium">允许不关联点位</div></div>
                </div>
                <div className="border-t px-4 py-4">
                  <h5 className="mb-2 text-sm font-semibold">问题与维修方案</h5>
                  <RichTextView html={selected.planDescription} />
                </div>
                <div className="overflow-x-auto border-t">
                  <table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">维修对象</th><th className="p-2 text-left">结构化位置</th><th className="p-2 text-left">问题现象</th><th className="p-2 text-left">拟定措施</th><th className="p-2 text-right">范围量</th></tr></thead><tbody>{selected.workPoints.map((point) => <tr key={point.workPointId} className="border-t"><td className="p-2 font-medium">{point.businessName}</td><td className="p-2">{workPointLocation(point)}</td><td className="p-2">{point.symptom}</td><td className="p-2">{point.proposedMeasure}</td><td className="p-2 text-right">{point.quantity == null ? "-" : `${point.quantity} ${point.unit ?? ""}`}</td></tr>)}</tbody></table>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {selected.latestQuote && (
              <section className="border-y">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-sm"><div><span className="font-semibold">上一版报价 {money(selected.latestQuote.quoteAmount)}</span><span className="ml-3 text-muted-foreground">第 {selected.latestQuote.revisionNo} 版</span></div><StatusChip tone={selected.latestQuote.quoteStatus === "REVISION_REQUESTED" ? "warning" : "success"}>{selected.latestQuote.quoteStatus === "REVISION_REQUESTED" ? "物业要求修订" : "已在线确认"}</StatusChip></div>
                <div className="px-4 py-4"><RepairProjectQuoteDetail quote={selected.latestQuote} /></div>
              </section>
            )}

            {selected.invitation.status === "PENDING" ? (
              <div className="border-t pt-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">填写本轮报价</h3>
                    <p className="mt-1 text-sm text-muted-foreground">截止 {selected.invitation.deadline ? new Date(selected.invitation.deadline).toLocaleString("zh-CN", { hour12: false }) : "未设置"}</p>
                  </div>
                  <StatusChip tone={selected.invitation.invitationType === "REVISION" ? "warning" : "info"}>{selected.invitation.invitationType === "REVISION" ? "修订报价" : "首次报价"}</StatusChip>
                </div>

                <div>
                  <QuoteFormStep
                    step={1}
                    title="填写履约周期"
                    description="按本次报价承诺填写施工工期和质保期，单位均为自然日。"
                    status={<StatusChip tone={periodValid && warrantyValid ? "success" : "warning"}>{periodValid && warrantyValid ? "已填写" : "待完善"}</StatusChip>}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label>施工工期（天）</Label><Input type="number" min="1" max="3650" step="1" value={constructionPeriodDays} onChange={(event) => setConstructionPeriodDays(event.target.value)} /></div>
                      <div><Label>质保期（天）</Label><Input type="number" min="0" max="3650" step="1" value={warrantyDays} onChange={(event) => setWarrantyDays(event.target.value)} /></div>
                    </div>
                  </QuoteFormStep>

                  <QuoteFormStep
                    step={2}
                    title="填写报价明细"
                    description="逐项填写不含税单价，系统根据整单税率计算税额和含税总额。"
                    status={<StatusChip tone={draftError ? "warning" : "success"}>{draftError ? "待完善" : "明细已完整"}</StatusChip>}
                  >
                    <RepairProjectQuoteEditor workPoints={selected.workPoints} lines={lines} taxRate={taxRate} onChange={setLines} onTaxRateChange={setTaxRate} />
                  </QuoteFormStep>

                  <QuoteFormStep
                    step={3}
                    title="上传原件并确认"
                    description="上传盖章报价原件，并确认线上结构化金额与原件完全一致。"
                    status={<StatusChip tone={attachment && originalAmountConfirmed ? "success" : "warning"}>{attachment && originalAmountConfirmed ? "材料已确认" : "待确认"}</StatusChip>}
                    last
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <RepairProjectFileUpload projectId={selected.projectId} label="盖章报价原件" value={attachment} onUploaded={setAttachment} />
                      <div><Label>报价说明（选填）</Label><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="填写主要材料、税费、施工组织或其他报价边界" /></div>
                    </div>
                    <label className="mt-4 flex items-start gap-3 border-y bg-muted/20 px-3 py-3 text-sm"><Checkbox className="mt-0.5" checked={originalAmountConfirmed} onCheckedChange={(checked) => setOriginalAmountConfirmed(checked === true)} /><span>我已核对线上报价明细的不含税合计、整单税率和含税总额与上传的盖章报价原件一致。</span></label>
                  </QuoteFormStep>
                </div>

                <div className="sticky bottom-0 z-10 mt-6 flex flex-col gap-3 border-y bg-background/95 px-3 py-3 shadow-[0_-10px_24px_-22px_rgba(15,23,42,0.8)] backdrop-blur sm:flex-row sm:items-center">
                  <div className="shrink-0"><div className="text-xs text-muted-foreground">本次含税报价</div><div className="mt-1 text-lg font-semibold tabular-nums">{money(total)}</div></div>
                  <div className={`min-w-0 flex-1 text-sm ${canSubmit ? "text-emerald-700" : "text-amber-700"}`} aria-live="polite">
                    {canSubmit ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4" />报价信息已完整，可以提交确认</span> : <span className="inline-flex items-start gap-1.5"><AlertCircle className="mt-0.5 size-4 shrink-0" />还需完成 {completionIssues.length} 项：{completionIssues[0]}</span>}
                  </div>
                  <Button className="w-full sm:w-auto" disabled={submitting || !canSubmit} onClick={() => void submitQuote()}>{submitting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <FileCheck2 className="mr-1 size-4" />}提交并确认报价</Button>
                </div>
              </div>
            ) : <div className="py-5 text-center text-sm text-muted-foreground">本轮报价已提交，等待物业比价；如需修订，物业会发出新的修订轮次。</div>}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
