// 关联业务：物业在维修工程方案内完成供应商邀价、报价原件核验、横向比价、修订和中选建议。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, CheckCircle2, FileCheck2, FilePlus2, FileText, Loader2, ReceiptText, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { listRepairFrameworkRelations, type RepairFrameworkRelation, type RepairSupplierOrganization } from "../../../lib/repair";
import {
  inviteRepairProjectSuppliers,
  getRepairProjectAttachmentTicket,
  requestRepairProjectQuoteRevisions,
  selectRepairProjectSupplier,
  submitPropertyRepairProjectQuote,
  type RepairProjectAttachment,
  type RepairProjectDetails,
  type RepairProjectQuoteInvitation,
  type RepairProjectSourcingDetails,
  type RepairProjectSupplierQuote,
} from "../../../lib/repair-project";
import { StatusChip, type Tone } from "../../gov/common";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
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

const METHOD_LABEL = {
  COMPETITIVE_QUOTATION: "竞争性询价",
  FRAMEWORK_SUPPLIER: "框架供应商",
  DIRECT_AWARD: "依法直接委托",
  EMERGENCY_APPOINTMENT: "紧急指定",
} as const;

const SOURCE_LABEL: Record<RepairProjectSupplierQuote["submissionSource"], string> = {
  SUPPLIER_ONLINE: "供应商在线提交",
  PROPERTY_ENTRY: "物业核验原件后录入",
};

const INVITATION_STATUS_META: Record<RepairProjectQuoteInvitation["status"], { label: string; tone: Tone }> = {
  PENDING: { label: "等待报价", tone: "warning" },
  SUBMITTED: { label: "已提交", tone: "success" },
  DECLINED: { label: "已拒绝", tone: "neutral" },
  EXPIRED: { label: "已逾期", tone: "warning" },
  CANCELLED: { label: "已取消", tone: "neutral" },
};

