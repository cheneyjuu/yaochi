// 关联业务：按维修项目状态和真实工作身份执行方案锁定、两类治理、合同、施工、结算、验收、付款及归档。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Loader2,
  Play,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
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
import type { RepairSupplierOrganization } from "../../../lib/repair";
import {
  getBuildingRepairGovernance,
  getCommunityRepairAssembly,
  getRepairProjectSourcing,
  linkRepairPlanAttachment,
  lockRepairProjectPlan,
  postRepairProjectAction,
  type RepairBuildingGovernanceDetails,
  type RepairCommunityAssemblyLink,
  type RepairPaymentMilestone,
  type RepairProjectAttachment,
  type RepairProjectDetails,
  type RepairProjectExecutionDetails,
  type RepairProjectPlan,
  type RepairProjectSourcingDetails,
  type RepairProjectStage,
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
  onChanged,
}: {
  details: RepairProjectDetails;
  execution: RepairProjectExecutionDetails | null;
  suppliers: RepairSupplierOrganization[];
  hasPermission: (permission: string) => boolean;
  onChanged: () => Promise<void>;
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
      await reloadSourcing();
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

  return (
    <div>
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
          />
          <PlanLockOperation
            details={details}
            plan={draftPlan}
            sourcing={sourcing}
            remember={remember}
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
          />
        ) : (
          <CommunityGovernanceOperation
            details={details}
            link={assemblyLink}
            busy={busy}
            run={run}
            afterGovernance={reloadGovernance}
          />
        )
      )}

      {project.status === "AUTHORIZED" && execution && (
        <ContractOperation
          details={details}
          execution={execution}
          sourcing={sourcing}
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

function PlanLockOperation({
  details,
  plan,
  sourcing,
  remember,
  busy,
  run,
}: OperationProps & { plan: RepairProjectPlan; sourcing: RepairProjectSourcingDetails | null }) {
  const project = details.project;
  const [photo, setPhoto] = useState<RepairProjectAttachment | null>(null);
  const linked = new Set(details.currentPlanAttachments.map((item) => item.purpose));

  async function link(attachment: RepairProjectAttachment) {
    remember(attachment);
    await run(
      "link-SITE_PHOTO",
      () => linkRepairPlanAttachment(project.projectId, plan.planId, { attachmentId: attachment.attachmentId, purpose: "SITE_PHOTO" }),
      "现场照片已关联",
    );
  }

  return (
    <OperationSection title="锁定当前实施方案" desc="完成定商并归档现场照片后锁定；报价原件由上方中选记录自动进入方案快照和业主披露。">
      <div className="max-w-xl">
        <FileUpload projectId={project.projectId} label="现场照片" value={photo} accept="image/*" onUploaded={(file) => { setPhoto(file); void link(file); }} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex gap-2"><StatusChip tone={sourcing?.selection ? "success" : "warning"}>定商{sourcing?.selection ? "已完成" : "待完成"}</StatusChip><StatusChip tone={linked.has("SITE_PHOTO") ? "success" : "warning"}>现场照片{linked.has("SITE_PHOTO") ? "已归档" : "待归档"}</StatusChip></div>
        <Button disabled={busy !== null || !sourcing?.selection || !linked.has("SITE_PHOTO")} onClick={() => void run(
          "lock-plan",
          () => lockRepairProjectPlan(project.projectId, plan.planId, project.version),
          "实施方案已锁定",
        )}><ShieldCheck className="mr-1 size-4" />锁定方案</Button>
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
}: OperationProps & { governance: RepairBuildingGovernanceDetails | null; afterGovernance: () => Promise<void> }) {
  const project = details.project;
  const [ruleFile, setRuleFile] = useState<RepairProjectAttachment | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<RepairProjectAttachment | null>(null);
  const [officialFile, setOfficialFile] = useState<RepairProjectAttachment | null>(null);
  const [reviewFile, setReviewFile] = useState<RepairProjectAttachment | null>(null);
  const [sealedFile, setSealedFile] = useState<RepairProjectAttachment | null>(null);
  const [ruleVersion, setRuleVersion] = useState("");
  const [deliveryRule, setDeliveryRule] = useState("物业将纸质征询及方案送达费用承担范围房屋");
  const [scopeLabel, setScopeLabel] = useState("");
  const [reviewAmount, setReviewAmount] = useState("");
  const [opinion, setOpinion] = useState("");
  const [entries, setEntries] = useState<Record<number, { choice: string; originalText: string }>>({});
  const status = governance?.process.status;

  async function governanceRun<T>(key: string, action: () => Promise<T>, success: string) {
    await run(key, action, success);
    await afterGovernance();
  }

  if (!governance) {
    return (
      <OperationSection title="发起楼栋维修微信接龙" desc="按备案议事规则锁定送达、未表态规则和费用承担范围。系统不把未回复推定为同意。">
        <div className="grid gap-4 md:grid-cols-2">
          <FileUpload projectId={project.projectId} label="备案议事规则" value={ruleFile} onUploaded={(file) => { remember(file); setRuleFile(file); }} />
          <div><Label>规则版本</Label><Input value={ruleVersion} onChange={(event) => setRuleVersion(event.target.value)} /></div>
          <div className="md:col-span-2"><Label>送达规则</Label><Input value={deliveryRule} onChange={(event) => setDeliveryRule(event.target.value)} /></div>
          <div className="md:col-span-2"><Label>征询范围名称</Label><Input value={scopeLabel} onChange={(event) => setScopeLabel(event.target.value)} placeholder="例如：16号楼全体费用承担业主" /></div>
        </div>
        <Button className="mt-4" disabled={busy !== null || !ruleFile || !ruleVersion.trim() || !scopeLabel.trim()} onClick={() => void governanceRun(
          "building-start",
          () => postRepairProjectAction(project.projectId, "building-governance/start", {
            expectedProjectVersion: project.version,
            ruleDocumentAttachmentId: ruleFile?.attachmentId,
            ruleVersion,
            deliveryRule,
            nonResponseRule: "NOT_PARTICIPATED",
            scopeLabel,
          }),
          "楼栋维修征询已发起",
        )}>发起征询</Button>
      </OperationSection>
    );
  }

  return (
    <OperationSection title="楼栋维修治理" desc={`当前节点：${status}；物业、业委会审价确认和用印分别留痕，业委会不代替楼栋业主验收。`}>
      {status === "DECISION_COLLECTING" && (
        <div className="space-y-4">
          <FileUpload projectId={project.projectId} label="微信接龙原始截图" value={evidenceFile} accept="image/*,.pdf" onUploaded={(file) => { remember(file); setEvidenceFile(file); }} />
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {details.currentPlanAllocationRooms.map((room) => {
              const value = entries[room.roomId] ?? { choice: "AGREE", originalText: "" };
              return (
                <div key={room.roomId} className="grid gap-2 border-b p-3 last:border-b-0 md:grid-cols-[120px_150px_1fr]">
                  <div className="text-sm">房屋 {room.roomId}</div>
                  <Select value={value.choice} onValueChange={(choice) => setEntries((current) => ({ ...current, [room.roomId]: { ...value, choice } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AGREE">同意</SelectItem><SelectItem value="DISAGREE">不同意</SelectItem><SelectItem value="ABSTAIN">弃权</SelectItem><SelectItem value="INVALID">无效</SelectItem></SelectContent></Select>
                  <Input placeholder="逐户接龙原文" value={value.originalText} onChange={(event) => setEntries((current) => ({ ...current, [room.roomId]: { ...value, originalText: event.target.value } }))} />
                </div>
              );
            })}
          </div>
          <Button disabled={busy !== null || !evidenceFile || details.currentPlanAllocationRooms.some((room) => !(entries[room.roomId]?.originalText ?? "").trim())} onClick={() => void governanceRun(
            "building-complete",
            () => postRepairProjectAction(project.projectId, "building-governance/decision/complete", {
              expectedProcessVersion: governance.process.processVersion,
              evidenceAttachmentId: evidenceFile?.attachmentId,
              entries: details.currentPlanAllocationRooms.map((room) => ({ roomId: room.roomId, ...entries[room.roomId] })),
            }),
            "楼栋微信接龙结果已核验",
          )}>核验接龙结果</Button>
        </div>
      )}
      {status === "DECISION_PASSED" && (
        <div className="space-y-4"><FileUpload projectId={project.projectId} label="物业正式报审文件" value={officialFile} onUploaded={(file) => { remember(file); setOfficialFile(file); }} /><Button disabled={busy !== null || !officialFile} onClick={() => void governanceRun("building-official", () => postRepairProjectAction(project.projectId, "building-governance/official-document", { expectedProcessVersion: governance.process.processVersion, attachmentId: officialFile?.attachmentId }), "物业正式报审文件已归档")}>提交正式文件</Button></div>
      )}
      {status === "OFFICIAL_DOCUMENT_READY" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>审价金额</Label><Input type="number" min="0" value={reviewAmount} onChange={(event) => setReviewAmount(event.target.value)} /></div>
          <FileUpload projectId={project.projectId} label="审价报告（可选）" value={reviewFile} onUploaded={(file) => { remember(file); setReviewFile(file); }} />
          <div className="md:col-span-2"><Label>审价意见</Label><Textarea value={opinion} onChange={(event) => setOpinion(event.target.value)} /></div>
          <Button disabled={busy !== null || Number(reviewAmount) <= 0} onClick={() => void governanceRun("building-review", () => postRepairProjectAction(project.projectId, "building-governance/price-review", { expectedProcessVersion: governance.process.processVersion, reviewMode: reviewFile ? "THIRD_PARTY_AUDIT" : "INTERNAL_PRICE_REVIEW", reviewedAmount: Number(reviewAmount), reportAttachmentId: reviewFile?.attachmentId, conclusion: "APPROVED", opinion }), "楼栋维修审价已完成")}>完成审价</Button>
        </div>
      )}
      {status === "PRICE_REVIEWED" && <div className="space-y-3"><Textarea placeholder="主任或副主任确认意见" value={opinion} onChange={(event) => setOpinion(event.target.value)} /><Button disabled={busy !== null} onClick={() => void governanceRun("building-approve", () => postRepairProjectAction(project.projectId, "building-governance/committee-approval", { expectedProcessVersion: governance.process.processVersion, opinion }), "主任或副主任已在线确认")}>在线确认</Button></div>}
      {status === "COMMITTEE_APPROVED" && <div className="space-y-4"><FileUpload projectId={project.projectId} label="已盖章正式文件" value={sealedFile} onUploaded={(file) => { remember(file); setSealedFile(file); }} /><Button disabled={busy !== null || !sealedFile} onClick={() => void governanceRun("building-seal", () => postRepairProjectAction(project.projectId, "building-governance/seal", { expectedProcessVersion: governance.process.processVersion, sealedAttachmentId: sealedFile?.attachmentId, remark: opinion }), "楼栋维修用印已登记")}>登记用印</Button></div>}
    </OperationSection>
  );
}

function CommunityGovernanceOperation({ details, link, busy, run, afterGovernance }: OperationProps & { link: RepairCommunityAssemblyLink | null; afterGovernance: () => Promise<void> }) {
  const [packageId, setPackageId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const project = details.project;

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
          <Button disabled={busy !== null || !packageId || !subjectId} onClick={() => void execute("community-link", () => postRepairProjectAction(project.projectId, "community-assembly/link", { expectedProjectVersion: project.version, packageId: Number(packageId), subjectId: Number(subjectId) }), "业主大会维修事项已关联")}>关联正式表决事项</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
          <div className="text-sm"><div className="font-medium">表决包 {link.packageId} · 事项 {link.subjectId}</div><div className="mt-1 text-muted-foreground">状态 {link.status}{link.result ? ` · 结果 ${link.result}` : ""}</div></div>
          {link.status === "LINKED" && <Button disabled={busy !== null} onClick={() => void execute("community-settle", () => postRepairProjectAction(project.projectId, "community-assembly/settle", { expectedProjectVersion: project.version }), "业主大会事项结果已写入项目")}>读取正式计票结果</Button>}
        </div>
      )}
    </OperationSection>
  );
}

function ContractOperation({
  details,
  execution,
  sourcing,
  remember,
  busy,
  run,
}: OperationProps & { sourcing: RepairProjectSourcingDetails | null }) {
  const project = details.project;
  const plan = details.plans.find((item) => item.planId === project.activePlanId) ?? details.plans[0];
  const [reviewMode, setReviewMode] = useState("THIRD_PARTY_AUDIT");
  const [reviewAmount, setReviewAmount] = useState("");
  const [reviewReport, setReviewReport] = useState<RepairProjectAttachment | null>(null);
  const [contractAmount, setContractAmount] = useState("");
  const [contractFile, setContractFile] = useState<RepairProjectAttachment | null>(null);
  const [ownerSignature, setOwnerSignature] = useState<RepairProjectAttachment | null>(null);
  const [propertySignature, setPropertySignature] = useState<RepairProjectAttachment | null>(null);
  const [supplierSignature, setSupplierSignature] = useState<RepairProjectAttachment | null>(null);
  const [ownerSignerName, setOwnerSignerName] = useState("");
  const [ownerSignerUserId, setOwnerSignerUserId] = useState("");
  const [propertySignerName, setPropertySignerName] = useState("");
  const [propertySignerUserId, setPropertySignerUserId] = useState("");
  const [supplierSignerName, setSupplierSignerName] = useState("");
  const [supplierSignerUserId, setSupplierSignerUserId] = useState("");
  const [signatureMethod, setSignatureMethod] = useState<"PAPER_SCAN" | "ELECTRONIC">("PAPER_SCAN");
  const [signedAt, setSignedAt] = useState(nowLocal());
  const selectedSupplier = sourcing?.selection;

  useEffect(() => {
    if (selectedSupplier && !contractAmount) {
      setContractAmount(String(selectedSupplier.quoteAmount));
    }
  }, [selectedSupplier?.selectionId]);

  return (
    <>
      {project.workflowType === "COMMUNITY_PUBLIC_REPAIR" && plan.priceReviewRequired && !execution?.costReview && (
        <OperationSection title="全小区维修审价" desc="审价结论绑定当前锁定方案，合同金额不得超过预算和有效审价金额。">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>审价方式</Label><Select value={reviewMode} onValueChange={setReviewMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INTERNAL_PRICE_REVIEW">业委会内部审价</SelectItem><SelectItem value="THIRD_PARTY_AUDIT">第三方审价</SelectItem><SelectItem value="NOT_REQUIRED">依法不需审价</SelectItem></SelectContent></Select></div>
            <div><Label>审定金额</Label><Input type="number" min="0" step="0.01" value={reviewAmount} onChange={(event) => setReviewAmount(event.target.value)} /></div>
            <FileUpload projectId={project.projectId} label="审价报告（按方式提供）" value={reviewReport} onUploaded={(file) => { remember(file); setReviewReport(file); }} />
            <div className="flex items-end"><Button disabled={busy !== null || Number(reviewAmount) <= 0} onClick={() => void run("cost-review", () => postRepairProjectAction(project.projectId, "cost-review", { expectedProjectVersion: project.version, reviewMode, reviewedAmount: Number(reviewAmount), reportAttachmentId: reviewReport?.attachmentId }), "全小区维修审价已归档")}>登记审价</Button></div>
          </div>
        </OperationSection>
      )}

      <OperationSection title="登记三方施工合同" desc="合同必须由业主大会或相关业主方、物业服务企业和施工单位三方签署，并引用当前锁定方案。">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Label>锁定方案中选施工单位</Label><div className="mt-1 flex min-h-10 items-center justify-between gap-3 border-y px-3 text-sm"><span>{selectedSupplier?.supplierName ?? "正在读取中选结果"}</span>{selectedSupplier && <span className="text-muted-foreground">中选报价 ¥{Number(selectedSupplier.quoteAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>}</div></div>
          <div><Label>合同含税总额</Label><Input type="number" min="0" max={selectedSupplier?.quoteAmount} step="0.01" value={contractAmount} onChange={(event) => setContractAmount(event.target.value)} /></div>
          <FileUpload projectId={project.projectId} label="完整三方合同" value={contractFile} onUploaded={(file) => { remember(file); setContractFile(file); }} />
          <div><Label>签署方式</Label><Select value={signatureMethod} onValueChange={(value) => setSignatureMethod(value as typeof signatureMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAPER_SCAN">纸质签署扫描</SelectItem><SelectItem value="ELECTRONIC">可信电子签署</SelectItem></SelectContent></Select></div>
          <div><Label>签署时间</Label><Input type="datetime-local" value={signedAt} onChange={(event) => setSignedAt(event.target.value)} /></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-md border p-3"><div className="text-sm font-medium">业主方</div><Input placeholder="主任或副主任姓名" value={ownerSignerName} onChange={(event) => setOwnerSignerName(event.target.value)} /><Input type="number" placeholder="主任或副主任 userId" value={ownerSignerUserId} onChange={(event) => setOwnerSignerUserId(event.target.value)} /><FileUpload projectId={project.projectId} label="业主方签署页" value={ownerSignature} onUploaded={(file) => { remember(file); setOwnerSignature(file); }} /></div>
          <div className="space-y-3 rounded-md border p-3"><div className="text-sm font-medium">物业方</div><Input placeholder="物业签署人姓名" value={propertySignerName} onChange={(event) => setPropertySignerName(event.target.value)} /><Input type="number" placeholder="物业签署人 userId" value={propertySignerUserId} onChange={(event) => setPropertySignerUserId(event.target.value)} /><FileUpload projectId={project.projectId} label="物业签署页" value={propertySignature} onUploaded={(file) => { remember(file); setPropertySignature(file); }} /></div>
          <div className="space-y-3 rounded-md border p-3"><div className="text-sm font-medium">施工单位</div><Input placeholder="施工单位签署人姓名" value={supplierSignerName} onChange={(event) => setSupplierSignerName(event.target.value)} /><Input type="number" placeholder="系统 userId（纸质可不填）" value={supplierSignerUserId} onChange={(event) => setSupplierSignerUserId(event.target.value)} /><FileUpload projectId={project.projectId} label="施工单位签署页" value={supplierSignature} onUploaded={(file) => { remember(file); setSupplierSignature(file); }} /></div>
        </div>
        <Button className="mt-4" disabled={busy !== null || !selectedSupplier || Number(contractAmount) <= 0 || Number(contractAmount) > Number(selectedSupplier?.quoteAmount ?? 0) || !contractFile || !ownerSignature || !propertySignature || !supplierSignature || !ownerSignerName || !ownerSignerUserId || !propertySignerName || !propertySignerUserId || !supplierSignerName} onClick={() => void run(
          "contract",
          () => postRepairProjectAction(project.projectId, "contract", {
            expectedProjectVersion: project.version,
            supplierDeptId: selectedSupplier?.supplierDeptId,
            supplierName: selectedSupplier?.supplierName,
            contractAmount: Number(contractAmount),
            contractAttachmentId: contractFile?.attachmentId,
            signatures: [
              { partyType: "OWNERS_ASSEMBLY_OR_GROUP", signerName: ownerSignerName, signerUserId: Number(ownerSignerUserId), signatureMethod, signatureAttachmentId: ownerSignature?.attachmentId, signedAt },
              { partyType: "PROPERTY", signerName: propertySignerName, signerUserId: Number(propertySignerUserId), signatureMethod, signatureAttachmentId: propertySignature?.attachmentId, signedAt },
              { partyType: "SUPPLIER", signerName: supplierSignerName, signerUserId: supplierSignerUserId ? Number(supplierSignerUserId) : undefined, signatureMethod, signatureAttachmentId: supplierSignature?.attachmentId, signedAt },
            ],
          }),
          "三方施工合同已登记生效",
        )}>登记合同</Button>
      </OperationSection>
    </>
  );
}

function ExecutionOperation({ details, execution, remember, busy, run }: OperationProps & { execution: RepairProjectExecutionDetails }) {
  const project = details.project;
  const [mode, setMode] = useState<"EXECUTION" | "MATERIAL" | "SETTLEMENT">("EXECUTION");
  const [itemId, setItemId] = useState(String(details.currentPlanItems[0]?.itemId ?? ""));
  const [stage, setStage] = useState<RepairProjectStage>("BEFORE_CONSTRUCTION");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [evidenceFile, setEvidenceFile] = useState<RepairProjectAttachment | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [qualification, setQualification] = useState<RepairProjectAttachment | null>(null);
  const [materialPhoto, setMaterialPhoto] = useState<RepairProjectAttachment | null>(null);
  const [settlementFile, setSettlementFile] = useState<RepairProjectAttachment | null>(null);
  const [settlementItems, setSettlementItems] = useState<Record<number, { quantity: string; unitPrice: string; taxRate: string; reason: string }>>({});

  useEffect(() => {
    setSettlementItems(Object.fromEntries(details.currentPlanItems.map((item) => [item.itemId, {
      quantity: String(item.quantity),
      unitPrice: String(item.estimatedUnitPrice),
      taxRate: "0",
      reason: "",
    }])));
  }, [project.projectId, project.activePlanId]);

  return (
    <OperationSection title="施工、材料与结算" desc="施工单位提交原始记录，物业逐条核验；验收只能基于已核验过程证据、材料和结构化结算。">
      <div className="mb-4 inline-flex rounded-md border bg-muted/30 p-1">
        {(["EXECUTION", "MATERIAL", "SETTLEMENT"] as const).map((value) => <Button key={value} size="sm" variant={mode === value ? "default" : "ghost"} onClick={() => setMode(value)}>{value === "EXECUTION" ? "施工记录" : value === "MATERIAL" ? "材料进场" : "竣工结算"}</Button>)}
      </div>

      {mode === "EXECUTION" && <div className="grid gap-4 md:grid-cols-2">
        <div><Label>工程项</Label><Select value={itemId} onValueChange={setItemId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{details.currentPlanItems.map((item) => <SelectItem key={item.itemId} value={String(item.itemId)}>{item.itemNo} · {item.locationText}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>阶段</Label><Select value={stage} onValueChange={(value) => setStage(value as RepairProjectStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAGE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>发生时间</Label><Input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label="阶段原始证据" value={evidenceFile} onUploaded={(file) => { remember(file); setEvidenceFile(file); }} />
        <div className="md:col-span-2"><Label>现场说明</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <Button disabled={busy !== null || !itemId || !description.trim() || !evidenceFile} onClick={() => void run("execution-record", () => postRepairProjectAction(project.projectId, "execution-records", { itemId: Number(itemId), stage, description, occurredAt, attachmentIds: [evidenceFile?.attachmentId] }), "施工记录已提交")}>提交施工记录</Button>
      </div>}

      {mode === "MATERIAL" && <div className="grid gap-4 md:grid-cols-3">
        <div><Label>工程项</Label><Select value={itemId} onValueChange={setItemId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{details.currentPlanItems.map((item) => <SelectItem key={item.itemId} value={String(item.itemId)}>{item.itemNo}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>材料名称</Label><Input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></div><div><Label>品牌</Label><Input value={brand} onChange={(event) => setBrand(event.target.value)} /></div>
        <div><Label>型号</Label><Input value={model} onChange={(event) => setModel(event.target.value)} /></div><div><Label>规格</Label><Input value={specification} onChange={(event) => setSpecification(event.target.value)} /></div><div><Label>生产厂家</Label><Input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></div>
        <div><Label>数量</Label><Input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div><Label>单位</Label><Input value={unit} onChange={(event) => setUnit(event.target.value)} /></div>
        <FileUpload projectId={project.projectId} label="合格证明" value={qualification} onUploaded={(file) => { remember(file); setQualification(file); }} /><FileUpload projectId={project.projectId} label="进场照片" value={materialPhoto} accept="image/*" onUploaded={(file) => { remember(file); setMaterialPhoto(file); }} />
        <div className="flex items-end"><Button disabled={busy !== null || !itemId || !materialName || !brand || !model || !specification || !manufacturer || !unit || !qualification || !materialPhoto} onClick={() => void run("material", () => postRepairProjectAction(project.projectId, "material-inspections", { itemId: Number(itemId), materialName, brand, model, specification, quantity: Number(quantity), unit, manufacturer, qualificationAttachmentId: qualification?.attachmentId, photoAttachmentIds: [materialPhoto?.attachmentId] }), "材料进场记录已提交")}>提交材料记录</Button></div>
      </div>}

      {mode === "SETTLEMENT" && <div className="space-y-4">
        <FileUpload projectId={project.projectId} label="竣工结算原件" value={settlementFile} onUploaded={(file) => { remember(file); setSettlementFile(file); }} />
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">工程项</th><th className="p-2 text-left">实际数量</th><th className="p-2 text-left">单位</th><th className="p-2 text-left">实际单价</th><th className="p-2 text-left">税率</th><th className="p-2 text-left">差异原因</th></tr></thead><tbody>{details.currentPlanItems.map((item) => { const value = settlementItems[item.itemId] ?? { quantity: "", unitPrice: "", taxRate: "0", reason: "" }; const update = (field: keyof typeof value, next: string) => setSettlementItems((current) => ({ ...current, [item.itemId]: { ...value, [field]: next } })); return <tr key={item.itemId} className="border-t"><td className="p-2">{item.itemNo}</td><td className="p-2"><Input type="number" value={value.quantity} onChange={(event) => update("quantity", event.target.value)} /></td><td className="p-2">{item.unit}</td><td className="p-2"><Input type="number" value={value.unitPrice} onChange={(event) => update("unitPrice", event.target.value)} /></td><td className="p-2"><Input type="number" min="0" max="1" step="0.01" value={value.taxRate} onChange={(event) => update("taxRate", event.target.value)} /></td><td className="p-2"><Input value={value.reason} onChange={(event) => update("reason", event.target.value)} /></td></tr>; })}</tbody></table></div>
        <Button disabled={busy !== null || !settlementFile} onClick={() => void run("settlement", () => postRepairProjectAction(project.projectId, "settlement", { settlementAttachmentId: settlementFile?.attachmentId, items: details.currentPlanItems.map((item) => ({ projectItemId: item.itemId, actualQuantity: Number(settlementItems[item.itemId]?.quantity), unit: item.unit, actualUnitPrice: Number(settlementItems[item.itemId]?.unitPrice), taxRate: Number(settlementItems[item.itemId]?.taxRate), varianceReason: settlementItems[item.itemId]?.reason || undefined })) }), "竣工结算已提交")}>提交结算</Button>
      </div>}

      <div className="mt-5 space-y-2 border-t pt-4">
        {[...execution.executionRecords.filter((record) => record.verificationStatus === "PENDING").map((record) => ({ key: `record-${record.recordId}`, label: `${STAGE_LABEL[record.stage]} · 记录 ${record.recordId}`, action: (approved: boolean) => postRepairProjectAction(project.projectId, `execution-records/${record.recordId}/verification`, { status: approved ? "VERIFIED" : "REJECTED", opinion: approved ? "现场核验一致" : "现场证据与实际不一致" }) })), ...execution.materialInspections.filter((material) => material.status === "PENDING").map((material) => ({ key: `material-${material.inspectionId}`, label: `${material.materialName} · 材料 ${material.inspectionId}`, action: (approved: boolean) => postRepairProjectAction(project.projectId, `material-inspections/${material.inspectionId}/verification`, { status: approved ? "VERIFIED" : "REJECTED", opinion: approved ? "品牌规格数量与证明一致" : "材料信息或证明不一致" }) }))].map((item) => <div key={item.key} className="flex items-center justify-between gap-3 rounded-md border p-3"><span className="text-sm">待物业核验：{item.label}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void run(`${item.key}-reject`, () => item.action(false), "已驳回并留痕")}>驳回</Button><Button size="sm" disabled={busy !== null} onClick={() => void run(`${item.key}-approve`, () => item.action(true), "已核验通过")}>通过</Button></div></div>)}
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
  const eligible = plan.paymentMilestones.filter((milestone) => {
    if (milestone.type === "ADVANCE") return ["CONTRACT_EFFECTIVE", "IN_PROGRESS"].includes(project.status);
    if (milestone.type === "PROGRESS") return ["IN_PROGRESS", "PENDING_ACCEPTANCE"].includes(project.status);
    if (milestone.type === "COMPLETION") return ["COMPLETED", "WARRANTY"].includes(project.status);
    return project.status === "WARRANTY";
  });
  const [milestoneType, setMilestoneType] = useState<RepairPaymentMilestone>(eligible[0]?.type ?? "ADVANCE");
  const [amount, setAmount] = useState("");
  const [newEvidence, setNewEvidence] = useState<RepairProjectAttachment | null>(null);
  const [evidenceIds, setEvidenceIds] = useState<Record<string, string>>({});
  const milestone = plan.paymentMilestones.find((item) => item.type === milestoneType);

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
