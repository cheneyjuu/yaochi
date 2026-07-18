// 关联业务：按维修项目状态和真实工作身份执行方案锁定、两类治理、合同、施工、结算、验收、付款及归档。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Eye,
  FileText,
  History,
  Loader2,
  Plus,
  Play,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { StatusChip } from "../../gov/common";
import {
  getRepairPlanningPolicy,
  type RepairPlanningPolicy,
  type RepairSupplierOrganization,
} from "../../../lib/repair";
import {
  getActiveRepairDecisionRule,
  getRepairDecisionRulePreviewTicket,
  type RepairDecisionRule,
} from "../../../lib/repair-decision-rule";
import {
  listPropertyServiceOrganizations,
  type PropertyServiceOrganization,
} from "../../../lib/property-service-organization";
import {
  auditBuildingRepairDecision,
  getBuildingRepairGovernance,
  getCommunityRepairAssembly,
  getRepairProjectAttachmentTicket,
  getRepairProjectProcessHistory,
  getRepairProjectSourcing,
  lockRepairProjectPlan,
  postRepairProjectAction,
  reverifyRepairProjectDecisionScope,
  type RepairBuildingGovernanceDetails,
  type RepairCommunityAssemblyLink,
  type RepairPaymentMilestone,
  type RepairProjectAttachment,
  type RepairProjectDetails,
  type RepairProjectExecutionDetails,
  type RepairProjectProcessHistoryEntry,
  type RepairProjectPlan,
  type RepairProjectSourcingDetails,
  type RepairProjectStage,
  type RepairWorkPoint,
} from "../../../lib/repair-project";
import { RepairProjectFileUpload as FileUpload } from "./RepairProjectFileUpload";
import { RepairProjectSourcingOperation } from "./RepairProjectSourcingOperation";

const STAGE_LABEL: Record<RepairProjectStage, string> = {
  BEFORE_CONSTRUCTION: "施工前",
  MATERIAL_ENTRY: "材料进场",
  DURING_CONSTRUCTION: "施工中",
  CONCEALED_WORK: "隐蔽工程",
  COMPLETION: "完工",
  ACCEPTANCE: "验收",
};

const MILESTONE_LABEL: Record<RepairPaymentMilestone, string> = {
  ADVANCE: "预付款",
  PROGRESS: "进度款",
  COMPLETION: "完工款",
  WARRANTY_RELEASE: "质保金释放",
};