function localDateTimeAfter(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000 - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function money(value: number): string {
  return `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "未设置";
}

function plannedPeriodDays(start?: string, completion?: string): number {
  if (!start || !completion) return 1;
  const startAt = new Date(`${start}T00:00:00`).getTime();
  const completionAt = new Date(`${completion}T00:00:00`).getTime();
  if (!Number.isFinite(startAt) || !Number.isFinite(completionAt)) return 1;
  return Math.max(1, Math.round((completionAt - startAt) / 86_400_000) + 1);
}

function SourcingStep({
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
            <h5 className="text-base font-semibold leading-5 text-foreground">{title}</h5>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
          {status && <div className="shrink-0">{status}</div>}
        </header>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

export function RepairProjectSourcingOperation({
  details,
  sourcing,
  suppliers,
  remember,
  busy,
  run,
  onReload,
  onOpenSupplierDirectory,
}: {
  details: RepairProjectDetails;
  sourcing: RepairProjectSourcingDetails | null;
  suppliers: RepairSupplierOrganization[];
  remember: (attachment: RepairProjectAttachment) => void;
  busy: string | null;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<boolean>;
  onReload: () => Promise<void>;
  onOpenSupplierDirectory: () => void;
}) {
  const project = details.project;
  const [inviteSupplierIds, setInviteSupplierIds] = useState<number[]>([]);
  const [inviteDeadline, setInviteDeadline] = useState(localDateTimeAfter(3));
  const [quoteSupplierId, setQuoteSupplierId] = useState("");
  const [quoteLines, setQuoteLines] = useState<RepairQuoteLineDraft[]>([]);
  const [quoteTaxRate, setQuoteTaxRate] = useState("9");
  const [quoteConstructionPeriodDays, setQuoteConstructionPeriodDays] = useState("");
  const [quoteWarrantyDays, setQuoteWarrantyDays] = useState("");
  const [quoteOriginalAmountConfirmed, setQuoteOriginalAmountConfirmed] = useState(false);
  const [quoteSummary, setQuoteSummary] = useState("");
  const [quoteSource, setQuoteSource] = useState("PAPER");
  const [quoteFile, setQuoteFile] = useState<RepairProjectAttachment | null>(null);
  const [revisionSupplierIds, setRevisionSupplierIds] = useState<number[]>([]);
  const [revisionDeadline, setRevisionDeadline] = useState(localDateTimeAfter(3));
  const [revisionReason, setRevisionReason] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [recommendationReason, setRecommendationReason] = useState("");
  const [insufficientQuoteReason, setInsufficientQuoteReason] = useState("");
  const [frameworkRelationId, setFrameworkRelationId] = useState("");
  const [frameworkRelations, setFrameworkRelations] = useState<RepairFrameworkRelation[]>([]);
  const [detailQuoteId, setDetailQuoteId] = useState<number | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  const verifiedSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.verificationStatus === "VERIFIED"),
    [suppliers],
  );
  const invitedSupplierIds = useMemo(
    () => new Set(sourcing?.invitations.map((item) => item.supplierDeptId) ?? []),
    [sourcing?.invitations],
  );
  const quoteSuppliers = useMemo(
    () => sourcing?.selectionMethod === "COMPETITIVE_QUOTATION"
      ? verifiedSuppliers.filter((supplier) => invitedSupplierIds.has(supplier.supplierDeptId))
      : verifiedSuppliers,
    [invitedSupplierIds, sourcing?.selectionMethod, verifiedSuppliers],
  );
  const activeQuotes = useMemo(
    () => (sourcing?.quotes ?? []).filter((quote) => quote.quoteStatus === "ACTIVE"),
    [sourcing?.quotes],
  );
  const activeConfirmedQuotes = useMemo(
    () => activeQuotes.filter((quote) =>
      ["ONLINE_CONFIRMED", "OFFLINE_EVIDENCE_VERIFIED", "CONTRACT_CONFIRMED"].includes(quote.confirmationStatus)),
    [activeQuotes],
  );
  const activeConfirmedSupplierIds = useMemo(
    () => new Set(activeConfirmedQuotes.map((quote) => quote.supplierDeptId)),
    [activeConfirmedQuotes],
  );
  const activeQuoteSupplierIds = useMemo(
    () => new Set(activeQuotes.map((quote) => quote.supplierDeptId)),
    [activeQuotes],
  );
  const manualEntrySuppliers = useMemo(
    () => quoteSuppliers.filter((supplier) => !activeQuoteSupplierIds.has(supplier.supplierDeptId)),
    [activeQuoteSupplierIds, quoteSuppliers],
  );
  const responseRows = useMemo(() => {
    const rows = new Map<number, {
      supplierDeptId: number;
      supplierName: string;
      invitation?: RepairProjectQuoteInvitation;
      quote?: RepairProjectSupplierQuote;
    }>();
    const currentInvitations = [...(sourcing?.invitations ?? [])]
      .filter((invitation) => invitation.status !== "CANCELLED")
      .sort((left, right) => left.invitationRound - right.invitationRound);
    currentInvitations.forEach((invitation) => rows.set(invitation.supplierDeptId, {
      supplierDeptId: invitation.supplierDeptId,
      supplierName: invitation.supplierName,
      invitation,
    }));
    activeQuotes.forEach((quote) => rows.set(quote.supplierDeptId, {
      ...rows.get(quote.supplierDeptId),
      supplierDeptId: quote.supplierDeptId,
      supplierName: quote.supplierName,
      quote,
    }));
    return [...rows.values()];
  }, [activeQuotes, sourcing?.invitations]);
  const selectedQuote = activeConfirmedQuotes.find((quote) => String(quote.quoteId) === selectedQuoteId);
  const initialInvitationCount = new Set((sourcing?.invitations ?? [])
    .filter((item) => item.invitationType === "INITIAL" && item.status !== "CANCELLED")
    .map((item) => item.supplierDeptId)).size;
  const availableInviteSuppliers = verifiedSuppliers.filter(
    (supplier) => !invitedSupplierIds.has(supplier.supplierDeptId),
  );
  const relevantFrameworkRelations = frameworkRelations.filter(
    (relation) => !selectedQuote || relation.supplierDeptId === selectedQuote.supplierDeptId,
  );
  const currentPlan = details.plans.find((plan) => plan.planId === sourcing?.planId) ?? details.plans[0];
  const quoteDraftError = validateRepairQuoteDraft(quoteLines, details.currentPlanItems, quoteTaxRate);
  const quoteTotal = calculateRepairQuoteTotal(quoteLines, quoteTaxRate);
  const quotePeriodValid = quoteConstructionPeriodDays.trim() !== "" && Number.isInteger(Number(quoteConstructionPeriodDays))
    && Number(quoteConstructionPeriodDays) > 0
    && Number(quoteConstructionPeriodDays) <= 3650;
  const quoteWarrantyValid = quoteWarrantyDays.trim() !== "" && Number.isInteger(Number(quoteWarrantyDays))
    && Number(quoteWarrantyDays) >= 0
    && Number(quoteWarrantyDays) <= 3650;
  const detailQuote = sourcing?.quotes.find((quote) => quote.quoteId === detailQuoteId) ?? null;

  useEffect(() => {
    if (!sourcing) return;
    setSelectedQuoteId(sourcing.selection ? String(sourcing.selection.quoteId) : "");
    setRecommendationReason(sourcing.selection?.recommendationReason ?? "");
    setInsufficientQuoteReason(sourcing.selection?.insufficientQuoteReason ?? "");
    setFrameworkRelationId(sourcing.selection?.frameworkRelationId
      ? String(sourcing.selection.frameworkRelationId)
      : "");
  }, [sourcing?.planId, sourcing?.selection?.selectionId]);

  useEffect(() => {
    if (manualEntrySuppliers.some((supplier) => String(supplier.supplierDeptId) === quoteSupplierId)) return;
    setQuoteSupplierId(manualEntrySuppliers[0] ? String(manualEntrySuppliers[0].supplierDeptId) : "");
    if (manualEntrySuppliers.length === 0) setManualEntryOpen(false);
  }, [manualEntrySuppliers, quoteSupplierId]);

  useEffect(() => {
    if (sourcing?.selectionMethod !== "FRAMEWORK_SUPPLIER") {
      setFrameworkRelations([]);
      return;
    }
    listRepairFrameworkRelations()
      .then(setFrameworkRelations)
      .catch(() => setFrameworkRelations([]));
  }, [sourcing?.planId, sourcing?.selectionMethod]);

  useEffect(() => {
    setQuoteLines(createRepairQuoteDraftLines(details.currentPlanItems));
    setQuoteTaxRate("9");
    setQuoteConstructionPeriodDays(String(plannedPeriodDays(
      currentPlan?.plannedStartDate,
      currentPlan?.plannedCompletionDate,
    )));
    setQuoteWarrantyDays(String(currentPlan?.warrantyDays ?? 0));
    setQuoteOriginalAmountConfirmed(false);
    setDetailQuoteId(null);
    setManualEntryOpen(false);
  }, [sourcing?.planId]);

  if (!sourcing) {
    return (
      <section className="border-t py-5 first:border-t-0 first:pt-0">
        <div className="flex items-center justify-between gap-3">
          <div><h4 className="text-sm font-semibold">供应商邀价与比价</h4><p className="mt-1 text-xs text-muted-foreground">正在读取当前方案的采购记录</p></div>
          <Button size="icon" variant="ghost" title="刷新询价记录" onClick={() => void onReload()}><RefreshCw className="size-4" /></Button>
        </div>
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />加载中</div>
      </section>
    );
  }

  const competitive = sourcing.selectionMethod === "COMPETITIVE_QUOTATION";
  const selectionNeedsReason = !competitive && !recommendationReason.trim();
  const selectionNeedsInsufficientReason = competitive
    && activeConfirmedQuotes.length < 3
    && !insufficientQuoteReason.trim();
  const selectionNeedsFramework = sourcing.selectionMethod === "FRAMEWORK_SUPPLIER"
    && !frameworkRelationId;

  async function submitQuote() {
    if (!quoteFile || !quoteSupplierId || quoteDraftError
      || !quotePeriodValid || !quoteWarrantyValid || !quoteOriginalAmountConfirmed) return;
    const supplierId = Number(quoteSupplierId);
    const invitation = [...sourcing.invitations]
      .filter((item) => item.supplierDeptId === supplierId && item.status === "PENDING")
      .sort((left, right) => right.invitationRound - left.invitationRound)[0];
    const successful = await run("project-quote", () => submitPropertyRepairProjectQuote(project.projectId, {
      supplierDeptId: supplierId,
      invitationId: invitation?.invitationId,
      quoteAmount: quoteTotal,
      taxRate: Number(quoteTaxRate),
      quoteSummary: quoteSummary.trim() || undefined,
      attachmentId: quoteFile.attachmentId,
      confirmationStatus: "OFFLINE_EVIDENCE_VERIFIED",
      originalSource: quoteSource,
      constructionPeriodDays: Number(quoteConstructionPeriodDays),
      warrantyDays: Number(quoteWarrantyDays),
      originalAmountConfirmed: quoteOriginalAmountConfirmed,
      quoteLines: toRepairQuoteLineInputs(quoteLines),
    }), "供应商报价原件已核验并录入");
    if (!successful) return;
    setQuoteLines(createRepairQuoteDraftLines(details.currentPlanItems));
    setQuoteTaxRate("9");
    setQuoteOriginalAmountConfirmed(false);
    setQuoteSummary("");
    setQuoteFile(null);
    setManualEntryOpen(false);
  }

  async function openQuote(quote: RepairProjectSupplierQuote) {
    try {
      const ticket = await getRepairProjectAttachmentTicket(project.projectId, quote.attachmentId);
      window.open(ticket.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价原件暂时无法打开");
    }
  }

  return (
    <section className="border-t py-5 first:border-t-0 first:pt-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold">供应商邀价与比价</h4>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">按顺序完成邀价、报价响应、比价和定商，所有材料均绑定当前方案。</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone="info">{METHOD_LABEL[sourcing.selectionMethod]}</StatusChip>
          <Button size="icon" variant="ghost" title="刷新询价记录" onClick={() => void onReload()}><RefreshCw className="size-4" /></Button>
        </div>
      </div>

      {sourcing.selection && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y bg-emerald-50/60 px-3 py-3 text-sm">
          <div><span className="font-medium">当前中选：{sourcing.selection.supplierName}</span><span className="ml-3 text-muted-foreground">报价 {money(sourcing.selection.quoteAmount)}</span></div>
          <StatusChip tone="success">已形成中选建议</StatusChip>
        </div>
      )}

      <div>
        {competitive && (
          <SourcingStep
            step={1}
            title="发出邀价"
            description="至少邀请 3 家已核验企业；邀请和供应商账号激活是两个独立事实。"
            status={<StatusChip tone={initialInvitationCount >= 3 ? "success" : "warning"}>已邀 {initialInvitationCount} 家</StatusChip>}
          >
          {availableInviteSuppliers.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableInviteSuppliers.map((supplier) => (
                <label key={supplier.supplierDeptId} className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
                  <Checkbox checked={inviteSupplierIds.includes(supplier.supplierDeptId)} onCheckedChange={(checked) => setInviteSupplierIds((current) => checked ? [...current, supplier.supplierDeptId] : current.filter((id) => id !== supplier.supplierDeptId))} />
                  <span className="min-w-0 flex-1 truncate">{supplier.legalName}</span>
                </label>
              ))}
            </div>
          ) : (
            verifiedSuppliers.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-y px-3 py-3 text-sm">
                <span className="text-muted-foreground">暂无可邀请的已核验供应商，请先完成供应商登记与企业主体核验。</span>
                <Button type="button" size="sm" variant="outline" onClick={onOpenSupplierDirectory}>
                  <Building2 className="mr-1 size-4" />前往供应商库
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">当前已核验企业均已邀请。</div>
            )
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(16rem,22rem)_1fr]">
            <div className="min-w-64"><Label>报价截止时间</Label><Input type="datetime-local" value={inviteDeadline} onChange={(event) => setInviteDeadline(event.target.value)} /></div>
            <div className="flex items-end justify-end">
              <Button disabled={busy !== null || inviteSupplierIds.length === 0} onClick={() => void run("project-invite", () => inviteRepairProjectSuppliers(project.projectId, { supplierDeptIds: inviteSupplierIds, deadline: inviteDeadline }), "维修工程邀价已发出").then((successful) => { if (successful) setInviteSupplierIds([]); })}><Send className="mr-1 size-4" />发出邀价</Button>
            </div>
          </div>
          </SourcingStep>
        )}

        <SourcingStep
          step={competitive ? 2 : 1}
          title="报价响应"
          description="供应商在线提交后自动进入有效报价；物业不再重复收集或录入。"
          status={(
            <StatusChip tone={activeConfirmedSupplierIds.size > 0 ? "success" : "warning"}>
              {competitive
                ? `已收 ${activeConfirmedSupplierIds.size} / 已邀 ${initialInvitationCount}`
                : `有效 ${activeConfirmedSupplierIds.size} 家`}
            </StatusChip>
          )}
        >
        {responseRows.length === 0 ? (
          <div className="border-y px-3 py-6 text-center text-sm text-muted-foreground">尚未收到供应商报价响应</div>
        ) : (
          <div className="divide-y border-y">
            {responseRows.map((response) => {
              const responseMeta = response.quote
                ? response.quote.confirmationStatus === "PENDING_SUPPLIER_CONFIRMATION"
                  ? { label: "待供应商确认", tone: "warning" as Tone }
                  : {
                      label: response.quote.submissionSource === "SUPPLIER_ONLINE" ? "已在线提交" : "物业已代录",
                      tone: "success" as Tone,
                    }
                : response.invitation
                  ? INVITATION_STATUS_META[response.invitation.status]
                  : { label: "待处理", tone: "neutral" as Tone };
              return (
                <div key={response.supplierDeptId} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{response.supplierName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {response.quote
                        ? `${SOURCE_LABEL[response.quote.submissionSource]} · 第 ${response.quote.revisionNo} 版`
                        : `${response.invitation?.invitationType === "REVISION" ? "修订" : "邀价"}第 ${response.invitation?.invitationRound ?? 1} 轮 · 截止 ${formatDateTime(response.invitation?.deadline)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <StatusChip tone={responseMeta.tone}>{responseMeta.label}</StatusChip>
                    {response.quote && <span className="text-sm font-semibold tabular-nums">{money(response.quote.quoteAmount)}</span>}
                  </div>
                  <div className="flex justify-end">
                    {response.quote ? (
                      <Button size="sm" variant="ghost" onClick={() => void openQuote(response.quote!)}><FileText className="mr-1 size-4" />查看原件</Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">等待供应商提交</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Collapsible open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <div className="text-sm font-medium">线下报价代录</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {manualEntrySuppliers.length === 0 && quoteSuppliers.length > 0
                  ? "当前供应商均已有报价记录，无需重复代录。"
                  : "仅在收到纸质、微信或邮件报价，且供应商未在线提交时使用。"}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" disabled={manualEntrySuppliers.length === 0}>
                <FilePlus2 className="mr-1 size-4" />{manualEntryOpen ? "收起代录" : "代录线下报价"}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="mt-4 border-y bg-muted/20 px-3 py-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div><Label>供应商</Label><Select value={quoteSupplierId} onValueChange={setQuoteSupplierId}><SelectTrigger><SelectValue placeholder={competitive ? "先邀请供应商" : "选择已核验供应商"} /></SelectTrigger><SelectContent>{manualEntrySuppliers.map((supplier) => <SelectItem key={supplier.supplierDeptId} value={String(supplier.supplierDeptId)}>{supplier.legalName}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>原件来源</Label><Select value={quoteSource} onValueChange={setQuoteSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAPER">纸质报价</SelectItem><SelectItem value="WECHAT">微信送达</SelectItem><SelectItem value="EMAIL">电子邮件</SelectItem><SelectItem value="OTHER">其他可核验来源</SelectItem></SelectContent></Select></div>
                <div><Label>施工工期（天）</Label><Input type="number" min="1" max="3650" step="1" value={quoteConstructionPeriodDays} onChange={(event) => setQuoteConstructionPeriodDays(event.target.value)} /></div>
                <div><Label>质保期（天）</Label><Input type="number" min="0" max="3650" step="1" value={quoteWarrantyDays} onChange={(event) => setQuoteWarrantyDays(event.target.value)} /></div>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3"><Label>报价明细</Label><span className="text-sm font-semibold tabular-nums">含税总额 {money(quoteTotal)}</span></div>
                <RepairProjectQuoteEditor items={details.currentPlanItems} lines={quoteLines} taxRate={quoteTaxRate} onChange={setQuoteLines} onTaxRateChange={setQuoteTaxRate} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div><Label>报价说明</Label><Textarea value={quoteSummary} onChange={(event) => setQuoteSummary(event.target.value)} placeholder="填写材料、施工组织或其他报价边界" /></div>
                <RepairProjectFileUpload projectId={project.projectId} label="供应商报价原件" value={quoteFile} onUploaded={(file) => { remember(file); setQuoteFile(file); }} />
              </div>
              <label className="mt-4 flex items-start gap-3 border-y px-3 py-3 text-sm"><Checkbox className="mt-0.5" checked={quoteOriginalAmountConfirmed} onCheckedChange={(checked) => setQuoteOriginalAmountConfirmed(checked === true)} /><span>我已核对线上报价明细的不含税合计、整单税率和含税总额与供应商报价原件一致。</span></label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className={`text-sm ${quoteDraftError || !quotePeriodValid || !quoteWarrantyValid ? "text-amber-700" : "text-muted-foreground"}`}>{quoteDraftError ?? (!quotePeriodValid ? "施工工期应为 1 至 3650 天" : !quoteWarrantyValid ? "质保期应为 0 至 3650 天" : `待录入含税总额 ${money(quoteTotal)}`)}</div>
                <Button disabled={busy !== null || !quoteSupplierId || Boolean(quoteDraftError) || !quotePeriodValid || !quoteWarrantyValid || !quoteFile || !quoteOriginalAmountConfirmed} onClick={() => void submitQuote()}><FileCheck2 className="mr-1 size-4" />录入已核验报价</Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        </SourcingStep>

        <SourcingStep
          step={competitive ? 3 : 2}
          title="比较有效报价"
          description="历史版本保留只读；只有当前有效且已在线确认或线下核验的报价可以中选。"
          status={<StatusChip tone={activeConfirmedQuotes.length >= 3 || !competitive ? "success" : "warning"}>有效 {activeConfirmedQuotes.length} 家</StatusChip>}
        >
        {sourcing.quotes.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">尚未收到报价</div> : (
          <div className="overflow-x-auto border-y">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-muted/40"><tr><th className="p-2 text-left">选择</th><th className="p-2 text-left">供应商</th><th className="p-2 text-left">版本</th><th className="p-2 text-left">提交方式</th><th className="p-2 text-right">工期 / 质保</th><th className="p-2 text-right">含税报价</th><th className="p-2 text-left">状态</th><th className="p-2 text-right">资料</th></tr></thead>
              <tbody>{sourcing.quotes.map((quote) => {
                const selectable = activeConfirmedQuotes.some((item) => item.quoteId === quote.quoteId);
                return <tr key={quote.quoteId} className="border-t"><td className="p-2"><Checkbox checked={selectedQuoteId === String(quote.quoteId)} disabled={!selectable} onCheckedChange={(checked) => setSelectedQuoteId(checked ? String(quote.quoteId) : "")} /></td><td className="p-2"><div className="font-medium">{quote.supplierName}</div><div className="mt-1 max-w-72 truncate text-xs text-muted-foreground">{quote.quoteSummary || "无补充说明"}</div></td><td className="p-2">第 {quote.revisionNo} 版</td><td className="p-2">{SOURCE_LABEL[quote.submissionSource]}</td><td className="p-2 text-right">{quote.constructionPeriodDays ?? "-"} / {quote.warrantyDays ?? "-"} 天</td><td className="p-2 text-right font-medium">{money(quote.quoteAmount)}</td><td className="p-2"><StatusChip tone={selectable ? "success" : quote.quoteStatus === "REVISION_REQUESTED" ? "warning" : "neutral"}>{quote.quoteStatus === "ACTIVE" ? quote.confirmationStatus === "PENDING_SUPPLIER_CONFIRMATION" ? "待确认" : "有效" : quote.quoteStatus === "REVISION_REQUESTED" ? "待修订" : "历史版"}</StatusChip></td><td className="p-2 text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" title="查看报价明细" onClick={() => setDetailQuoteId(quote.quoteId)}><ReceiptText className="mr-1 size-4" />明细</Button><Button size="icon" variant="ghost" title="查看报价原件" onClick={() => void openQuote(quote)}><FileText className="size-4" /></Button></div></td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
        {detailQuote && <div className="mt-4 border-y px-3 py-4"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-sm font-medium">{detailQuote.supplierName} · 第 {detailQuote.revisionNo} 版报价明细</div><div className="mt-1 text-xs text-muted-foreground">提交时间 {new Date(detailQuote.createTime).toLocaleString("zh-CN", { hour12: false })}</div></div><Button size="icon" variant="ghost" title="关闭报价明细" onClick={() => setDetailQuoteId(null)}><X className="size-4" /></Button></div><RepairProjectQuoteDetail quote={detailQuote} /></div>}
        {activeConfirmedQuotes.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div><Label>要求修订的供应商</Label><div className="mt-1 flex min-h-10 flex-wrap gap-2 border-y py-2">{activeConfirmedQuotes.map((quote) => <label key={quote.supplierDeptId} className="flex items-center gap-2 text-sm"><Checkbox checked={revisionSupplierIds.includes(quote.supplierDeptId)} onCheckedChange={(checked) => setRevisionSupplierIds((current) => checked ? [...new Set([...current, quote.supplierDeptId])] : current.filter((id) => id !== quote.supplierDeptId))} />{quote.supplierName}</label>)}</div></div>
            <div><Label>修订原因</Label><Input value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} /></div>
            <div><Label>修订截止</Label><Input type="datetime-local" value={revisionDeadline} onChange={(event) => setRevisionDeadline(event.target.value)} /></div>
            <div className="flex justify-end md:col-span-3">
              <Button variant="outline" disabled={busy !== null || revisionSupplierIds.length === 0 || !revisionReason.trim()} onClick={() => void run("quote-revision", () => requestRepairProjectQuoteRevisions(project.projectId, { supplierDeptIds: revisionSupplierIds, deadline: revisionDeadline, revisionReason: revisionReason.trim() }), "报价修订要求已发出").then((successful) => { if (successful) { setRevisionSupplierIds([]); setRevisionReason(""); } })}><RefreshCw className="mr-1 size-4" />要求修订</Button>
            </div>
          </div>
        )}
        </SourcingStep>

        <SourcingStep
          step={competitive ? 4 : 3}
          title="确认中选供应商"
          description="中选结果进入方案快照、业主披露和合同，后续合同不能另选企业或提高金额。"
          status={(
            <StatusChip tone={sourcing.selection ? "success" : selectedQuote ? "info" : "neutral"}>
              {sourcing.selection ? "已形成建议" : selectedQuote ? "待确认" : "待选择"}
            </StatusChip>
          )}
          last
        >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>{competitive ? "推荐说明（选填）" : "选择依据"}</Label><Textarea value={recommendationReason} onChange={(event) => setRecommendationReason(event.target.value)} placeholder={competitive ? "可填写施工组织、工期、材料等非价格比较结论" : "说明适用框架、直接委托或紧急指定的依据"} /></div>
          {competitive && activeConfirmedQuotes.length < 3 && <div className="md:col-span-2"><Label>有效报价不足 3 家说明</Label><Textarea value={insufficientQuoteReason} onChange={(event) => setInsufficientQuoteReason(event.target.value)} placeholder="说明未响应、退出或其他客观原因" /></div>}
          {sourcing.selectionMethod === "FRAMEWORK_SUPPLIER" && <div><Label>有效长期合作关系</Label><Select value={frameworkRelationId} onValueChange={setFrameworkRelationId}><SelectTrigger><SelectValue placeholder="选择与中选企业匹配的合作关系" /></SelectTrigger><SelectContent>{relevantFrameworkRelations.map((relation) => <SelectItem key={relation.relationId} value={String(relation.relationId)}>{relation.supplierLegalName}{relation.validUntil ? ` · 至 ${relation.validUntil}` : ""}</SelectItem>)}</SelectContent></Select></div>}
          <div className="flex justify-end md:col-span-2"><Button disabled={busy !== null || !selectedQuote || (competitive && initialInvitationCount < 3) || selectionNeedsReason || selectionNeedsInsufficientReason || selectionNeedsFramework} onClick={() => void run("supplier-selection", () => selectRepairProjectSupplier(project.projectId, { quoteId: Number(selectedQuoteId), recommendationReason: recommendationReason.trim() || undefined, insufficientQuoteReason: insufficientQuoteReason.trim() || undefined, frameworkRelationId: frameworkRelationId ? Number(frameworkRelationId) : undefined }), "中选供应商建议已形成")}><CheckCircle2 className="mr-1 size-4" />确认中选供应商</Button></div>
        </div>
        </SourcingStep>
      </div>
    </section>
  );
}
