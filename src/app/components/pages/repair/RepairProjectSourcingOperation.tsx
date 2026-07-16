// 关联业务：物业在维修工程方案内完成供应商邀价、报价原件核验、横向比价、修订和中选建议。
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2, RefreshCw, Send } from "lucide-react";
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
  type RepairProjectSourcingDetails,
  type RepairProjectSupplierQuote,
} from "../../../lib/repair-project";
import { StatusChip } from "../../gov/common";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { RepairProjectFileUpload } from "./RepairProjectFileUpload";

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

function localDateTimeAfter(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000 - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function money(value: number): string {
  return `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
}

export function RepairProjectSourcingOperation({
  details,
  sourcing,
  suppliers,
  remember,
  busy,
  run,
  onReload,
}: {
  details: RepairProjectDetails;
  sourcing: RepairProjectSourcingDetails | null;
  suppliers: RepairSupplierOrganization[];
  remember: (attachment: RepairProjectAttachment) => void;
  busy: string | null;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<boolean>;
  onReload: () => Promise<void>;
}) {
  const project = details.project;
  const [inviteSupplierIds, setInviteSupplierIds] = useState<number[]>([]);
  const [inviteDeadline, setInviteDeadline] = useState(localDateTimeAfter(3));
  const [quoteSupplierId, setQuoteSupplierId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
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

  const verifiedSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.verificationStatus === "VERIFIED"),
    [suppliers],
  );
  const invitedSupplierIds = useMemo(
    () => new Set(sourcing?.invitations.map((item) => item.supplierDeptId) ?? []),
    [sourcing?.invitations],
  );
  const quoteSuppliers = sourcing?.selectionMethod === "COMPETITIVE_QUOTATION"
    ? verifiedSuppliers.filter((supplier) => invitedSupplierIds.has(supplier.supplierDeptId))
    : verifiedSuppliers;
  const activeConfirmedQuotes = (sourcing?.quotes ?? []).filter((quote) =>
    quote.quoteStatus === "ACTIVE"
    && ["ONLINE_CONFIRMED", "OFFLINE_EVIDENCE_VERIFIED", "CONTRACT_CONFIRMED"].includes(quote.confirmationStatus));
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
    if (quoteSuppliers.some((supplier) => String(supplier.supplierDeptId) === quoteSupplierId)) return;
    setQuoteSupplierId(quoteSuppliers[0] ? String(quoteSuppliers[0].supplierDeptId) : "");
  }, [sourcing?.planId, quoteSuppliers.length]);

  useEffect(() => {
    if (sourcing?.selectionMethod !== "FRAMEWORK_SUPPLIER") {
      setFrameworkRelations([]);
      return;
    }
    listRepairFrameworkRelations()
      .then(setFrameworkRelations)
      .catch(() => setFrameworkRelations([]));
  }, [sourcing?.planId, sourcing?.selectionMethod]);

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
    if (!quoteFile || !quoteSupplierId) return;
    const supplierId = Number(quoteSupplierId);
    const invitation = [...sourcing.invitations]
      .filter((item) => item.supplierDeptId === supplierId && item.status === "PENDING")
      .sort((left, right) => right.invitationRound - left.invitationRound)[0];
    const successful = await run("project-quote", () => submitPropertyRepairProjectQuote(project.projectId, {
      supplierDeptId: supplierId,
      invitationId: invitation?.invitationId,
      quoteAmount: Number(quoteAmount),
      quoteSummary: quoteSummary.trim() || undefined,
      attachmentId: quoteFile.attachmentId,
      confirmationStatus: "OFFLINE_EVIDENCE_VERIFIED",
      originalSource: quoteSource,
    }), "供应商报价原件已核验并录入");
    if (!successful) return;
    setQuoteAmount("");
    setQuoteSummary("");
    setQuoteFile(null);
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
          <h4 className="text-sm font-semibold">供应商邀价与比价</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">报价原件、修订版本和中选建议均绑定当前方案，锁定后只能查看。</p>
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

      {competitive && (
        <div className="border-b pb-5">
          <div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-sm font-medium">1. 发出邀价</div><div className="mt-1 text-xs text-muted-foreground">至少邀请 3 家已核验企业；邀请和供应商账号激活是两个独立事实。</div></div><StatusChip tone={initialInvitationCount >= 3 ? "success" : "warning"}>已邀 {initialInvitationCount} 家</StatusChip></div>
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
            <div className="text-sm text-muted-foreground">
              {verifiedSuppliers.length === 0
                ? "暂无可邀请的已核验供应商，请先在维修工单中完成供应商准入与主体核验。"
                : "当前已核验企业均已邀请。"}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-64"><Label>报价截止时间</Label><Input type="datetime-local" value={inviteDeadline} onChange={(event) => setInviteDeadline(event.target.value)} /></div>
            <Button disabled={busy !== null || inviteSupplierIds.length === 0} onClick={() => void run("project-invite", () => inviteRepairProjectSuppliers(project.projectId, { supplierDeptIds: inviteSupplierIds, deadline: inviteDeadline }), "维修工程邀价已发出").then((successful) => { if (successful) setInviteSupplierIds([]); })}><Send className="mr-1 size-4" />发出邀价</Button>
          </div>
          {sourcing.invitations.length > 0 && <div className="mt-4 divide-y border-y text-sm">{sourcing.invitations.map((invitation) => <div key={invitation.invitationId} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{invitation.supplierName} · 第 {invitation.invitationRound} 轮{invitation.invitationType === "REVISION" ? "修订" : "邀价"}</span><span className="text-xs text-muted-foreground">{invitation.status} · 截止 {invitation.deadline ? new Date(invitation.deadline).toLocaleString("zh-CN", { hour12: false }) : "未设置"}</span></div>)}</div>}
        </div>
      )}

      <div className="border-b py-5">
        <div className="mb-3"><div className="text-sm font-medium">{competitive ? "2" : "1"}. 收集报价原件</div><div className="mt-1 text-xs text-muted-foreground">供应商可在线提交；物业仅在核验纸质、微信或邮件原件后代录，不填写内部估算替代供应商报价。</div></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div><Label>供应商</Label><Select value={quoteSupplierId} onValueChange={setQuoteSupplierId}><SelectTrigger><SelectValue placeholder={competitive ? "先邀请供应商" : "选择已核验供应商"} /></SelectTrigger><SelectContent>{quoteSuppliers.map((supplier) => <SelectItem key={supplier.supplierDeptId} value={String(supplier.supplierDeptId)}>{supplier.legalName}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>含税报价总额</Label><Input type="number" min="0.01" step="0.01" value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} /></div>
          <div><Label>原件来源</Label><Select value={quoteSource} onValueChange={setQuoteSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAPER">纸质报价</SelectItem><SelectItem value="WECHAT">微信送达</SelectItem><SelectItem value="EMAIL">电子邮件</SelectItem><SelectItem value="OTHER">其他可核验来源</SelectItem></SelectContent></Select></div>
          <div className="lg:col-span-2"><Label>报价说明</Label><Textarea value={quoteSummary} onChange={(event) => setQuoteSummary(event.target.value)} placeholder="填写工期、税费、主要材料或其他报价边界" /></div>
          <RepairProjectFileUpload projectId={project.projectId} label="供应商报价原件" value={quoteFile} onUploaded={(file) => { remember(file); setQuoteFile(file); }} />
        </div>
        <Button className="mt-3" disabled={busy !== null || !quoteSupplierId || Number(quoteAmount) <= 0 || !quoteFile} onClick={() => void submitQuote()}>录入已核验报价</Button>
      </div>

      <div className="border-b py-5">
        <div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-sm font-medium">{competitive ? "3" : "2"}. 比较有效报价</div><div className="mt-1 text-xs text-muted-foreground">历史版本保留只读；只有当前有效且已在线确认或线下核验的报价可以中选。</div></div><StatusChip tone={activeConfirmedQuotes.length >= 3 || !competitive ? "success" : "warning"}>有效 {activeConfirmedQuotes.length} 家</StatusChip></div>
        {sourcing.quotes.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">尚未收到报价</div> : (
          <div className="overflow-x-auto border-y">
            <table className="w-full min-w-[820px] text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">选择</th><th className="p-2 text-left">供应商</th><th className="p-2 text-left">版本</th><th className="p-2 text-left">提交方式</th><th className="p-2 text-right">含税报价</th><th className="p-2 text-left">状态</th><th className="p-2 text-right">原件</th></tr></thead><tbody>{sourcing.quotes.map((quote) => { const selectable = activeConfirmedQuotes.some((item) => item.quoteId === quote.quoteId); return <tr key={quote.quoteId} className="border-t"><td className="p-2"><Checkbox checked={selectedQuoteId === String(quote.quoteId)} disabled={!selectable} onCheckedChange={(checked) => setSelectedQuoteId(checked ? String(quote.quoteId) : "")} /></td><td className="p-2"><div className="font-medium">{quote.supplierName}</div><div className="mt-1 max-w-72 truncate text-xs text-muted-foreground">{quote.quoteSummary || "无补充说明"}</div></td><td className="p-2">第 {quote.revisionNo} 版</td><td className="p-2">{SOURCE_LABEL[quote.submissionSource]}</td><td className="p-2 text-right font-medium">{money(quote.quoteAmount)}</td><td className="p-2"><StatusChip tone={selectable ? "success" : quote.quoteStatus === "REVISION_REQUESTED" ? "warning" : "neutral"}>{quote.quoteStatus === "ACTIVE" ? quote.confirmationStatus === "PENDING_SUPPLIER_CONFIRMATION" ? "待确认" : "有效" : quote.quoteStatus === "REVISION_REQUESTED" ? "待修订" : "历史版"}</StatusChip></td><td className="p-2 text-right"><Button size="icon" variant="ghost" title="查看报价原件" onClick={() => void openQuote(quote)}><FileText className="size-4" /></Button></td></tr>; })}</tbody></table>
          </div>
        )}
        {activeConfirmedQuotes.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div><Label>要求修订的供应商</Label><div className="mt-1 flex min-h-10 flex-wrap gap-2 border-y py-2">{activeConfirmedQuotes.map((quote) => <label key={quote.supplierDeptId} className="flex items-center gap-2 text-sm"><Checkbox checked={revisionSupplierIds.includes(quote.supplierDeptId)} onCheckedChange={(checked) => setRevisionSupplierIds((current) => checked ? [...new Set([...current, quote.supplierDeptId])] : current.filter((id) => id !== quote.supplierDeptId))} />{quote.supplierName}</label>)}</div></div>
            <div><Label>修订原因</Label><Input value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} /></div>
            <div><Label>修订截止</Label><Input type="datetime-local" value={revisionDeadline} onChange={(event) => setRevisionDeadline(event.target.value)} /></div>
            <Button variant="outline" disabled={busy !== null || revisionSupplierIds.length === 0 || !revisionReason.trim()} onClick={() => void run("quote-revision", () => requestRepairProjectQuoteRevisions(project.projectId, { supplierDeptIds: revisionSupplierIds, deadline: revisionDeadline, revisionReason: revisionReason.trim() }), "报价修订要求已发出").then((successful) => { if (successful) { setRevisionSupplierIds([]); setRevisionReason(""); } })}>要求修订</Button>
          </div>
        )}
      </div>

      <div className="pt-5">
        <div className="mb-3"><div className="text-sm font-medium">{competitive ? "4" : "3"}. 确认中选供应商</div><div className="mt-1 text-xs text-muted-foreground">中选结果进入方案快照、业主披露和合同，后续合同不能另选企业或提高金额。</div></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>{competitive ? "推荐说明（选填）" : "选择依据"}</Label><Textarea value={recommendationReason} onChange={(event) => setRecommendationReason(event.target.value)} placeholder={competitive ? "可填写施工组织、工期、材料等非价格比较结论" : "说明适用框架、直接委托或紧急指定的依据"} /></div>
          {competitive && activeConfirmedQuotes.length < 3 && <div className="md:col-span-2"><Label>有效报价不足 3 家说明</Label><Textarea value={insufficientQuoteReason} onChange={(event) => setInsufficientQuoteReason(event.target.value)} placeholder="说明未响应、退出或其他客观原因" /></div>}
          {sourcing.selectionMethod === "FRAMEWORK_SUPPLIER" && <div><Label>有效长期合作关系</Label><Select value={frameworkRelationId} onValueChange={setFrameworkRelationId}><SelectTrigger><SelectValue placeholder="选择与中选企业匹配的合作关系" /></SelectTrigger><SelectContent>{relevantFrameworkRelations.map((relation) => <SelectItem key={relation.relationId} value={String(relation.relationId)}>{relation.supplierLegalName}{relation.validUntil ? ` · 至 ${relation.validUntil}` : ""}</SelectItem>)}</SelectContent></Select></div>}
          <div className="flex items-end justify-end"><Button disabled={busy !== null || !selectedQuote || (competitive && initialInvitationCount < 3) || selectionNeedsReason || selectionNeedsInsufficientReason || selectionNeedsFramework} onClick={() => void run("supplier-selection", () => selectRepairProjectSupplier(project.projectId, { quoteId: Number(selectedQuoteId), recommendationReason: recommendationReason.trim() || undefined, insufficientQuoteReason: insufficientQuoteReason.trim() || undefined, frameworkRelationId: frameworkRelationId ? Number(frameworkRelationId) : undefined }), "中选供应商建议已形成")}><CheckCircle2 className="mr-1 size-4" />确认中选供应商</Button></div>
        </div>
      </div>
    </section>
  );
}