function nowLocal(): string {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function today(): string {
  return nowLocal().slice(0, 10);
}

function nonResponseRuleLabel(value: string): string {
  switch (value) {
    case "NOT_PARTICIPATED":
      return "未表态不计入参与";
    case "FOLLOW_MAJORITY":
      return "未表态随多数意见";
    case "ABSTAIN":
      return "未表态计为弃权";
    default:
      return value;
  }
}

function formatRuleDate(value?: string | null): string {
  return value ? value.slice(0, 10) : "未记录";
}

function formatDateTime(value?: string | null): string {
  return value ? value.replace("T", " ").slice(0, 16) : "未记录";
}

function isPercentageTaxRate(value: string): boolean {
  const normalized = value.trim();
  return /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(normalized)
    && Number(normalized) >= 0
    && Number(normalized) <= 100;
}

function buildingProcessStatusLabel(value?: string | null): string {
  switch (value) {
    case "DECISION_COLLECTING":
      return "正在收集业主征询结果";
    case "DECISION_PASSED":
      return "业主征询已通过，待提交物业正式报审文件";
    case "DECISION_FAILED":
      return "业主征询未通过，已退回已锁定方案";
    case "OFFICIAL_DOCUMENT_READY":
      return "正式报审文件已提交，待业委会审价";
    case "PRICE_REVIEWED":
      return "审价已通过，待主任或副主任在线确认";
    case "PRICE_REVIEW_REJECTED":
      return "审价未通过，已退回已锁定方案";
    case "COMMITTEE_APPROVED":
      return "主任或副主任已确认，待办理业委会用印";
    case "AUTHORIZED":
      return "业委会用印已完成，项目已获授权";
    default:
      return "楼栋维修治理正在办理";
  }
}

function decisionResultLabel(value?: string | null): string {
  return value === "PASSED" ? "核验通过" : value === "FAILED" ? "核验未通过" : "待核验";
}

function reviewModeLabel(value?: string | null): string {
  switch (value) {
    case "THIRD_PARTY_AUDIT":
      return "第三方审价";
    case "INTERNAL_PRICE_REVIEW":
      return "内部审价";
    case "NOT_REQUIRED":
      return "无需审价";
    default:
      return "未记录";
  }
}

function priceReviewConclusionLabel(value?: string | null): string {
  return value === "APPROVED" ? "审价通过" : value === "REJECTED" ? "审价未通过" : "未记录";
}

function committeePositionLabel(value?: string | null): string {
  return value === "DIRECTOR" ? "业委会主任" : value === "VICE_DIRECTOR" ? "业委会副主任" : "业委会成员";
}

function decisionChannelLabel(value?: "ONLINE" | "WECHAT" | null): string {
  return value === "ONLINE" ? "C 端小程序在线表决" : "微信接龙截图";
}

function decisionChoiceLabel(value?: string | null): string {
  switch (value) {
    case "AGREE":
      return "同意";
    case "DISAGREE":
      return "不同意";
    case "ABSTAIN":
      return "弃权";
    case "INVALID":
      return "无效";
    default:
      return "未表决";
  }
}

function OperationSection({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="border-t py-5 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        {desc && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export function RepairProjectOperationPanel({
  details,
  execution,
  suppliers,
  hasPermission,
  roleKey,
  onChanged,
  onOpenSupplierDirectory,
}: {
  details: RepairProjectDetails;
  execution: RepairProjectExecutionDetails | null;
  suppliers: RepairSupplierOrganization[];
  hasPermission: (permission: string) => boolean;
  roleKey: string | null;
  onChanged: () => Promise<void>;
  onOpenSupplierDirectory: () => void;
}) {
  const project = details.project;
  const draftPlan = details.plans.find((item) => item.status === "DRAFT");
  const plan = draftPlan ?? details.plans.find((item) => item.planId === project.activePlanId)
    ?? details.plans.find((item) => item.status === "LOCKED")
    ?? details.plans[0];
  const [busy, setBusy] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<RepairProjectAttachment[]>([]);
  const [buildingGovernance, setBuildingGovernance] = useState<RepairBuildingGovernanceDetails | null>(null);
  const [assemblyLink, setAssemblyLink] = useState<RepairCommunityAssemblyLink | null>(null);
  const [sourcing, setSourcing] = useState<RepairProjectSourcingDetails | null>(null);
  const [processHistory, setProcessHistory] = useState<RepairProjectProcessHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const attachments = useMemo(() => {
    const byId = new Map<number, RepairProjectAttachment>();
    [...details.attachments, ...uploaded].forEach((item) => byId.set(item.attachmentId, item));
    return [...byId.values()];
  }, [details.attachments, uploaded]);

  function remember(attachment: RepairProjectAttachment) {
    setUploaded((current) => [...current.filter((item) => item.attachmentId !== attachment.attachmentId), attachment]);
  }

  async function run<T>(key: string, action: () => Promise<T>, success: string): Promise<boolean> {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      setUploaded([]);
      await onChanged();
      await Promise.all([reloadSourcing(), reloadProcessHistory()]);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function reloadSourcing() {
    try {
      setSourcing(await getRepairProjectSourcing(project.projectId));
    } catch {
      setSourcing(null);
    }
  }

  async function reloadProcessHistory() {
    setHistoryLoading(true);
    try {
      setProcessHistory(await getRepairProjectProcessHistory(project.projectId));
      setHistoryError(null);
    } catch (error) {
      setProcessHistory([]);
      setHistoryError(error instanceof Error ? error.message : "办理记录读取失败");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function reloadGovernance() {
    if (project.status !== "GOVERNANCE_IN_PROGRESS") {
      setBuildingGovernance(null);
      setAssemblyLink(null);
      return;
    }
    if (project.workflowType === "BUILDING_REPAIR") {
      try {
        setBuildingGovernance(await getBuildingRepairGovernance(project.projectId));
      } catch {
        setBuildingGovernance(null);
      }
      return;
    }
    try {
      setAssemblyLink(await getCommunityRepairAssembly(project.projectId));
    } catch {
      setAssemblyLink(null);
    }
  }

  useEffect(() => {
    void reloadGovernance();
  }, [project.projectId, project.status, project.workflowType]);

  useEffect(() => {
    void reloadSourcing();
  }, [project.projectId, plan?.planId]);

  useEffect(() => {
    void reloadProcessHistory();
  }, [project.projectId]);

  return (
    <div>
      <RepairProjectProcessHistory
        entries={processHistory}
        loading={historyLoading}
        error={historyError}
      />

      {draftPlan && (
        <>
          <RepairProjectSourcingOperation
            details={details}
            sourcing={sourcing}
            suppliers={suppliers}
            remember={remember}
            busy={busy}
            run={run}
            onReload={reloadSourcing}
            onOpenSupplierDirectory={onOpenSupplierDirectory}
          />
          <PlanLockOperation
            details={details}
            plan={draftPlan}
            busy={busy}
            run={run}
          />
        </>
      )}

      {!draftPlan && ["PLAN_LOCKED", "GOVERNANCE_IN_PROGRESS"].includes(project.status) && (
        project.workflowType === "BUILDING_REPAIR" ? (
          <BuildingGovernanceOperation
            details={details}
            governance={buildingGovernance}
            remember={remember}
            busy={busy}
            run={run}
            afterGovernance={reloadGovernance}
            hasPermission={hasPermission}
            roleKey={roleKey}
          />
        ) : (
          <CommunityGovernanceOperation
            details={details}
            link={assemblyLink}
            remember={remember}
            busy={busy}
            run={run}
            afterGovernance={reloadGovernance}
            hasPermission={hasPermission}
            roleKey={roleKey}
          />
        )
      )}

      {project.status === "AUTHORIZED" && execution && (
        <ContractOperation
          details={details}
          execution={execution}
          sourcing={sourcing}
          roleKey={roleKey}
          remember={remember}
          busy={busy}
          run={run}
        />
      )}

      {project.status === "CONTRACT_EFFECTIVE" && hasPermission("repair:workorder:manage") && (
        <OperationSection title="登记开工" desc="开工后施工单位和物业按工程项提交、核验原始过程证据。">
          <Button disabled={busy !== null} onClick={() => void run(
            "start",
            () => postRepairProjectAction(project.projectId, "execution/start", { expectedProjectVersion: project.version }),
            "维修工程已登记开工",
          )}>
            {busy === "start" ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Play className="mr-1 size-4" />}登记开工
          </Button>
        </OperationSection>
      )}

      {project.status === "IN_PROGRESS" && execution && (
        <ExecutionOperation details={details} execution={execution} remember={remember} busy={busy} run={run} />
      )}

      {project.status === "PENDING_ACCEPTANCE" && execution && (
        <AcceptanceOperation
          details={details}
          execution={execution}
          hasPermission={hasPermission}
          remember={remember}
          busy={busy}
          run={run}
        />
      )}

      {["CONTRACT_EFFECTIVE", "IN_PROGRESS", "PENDING_ACCEPTANCE", "COMPLETED", "WARRANTY"].includes(project.status)
        && hasPermission("repair:workorder:manage") && (
          <PaymentOperation details={details} remember={remember} attachments={attachments} busy={busy} run={run} />
        )}

      {project.status === "COMPLETED" && hasPermission("repair:workorder:manage") && (
        <DisclosureOperation details={details} remember={remember} busy={busy} run={run} />
      )}

      {project.status === "WARRANTY" && execution && hasPermission("repair:workorder:manage") && (
        <OperationSection title="质保期满归档" desc={`质保期满日：${execution.completionDisclosure?.warrantyEndDate ?? "尚未生成"}。后端会同时校验告示、物业书面报告和质保责任期。`}>
          <Button variant="outline" disabled={busy !== null} onClick={() => void run(
            "archive",
            () => postRepairProjectAction(project.projectId, "archive", { expectedProjectVersion: project.version }),
            "维修工程项目已归档",
          )}>归档项目</Button>
        </OperationSection>
      )}

      {["ARCHIVED", "CANCELLED"].includes(project.status) && (
        <div className="py-8 text-center text-sm text-muted-foreground">当前项目已结束，不再开放工程写入操作。</div>
      )}
    </div>
  );
}

function RepairProjectProcessHistory({
  entries,
  loading,
  error,
}: {
  entries: RepairProjectProcessHistoryEntry[];
  loading: boolean;
  error: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleEntries = expanded ? entries : entries.slice(-3);

  return (
    <section className="border-b pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4 text-primary" />
            办理记录
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            已完成环节会持续保留；当前操作不会覆盖此前的结论和办理时间。
          </p>
        </div>
        {!loading && !error && entries.length > 0 && (
          <span className="text-xs text-muted-foreground">共 {entries.length} 个节点</span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />正在读取办理记录
        </div>
      ) : error ? (
        <p className="mt-4 text-sm text-destructive">办理记录暂时无法读取：{error}</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">当前项目尚无已归档的办理节点。</p>
      ) : (
        <div className="mt-4">
          <ol className="space-y-4 border-l border-border pl-5">
            {visibleEntries.map((entry) => (
              <li key={entry.eventId} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h5 className="text-sm font-medium">{entry.title}</h5>
                  <span className="text-xs text-muted-foreground">{formatDateTime(entry.occurredAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.summary}</p>
              </li>
            ))}
          </ol>
          {entries.length > 3 && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={expanded}
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? <ChevronUp className="mr-1 size-4" /> : <ChevronDown className="mr-1 size-4" />}
                {expanded ? "收起办理记录" : `查看全部 ${entries.length} 个节点`}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PlanLockOperation({
  details,
  plan,
  busy,
  run,
}: Omit<OperationProps, "remember"> & { plan: RepairProjectPlan }) {
  const project = details.project;
  const decisionScope = details.decisionScope;
  const decisionScopePending = decisionScope?.verificationStatus === "PENDING_VERIFICATION";
  const fundingSlicesConfirmed = details.fundingSlices.length > 0
    && details.fundingSlices.every((slice) => slice.verificationStatus === "CONFIRMED");

  return (
    <OperationSection title="请求锁定当前实施方案" desc="锁定时由后端重新核验决定范围、资金承担、验收与证据依据，并固化真实快照。本页不以定商结果或附件上传替代这些核验。">
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={decisionScope?.verificationStatus === "CONFIRMED" ? "success" : "warning"}>决定范围{decisionScope?.verificationStatus === "CONFIRMED" ? "已确认" : "待核验"}</StatusChip>
          <StatusChip tone={fundingSlicesConfirmed ? "success" : "warning"}>资金承担快照{fundingSlicesConfirmed ? "已确认" : "待后端核验"}</StatusChip>
        </div>
        <div className="flex shrink-0 gap-2">
          {decisionScopePending && <Button variant="outline" disabled={busy !== null} onClick={() => void run(
            "reverify-decision-scope",
            () => reverifyRepairProjectDecisionScope(project.projectId, project.version),
            "已按关联来源重新核验决定范围",
          )}>重新核验范围</Button>}
          <Button disabled={busy !== null} onClick={() => void run(
            "lock-plan",
            () => lockRepairProjectPlan(project.projectId, plan.planId, project.version),
            "后端已核验并锁定实施方案",
          )}><ShieldCheck className="mr-1 size-4" />请求锁定</Button>
        </div>
      </div>
    </OperationSection>
  );
}

interface OperationProps {
  details: RepairProjectDetails;
  execution?: RepairProjectExecutionDetails;
  remember: (attachment: RepairProjectAttachment) => void;
  busy: string | null;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<boolean>;
}

function BuildingGovernanceOperation({
  details,
  governance,
  remember,
  busy,
  run,
  afterGovernance,
  hasPermission,
  roleKey,
}: OperationProps & {
  governance: RepairBuildingGovernanceDetails | null;
  afterGovernance: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  roleKey: string | null;
}) {
  const project = details.project;
  const [evidenceFile, setEvidenceFile] = useState<RepairProjectAttachment | null>(null);
  const [officialFile, setOfficialFile] = useState<RepairProjectAttachment | null>(null);
  const [reviewFile, setReviewFile] = useState<RepairProjectAttachment | null>(null);
  const [sealedFile, setSealedFile] = useState<RepairProjectAttachment | null>(null);
  const [decisionRule, setDecisionRule] = useState<RepairDecisionRule | null>(null);
  const [planningPolicy, setPlanningPolicy] = useState<RepairPlanningPolicy | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [rulePreviewing, setRulePreviewing] = useState(false);
  const [reviewAmount, setReviewAmount] = useState("");
  const [opinion, setOpinion] = useState("");
  const [confirmedResult, setConfirmedResult] = useState<"PASSED" | "FAILED" | null>(null);
  const [decisionConfirmationOpen, setDecisionConfirmationOpen] = useState(false);
  const [auditedGovernance, setAuditedGovernance] = useState<RepairBuildingGovernanceDetails | null>(null);
  const status = governance?.process.status;
  const confirmedFundingSlices = details.fundingSlices.filter((slice) => slice.verificationStatus === "CONFIRMED");
  const decisionScopeConfirmed = details.decisionScope?.verificationStatus === "CONFIRMED";
  const isPropertyVerifier = ["PROPERTY_MANAGER", "PROPERTY_STAFF"].includes(roleKey ?? "")
    && hasPermission("repair:decision:verify");
  const isCommitteePriceReviewer = ["COMMITTEE_DIRECTOR", "COMMITTEE_MEMBER"].includes(roleKey ?? "")
    && hasPermission("repair:workorder:governance");
  const decisionEvidence = governance?.decision.evidenceAttachmentHash
    ? details.attachments.find((attachment) => attachment.sha256 === governance.decision.evidenceAttachmentHash)
    : null;
  const officialDocument = governance?.process.officialDocumentAttachmentId
    ? details.attachments.find((attachment) => attachment.attachmentId === governance.process.officialDocumentAttachmentId)
    : null;
  const priceReviewReport = governance?.process.priceReviewReportAttachmentId
    ? details.attachments.find((attachment) => attachment.attachmentId === governance.process.priceReviewReportAttachmentId)
    : null;
  const decisionCompleted = ["PASSED", "FAILED"].includes(governance?.decision.result ?? "");
  const hasCompletedGovernanceStep = Boolean(
    decisionCompleted
    || governance?.process.officialDocumentAttachmentId
    || governance?.process.reviewedAmount !== null && governance?.process.reviewedAmount !== undefined
    || governance?.process.approverPosition
    || governance?.process.sealUsageId,
  );

  useEffect(() => {
    let cancelled = false;
    if (governance) {
      setRuleLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setRuleLoading(true);
    setRuleError(null);
    void Promise.all([getActiveRepairDecisionRule(), getRepairPlanningPolicy()])
      .then(([rule, policy]) => {
        if (cancelled) return;
        setDecisionRule(rule);
        setPlanningPolicy(policy);
      })
      .catch((error) => {
        if (cancelled) return;
        setDecisionRule(null);
        setPlanningPolicy(null);
        setRuleError(error instanceof Error ? error.message : "当前小区维修征询规则读取失败");
      })
      .finally(() => {
        if (!cancelled) setRuleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [governance, project.projectId]);

  useEffect(() => {
    setAuditedGovernance(null);
    setConfirmedResult(null);
  }, [governance?.decision.decisionId, governance?.decision.result]);

  async function previewDecisionRule(ruleId: number) {
    setRulePreviewing(true);
    try {
      const ticket = await getRepairDecisionRulePreviewTicket(ruleId);
      window.open(ticket.previewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "规则原件预览失败");
    } finally {
      setRulePreviewing(false);
    }
  }

  async function openProjectAttachment(attachment: RepairProjectAttachment, fallbackMessage: string) {
    try {
      const ticket = await getRepairProjectAttachmentTicket(project.projectId, attachment.attachmentId);
      window.open(ticket.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fallbackMessage);
    }
  }

  async function governanceRun<T>(key: string, action: () => Promise<T>, success: string) {
    const succeeded = await run(key, action, success);
    await afterGovernance();
    return succeeded;
  }

  async function confirmWechatDecision() {
    if (!governance || !evidenceFile || !confirmedResult) return;
    const succeeded = await governanceRun(
      "building-complete",
      () => postRepairProjectAction(project.projectId, "building-governance/decision/complete", {
        expectedProcessVersion: governance.process.processVersion,
        evidenceAttachmentId: evidenceFile.attachmentId,
        confirmedResult,
      }),
      confirmedResult === "PASSED"
        ? "微信接龙核验通过，项目已进入报审阶段"
        : "微信接龙核验未通过，项目已退回已锁定方案",
    );
    if (succeeded) setDecisionConfirmationOpen(false);
  }

  if (!governance) {
    const unsupportedNonResponseRule = decisionRule?.nonResponseRule !== undefined
      && decisionRule.nonResponseRule !== "NOT_PARTICIPATED";
    // 当前后端尚未提供可用于征询的业主/面积范围快照，不能由项目范围或资金切片自动补造。
    const canStart = false;
    return (
      <OperationSection title="楼栋维修治理依据" desc="业主征询必须依赖后端已核验的决定范围、资金承担和业主范围快照。当前页面不会从项目范围或资金切片自动生成征询对象。">
        <div className="grid overflow-hidden rounded-md border bg-border md:grid-cols-2 md:gap-px">
          <div className="bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" />
                当前有效备案规则
              </div>
              {decisionRule && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={rulePreviewing}
                  onClick={() => void previewDecisionRule(decisionRule.ruleId)}
                >
                  {rulePreviewing ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Eye className="mr-1 size-4" />}
                  查看原件
                </Button>
              )}
            </div>
            {ruleLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />正在读取小区备案规则
              </div>
            ) : decisionRule ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">规则名称</dt><dd className="mt-1 font-medium">{decisionRule.ruleName}</dd></div>
                <div><dt className="text-xs text-muted-foreground">规则版本</dt><dd className="mt-1">{decisionRule.ruleVersion}</dd></div>
                <div><dt className="text-xs text-muted-foreground">生效日期</dt><dd className="mt-1">{formatRuleDate(decisionRule.effectiveAt)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">本次征询方式</dt><dd className="mt-1 font-medium">{decisionChannelLabel(planningPolicy?.buildingRepairDefaultDecisionChannel)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">送达规则</dt><dd className="mt-1 leading-6">{decisionRule.deliveryRule}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">未表态处理</dt><dd className="mt-1">{nonResponseRuleLabel(decisionRule.nonResponseRule)}</dd></div>
              </dl>
            ) : (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900">
                <AlertTriangle className="mt-1 size-4 shrink-0" />
                <span>{ruleError ?? "当前小区尚未备案有效的维修征询规则"}。请由业委会主任在“系统管理 - 社区设置 - 自治与财务规则”中备案后再发起。</span>
              </div>
            )}
          </div>
          <div className="bg-background p-4">
            <div className="mb-3 text-sm font-semibold">后端核验快照</div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">项目决定范围</dt><dd className="mt-1">{decisionScopeConfirmed ? "已确认" : "待核验"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">资金承担切片</dt><dd className="mt-1">{confirmedFundingSlices.length > 0 ? `已确认 ${confirmedFundingSlices.length} 项` : "待核验"}</dd></div>
            </dl>
            <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
              <AlertTriangle className="mt-1 size-4 shrink-0" />
              <span>当前契约未提供可用于业主征询的实际业主、房屋或面积快照。该事实不能由项目范围或资金承担切片推导，待后端可信快照接入后才可发起征询。</span>
            </div>
          </div>
        </div>
        {unsupportedNonResponseRule && (
          <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            <AlertTriangle className="mt-1 size-4 shrink-0" />
            当前有效规则为“{nonResponseRuleLabel(decisionRule?.nonResponseRule ?? "")}”，现有计票能力尚不支持该未表态处理方式，禁止发起征询。
          </div>
        )}
        <Button className="mt-4" disabled={busy !== null || ruleLoading || !canStart} onClick={() => void governanceRun(
          "building-start",
          () => postRepairProjectAction(project.projectId, "building-governance/start", {
            expectedProjectVersion: project.version,
          }),
          "楼栋维修征询已发起",
        )}>等待后端治理快照</Button>
      </OperationSection>
    );
  }

  return (
    <OperationSection title="楼栋维修治理" desc={`${buildingProcessStatusLabel(status)}。已完成环节和原始材料会持续保留，业委会不代替楼栋业主验收。`}>
      <div className="mb-4 grid gap-3 rounded-md border bg-muted/20 p-3 text-sm md:grid-cols-2">
        <div><span className="text-muted-foreground">备案规则：</span>{governance.policySnapshot.ruleName ?? "历史项目规则"} · {governance.policySnapshot.ruleVersion}</div>
        <div><span className="text-muted-foreground">征询方式：</span>{decisionChannelLabel(governance.policySnapshot.decisionChannel)}</div>
        <div><span className="text-muted-foreground">征询范围：</span>{governance.decision.scopeLabel}</div>
        <div><span className="text-muted-foreground">送达规则：</span>{governance.policySnapshot.deliveryRule}</div>
        <div><span className="text-muted-foreground">未表态处理：</span>{nonResponseRuleLabel(governance.policySnapshot.nonResponseRule)}</div>
      </div>
      {hasCompletedGovernanceStep && (
        <section className="mb-5 border-y py-4" aria-labelledby="completed-governance-steps">
          <div>
            <h5 id="completed-governance-steps" className="text-sm font-semibold">已完成环节</h5>
            <p className="mt-1 text-xs text-muted-foreground">结论、原始材料和关键办理信息会在后续环节持续保留，只读查看。</p>
          </div>
          <ol className="mt-4 space-y-4 border-l border-border pl-5">
            {decisionCompleted && (
              <li className="relative">
                <span className={`absolute -left-[1.64rem] top-1 size-3 rounded-full border-2 border-background ${governance.decision.result === "PASSED" ? "bg-emerald-600" : "bg-destructive"}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <h6 className="text-sm font-medium">业主征询核验</h6>
                  <StatusChip tone={governance.decision.result === "PASSED" ? "success" : "danger"}>{decisionResultLabel(governance.decision.result)}</StatusChip>
                </div>
                <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">征询方式</dt><dd className="mt-0.5">{decisionChannelLabel(governance.policySnapshot.decisionChannel)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">核验时间</dt><dd className="mt-0.5">{formatDateTime(governance.decision.updateTime)}</dd></div>
                  {governance.policySnapshot.decisionChannel === "ONLINE" && (
                    <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">表决汇总</dt><dd className="mt-0.5">已参与 {governance.decision.participatedOwnerCount ?? 0} 户，其中同意 {governance.decision.agreeOwnerCount ?? 0} 户</dd></div>
                  )}
                </dl>
                {decisionEvidence && (
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void openProjectAttachment(decisionEvidence, "微信接龙原始证据暂时无法打开")}>
                    <Eye className="mr-1 size-4" />查看原始证据
                  </Button>
                )}
              </li>
            )}
            {governance.process.officialDocumentAttachmentId && (
              <li className="relative">
                <span className="absolute -left-[1.64rem] top-1 size-3 rounded-full border-2 border-background bg-emerald-600" />
                <div className="flex flex-wrap items-center gap-2"><h6 className="text-sm font-medium">物业正式报审文件</h6><StatusChip tone="success">已归档</StatusChip></div>
                <p className="mt-2 text-sm text-muted-foreground">物业已提交正式报审文件，后续审价以该文件为依据。</p>
                {officialDocument && (
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void openProjectAttachment(officialDocument, "物业正式报审文件暂时无法打开")}>
                    <Eye className="mr-1 size-4" />查看正式文件
                  </Button>
                )}
              </li>
            )}
            {governance.process.reviewedAmount !== null && governance.process.reviewedAmount !== undefined && (
              <li className="relative">
                <span className={`absolute -left-[1.64rem] top-1 size-3 rounded-full border-2 border-background ${governance.process.priceReviewConclusion === "APPROVED" ? "bg-emerald-600" : "bg-destructive"}`} />
                <div className="flex flex-wrap items-center gap-2"><h6 className="text-sm font-medium">业委会审价</h6><StatusChip tone={governance.process.priceReviewConclusion === "APPROVED" ? "success" : "danger"}>{priceReviewConclusionLabel(governance.process.priceReviewConclusion)}</StatusChip></div>
                <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">审价方式</dt><dd className="mt-0.5">{reviewModeLabel(governance.process.reviewMode)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">审定金额</dt><dd className="mt-0.5">¥{Number(governance.process.reviewedAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">审价时间</dt><dd className="mt-0.5">{formatDateTime(governance.process.priceReviewedAt)}</dd></div>
                  {governance.process.priceReviewOpinion && <div><dt className="text-xs text-muted-foreground">审价意见</dt><dd className="mt-0.5">{governance.process.priceReviewOpinion}</dd></div>}
                </dl>
                {priceReviewReport && (
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void openProjectAttachment(priceReviewReport, "审价报告暂时无法打开")}>
                    <Eye className="mr-1 size-4" />查看审价报告
                  </Button>
                )}
              </li>
            )}
            {governance.process.approverPosition && (
              <li className="relative">
                <span className="absolute -left-[1.64rem] top-1 size-3 rounded-full border-2 border-background bg-emerald-600" />
                <div className="flex flex-wrap items-center gap-2"><h6 className="text-sm font-medium">主任或副主任在线确认</h6><StatusChip tone="success">已确认</StatusChip></div>
                <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">确认角色</dt><dd className="mt-0.5">{committeePositionLabel(governance.process.approverPosition)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">确认时间</dt><dd className="mt-0.5">{formatDateTime(governance.process.approvedAt)}</dd></div>
                  {governance.process.approvalOpinion && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">确认意见</dt><dd className="mt-0.5">{governance.process.approvalOpinion}</dd></div>}
                </dl>
              </li>
            )}
            {governance.process.sealUsageId && (
              <li className="relative">
                <span className="absolute -left-[1.64rem] top-1 size-3 rounded-full border-2 border-background bg-emerald-600" />
                <div className="flex flex-wrap items-center gap-2"><h6 className="text-sm font-medium">业委会用印</h6><StatusChip tone="success">已登记</StatusChip></div>
                <p className="mt-2 text-sm text-muted-foreground">用印记录已关联本项目，可在工程档案中继续查看。</p>
              </li>
            )}
          </ol>
        </section>
      )}
      {status === "DECISION_COLLECTING" && (
        governance.policySnapshot.decisionChannel === "WECHAT" ? (
          <div className="space-y-4">
            {isPropertyVerifier ? (
              <>
                <div className="max-w-xl">
                  <FileUpload projectId={project.projectId} label="微信接龙原始截图或导出 PDF" value={evidenceFile} accept="image/*,application/pdf,.pdf" onUploaded={(file) => { remember(file); setEvidenceFile(file); }} />
                </div>
                <fieldset>
                  <legend className="text-sm font-medium">物业核验结论</legend>
                  <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-2" role="group" aria-label="物业核验结论">
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={confirmedResult === "PASSED"}
                      className={`h-10 ${confirmedResult === "PASSED"
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:text-white"
                        : "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                      onClick={() => setConfirmedResult("PASSED")}
                    >
                      <CheckCircle2 />
                      通过
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={confirmedResult === "FAILED"}
                      className={`h-10 ${confirmedResult === "FAILED"
                        ? "border-destructive bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:text-white"
                        : "hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                      }`}
                      onClick={() => setConfirmedResult("FAILED")}
                    >
                      <XCircle />
                      未通过
                    </Button>
                  </div>
                </fieldset>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    disabled={busy !== null || !evidenceFile || !confirmedResult}
                    className={confirmedResult === "PASSED"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : confirmedResult === "FAILED"
                        ? "bg-destructive text-white hover:bg-destructive/90"
                        : undefined}
                    onClick={() => setDecisionConfirmationOpen(true)}
                  >
                    {confirmedResult === "PASSED" ? <CheckCircle2 /> : confirmedResult === "FAILED" ? <XCircle /> : <ShieldCheck />}
                    {confirmedResult === "PASSED"
                      ? "确认通过并进入报审"
                      : confirmedResult === "FAILED"
                        ? "确认未通过并退回方案"
                        : "请选择核验结论"}
                  </Button>
                  {!confirmedResult && <p className="text-sm text-muted-foreground">上传证据后，请先选择核验结论。</p>}
                </div>
                <AlertDialog
                  open={decisionConfirmationOpen}
                  onOpenChange={(open) => {
                    if (busy === null) setDecisionConfirmationOpen(open);
                  }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {confirmedResult === "PASSED" ? "确认微信接龙核验通过？" : "确认微信接龙核验未通过？"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {confirmedResult === "PASSED"
                          ? "系统将留存原始证据和物业核验结论，项目随后进入报审阶段。"
                          : "系统将留存原始证据和物业核验结论，本次征询结束，项目将退回已锁定方案。"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      已归档证据：{evidenceFile?.originalFileName ?? "未选择"}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={busy !== null}>取消</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={busy !== null || !evidenceFile || !confirmedResult}
                        className={confirmedResult === "PASSED"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-destructive text-white hover:bg-destructive/90"}
                        onClick={(event) => {
                          event.preventDefault();
                          void confirmWechatDecision();
                        }}
                      >
                        {busy === "building-complete" ? <Loader2 className="animate-spin" /> : confirmedResult === "PASSED" ? <CheckCircle2 /> : <XCircle />}
                        {confirmedResult === "PASSED" ? "确认通过" : "确认未通过"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">微信接龙结果由物业上传原始截图并确认通过或未通过，当前身份仅可查看。</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4 lg:gap-px">
              {[
                ["应参与业主", governance.decision.totalOwnerCount],
                ["已参与", governance.decision.participatedOwnerCount ?? 0],
                ["同意", governance.decision.agreeOwnerCount ?? 0],
                ["不同意 / 弃权", `${governance.decision.disagreeOwnerCount ?? 0} / ${governance.decision.abstainOwnerCount ?? 0}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-background p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>
              ))}
            </div>
            <div className="overflow-hidden rounded-md border">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
                <div><div className="text-sm font-medium">费用承担房屋参与情况</div><div className="text-xs text-muted-foreground">默认不显示个人具体选择</div></div>
                {hasPermission("repair:decision:audit") && (
                  <Button type="button" size="sm" variant="outline" disabled={busy !== null || Boolean(auditedGovernance)} onClick={() => void run(
                    "decision-audit",
                    async () => setAuditedGovernance(await auditBuildingRepairDecision(project.projectId)),
                    "已按审计权限读取逐户选择",
                  )}><Eye className="mr-1 size-4" />{auditedGovernance ? "已显示审计结果" : "审计查看选择"}</Button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {(auditedGovernance?.entries ?? governance.entries).map((entry) => (
                  <div key={entry.roomId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-3 py-2 text-sm last:border-b-0">
                    <span>房屋 {entry.roomId}</span>
                    <span className="text-muted-foreground">{Number(entry.buildArea).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ㎡</span>
                    <StatusChip tone={entry.participated ? "success" : "neutral"}>{auditedGovernance ? decisionChoiceLabel(entry.choice) : entry.participated ? "已参与" : "未参与"}</StatusChip>
                  </div>
                ))}
              </div>
            </div>
            {isPropertyVerifier ? (
              <Button disabled={busy !== null} onClick={() => void governanceRun(
                "building-complete",
                () => postRepairProjectAction(project.projectId, "building-governance/decision/complete", {
                  expectedProcessVersion: governance.process.processVersion,
                }),
                "C 端在线表决结果已由物业核验",
              )}>核验并锁定在线表决结果</Button>
            ) : (
              <p className="text-sm text-muted-foreground">业主可继续在 C 端表决；最终结果仅由物业核验。</p>
            )}
          </div>
        )
      )}
      {status === "DECISION_FAILED" && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">本次楼栋维修征询未通过，项目不能继续进入报审与签约。</p>}
      {status === "DECISION_PASSED" && (
        <div className="space-y-4"><FileUpload projectId={project.projectId} label="物业正式报审文件" value={officialFile} onUploaded={(file) => { remember(file); setOfficialFile(file); }} /><Button disabled={busy !== null || !officialFile} onClick={() => void governanceRun("building-official", () => postRepairProjectAction(project.projectId, "building-governance/official-document", { expectedProcessVersion: governance.process.processVersion, attachmentId: officialFile?.attachmentId }), "物业正式报审文件已归档")}>提交正式文件</Button></div>
      )}
      {status === "OFFICIAL_DOCUMENT_READY" && (
        isCommitteePriceReviewer ? (
          <div className="space-y-5">
            <div>
              <h5 className="text-sm font-semibold">业委会审价</h5>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">物业正式报审文件已归档。由具备审价权限的业委会成员核对方案、报价和报告后办理审价。</p>
            </div>
            <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="building-review-amount">审价金额</Label>
                <Input id="building-review-amount" type="number" min="0" step="0.01" value={reviewAmount} onChange={(event) => setReviewAmount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <FileUpload projectId={project.projectId} label="审价报告（必填）" value={reviewFile} onUploaded={(file) => { remember(file); setReviewFile(file); }} />
                <p className="text-xs leading-5 text-muted-foreground">支持 PDF、Office 文档或扫描图片，归档后作为本次审价依据。</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="building-review-opinion">审价意见</Label>
                <Textarea id="building-review-opinion" rows={4} placeholder="填写审价结论、金额依据或需补充事项" value={opinion} onChange={(event) => setOpinion(event.target.value)} />
              </div>
            </div>
            <div className="border-t pt-4">
              <Button disabled={busy !== null || Number(reviewAmount) <= 0 || !reviewFile} onClick={() => {
                if (!reviewFile) return;
                void governanceRun(
                  "building-review",
                  () => postRepairProjectAction(project.projectId, "building-governance/price-review", {
                    expectedProcessVersion: governance.process.processVersion,
                    reviewMode: "INTERNAL_PRICE_REVIEW",
                    reviewedAmount: Number(reviewAmount),
                    reportAttachmentId: reviewFile.attachmentId,
                    conclusion: "APPROVED",
                    opinion,
                  }),
                  "楼栋维修审价已完成",
                );
              }}>
                <ShieldCheck className="mr-1 size-4" />完成审价
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-l-2 border-amber-500 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">待业委会审价</p>
            <p className="mt-1 leading-6">物业正式报审文件已归档。审价由具备审价权限的业委会成员办理，当前身份仅可查看已完成环节。</p>
          </div>
        )
      )}
      {status === "PRICE_REVIEWED" && <div className="space-y-3"><Textarea placeholder="主任或副主任确认意见" value={opinion} onChange={(event) => setOpinion(event.target.value)} /><Button disabled={busy !== null} onClick={() => void governanceRun("building-approve", () => postRepairProjectAction(project.projectId, "building-governance/committee-approval", { expectedProcessVersion: governance.process.processVersion, opinion }), "主任或副主任已在线确认")}>在线确认</Button></div>}
      {status === "COMMITTEE_APPROVED" && <div className="space-y-4"><FileUpload projectId={project.projectId} label="已盖章正式文件" value={sealedFile} onUploaded={(file) => { remember(file); setSealedFile(file); }} /><Button disabled={busy !== null || !sealedFile} onClick={() => void governanceRun("building-seal", () => postRepairProjectAction(project.projectId, "building-governance/seal", { expectedProcessVersion: governance.process.processVersion, sealedAttachmentId: sealedFile?.attachmentId, remark: opinion }), "楼栋维修用印已登记")}>登记用印</Button></div>}
    </OperationSection>
  );
}

function CommunityGovernanceOperation({
  details,
  link,
  busy,
  run,
  afterGovernance,
  hasPermission,
  roleKey,
}: OperationProps & {
  link: RepairCommunityAssemblyLink | null;
  afterGovernance: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  roleKey: string | null;
}) {
  const [packageId, setPackageId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const project = details.project;
  const isPropertyVerifier = ["PROPERTY_MANAGER", "PROPERTY_STAFF"].includes(roleKey ?? "");
  const isCommitteeVerifier = ["COMMITTEE_DIRECTOR", "COMMITTEE_MEMBER"].includes(roleKey ?? "");

  async function execute<T>(key: string, action: () => Promise<T>, success: string) {
    await run(key, action, success);
    await afterGovernance();
  }

  return (
    <OperationSection title="全小区公共维修业主大会" desc="只关联正式业主大会表决包和其中的维修事项；项目不复制投票数据，也不能用楼栋接龙替代。">
      {!link ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>表决包 ID</Label><Input type="number" min="1" value={packageId} onChange={(event) => setPackageId(event.target.value)} /></div>
          <div><Label>表决事项 ID</Label><Input type="number" min="1" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} /></div>
          {hasPermission("repair:workorder:governance") && <Button disabled={busy !== null || !packageId || !subjectId} onClick={() => void execute("community-link", () => postRepairProjectAction(project.projectId, "community-assembly/link", { expectedProjectVersion: project.version, packageId: Number(packageId), subjectId: Number(subjectId) }), "业主大会维修事项已关联")}>关联正式表决事项</Button>}
        </div>
      ) : (
        <div className="rounded-md border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm"><div className="font-medium">表决包 {link.packageId} · 事项 {link.subjectId}</div><div className="mt-1 text-muted-foreground">状态 {link.status}{link.result ? ` · 结果 ${link.result}` : ""}</div></div>
            {link.status === "LINKED" && hasPermission("repair:decision:verify") && (isPropertyVerifier || isCommitteeVerifier) && (
              <Button
                variant={isPropertyVerifier ? "default" : "outline"}
                disabled={busy !== null}
                onClick={() => void execute(
                  "community-settle",
                  () => postRepairProjectAction(project.projectId, "community-assembly/settle", { expectedProjectVersion: project.version }),
                  "业主大会事项结果已由核验人写入项目",
                )}
              >核验并写入正式计票结果</Button>
            )}
          </div>
          {link.status === "LINKED" && isCommitteeVerifier && !isPropertyVerifier && hasPermission("repair:decision:verify") && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">本流程以物业核验为主；物业尚未办理时，业委会可按正式结算快照补充核验。</p>
          )}
        </div>
      )}
    </OperationSection>
  );
}

function ContractOperation({
  details,
  execution,
  sourcing,
  roleKey,
  remember,
  busy,
  run,
}: OperationProps & { sourcing: RepairProjectSourcingDetails | null; roleKey: string | null }) {
  const project = details.project;
  const plan = details.plans.find((item) => item.planId === project.activePlanId) ?? details.plans[0];
  const isBuildingRepair = project.workflowType === "BUILDING_REPAIR";
  const isCommitteeReviewer = roleKey === "COMMITTEE_DIRECTOR" || roleKey === "COMMITTEE_MEMBER";
  const priceReviewPending = project.workflowType === "COMMUNITY_PUBLIC_REPAIR"
    && plan.priceReviewRequired
    && !execution?.costReview;
  const canRecordContract = roleKey === "PROPERTY_MANAGER" && !priceReviewPending;
  const [reviewMode, setReviewMode] = useState("THIRD_PARTY_AUDIT");
  const [reviewAmount, setReviewAmount] = useState("");
  const [reviewReport, setReviewReport] = useState<RepairProjectAttachment | null>(null);
  const [contractAmount, setContractAmount] = useState("");
  const [contractFile, setContractFile] = useState<RepairProjectAttachment | null>(null);
  const [ownerSignature, setOwnerSignature] = useState<RepairProjectAttachment | null>(null);
  const [propertySignature, setPropertySignature] = useState<RepairProjectAttachment | null>(null);
  const [supplierSignature, setSupplierSignature] = useState<RepairProjectAttachment | null>(null);
  const [ownerSignerName, setOwnerSignerName] = useState("");
  const [propertySignerName, setPropertySignerName] = useState("");
  const [supplierSignerName, setSupplierSignerName] = useState("");
  const [signedAt, setSignedAt] = useState(nowLocal());
  const [propertyOrganization, setPropertyOrganization] = useState<PropertyServiceOrganization | null>(null);
  const [propertyOrganizationLoading, setPropertyOrganizationLoading] = useState(true);
  const selectedSupplier = sourcing?.selection;

  useEffect(() => {
    if (selectedSupplier && !contractAmount) {
      setContractAmount(String(selectedSupplier.quoteAmount));
    }
  }, [selectedSupplier?.selectionId]);

  useEffect(() => {
    let cancelled = false;
    void listPropertyServiceOrganizations()
      .then((organizations) => {
        if (!cancelled) {
          setPropertyOrganization(organizations.find((item) => item.status === "ACTIVE") ?? null);
          setPropertyOrganizationLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPropertyOrganization(null);
          setPropertyOrganizationLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requiredSignaturesComplete = isBuildingRepair
    ? Boolean(propertySignature && supplierSignature && propertySignerName && supplierSignerName)
    : Boolean(ownerSignature && ownerSignerName
      && propertySignature && supplierSignature && propertySignerName && supplierSignerName);
  const contractTitle = isBuildingRepair ? "登记双方施工合同" : "登记三方施工合同";
  const contractDescription = isBuildingRepair
    ? "楼栋维修合同由物业服务企业和施工单位以各自名义签署；签约物业从已启用的物业服务组织读取，业委会授权依据已在治理环节归档。"
    : "合同必须由业主大会或相关业主方、物业服务企业和施工单位三方签署，并引用当前锁定方案。";

  return (
    <>
      {priceReviewPending && isCommitteeReviewer && (
        <OperationSection title="全小区维修审价" desc="审价结论绑定当前锁定方案，合同金额不得超过预算和有效审价金额。">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>审价方式</Label><Select value={reviewMode} onValueChange={setReviewMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INTERNAL_PRICE_REVIEW">业委会内部审价</SelectItem><SelectItem value="THIRD_PARTY_AUDIT">第三方审价</SelectItem><SelectItem value="NOT_REQUIRED">依法不需审价</SelectItem></SelectContent></Select></div>
            <div><Label>审定金额</Label><Input type="number" min="0" step="0.01" value={reviewAmount} onChange={(event) => setReviewAmount(event.target.value)} /></div>
            <FileUpload projectId={project.projectId} label="审价报告（按方式提供）" value={reviewReport} onUploaded={(file) => { remember(file); setReviewReport(file); }} />
            <div className="flex items-end"><Button disabled={busy !== null || Number(reviewAmount) <= 0} onClick={() => void run("cost-review", () => postRepairProjectAction(project.projectId, "cost-review", { expectedProjectVersion: project.version, reviewMode, reviewedAmount: Number(reviewAmount), reportAttachmentId: reviewReport?.attachmentId }), "全小区维修审价已归档")}>登记审价</Button></div>
          </div>
        </OperationSection>
      )}

      {!canRecordContract ? (
        <OperationSection title="施工合同办理" desc="合同归档由物业经理办理，已完成的治理授权会作为合同依据持续保留。">
          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
            {priceReviewPending
              ? "当前锁定方案待业委会完成审价，审价通过后由物业经理登记施工合同。"
              : isBuildingRepair
                ? "楼栋维修合同由物业服务企业与施工单位以各自名义签署。业委会当前仅查看授权依据和后续归档结果。"
                : "当前项目待物业经理归档三方施工合同。"}
          </div>
        </OperationSection>
      ) : (
        <OperationSection title={contractTitle} desc={contractDescription}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>锁定方案中选施工单位</Label><div className="mt-1 flex min-h-10 items-center justify-between gap-3 border-y px-3 text-sm"><span>{selectedSupplier?.supplierName ?? "正在读取中选结果"}</span>{selectedSupplier && <span className="text-muted-foreground">中选报价 ¥{Number(selectedSupplier.quoteAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>}</div></div>
            <div><Label>合同含税总额</Label><Input type="number" min="0" max={selectedSupplier?.quoteAmount} step="0.01" value={contractAmount} onChange={(event) => setContractAmount(event.target.value)} /></div>
            <FileUpload projectId={project.projectId} label={isBuildingRepair ? "完整双方合同" : "完整三方合同"} value={contractFile} onUploaded={(file) => { remember(file); setContractFile(file); }} />
            <div>
              <Label>签署归档</Label>
              <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">纸质签署扫描件</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">签署页和完整合同作为凭证，系统自动留存本次物业办理人的审计记录。</p>
            </div>
            <div><Label>签署时间</Label><Input type="datetime-local" value={signedAt} onChange={(event) => setSignedAt(event.target.value)} /></div>
          </div>
          <div className={`mt-5 grid gap-4 ${isBuildingRepair ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {!isBuildingRepair && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="text-sm font-medium">业主方</div>
                <Input placeholder="主任或副主任姓名" value={ownerSignerName} onChange={(event) => setOwnerSignerName(event.target.value)} />
                <FileUpload projectId={project.projectId} label="业主方签署页" value={ownerSignature} onUploaded={(file) => { remember(file); setOwnerSignature(file); }} />
              </div>
            )}
            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm font-medium">物业服务企业</div>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                {propertyOrganizationLoading ? "正在读取本小区已启用的物业服务组织" : propertyOrganization ? <><div>{propertyOrganization.legalName}</div><div className="mt-1 text-xs text-muted-foreground">{propertyOrganization.projectDeptName}</div></> : "未找到已启用的物业服务组织，暂不能登记合同"}
              </div>
              <Input placeholder="物业授权签署人姓名" value={propertySignerName} onChange={(event) => setPropertySignerName(event.target.value)} />
              <FileUpload projectId={project.projectId} label="物业方签署页" value={propertySignature} onUploaded={(file) => { remember(file); setPropertySignature(file); }} />
            </div>
            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm font-medium">施工单位</div>
              <Input placeholder="施工单位签署人姓名" value={supplierSignerName} onChange={(event) => setSupplierSignerName(event.target.value)} />
              <FileUpload projectId={project.projectId} label="施工单位签署页" value={supplierSignature} onUploaded={(file) => { remember(file); setSupplierSignature(file); }} />
            </div>
          </div>
          <Button className="mt-4" disabled={busy !== null || propertyOrganizationLoading || !propertyOrganization || !selectedSupplier || Number(contractAmount) <= 0 || Number(contractAmount) > Number(selectedSupplier?.quoteAmount ?? 0) || !contractFile || !requiredSignaturesComplete} onClick={() => void run(
            "contract",
            () => postRepairProjectAction(project.projectId, "contract", {
              expectedProjectVersion: project.version,
              supplierDeptId: selectedSupplier?.supplierDeptId,
              supplierName: selectedSupplier?.supplierName,
              contractAmount: Number(contractAmount),
              contractAttachmentId: contractFile?.attachmentId,
              signatures: [
                ...(!isBuildingRepair ? [{ partyType: "OWNERS_ASSEMBLY_OR_GROUP", signerName: ownerSignerName, signatureMethod: "PAPER_SCAN" as const, signatureAttachmentId: ownerSignature?.attachmentId, signedAt }] : []),
                { partyType: "PROPERTY", signerName: propertySignerName, signatureMethod: "PAPER_SCAN" as const, signatureAttachmentId: propertySignature?.attachmentId, signedAt },
                { partyType: "SUPPLIER", signerName: supplierSignerName, signatureMethod: "PAPER_SCAN" as const, signatureAttachmentId: supplierSignature?.attachmentId, signedAt },
              ],
            }),
            `${isBuildingRepair ? "双方" : "三方"}施工合同已登记生效`,
          )}>登记合同</Button>
        </OperationSection>
      )}
    </>
  );
}

interface ExecutionSettlementLineDraft {
  clientId: string;
  workPointId: number | null;
  actualQuantity: string;
  unit: string;
  actualUnitPrice: string;
  varianceReason: string;
}

let executionSettlementLineSequence = 0;

function emptyExecutionSettlementLine(): ExecutionSettlementLineDraft {
  executionSettlementLineSequence += 1;
  return {
    clientId: `execution-settlement-line-${executionSettlementLineSequence}`,
    workPointId: null,
    actualQuantity: "",
    unit: "",
    actualUnitPrice: "",
    varianceReason: "",
  };
}

function ManagementWorkPointSelect({
  workPoints,
  value,
  onValueChange,
  compact = false,
}: {
  workPoints: RepairWorkPoint[];
  value: string;
  onValueChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact && <Label>关联维修点位（可选）</Label>}
      <Select value={value || "__PROJECT_WIDE__"} onValueChange={(nextValue) => onValueChange(nextValue === "__PROJECT_WIDE__" ? "" : nextValue)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__PROJECT_WIDE__">项目通用事项</SelectItem>
          {workPoints.map((point) => <SelectItem key={point.workPointId} value={String(point.workPointId)}>{point.businessName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExecutionOperation({ details, execution, remember, busy, run }: OperationProps & { execution: RepairProjectExecutionDetails }) {
  const project = details.project;
  const workPoints = details.currentPlanWorkPoints;
  const [mode, setMode] = useState<"EXECUTION" | "MATERIAL" | "SETTLEMENT">("EXECUTION");
  const [workPointId, setWorkPointId] = useState("");
  const [stage, setStage] = useState<RepairProjectStage>("BEFORE_CONSTRUCTION");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [evidenceFile, setEvidenceFile] = useState<RepairProjectAttachment | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [qualification, setQualification] = useState<RepairProjectAttachment | null>(null);
  const [materialPhoto, setMaterialPhoto] = useState<RepairProjectAttachment | null>(null);
  const [settlementFile, setSettlementFile] = useState<RepairProjectAttachment | null>(null);
  const [settlementTaxRate, setSettlementTaxRate] = useState("");
  const [settlementLines, setSettlementLines] = useState<ExecutionSettlementLineDraft[]>([]);
  const workPointById = useMemo(
    () => new Map(workPoints.map((point) => [point.workPointId, point])),
    [workPoints],
  );

  useEffect(() => {
    setWorkPointId("");
    setQuantity("");
    setEvidenceFile(null);
    setQualification(null);
    setMaterialPhoto(null);
    setSettlementFile(null);
    setSettlementTaxRate("");
    setSettlementLines([]);
  }, [project.projectId, project.activePlanId]);

  function updateSettlementLine(clientId: string, field: keyof ExecutionSettlementLineDraft, value: string | number | null) {
    setSettlementLines((current) => current.map((line) => line.clientId === clientId ? { ...line, [field]: value } : line));
  }

  const settlementPayload = useMemo(() => settlementLines.map((line) => ({
    workPointId: line.workPointId ?? undefined,
    actualQuantity: Number(line.actualQuantity),
    unit: line.unit.trim(),
    actualUnitPrice: Number(line.actualUnitPrice),
    varianceReason: line.varianceReason.trim() || undefined,
  })), [settlementLines]);
  const settlementTaxRateNumber = Number(settlementTaxRate);
  const settlementValid = settlementPayload.length > 0
    && isPercentageTaxRate(settlementTaxRate)
    && settlementPayload.every((line) =>
      (line.workPointId == null || workPointById.has(line.workPointId))
      && Number.isFinite(line.actualQuantity) && line.actualQuantity >= 0
      && Boolean(line.unit)
      && Number.isFinite(line.actualUnitPrice) && line.actualUnitPrice >= 0);
  const workPointLabel = (value?: number | null) => value == null
    ? "项目通用事项"
    : workPointById.get(value)?.businessName ?? `维修点位 #${value}`;

  return (
    <OperationSection title="施工、材料与结算" desc="施工单位提交原始记录，物业逐条核验；过程、材料和专业结算可如实关联维修点位，也可记录项目通用事项。">
      <div className="mb-4 inline-flex rounded-md border bg-muted/30 p-1">
        {(["EXECUTION", "MATERIAL", "SETTLEMENT"] as const).map((value) => <Button key={value} size="sm" variant={mode === value ? "default" : "ghost"} onClick={() => setMode(value)}>{value === "EXECUTION" ? "施工记录" : value === "MATERIAL" ? "材料进场" : "竣工结算"}</Button>)}
      </div>

      {mode === "EXECUTION" && <div className="grid gap-4 md:grid-cols-2">
        <ManagementWorkPointSelect workPoints={workPoints} value={workPointId} onValueChange={setWorkPointId} />
        <div><Label>阶段</Label><Select value={stage} onValueChange={(value) => setStage(value as RepairProjectStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAGE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>发生时间</Label><Input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label="阶段原始证据" value={evidenceFile} onUploaded={(file) => { remember(file); setEvidenceFile(file); }} />
        <div className="md:col-span-2"><Label>现场说明</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <Button disabled={busy !== null || !description.trim() || !evidenceFile} onClick={() => void run("execution-record", () => postRepairProjectAction(project.projectId, "execution-records", { workPointId: workPointId ? Number(workPointId) : undefined, stage, description, occurredAt, attachmentIds: [evidenceFile?.attachmentId] }), "施工记录已提交")}>提交施工记录</Button>
      </div>}

      {mode === "MATERIAL" && <div className="grid gap-4 md:grid-cols-3">
        <ManagementWorkPointSelect workPoints={workPoints} value={workPointId} onValueChange={setWorkPointId} />
        <div><Label>材料名称</Label><Input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></div><div><Label>品牌</Label><Input value={brand} onChange={(event) => setBrand(event.target.value)} /></div>
        <div><Label>型号</Label><Input value={model} onChange={(event) => setModel(event.target.value)} /></div><div><Label>规格</Label><Input value={specification} onChange={(event) => setSpecification(event.target.value)} /></div><div><Label>生产厂家</Label><Input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></div>
        <div><Label>数量</Label><Input type="number" min="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div><Label>单位</Label><Input value={unit} onChange={(event) => setUnit(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label="合格证明" value={qualification} onUploaded={(file) => { remember(file); setQualification(file); }} /><FileUpload projectId={project.projectId} label="进场照片" value={materialPhoto} accept="image/*" onUploaded={(file) => { remember(file); setMaterialPhoto(file); }} />
        <div className="flex items-end"><Button disabled={busy !== null || !materialName.trim() || !brand.trim() || !model.trim() || !specification.trim() || !manufacturer.trim() || Number(quantity) <= 0 || !unit.trim() || !qualification || !materialPhoto} onClick={() => void run("material", () => postRepairProjectAction(project.projectId, "material-inspections", { workPointId: workPointId ? Number(workPointId) : undefined, materialName, brand, model, specification, quantity: Number(quantity), unit, manufacturer, qualificationAttachmentId: qualification?.attachmentId, photoAttachmentIds: [materialPhoto?.attachmentId] }), "材料进场记录已提交")}>提交材料记录</Button></div>
      </div>}

      {mode === "SETTLEMENT" && <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FileUpload projectId={project.projectId} label="竣工结算原件" value={settlementFile} onUploaded={(file) => { remember(file); setSettlementFile(file); }} />
          <div><Label>结算单税率（%）</Label><Input type="number" min="0" max="100" step="0.001" value={settlementTaxRate} onChange={(event) => setSettlementTaxRate(event.target.value)} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">每条结算专业明细可关联维修点位，也可如实记录项目通用事项。</p><Button type="button" size="sm" variant="outline" onClick={() => setSettlementLines((current) => [...current, emptyExecutionSettlementLine()])}><Plus className="size-4" />新增结算明细</Button></div>
        {settlementLines.length === 0 ? <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">尚未新增结算专业明细。</div> : <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[960px] text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">关联维修点位</th><th className="p-2 text-left">实际数量</th><th className="p-2 text-left">单位</th><th className="p-2 text-left">实际单价</th><th className="p-2 text-left">差异原因</th><th className="p-2 text-right">操作</th></tr></thead><tbody>{settlementLines.map((line) => <tr key={line.clientId} className="border-t"><td className="p-2"><ManagementWorkPointSelect compact workPoints={workPoints} value={line.workPointId == null ? "" : String(line.workPointId)} onValueChange={(value) => updateSettlementLine(line.clientId, "workPointId", value ? Number(value) : null)} /></td><td className="p-2"><Input type="number" min="0" value={line.actualQuantity} onChange={(event) => updateSettlementLine(line.clientId, "actualQuantity", event.target.value)} /></td><td className="p-2"><Input value={line.unit} onChange={(event) => updateSettlementLine(line.clientId, "unit", event.target.value)} /></td><td className="p-2"><Input type="number" min="0" value={line.actualUnitPrice} onChange={(event) => updateSettlementLine(line.clientId, "actualUnitPrice", event.target.value)} /></td><td className="p-2"><Input value={line.varianceReason} onChange={(event) => updateSettlementLine(line.clientId, "varianceReason", event.target.value)} /></td><td className="p-2 text-right"><Button type="button" size="icon" variant="ghost" title="删除结算明细" onClick={() => setSettlementLines((current) => current.filter((candidate) => candidate.clientId !== line.clientId))}><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div>}
        <Button disabled={busy !== null || !settlementFile || !settlementValid} onClick={() => void run("settlement", () => postRepairProjectAction(project.projectId, "settlement", { settlementAttachmentId: settlementFile?.attachmentId, taxRate: settlementTaxRateNumber, items: settlementPayload }), "竣工结算已提交")}>提交结算</Button>
      </div>}

      <div className="mt-5 space-y-2 border-t pt-4">
        {[...execution.executionRecords.filter((record) => record.verificationStatus === "PENDING").map((record) => ({ key: `record-${record.recordId}`, label: `${STAGE_LABEL[record.stage]} · ${workPointLabel(record.workPointId)} · 记录 ${record.recordId}`, action: (approved: boolean) => postRepairProjectAction(project.projectId, `execution-records/${record.recordId}/verification`, { status: approved ? "VERIFIED" : "REJECTED", opinion: approved ? "现场核验一致" : "现场证据与实际不一致" }) })), ...execution.materialInspections.filter((material) => material.status === "PENDING").map((material) => ({ key: `material-${material.inspectionId}`, label: `${material.materialName} · ${workPointLabel(material.workPointId)} · 材料 ${material.inspectionId}`, action: (approved: boolean) => postRepairProjectAction(project.projectId, `material-inspections/${material.inspectionId}/verification`, { status: approved ? "VERIFIED" : "REJECTED", opinion: approved ? "品牌规格数量与证明一致" : "材料信息或证明不一致" }) }))].map((item) => <div key={item.key} className="flex items-center justify-between gap-3 rounded-md border p-3"><span className="text-sm">待物业核验：{item.label}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run(`${item.key}-reject`, () => item.action(false), "已驳回并留痕")}>驳回</Button><Button size="sm" disabled={busy !== null} onClick={() => void run(`${item.key}-approve`, () => item.action(true), "已核验通过")}>通过</Button></div></div>)}
        {execution.settlement?.status === "SUBMITTED" && <div className="flex items-center justify-between gap-3 rounded-md border p-3"><span className="text-sm">待物业核验：第 {execution.settlement.versionNo} 版竣工结算</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("settlement-reject", () => postRepairProjectAction(project.projectId, "settlement/verification", { expectedProjectVersion: project.version, approved: false, opinion: "结算与现场实际不一致" }), "结算已驳回")}>驳回</Button><Button size="sm" disabled={busy !== null} onClick={() => void run("settlement-approve", () => postRepairProjectAction(project.projectId, "settlement/verification", { expectedProjectVersion: project.version, approved: true, opinion: "实际工程量与结算一致" }), "结算已核验并进入验收")}>通过并发起验收</Button></div></div>}
      </div>
    </OperationSection>
  );
}

function AcceptanceOperation({ details, execution, hasPermission, remember, busy, run }: OperationProps & { execution: RepairProjectExecutionDetails; hasPermission: (permission: string) => boolean }) {
  const project = details.project;
  const building = project.workflowType === "BUILDING_REPAIR";
  const [kind, setKind] = useState(building ? "building-leader" : "committee-executive");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [opinion, setOpinion] = useState("");
  const [conclusion, setConclusion] = useState<"PASSED" | "RECTIFICATION_REQUIRED">("PASSED");
  const [evidence, setEvidence] = useState<RepairProjectAttachment | null>(null);
  const [sourceFile, setSourceFile] = useState<RepairProjectAttachment | null>(null);
  const [sealedFile, setSealedFile] = useState<RepairProjectAttachment | null>(null);
  const [resultFile, setResultFile] = useState<RepairProjectAttachment | null>(null);

  const allowedKinds = building
    ? (hasPermission("repair:workorder:local-decision") ? [{ value: "building-leader", label: "楼组长验收" }] : [])
    : [
      ...(hasPermission("repair:workorder:governance") ? [{ value: "committee-executive", label: "主任/副主任在线同意" }, { value: "third-party-technical", label: "登记第三方专业签署" }] : []),
      ...(hasPermission("repair:workorder:manage") || hasPermission("repair:workorder:field") ? [{ value: "property-technical", label: "物业专业共同签署" }] : []),
    ];

  useEffect(() => {
    if (allowedKinds.length > 0 && !allowedKinds.some((item) => item.value === kind)) setKind(allowedKinds[0].value);
  }, [project.projectId, building]);

  return (
    <OperationSection title={building ? "楼栋业主侧验收" : "全小区业委会验收"} desc={building ? "楼组长与锁定受影响业主共同验收；业委会账号不在此处代签。" : "主任或副主任在线同意、业委会用印、物业或第三方专业人员共同签署，三项缺一不可。"}>
      {allowedKinds.length > 0 && <div className="grid gap-4 md:grid-cols-2">
        <div><Label>当前签署角色</Label><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allowedKinds.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>结论</Label><Select value={conclusion} onValueChange={(value) => setConclusion(value as typeof conclusion)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PASSED">验收通过</SelectItem><SelectItem value="RECTIFICATION_REQUIRED">要求整改</SelectItem></SelectContent></Select></div>
        <div><Label>签署人姓名</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
        {!building && kind !== "committee-executive" && <div><Label>签署组织</Label><Input value={organization} onChange={(event) => setOrganization(event.target.value)} /></div>}
        <div className="md:col-span-2"><Label>验收意见</Label><Textarea value={opinion} onChange={(event) => setOpinion(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label={kind === "third-party-technical" ? "第三方签署原件" : "补充证据（可选）"} value={evidence} onUploaded={(file) => { remember(file); setEvidence(file); }} />
        <div className="flex items-end"><Button disabled={busy !== null || !name.trim() || (kind === "third-party-technical" && (!organization.trim() || !evidence)) || (kind === "property-technical" && !organization.trim()) || (conclusion === "RECTIFICATION_REQUIRED" && !opinion.trim())} onClick={() => void run("acceptance-party", () => postRepairProjectAction(project.projectId, `acceptance/${kind}`, { conclusion, participantName: name, participantOrganization: organization || undefined, opinion: opinion || undefined, evidenceAttachmentId: evidence?.attachmentId }), "验收签署已提交")}>提交签署</Button></div>
      </div>}

      {!building && hasPermission("repair:workorder:governance") && hasPermission("committee:seal:use") && <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2"><FileUpload projectId={project.projectId} label="验收签前文件" value={sourceFile} onUploaded={(file) => { remember(file); setSourceFile(file); }} /><FileUpload projectId={project.projectId} label="已盖章验收文件" value={sealedFile} onUploaded={(file) => { remember(file); setSealedFile(file); }} /><Button disabled={busy !== null || !sourceFile || !sealedFile} onClick={() => void run("acceptance-seal", () => postRepairProjectAction(project.projectId, "acceptance/seal", { sourceAttachmentId: sourceFile?.attachmentId, sealedAttachmentId: sealedFile?.attachmentId, remark: opinion }), "业委会验收用印已登记")}>登记验收用印</Button></div>}

      {(hasPermission(building ? "repair:workorder:local-decision" : "repair:workorder:governance")) && <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2"><FileUpload projectId={project.projectId} label="验收定案文件" value={resultFile} onUploaded={(file) => { remember(file); setResultFile(file); }} /><div className="flex items-end"><Button disabled={busy !== null || !resultFile} onClick={() => void run("acceptance-finalize", () => postRepairProjectAction(project.projectId, "acceptance/finalization", { expectedProjectVersion: project.version, resultAttachmentId: resultFile?.attachmentId, remark: opinion }), "项目验收已定案")}>完成验收定案</Button></div></div>}

      <div className="mt-5 space-y-2 border-t pt-4">{execution.acceptanceParties.map((party) => <div key={party.partyId} className="flex items-start justify-between gap-3 text-sm"><div><span className="font-medium">{party.participantName}</span><span className="ml-2 text-muted-foreground">{party.partyRole}</span>{party.opinion && <div className="mt-1 text-xs text-muted-foreground">{party.opinion}</div>}</div><StatusChip tone={party.conclusion === "PASSED" ? "success" : "danger"}>{party.conclusion === "PASSED" ? "通过" : "整改"}</StatusChip></div>)}</div>
    </OperationSection>
  );
}

function PaymentOperation({ details, remember, attachments, busy, run }: OperationProps & { attachments: RepairProjectAttachment[] }) {
  const project = details.project;
  const plan = details.plans.find((item) => item.planId === project.activePlanId) ?? details.plans[0];
  const paymentMilestones = plan?.paymentMilestones ?? [];
  const eligible = paymentMilestones.filter((milestone) => {
    if (milestone.type === "ADVANCE") return ["CONTRACT_EFFECTIVE", "IN_PROGRESS"].includes(project.status);
    if (milestone.type === "PROGRESS") return ["IN_PROGRESS", "PENDING_ACCEPTANCE"].includes(project.status);
    if (milestone.type === "COMPLETION") return ["COMPLETED", "WARRANTY"].includes(project.status);
    return project.status === "WARRANTY";
  });
  const [milestoneType, setMilestoneType] = useState<RepairPaymentMilestone>(eligible[0]?.type ?? "ADVANCE");
  const [amount, setAmount] = useState("");
  const [newEvidence, setNewEvidence] = useState<RepairProjectAttachment | null>(null);
  const [evidenceIds, setEvidenceIds] = useState<Record<string, string>>({});
  const milestone = paymentMilestones.find((item) => item.type === milestoneType);

  useEffect(() => {
    if (eligible.length > 0 && !eligible.some((item) => item.type === milestoneType)) setMilestoneType(eligible[0].type);
  }, [project.status]);

  if (eligible.length === 0) return null;
  const available = newEvidence ? [...attachments.filter((item) => item.attachmentId !== newEvidence.attachmentId), newEvidence] : attachments;

  return (
    <OperationSection title="维修资金付款申请" desc="这里只生成满足条件的付款申请；实际支取、银行流水和财务审批仍由财务模块负责。">
      <div className="grid gap-4 md:grid-cols-3">
        <div><Label>付款节点</Label><Select value={milestoneType} onValueChange={(value) => setMilestoneType(value as RepairPaymentMilestone)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{eligible.map((item) => <SelectItem key={item.type} value={item.type}>{MILESTONE_LABEL[item.type]} · 累计上限 {(item.maximumContractRatio * 100).toFixed(0)}%</SelectItem>)}</SelectContent></Select></div>
        <div><Label>本次申请金额</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label="上传缺少的付款证明" value={newEvidence} onUploaded={(file) => { remember(file); setNewEvidence(file); }} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{milestone?.requiredEvidenceCodes.map((code) => <div key={code}><Label>{code}</Label><Select value={evidenceIds[code] ?? ""} onValueChange={(value) => setEvidenceIds((current) => ({ ...current, [code]: value }))}><SelectTrigger><SelectValue placeholder="选择本项目原始附件" /></SelectTrigger><SelectContent>{available.map((attachment) => <SelectItem key={attachment.attachmentId} value={String(attachment.attachmentId)}>{attachment.originalFileName}</SelectItem>)}</SelectContent></Select></div>)}</div>
      <Button className="mt-4" disabled={busy !== null || Number(amount) <= 0 || milestone?.requiredEvidenceCodes.some((code) => !evidenceIds[code])} onClick={() => void run("payment", () => postRepairProjectAction(project.projectId, "payment-requests", { milestoneType, requestedAmount: Number(amount), evidence: milestone?.requiredEvidenceCodes.map((code) => ({ evidenceCode: code, attachmentId: Number(evidenceIds[code]) })) }), "付款申请已进入财务处理")}>提交付款申请</Button>
    </OperationSection>
  );
}

function DisclosureOperation({ details, remember, busy, run }: OperationProps) {
  const project = details.project;
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [postingScope, setPostingScope] = useState("");
  const [warrantyStartDate, setWarrantyStartDate] = useState(today());
  const [notice, setNotice] = useState<RepairProjectAttachment | null>(null);
  const [report, setReport] = useState<RepairProjectAttachment | null>(null);
  const [photo, setPhoto] = useState<RepairProjectAttachment | null>(null);
  return (
    <OperationSection title="完工披露与质保" desc="归档完工告示、物业书面维修报告和现场张贴照片后，项目进入锁定质保责任期。">
      <div className="grid gap-4 md:grid-cols-3">
        <div><Label>告示开始日</Label><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div><div><Label>告示结束日</Label><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div><div><Label>质保起算日</Label><Input type="date" value={warrantyStartDate} onChange={(event) => setWarrantyStartDate(event.target.value)} /></div>
        <div className="md:col-span-3"><Label>张贴范围</Label><Input value={postingScope} onChange={(event) => setPostingScope(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label="完工告示" value={notice} onUploaded={(file) => { remember(file); setNotice(file); }} /><FileUpload projectId={project.projectId} label="物业书面维修报告" value={report} onUploaded={(file) => { remember(file); setReport(file); }} /><FileUpload projectId={project.projectId} label="现场张贴照片" value={photo} accept="image/*" onUploaded={(file) => { remember(file); setPhoto(file); }} />
      </div>
      <Button className="mt-4" disabled={busy !== null || !postingScope.trim() || !notice || !report || !photo} onClick={() => void run("disclosure", () => postRepairProjectAction(project.projectId, "completion-disclosure", { expectedProjectVersion: project.version, noticeStartDate: startDate, noticeEndDate: endDate, postingScope, noticeAttachmentId: notice?.attachmentId, propertyReportAttachmentId: report?.attachmentId, sitePhotoAttachmentIds: [photo?.attachmentId], warrantyStartDate }), "完工披露和质保期已归档")}>归档完工披露</Button>
    </OperationSection>
  );
}
