// 关联业务：物业在表决前收集施工单位报价，实施方案通过后再按通过的选择方式确定施工单位。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, CheckCircle2, FileCheck2, FilePlus2, FileText, Loader2, ReceiptText, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { type RepairSupplierOrganization } from "../../../lib/repair";
import {
  inviteRepairProjectSuppliers,
  getRepairProjectAttachmentTicket,
  requestRepairProjectQuoteRevisions,
  selectRepairProjectSupplier,
  submitPropertyRepairProjectQuote,
  type RepairProjectAttachment,
  type RepairProjectDetails,
  type RepairProjectSupplierEvaluationRule,
  type RepairProjectSupplierSelectionAuthorization,
  type RepairProjectSupplierSelectionMethod,
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
  COMPETITIVE_QUOTATION: "询价比选",
  FRAMEWORK_SUPPLIER: "从长期合作单位中选择",
  DIRECT_AWARD: "直接委托",
  EMERGENCY_APPOINTMENT: "按紧急维修程序指定",
} as const;

const EVALUATION_RULE_LABEL: Record<RepairProjectSupplierEvaluationRule, string> = {
  LOWEST_COMPLIANT_QUOTE: "最低合格报价",
  COMPREHENSIVE_EVALUATION: "综合比较",
  AUTHORIZED_DIRECT_SELECTION: "按通过的方案直接选择",
};

