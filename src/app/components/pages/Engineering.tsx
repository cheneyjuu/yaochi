// 关联业务：展示真实维修工程项目台账，并按楼栋或全小区流程办理治理、施工、验收、付款和归档。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HardHat,
  Inbox,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import { RichTextView } from "../common/RichTextEditor";
import { listRepairSupplierOrganizations, type RepairSupplierOrganization } from "../../lib/repair";
import {
  getRepairProject,
  getRepairProjectAttachmentTicket,
  getRepairProjectExecution,
  getRepairProjectSourcing,
  pageRepairProjects,
  type RepairProject,
  type RepairProjectDetails,
  type RepairProjectExecutionDetails,
  type RepairProjectSourcingDetails,
  type RepairProjectStatus,
  type RepairProjectStage,
} from "../../lib/repair-project";
import { PageHeader, KpiCard, Money, SectionCard, StatusChip, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { RepairProjectOperationPanel } from "./repair/RepairProjectOperationPanel";

const STATUS_LABEL: Record<RepairProjectStatus, string> = {
  DRAFT: "方案草稿",
  PLAN_LOCKED: "方案已锁定",
  GOVERNANCE_IN_PROGRESS: "治理决策中",
  AUTHORIZED: "已授权签约",
  CONTRACT_EFFECTIVE: "合同已生效",
  IN_PROGRESS: "施工中",
  PENDING_ACCEPTANCE: "待验收",
  COMPLETED: "验收完成",
  WARRANTY: "质保期",
  ARCHIVED: "已归档",
  CANCELLED: "已取消",
};

const STATUS_TONE: Record<RepairProjectStatus, Tone> = {
  DRAFT: "neutral",
  PLAN_LOCKED: "info",
  GOVERNANCE_IN_PROGRESS: "warning",
  AUTHORIZED: "tech",
  CONTRACT_EFFECTIVE: "success",
  IN_PROGRESS: "primary",
  PENDING_ACCEPTANCE: "warning",
  COMPLETED: "success",
  WARRANTY: "info",
  ARCHIVED: "neutral",
  CANCELLED: "danger",
};

const STAGE_LABEL: Record<RepairProjectStage, string> = {
  BEFORE_CONSTRUCTION: "施工前",
  MATERIAL_ENTRY: "材料进场",
  DURING_CONSTRUCTION: "施工中",
  CONCEALED_WORK: "隐蔽工程",
  COMPLETION: "完工",
  ACCEPTANCE: "验收",
};

const FUND_LABEL = {
  BUILDING_MAINTENANCE_FUND: "楼栋专有维修资金",
  COMMUNITY_MAINTENANCE_FUND: "小区公共维修资金",
} as const;

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function Engineering() {
  const { hasPermission, setPage } = useStore();
  const [projects, setProjects] = useState<RepairProject[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<RepairProjectDetails | null>(null);
  const [execution, setExecution] = useState<RepairProjectExecutionDetails | null>(null);
  const [sourcing, setSourcing] = useState<RepairProjectSourcingDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<RepairSupplierOrganization[]>([]);

  async function reloadList() {
    setLoading(true);
    try {
      const result = await pageRepairProjects({ status, keyword: keyword.trim(), size: 100 });
      setProjects(result.items);
      setTotal(result.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "工程项目台账加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(projectId: number) {
    setDetailLoading(true);
    try {
      const [projectDetails, sourcingDetails] = await Promise.all([
        getRepairProject(projectId),
        getRepairProjectSourcing(projectId),
      ]);
      const executionDetails = projectDetails.project.status === "DRAFT"
        ? null
        : await getRepairProjectExecution(projectId);
      setDetails(projectDetails);
      setExecution(executionDetails);
      setSourcing(sourcingDetails);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "工程项目详情加载失败");
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshSelected() {
    if (selectedId == null) return;
    await Promise.all([loadDetail(selectedId), reloadList()]);
  }

  useEffect(() => {
    void reloadList();
  }, [status]);

  useEffect(() => {
    if (!hasPermission("repair:workorder:manage")) return;
    listRepairSupplierOrganizations()
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  const kpis = useMemo(() => ({
    active: projects.filter((project) => !["ARCHIVED", "CANCELLED"].includes(project.status)).length,
    constructing: projects.filter((project) => project.status === "IN_PROGRESS").length,
    acceptance: projects.filter((project) => project.status === "PENDING_ACCEPTANCE").length,
  }), [projects]);

  function openProject(project: RepairProject, tab = "overview") {
    setSelectedId(project.projectId);
    setDetailTab(tab);
    setDetails(null);
    setExecution(null);
    setSourcing(null);
    setSheetOpen(true);
    void loadDetail(project.projectId);
  }

  async function openAttachment(attachmentId: number) {
    if (!details) return;
    try {
      const ticket = await getRepairProjectAttachmentTicket(details.project.projectId, attachmentId);
      window.open(ticket.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "附件打开失败");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="维修工程项目"
        desc="楼栋维修与全小区公共维修项目台账"
        actions={(
          <>
            <Button variant="outline" onClick={() => void reloadList()} disabled={loading}><RefreshCw className={`mr-1 size-4 ${loading ? "animate-spin" : ""}`} />刷新</Button>
            {hasPermission("repair:workorder:manage") && <Button onClick={() => setPage("repair-project-editor")}><Plus className="mr-1 size-4" />新建项目</Button>}
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="当前项目" value={total} unit="个" tone="primary" icon={<Layers className="size-4" />} />
        <KpiCard label="处理中" value={kpis.active} unit="个" tone="warning" icon={<HardHat className="size-4" />} />
        <KpiCard label="施工中" value={kpis.constructing} unit="个" tone="tech" icon={<Building2 className="size-4" />} />
        <KpiCard label="待验收" value={kpis.acceptance} unit="个" tone="success" icon={<ClipboardCheck className="size-4" />} />
      </div>

      <SectionCard
        title="项目台账"
        bodyClassName="p-0"
        extra={(
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="w-64 pl-8" placeholder="工程名称或项目编号" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void reloadList(); }} /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部状态</SelectItem>{Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          </div>
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />正在读取项目台账</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center"><Inbox className="mb-3 size-9 text-muted-foreground/50" /><div className="text-sm font-medium">没有符合条件的维修工程项目</div></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>项目</TableHead><TableHead>治理流程</TableHead><TableHead>资金范围</TableHead><TableHead>工程范围</TableHead><TableHead>状态</TableHead><TableHead>更新时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>{projects.map((project) => (
              <TableRow key={project.projectId} className="hover:bg-muted/40">
                <TableCell><div className="font-medium">{project.projectName}</div><div className="mt-1 font-mono-num text-xs text-muted-foreground">{project.projectNo}</div></TableCell>
                <TableCell><StatusChip tone={project.workflowType === "BUILDING_REPAIR" ? "warning" : "tech"}>{project.workflowType === "BUILDING_REPAIR" ? "楼栋/单元决定" : "全小区业主大会"}</StatusChip></TableCell>
                <TableCell className="text-sm">{FUND_LABEL[project.fundSource]}</TableCell>
                <TableCell className="text-sm">{project.scopeType === "COMMUNITY" ? "全小区公共区域" : `${project.buildingId ?? "-"} 号楼${project.unitName ? ` · ${project.unitName}` : ""}`}</TableCell>
                <TableCell><StatusChip tone={STATUS_TONE[project.status]} dot>{STATUS_LABEL[project.status]}</StatusChip></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(project.updateTime)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {project.status === "DRAFT" && hasPermission("repair:workorder:manage") && (
                      <Button size="sm" onClick={() => openProject(project, "actions")}><Send className="mr-1 size-4" />邀请供应商</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openProject(project)}>详情</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </SectionCard>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-screen gap-0 overflow-hidden bg-card p-0 sm:w-[min(94vw,1200px)] sm:max-w-[1200px]">
          {detailLoading || !details ? (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>正在读取工程档案</SheetTitle>
                <SheetDescription>请稍候，系统正在读取维修工程项目及供应商邀价记录。</SheetDescription>
              </SheetHeader>
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />正在读取工程档案</div>
            </>
          ) : (
            <>
              <SheetHeader className="shrink-0 border-b bg-card px-4 py-5 sm:px-6">
                <SheetTitle className="pr-8 text-lg sm:text-xl">{details.project.projectName}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2"><span className="font-mono-num">{details.project.projectNo}</span><StatusChip tone={STATUS_TONE[details.project.status]} dot>{STATUS_LABEL[details.project.status]}</StatusChip><StatusChip tone={details.project.workflowType === "BUILDING_REPAIR" ? "warning" : "tech"}>{details.project.workflowType === "BUILDING_REPAIR" ? "楼栋维修" : "全小区公共维修"}</StatusChip></SheetDescription>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="min-h-0 flex-1 gap-0">
                <div className="shrink-0 border-b bg-card px-4 py-3 sm:px-6">
                  <TabsList className="grid h-10 w-full grid-cols-4 rounded-md"><TabsTrigger className="rounded-sm text-xs sm:text-sm" value="overview">项目方案</TabsTrigger><TabsTrigger className="rounded-sm text-xs sm:text-sm" value="execution">工程档案</TabsTrigger><TabsTrigger className="rounded-sm text-xs sm:text-sm" value="acceptance">验收付款</TabsTrigger><TabsTrigger className="rounded-sm text-xs sm:text-sm" value="actions">{details.plans.some((plan) => plan.status === "DRAFT") ? "供应商邀价" : "办理操作"}</TabsTrigger></TabsList>
                </div>

                <TabsContent value="overview" className="m-0 min-h-0 flex-1 overflow-y-auto bg-background">
                  <div className="mx-auto min-h-full w-full max-w-[1120px] bg-card px-4 py-6 sm:px-6 lg:px-8">
                    <ProjectOverview details={details} sourcing={sourcing} openAttachment={openAttachment} />
                  </div>
                </TabsContent>

                <TabsContent value="execution" className="m-0 min-h-0 flex-1 overflow-y-auto bg-background">
                  <div className="mx-auto min-h-full w-full max-w-[1120px] bg-card px-4 py-6 sm:px-6 lg:px-8">
                    {execution
                      ? <ExecutionArchive details={details} execution={execution} openAttachment={openAttachment} />
                      : <Empty text="方案锁定并生成工程档案后，可在这里查看合同、施工与结算记录" />}
                  </div>
                </TabsContent>

                <TabsContent value="acceptance" className="m-0 min-h-0 flex-1 overflow-y-auto bg-background">
                  <div className="mx-auto min-h-full w-full max-w-[1120px] bg-card px-4 py-6 sm:px-6 lg:px-8">
                    {execution
                      ? <AcceptanceAndPayments execution={execution} />
                      : <Empty text="方案锁定并进入实施阶段后，可在这里查看验收与付款记录" />}
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="m-0 min-h-0 flex-1 overflow-y-auto bg-background">
                  <div className="mx-auto min-h-full w-full max-w-[1120px] bg-card px-4 py-6 sm:px-6 lg:px-8">
                    <RepairProjectOperationPanel
                      details={details}
                      execution={execution}
                      suppliers={suppliers}
                      hasPermission={hasPermission}
                      onChanged={refreshSelected}
                      onOpenSupplierDirectory={() => {
                        setSheetOpen(false);
                        setPage("repair-suppliers");
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}

function ProjectOverview({ details, sourcing, openAttachment }: { details: RepairProjectDetails; sourcing: RepairProjectSourcingDetails | null; openAttachment: (attachmentId: number) => Promise<void> }) {
  const project = details.project;
  const plan = details.plans.find((item) => item.planId === project.activePlanId) ?? details.plans[0];
  return (
    <div>
      <section className="pb-7">
        <h3 className="mb-5 text-base font-semibold text-slate-950">项目概况</h3>
        <div className="grid gap-x-8 gap-y-5 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Info label="资金范围" value={FUND_LABEL[project.fundSource]} icon={<Banknote className="size-4" />} />
          <Info label="方案预算" value={<Money value={Number(plan?.budgetTotal ?? 0)} />} />
          <Info label="实施计划" value={`${plan?.plannedStartDate ?? "-"} 至 ${plan?.plannedCompletionDate ?? "-"}`} />
          <Info label="质保期" value={`${plan?.warrantyDays ?? 0} 天`} />
          <Info className="md:col-span-2" label="验收方式" value={plan?.acceptanceMethod ?? "-"} />
          <Info className="md:col-span-2" label="分摊范围" value={plan?.allocationRuleDescription ?? "-"} />
          <Info className="xl:col-span-2" label="中选供应商" value={sourcing?.selection?.supplierName ?? "尚未完成定商"} />
          <Info className="xl:col-span-2" label="中选报价" value={sourcing?.selection ? <Money value={Number(sourcing.selection.quoteAmount)} /> : "-"} />
        </div>

        {sourcing?.selection && (sourcing.selection.recommendationReason || sourcing.selection.insufficientQuoteReason) && <div className="mt-5 border-l-2 border-primary/50 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">{sourcing.selection.recommendationReason && <div>中选说明：{sourcing.selection.recommendationReason}</div>}{sourcing.selection.insufficientQuoteReason && <div className="mt-1">有效报价不足说明：{sourcing.selection.insufficientQuoteReason}</div>}</div>}
      </section>

      <section className="border-t py-7">
        <PlanNarrative label="问题与维修方案" html={plan?.planDescription} />
        <div className="mt-7 grid divide-y border-t lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <PlanNarrative className="py-6 lg:pr-8" label="施工管理要求" html={plan?.constructionManagementRequirements} />
          <PlanNarrative className="py-6 lg:pl-8" label="安全要求" html={plan?.safetyRequirements} />
        </div>
      </section>

      <section className="border-t py-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-950">工程清单</h3>
          <span className="text-xs text-muted-foreground">共 {details.currentPlanItems.length} 项</span>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table><TableHeader className="bg-slate-50"><TableRow><TableHead>编号</TableHead><TableHead>位置</TableHead><TableHead>工作内容</TableHead><TableHead className="text-right">数量</TableHead><TableHead className="text-right">估算金额</TableHead><TableHead>关联工单</TableHead></TableRow></TableHeader><TableBody>{details.currentPlanItems.map((item) => <TableRow key={item.itemId}><TableCell className="font-mono-num text-xs">{item.itemNo}</TableCell><TableCell className="min-w-40 whitespace-normal">{item.locationText}</TableCell><TableCell className="min-w-56 whitespace-normal">{item.workContent}</TableCell><TableCell className="text-right">{item.quantity} {item.unit}</TableCell><TableCell className="text-right"><Money value={Number(item.estimatedAmount)} /></TableCell><TableCell className="text-xs text-muted-foreground">{item.linkedWorkOrderIds.join("、") || "-"}</TableCell></TableRow>)}</TableBody></Table>
        </div>
      </section>

      <section className="border-t pt-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-950">项目附件</h3>
          <span className="text-xs text-muted-foreground">共 {details.attachments.length} 份</span>
        </div>
        {details.attachments.length === 0 ? <div className="rounded-md border border-dashed px-4 py-7 text-center text-sm text-muted-foreground">尚未归档附件</div> : <div className="grid gap-2 md:grid-cols-2">{details.attachments.map((attachment) => <button key={attachment.attachmentId} className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted/40" onClick={() => void openAttachment(attachment.attachmentId)}><FileText className="size-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{attachment.originalFileName}</span><span className="text-xs text-muted-foreground">#{attachment.attachmentId}</span></button>)}</div>}
      </section>
    </div>
  );
}

function PlanNarrative({ label, html, className }: { label: string; html?: string | null; className?: string }) {
  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <h3 className="mb-3 text-base font-semibold text-slate-950">{label}</h3>
      <RichTextView html={html} />
    </div>
  );
}

function Info({ label, value, icon, className }: { label: string; value: ReactNode; icon?: ReactNode; className?: string }) {
  return <div className={`min-w-0 ${className ?? ""}`}><div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div><div className="break-words leading-relaxed text-foreground">{value}</div></div>;
}

function ExecutionArchive({ details, execution, openAttachment }: { details: RepairProjectDetails; execution: RepairProjectExecutionDetails; openAttachment: (attachmentId: number) => Promise<void> }) {
  const itemById = new Map(details.currentPlanItems.map((item) => [item.itemId, item]));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 border-b pb-5 md:grid-cols-3">
        <Info label="施工单位" value={execution.contract?.supplierName ?? "尚未签约"} />
        <Info label="合同金额" value={execution.contract ? <Money value={Number(execution.contract.contractAmount)} /> : "-"} />
        <Info label="签署方式" value={execution.contract?.signingMethod ?? "-"} />
      </div>

      <div><h4 className="mb-3 text-sm font-semibold">施工过程记录</h4>{execution.executionRecords.length === 0 ? <Empty text="尚无施工记录" /> : <div className="space-y-2">{execution.executionRecords.map((record) => <div key={record.recordId} className="grid gap-3 rounded-md border p-3 md:grid-cols-[140px_1fr_auto]"><div><StatusChip tone={record.verificationStatus === "VERIFIED" ? "success" : record.verificationStatus === "REJECTED" ? "danger" : "warning"}>{STAGE_LABEL[record.stage]}</StatusChip><div className="mt-2 text-xs text-muted-foreground">{formatDate(record.occurredAt)}</div></div><div className="text-sm"><div className="font-medium">{itemById.get(record.itemId)?.itemNo ?? record.itemId}</div><div className="mt-1 text-muted-foreground">{record.description}</div>{record.verificationOpinion && <div className="mt-1 text-xs text-muted-foreground">核验：{record.verificationOpinion}</div>}</div><div className="flex flex-wrap gap-1">{record.attachmentIds.map((attachmentId) => <Button key={attachmentId} size="sm" variant="ghost" onClick={() => void openAttachment(attachmentId)}>附件 {attachmentId}</Button>)}</div></div>)}</div>}</div>

      <div><h4 className="mb-3 text-sm font-semibold">材料进场</h4>{execution.materialInspections.length === 0 ? <Empty text="尚无材料进场记录" /> : <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>材料</TableHead><TableHead>品牌/型号</TableHead><TableHead>规格数量</TableHead><TableHead>生产厂家</TableHead><TableHead>核验状态</TableHead></TableRow></TableHeader><TableBody>{execution.materialInspections.map((material) => <TableRow key={material.inspectionId}><TableCell className="font-medium">{material.materialName}</TableCell><TableCell>{material.brand} · {material.model}</TableCell><TableCell>{material.specification} · {material.quantity} {material.unit}</TableCell><TableCell>{material.manufacturer}</TableCell><TableCell><StatusChip tone={material.status === "VERIFIED" ? "success" : material.status === "REJECTED" ? "danger" : "warning"}>{material.status}</StatusChip></TableCell></TableRow>)}</TableBody></Table></div>}</div>

      {execution.settlement && <div><h4 className="mb-3 text-sm font-semibold">结构化竣工结算</h4><div className="mb-3 flex items-center justify-between rounded-md border p-3"><div className="text-sm">第 {execution.settlement.versionNo} 版 · {execution.settlement.status}</div><Money value={Number(execution.settlement.totalAmount)} className="font-semibold" /></div><div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>工程项</TableHead><TableHead className="text-right">实际数量</TableHead><TableHead className="text-right">实际单价</TableHead><TableHead className="text-right">税额</TableHead><TableHead className="text-right">含税金额</TableHead><TableHead>差异原因</TableHead></TableRow></TableHeader><TableBody>{execution.settlement.items.map((item) => <TableRow key={item.projectItemId}><TableCell>{itemById.get(item.projectItemId)?.itemNo ?? item.projectItemId}</TableCell><TableCell className="text-right">{item.actualQuantity} {item.unit}</TableCell><TableCell className="text-right"><Money value={Number(item.actualUnitPrice)} /></TableCell><TableCell className="text-right"><Money value={Number(item.taxAmount)} /></TableCell><TableCell className="text-right"><Money value={Number(item.amountIncludingTax)} /></TableCell><TableCell>{item.varianceReason ?? "-"}</TableCell></TableRow>)}</TableBody></Table></div></div>}
    </div>
  );
}

function AcceptanceAndPayments({ execution }: { execution: RepairProjectExecutionDetails }) {
  return (
    <div className="space-y-6">
      <div><h4 className="mb-3 text-sm font-semibold">验收轮次</h4>{!execution.acceptance ? <Empty text="尚未进入项目验收" /> : <div className="rounded-md border p-4"><div className="flex items-center justify-between"><div className="font-medium">第 {execution.acceptance.roundNo} 轮</div><StatusChip tone={execution.acceptance.status === "PASSED" ? "success" : execution.acceptance.status === "RECTIFICATION_REQUIRED" ? "danger" : "warning"}>{execution.acceptance.status}</StatusChip></div><div className="mt-4 space-y-3">{execution.acceptanceParties.map((party) => <div key={party.partyId} className="flex items-start justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0"><div><div className="text-sm font-medium">{party.participantName}</div><div className="mt-1 text-xs text-muted-foreground">{party.partyRole}{party.participantOrganization ? ` · ${party.participantOrganization}` : ""}</div>{party.opinion && <div className="mt-1 text-xs text-muted-foreground">{party.opinion}</div>}</div><StatusChip tone={party.conclusion === "PASSED" ? "success" : "danger"}>{party.conclusion === "PASSED" ? "通过" : "整改"}</StatusChip></div>)}</div></div>}</div>

      <div><h4 className="mb-3 text-sm font-semibold">付款申请</h4>{execution.paymentRequests.length === 0 ? <Empty text="尚无付款申请" /> : <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>节点</TableHead><TableHead className="text-right">本次金额</TableHead><TableHead className="text-right">累计申请</TableHead><TableHead className="text-right">当期上限</TableHead><TableHead>状态</TableHead><TableHead>申请时间</TableHead></TableRow></TableHeader><TableBody>{execution.paymentRequests.map((payment) => <TableRow key={payment.paymentRequestId}><TableCell>{payment.milestoneType}</TableCell><TableCell className="text-right"><Money value={Number(payment.requestedAmount)} /></TableCell><TableCell className="text-right"><Money value={Number(payment.cumulativeRequestedAmount)} /></TableCell><TableCell className="text-right"><Money value={Number(payment.eligibleUpperLimit)} /></TableCell><TableCell><StatusChip tone={payment.status === "PAID" ? "success" : payment.status === "FAILED" || payment.status === "RETURNED" ? "danger" : "warning"}>{payment.status}</StatusChip></TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(payment.createTime)}</TableCell></TableRow>)}</TableBody></Table></div>}</div>

      {execution.completionDisclosure && <div><h4 className="mb-3 text-sm font-semibold">完工披露与质保</h4><div className="grid gap-4 rounded-md border p-4 text-sm md:grid-cols-3"><Info label="张贴范围" value={execution.completionDisclosure.postingScope} /><Info label="告示期间" value={`${execution.completionDisclosure.noticeStartDate} 至 ${execution.completionDisclosure.noticeEndDate}`} /><Info label="质保期间" value={`${execution.completionDisclosure.warrantyStartDate} 至 ${execution.completionDisclosure.warrantyEndDate}`} /></div></div>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center rounded-md border border-dashed py-10 text-sm text-muted-foreground"><CheckCircle2 className="mr-2 size-4 opacity-50" />{text}</div>;
}