const SOURCE_LABEL: Record<RepairProjectSupplierQuote["submissionSource"], string> = {
  SUPPLIER_ONLINE: "施工单位在线提交",
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

function SelectionAuthorizationSnapshot({
  authorization,
}: {
  authorization?: RepairProjectSupplierSelectionAuthorization | null;
}) {
  if (!authorization) {
    return (
      <div className="border-y bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
        完成责任与费用确认、实施方案公示和相关业主表决后，再办理施工单位选择。
      </div>
    );
  }

  if (authorization.status !== "AUTHORIZED") {
    const unsupported = authorization.status === "UNSUPPORTED_WORKFLOW";
    return (
      <div className="border-y bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
        <div className="font-medium">{unsupported ? "本项目不在此处选择施工单位" : "尚未到确定施工单位环节"}</div>
        <div className="mt-1">{authorization.blockingReason ?? "完成实施方案表决和业委会确认后再办理。"}</div>
      </div>
    );
  }

  const method = authorization.approvedSelectionMethod;
  const rule = authorization.approvedEvaluationRule;
  return (
    <div className="border-y bg-emerald-50/50 px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">表决通过的施工单位选择方案</div>
        <StatusChip tone={authorization.currentActorMayConfirm ? "success" : "info"}>
          {authorization.currentActorMayConfirm ? "当前可办理" : "当前仅可查看"}
        </StatusChip>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">选择方式</dt><dd className="mt-1 font-medium">{method ? METHOD_LABEL[method] : "未载明"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">报价选择规则</dt><dd className="mt-1 font-medium">{rule ? EVALUATION_RULE_LABEL[rule] : "未载明"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">表决通过预算</dt><dd className="mt-1 font-medium">{authorization.approvedBudgetAmount == null ? "未载明" : money(authorization.approvedBudgetAmount)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">邀请单位数</dt><dd className="mt-1">{authorization.minimumInvitedSupplierCount == null ? "文件未明确" : `${authorization.minimumInvitedSupplierCount} 家`}</dd></div>
        <div><dt className="text-xs text-muted-foreground">报价数量</dt><dd className="mt-1">{authorization.minimumValidQuoteCount == null ? "文件未明确" : `${authorization.minimumValidQuoteCount} 家`}</dd></div>
        <div><dt className="text-xs text-muted-foreground">决定材料</dt><dd className="mt-1">已核对</dd></div>
        {authorization.nonCompetitiveSelectionBasis && <div className="sm:col-span-2 xl:col-span-3"><dt className="text-xs text-muted-foreground">直接委托依据</dt><dd className="mt-1 leading-6">{authorization.nonCompetitiveSelectionBasis}</dd></div>}
      </dl>
    </div>
  );
}

type SourcingOperationMode = "PREPARATION" | "SELECTION";

/**
 * 询价与施工单位选择在页面上属于同一办理顺序；即使授权后隐藏了邀价环节，
 * 后续步骤也必须沿用当前页面可见的连续编号，避免重新从 1 开始。
 */
export function getRepairSourcingStepNumbers(showReferenceCollection: boolean) {
  return {
    invitation: showReferenceCollection ? 1 : null,
    response: showReferenceCollection ? 2 : 1,
    comparison: showReferenceCollection ? 3 : 2,
    selection: showReferenceCollection ? 4 : 3,
  } as const;
}

export function RepairProjectSourcingOperation({
  mode,
  details,
  sourcing,
  sourcingLoading,
  sourcingError,
  suppliers,
  remember,
  busy,
  run,
  onReload,
  onOpenSupplierDirectory,
  canManageReferenceQuotes,
}: {
  mode: SourcingOperationMode;
  details: RepairProjectDetails;
  sourcing: RepairProjectSourcingDetails | null;
  sourcingLoading: boolean;
  sourcingError: string | null;
  suppliers: RepairSupplierOrganization[];
  remember: (attachment: RepairProjectAttachment) => void;
  busy: string | null;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<boolean>;
  onReload: () => Promise<void>;
  onOpenSupplierDirectory: () => void;
  canManageReferenceQuotes: boolean;
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
  const [detailQuoteId, setDetailQuoteId] = useState<number | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectionRationale, setSelectionRationale] = useState("");
  const [selectionEvidence, setSelectionEvidence] = useState<RepairProjectAttachment | null>(null);
  const [frameworkRelationId, setFrameworkRelationId] = useState("");

  const verifiedSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.verificationStatus === "VERIFIED"),
    [suppliers],
  );
  const invitedSupplierIds = useMemo(
    () => new Set(sourcing?.invitations.map((item) => item.supplierDeptId) ?? []),
    [sourcing?.invitations],
  );
  const pendingInvitationSupplierIds = useMemo(
    () => new Set((sourcing?.invitations ?? [])
      .filter((item) => item.status === "PENDING")
      .map((item) => item.supplierDeptId)),
    [sourcing?.invitations],
  );
  const quoteSuppliers = useMemo(
    () => verifiedSuppliers.filter((supplier) => pendingInvitationSupplierIds.has(supplier.supplierDeptId)),
    [pendingInvitationSupplierIds, verifiedSuppliers],
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
  const confirmedSupplierCount = activeConfirmedSupplierIds.size;
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
  const initialInvitationCount = new Set((sourcing?.invitations ?? [])
    .filter((item) => item.invitationType === "INITIAL" && item.status !== "CANCELLED")
    .map((item) => item.supplierDeptId)).size;
  const availableInviteSuppliers = verifiedSuppliers.filter(
    (supplier) => !invitedSupplierIds.has(supplier.supplierDeptId),
  );
  const quoteDraftError = validateRepairQuoteDraft(quoteLines, details.currentPlanWorkPoints, quoteTaxRate);
  const quoteTotal = calculateRepairQuoteTotal(quoteLines, quoteTaxRate);
  const quotePeriodValid = quoteConstructionPeriodDays.trim() !== "" && Number.isInteger(Number(quoteConstructionPeriodDays))
    && Number(quoteConstructionPeriodDays) > 0
    && Number(quoteConstructionPeriodDays) <= 3650;
  const quoteWarrantyValid = quoteWarrantyDays.trim() !== "" && Number.isInteger(Number(quoteWarrantyDays))
    && Number(quoteWarrantyDays) >= 0
    && Number(quoteWarrantyDays) <= 3650;
  const detailQuote = sourcing?.quotes.find((quote) => quote.quoteId === detailQuoteId) ?? null;
  const selectionAuthorization = sourcing?.selectionAuthorization ?? null;
  const selectionMethod = selectionAuthorization?.status === "AUTHORIZED"
    ? selectionAuthorization.approvedSelectionMethod ?? null
    : null;
  const selectionAuthorized = selectionAuthorization?.status === "AUTHORIZED"
    && selectionMethod != null
    && selectionAuthorization.approvedEvaluationRule != null;
  const mayConfirmSelection = Boolean(
    selectionAuthorized
    && selectionAuthorization?.currentActorMayConfirm
    && !sourcing?.selection,
  );
  const requiredInvitationCount = selectionAuthorization?.minimumInvitedSupplierCount ?? null;
  const requiredValidQuoteCount = selectionAuthorization?.minimumValidQuoteCount ?? null;
  const invitationRequirementMet = requiredInvitationCount == null || initialInvitationCount >= requiredInvitationCount;
  const validQuoteRequirementMet = requiredValidQuoteCount == null || confirmedSupplierCount >= requiredValidQuoteCount;
  const selectedQuote = activeConfirmedQuotes.find((quote) => quote.quoteId === Number(selectedQuoteId)) ?? null;
  const eligibleFrameworkRelations = useMemo(
    () => (sourcing?.eligibleFrameworkRelations ?? []).filter((relation) =>
      !selectedQuote || relation.supplierDeptId === selectedQuote.supplierDeptId),
    [selectedQuote, sourcing?.eligibleFrameworkRelations],
  );
  const canCollectReferenceQuotes = project.status === "DRAFT" && canManageReferenceQuotes && !sourcing?.selection;
  const showReferenceCollection = project.status === "DRAFT";
  const stepNumbers = getRepairSourcingStepNumbers(showReferenceCollection);

  useEffect(() => {
    if (manualEntrySuppliers.some((supplier) => String(supplier.supplierDeptId) === quoteSupplierId)) return;
    setQuoteSupplierId(manualEntrySuppliers[0] ? String(manualEntrySuppliers[0].supplierDeptId) : "");
    if (manualEntrySuppliers.length === 0) setManualEntryOpen(false);
  }, [manualEntrySuppliers, quoteSupplierId]);

  useEffect(() => {
    setQuoteLines(createRepairQuoteDraftLines());
    setQuoteTaxRate("9");
    setQuoteConstructionPeriodDays("");
    setQuoteWarrantyDays("");
    setQuoteOriginalAmountConfirmed(false);
    setDetailQuoteId(null);
    setManualEntryOpen(false);
    setSelectedQuoteId("");
    setSelectionRationale("");
    setSelectionEvidence(null);
    setFrameworkRelationId("");
  }, [sourcing?.planId]);

  useEffect(() => {
    if (!selectedQuote || selectionMethod !== "FRAMEWORK_SUPPLIER") {
      setFrameworkRelationId("");
      return;
    }
    if (!eligibleFrameworkRelations.some((relation) => String(relation.relationId) === frameworkRelationId)) {
      setFrameworkRelationId("");
    }
  }, [eligibleFrameworkRelations, frameworkRelationId, selectedQuote, selectionMethod]);

  if (!sourcing) {
    return (
      <section className="border-t py-5 first:border-t-0 first:pt-0">
        <div className="flex items-center justify-between gap-3">
          <div><h4 className="text-sm font-semibold">{mode === "PREPARATION" ? "前期询价" : "确定施工单位"}</h4><p className="mt-1 text-xs text-muted-foreground">{sourcingError ? "询价记录读取失败，项目方案和其他办理记录不受影响。" : "正在读取当前方案的询价记录"}</p></div>
          <Button size="icon" variant="ghost" title="重新读取询价记录" onClick={() => void onReload()} disabled={sourcingLoading}><RefreshCw className={`size-4 ${sourcingLoading ? "animate-spin" : ""}`} /></Button>
        </div>
        {sourcingError ? (
          <div className="mt-4 flex flex-col items-start gap-3 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm">
            <div className="font-medium">参考询价暂时无法读取</div>
            <p className="text-muted-foreground">{sourcingError}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void onReload()} disabled={sourcingLoading}><RefreshCw className="size-4" />重新读取</Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />正在读取询价记录</div>
        )}
      </section>
    );
  }

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
    }), "施工单位报价原件已核验并录入");
    if (!successful) return;
    setQuoteLines(createRepairQuoteDraftLines());
    setQuoteTaxRate("9");
    setQuoteConstructionPeriodDays("");
    setQuoteWarrantyDays("");
    setQuoteOriginalAmountConfirmed(false);
    setQuoteSummary("");
    setQuoteFile(null);
    setManualEntryOpen(false);
  }

  async function confirmSupplierSelection() {
    if (!mayConfirmSelection || !selectedQuote || !selectionEvidence || !selectionRationale.trim()) return;
    if (!invitationRequirementMet || !validQuoteRequirementMet) return;
    if (selectionMethod === "FRAMEWORK_SUPPLIER" && !frameworkRelationId) return;
    const successful = await run(
      "project-select-supplier",
      () => selectRepairProjectSupplier(project.projectId, {
        quoteId: selectedQuote.quoteId,
        selectionRationale: selectionRationale.trim(),
        selectionEvidenceAttachmentId: selectionEvidence.attachmentId,
        ...(selectionMethod === "FRAMEWORK_SUPPLIER" ? { frameworkRelationId: Number(frameworkRelationId) } : {}),
      }),
      "施工单位已确认",
    );
    if (!successful) return;
    setSelectedQuoteId("");
    setSelectionRationale("");
    setSelectionEvidence(null);
    setFrameworkRelationId("");
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
      {mode === "PREPARATION" && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold">前期询价</h4>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">在实施方案提交相关业主表决前收集报价，用于完善预算和比较施工方案；此时不确定施工单位。</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip tone={confirmedSupplierCount > 0 ? "success" : "neutral"}>已收 {confirmedSupplierCount} 家报价</StatusChip>
            <Button size="icon" variant="ghost" title="刷新询价记录" onClick={() => void onReload()}><RefreshCw className="size-4" /></Button>
          </div>
        </div>
      )}

      <div>
        {mode === "PREPARATION" && (
          <>
        {showReferenceCollection && (
          <SourcingStep
            step={stepNumbers.invitation!}
            title="邀请施工单位报价"
            description="收集报价用于完善预算、施工内容和工期要求；此阶段不确定施工单位。"
            status={<StatusChip tone={initialInvitationCount > 0 ? "success" : "warning"}>已邀 {initialInvitationCount} 家</StatusChip>}
          >
          {canCollectReferenceQuotes ? (
            <>
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
                    <span className="text-muted-foreground">暂无可邀请的已核验施工单位，请先完成企业登记与主体核验。</span>
                    <Button type="button" size="sm" variant="outline" onClick={onOpenSupplierDirectory}>
                      <Building2 className="mr-1 size-4" />前往施工单位库
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">当前已核验企业均已邀请。</div>
                )
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(16rem,22rem)_1fr]">
                <div className="min-w-64"><Label>报价截止时间</Label><Input type="datetime-local" value={inviteDeadline} onChange={(event) => setInviteDeadline(event.target.value)} /></div>
                <div className="flex items-end justify-end">
                  <Button disabled={busy !== null || inviteSupplierIds.length === 0} onClick={() => void run("project-invite", () => inviteRepairProjectSuppliers(project.projectId, { supplierDeptIds: inviteSupplierIds, deadline: inviteDeadline }), "参考询价已发出").then((successful) => { if (successful) setInviteSupplierIds([]); })}><Send className="mr-1 size-4" />发出参考询价</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="border-y px-3 py-3 text-sm text-muted-foreground">当前身份仅可查看参考询价记录。</div>
          )}
          </SourcingStep>
        )}

        <SourcingStep
          step={stepNumbers.response}
          title="报价响应"
          description="施工单位在线提交，或物业核对线下原件后代录，报价才会进入本次比较。"
          status={(
            <StatusChip tone={confirmedSupplierCount > 0 ? "success" : "warning"}>
              {showReferenceCollection ? `已收 ${confirmedSupplierCount} / 已邀 ${initialInvitationCount}` : `有效 ${confirmedSupplierCount} 家`}
            </StatusChip>
          )}
        >
        {responseRows.length === 0 ? (
          <div className="border-y px-3 py-6 text-center text-sm text-muted-foreground">尚未收到施工单位报价</div>
        ) : (
          <div className="divide-y border-y">
            {responseRows.map((response) => {
              const responseMeta = response.quote
                ? response.quote.confirmationStatus === "PENDING_SUPPLIER_CONFIRMATION"
                  ? { label: "待施工单位确认", tone: "warning" as Tone }
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
                      <span className="text-xs text-muted-foreground">等待施工单位提交</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canCollectReferenceQuotes && (
          <Collapsible open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <div className="text-sm font-medium">线下报价代录</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {manualEntrySuppliers.length === 0 && quoteSuppliers.length > 0
                  ? "当前施工单位均已有报价记录，无需重复代录。"
                  : "仅在收到纸质、微信或邮件报价，且施工单位未在线提交时使用。"}
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
                <div><Label>施工单位</Label><Select value={quoteSupplierId} onValueChange={setQuoteSupplierId}><SelectTrigger><SelectValue placeholder="先邀请已核验施工单位" /></SelectTrigger><SelectContent>{manualEntrySuppliers.map((supplier) => <SelectItem key={supplier.supplierDeptId} value={String(supplier.supplierDeptId)}>{supplier.legalName}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>原件来源</Label><Select value={quoteSource} onValueChange={setQuoteSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAPER">纸质报价</SelectItem><SelectItem value="WECHAT">微信送达</SelectItem><SelectItem value="EMAIL">电子邮件</SelectItem><SelectItem value="OTHER">其他可核验来源</SelectItem></SelectContent></Select></div>
                <div><Label>施工工期（天）</Label><Input type="number" min="1" max="3650" step="1" value={quoteConstructionPeriodDays} onChange={(event) => setQuoteConstructionPeriodDays(event.target.value)} /></div>
                <div><Label>质保期（天）</Label><Input type="number" min="0" max="3650" step="1" value={quoteWarrantyDays} onChange={(event) => setQuoteWarrantyDays(event.target.value)} /></div>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3"><Label>报价明细</Label><span className="text-sm font-semibold tabular-nums">含税总额 {money(quoteTotal)}</span></div>
                <RepairProjectQuoteEditor workPoints={details.currentPlanWorkPoints} lines={quoteLines} taxRate={quoteTaxRate} onChange={setQuoteLines} onTaxRateChange={setQuoteTaxRate} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div><Label>报价说明</Label><Textarea value={quoteSummary} onChange={(event) => setQuoteSummary(event.target.value)} placeholder="填写材料、施工组织或其他报价边界" /></div>
                <RepairProjectFileUpload projectId={project.projectId} label="施工单位报价原件" value={quoteFile} onUploaded={(file) => { remember(file); setQuoteFile(file); }} />
              </div>
              <label className="mt-4 flex items-start gap-3 border-y px-3 py-3 text-sm"><Checkbox className="mt-0.5" checked={quoteOriginalAmountConfirmed} onCheckedChange={(checked) => setQuoteOriginalAmountConfirmed(checked === true)} /><span>我已核对线上报价明细的不含税合计、整单税率和含税总额与施工单位报价原件一致。</span></label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className={`text-sm ${quoteDraftError || !quotePeriodValid || !quoteWarrantyValid ? "text-amber-700" : "text-muted-foreground"}`}>{quoteDraftError ?? (!quotePeriodValid ? "施工工期应为 1 至 3650 天" : !quoteWarrantyValid ? "质保期应为 0 至 3650 天" : `待录入含税总额 ${money(quoteTotal)}`)}</div>
                <Button disabled={busy !== null || !quoteSupplierId || Boolean(quoteDraftError) || !quotePeriodValid || !quoteWarrantyValid || !quoteFile || !quoteOriginalAmountConfirmed} onClick={() => void submitQuote()}><FileCheck2 className="mr-1 size-4" />录入已核验报价</Button>
              </div>
            </div>
          </CollapsibleContent>
          </Collapsible>
        )}
        </SourcingStep>

        <SourcingStep
          step={stepNumbers.comparison}
          title="报价对比"
          description="对比含税金额、工期、质保和报价边界，为完善实施方案和预算提供依据。"
          status={<StatusChip tone={confirmedSupplierCount > 0 ? "success" : "neutral"}>已核对 {confirmedSupplierCount} 家</StatusChip>}
        >
        {sourcing.quotes.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">尚未收到报价</div> : (
          <div className="overflow-x-auto border-y">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-muted/40"><tr><th className="p-2 text-left">用途</th><th className="p-2 text-left">施工单位</th><th className="p-2 text-left">版本</th><th className="p-2 text-left">提交方式</th><th className="p-2 text-right">工期 / 质保</th><th className="p-2 text-right">含税报价</th><th className="p-2 text-left">状态</th><th className="p-2 text-right">资料</th></tr></thead>
              <tbody>{sourcing.quotes.map((quote) => {
                const confirmed = activeConfirmedQuotes.some((item) => item.quoteId === quote.quoteId);
                const isHistoricalSelection = sourcing.selection?.quoteId === quote.quoteId;
                return <tr key={quote.quoteId} className="border-t"><td className="p-2"><span className="text-xs text-muted-foreground">{isHistoricalSelection ? "已选施工单位" : "参考报价"}</span></td><td className="p-2"><div className="font-medium">{quote.supplierName}</div><div className="mt-1 max-w-72 truncate text-xs text-muted-foreground">{quote.quoteSummary || "无补充说明"}</div></td><td className="p-2">第 {quote.revisionNo} 版</td><td className="p-2">{SOURCE_LABEL[quote.submissionSource]}</td><td className="p-2 text-right">{quote.constructionPeriodDays ?? "-"} / {quote.warrantyDays ?? "-"} 天</td><td className="p-2 text-right font-medium">{money(quote.quoteAmount)}</td><td className="p-2"><StatusChip tone={confirmed ? "success" : quote.quoteStatus === "REVISION_REQUESTED" ? "warning" : "neutral"}>{quote.quoteStatus === "ACTIVE" ? quote.confirmationStatus === "PENDING_SUPPLIER_CONFIRMATION" ? "待确认" : "已核对" : quote.quoteStatus === "REVISION_REQUESTED" ? "待修订" : "历史版"}</StatusChip></td><td className="p-2 text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" title="查看报价明细" onClick={() => setDetailQuoteId(quote.quoteId)}><ReceiptText className="mr-1 size-4" />明细</Button><Button size="icon" variant="ghost" title="查看报价原件" onClick={() => void openQuote(quote)}><FileText className="size-4" /></Button></div></td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
        {detailQuote && <div className="mt-4 border-y px-3 py-4"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-sm font-medium">{detailQuote.supplierName} · 第 {detailQuote.revisionNo} 版报价明细</div><div className="mt-1 text-xs text-muted-foreground">提交时间 {new Date(detailQuote.createTime).toLocaleString("zh-CN", { hour12: false })}</div></div><Button size="icon" variant="ghost" title="关闭报价明细" onClick={() => setDetailQuoteId(null)}><X className="size-4" /></Button></div><RepairProjectQuoteDetail quote={detailQuote} /></div>}
        {canCollectReferenceQuotes && activeConfirmedQuotes.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div><Label>要求修订的施工单位</Label><div className="mt-1 flex min-h-10 flex-wrap gap-2 border-y py-2">{activeConfirmedQuotes.map((quote) => <label key={quote.supplierDeptId} className="flex items-center gap-2 text-sm"><Checkbox checked={revisionSupplierIds.includes(quote.supplierDeptId)} onCheckedChange={(checked) => setRevisionSupplierIds((current) => checked ? [...new Set([...current, quote.supplierDeptId])] : current.filter((id) => id !== quote.supplierDeptId))} />{quote.supplierName}</label>)}</div></div>
            <div><Label>修订原因</Label><Input value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} /></div>
            <div><Label>修订截止</Label><Input type="datetime-local" value={revisionDeadline} onChange={(event) => setRevisionDeadline(event.target.value)} /></div>
            <div className="flex justify-end md:col-span-3">
              <Button variant="outline" disabled={busy !== null || revisionSupplierIds.length === 0 || !revisionReason.trim()} onClick={() => void run("quote-revision", () => requestRepairProjectQuoteRevisions(project.projectId, { supplierDeptIds: revisionSupplierIds, deadline: revisionDeadline, revisionReason: revisionReason.trim() }), "报价修订要求已发出").then((successful) => { if (successful) { setRevisionSupplierIds([]); setRevisionReason(""); } })}><RefreshCw className="mr-1 size-4" />要求修订</Button>
            </div>
          </div>
        )}
        </SourcingStep>

          </>
        )}

        {mode === "SELECTION" && (
          <SourcingStep
          step={stepNumbers.selection}
          title="确定施工单位"
          description="相关业主表决通过实施方案后，按表决通过的选择方式确定施工单位。施工合同在工程档案中另行登记。"
          status={<StatusChip tone={sourcing.selection ? "success" : selectionAuthorized ? "info" : "neutral"}>{sourcing.selection ? "已完成" : selectionAuthorized ? "可以办理" : selectionAuthorization?.status === "UNSUPPORTED_WORKFLOW" ? "不适用" : "后续办理"}</StatusChip>}
          last
        >
          <div className="mb-4">
            <SelectionAuthorizationSnapshot authorization={selectionAuthorization} />
          </div>
          {sourcing.selection ? (
            <div className="border-y bg-emerald-50/50 px-4 py-3 text-sm leading-6 text-emerald-950">
              <div className="font-medium">已选定施工单位：{sourcing.selection.supplierName}</div>
              <div className="mt-1">报价 {money(sourcing.selection.quoteAmount)}</div>
              {sourcing.selection.selectionRationale && <div className="mt-1">选择说明：{sourcing.selection.selectionRationale}</div>}
            </div>
          ) : !selectionAuthorized ? (
            null
          ) : !mayConfirmSelection ? (
            <div className="border-y bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
              当前身份仅可查看报价资料。施工单位由在任业委会主任或副主任确认。
            </div>
          ) : confirmedSupplierCount === 0 ? (
            <div className="border-y bg-amber-50/60 px-4 py-3 text-sm leading-6 text-amber-950">尚无已核对的报价，请先完成报价收集和核对。</div>
          ) : (
            <div className="space-y-5 rounded-md border bg-muted/20 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>拟选报价</Label>
                  <Select value={selectedQuoteId || "__UNSELECTED__"} onValueChange={(value) => setSelectedQuoteId(value === "__UNSELECTED__" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="选择已确认报价" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__UNSELECTED__">选择已确认报价</SelectItem>
                      {activeConfirmedQuotes.map((quote) => (
                        <SelectItem key={quote.quoteId} value={String(quote.quoteId)}>{quote.supplierName} · {money(quote.quoteAmount)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedQuote && <div className="border-y px-3 py-2 text-sm"><div className="text-xs text-muted-foreground">拟选施工单位</div><div className="mt-1 flex items-center justify-between gap-3"><span className="font-medium">{selectedQuote.supplierName}</span><span className="font-semibold tabular-nums">{money(selectedQuote.quoteAmount)}</span></div></div>}
              </div>

              {selectionAuthorization?.approvedEvaluationRule === "LOWEST_COMPLIANT_QUOTE" && (
                <p className="border-y bg-muted/20 px-3 py-2 text-sm leading-6 text-muted-foreground">
                  最低合格报价只在本次已核对且符合施工要求的报价中比较，不能只按页面上的最低金额直接选择。
                </p>
              )}

              {selectionMethod === "FRAMEWORK_SUPPLIER" && (
                <div className="space-y-2">
                  <Label>本项目适用的长期合作关系</Label>
                  <Select value={frameworkRelationId || "__UNSELECTED__"} disabled={!selectedQuote || eligibleFrameworkRelations.length === 0} onValueChange={(value) => setFrameworkRelationId(value === "__UNSELECTED__" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder={selectedQuote ? "选择当前有效的合作关系" : "先选择拟选报价"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__UNSELECTED__">选择当前有效的合作关系</SelectItem>
                      {eligibleFrameworkRelations.map((relation) => (
                        <SelectItem key={relation.relationId} value={String(relation.relationId)}>{relation.supplierLegalName}{relation.validUntil ? ` · 有效至 ${relation.validUntil}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedQuote && eligibleFrameworkRelations.length === 0 && <p className="text-sm text-destructive">该施工单位目前没有适用于本项目的有效长期合作关系。</p>}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-selection-rationale">选择说明</Label>
                  <Textarea id="project-selection-rationale" rows={4} value={selectionRationale} onChange={(event) => setSelectionRationale(event.target.value)} placeholder="说明如何按照表决通过的选择方式确定该施工单位" />
                </div>
                <RepairProjectFileUpload projectId={project.projectId} label="施工单位选择记录" value={selectionEvidence} onUploaded={(file) => { remember(file); setSelectionEvidence(file); }} />
              </div>

              <div className="border-y px-3 py-3 text-sm">
                <div className="font-medium">数量核对</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className={invitationRequirementMet ? "text-muted-foreground" : "text-destructive"}>邀价：{initialInvitationCount}{requiredInvitationCount == null ? " 家（文件未明确最小数量）" : ` / ${requiredInvitationCount} 家`}</div>
                  <div className={validQuoteRequirementMet ? "text-muted-foreground" : "text-destructive"}>已核对报价：{confirmedSupplierCount}{requiredValidQuoteCount == null ? " 家（文件未明确最小数量）" : ` / ${requiredValidQuoteCount} 家`}</div>
                </div>
              </div>

              <div className="flex justify-end border-t pt-4">
                <Button disabled={busy !== null || !selectedQuote || !selectionRationale.trim() || !selectionEvidence || !invitationRequirementMet || !validQuoteRequirementMet || (selectionMethod === "FRAMEWORK_SUPPLIER" && !frameworkRelationId)} onClick={() => void confirmSupplierSelection()}>
                  <CheckCircle2 className="mr-1 size-4" />确认施工单位
                </Button>
              </div>
            </div>
          )}
          </SourcingStep>
        )}
      </div>
    </section>
  );
}
