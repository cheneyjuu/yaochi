// 关联业务：在独立工作页创建楼栋或全小区维修工程项目，并固化首版结构化实施方案。
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "../common/RichTextEditor";
import { PageHeader, SectionCard } from "../gov/common";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import {
  listRepairLocationOptions,
  pageRepairWorkOrders,
  type RepairLocationBuildingOption,
  type RepairWorkOrder,
} from "../../lib/repair";
import {
  createRepairProject,
  type RepairPlanDraftInput,
  type RepairProjectCreateInput,
  type RepairProjectStage,
} from "../../lib/repair-project";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { useStore } from "../../lib/store";

type Workflow = "BUILDING_REPAIR" | "COMMUNITY_PUBLIC_REPAIR";

interface DraftItem {
  itemNo: string;
  locationText: string;
  workContent: string;
  quantity: string;
  unit: string;
  estimatedUnitPrice: string;
  linkedWorkOrderIds: number[];
}

type DraftItemTextField = Exclude<keyof DraftItem, "linkedWorkOrderIds">;

interface PercentageInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

const EVIDENCE_STAGES: RepairProjectStage[] = [
  "BEFORE_CONSTRUCTION",
  "MATERIAL_ENTRY",
  "DURING_CONSTRUCTION",
  "CONCEALED_WORK",
  "COMPLETION",
  "ACCEPTANCE",
];

function dateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function emptyItem(index: number): DraftItem {
  return {
    itemNo: `ITEM-${index + 1}`,
    locationText: "",
    workContent: "",
    quantity: "1",
    unit: "项",
    estimatedUnitPrice: "0",
    linkedWorkOrderIds: [],
  };
}

function percentageToRatio(percentage: number): number {
  return Number((percentage / 100).toFixed(6));
}

// 管理端录入各期合同占比，领域模型保存截至每个节点的累计付款上限。
function paymentSharesToCumulativeRatios(paymentShares: number[]): number[] {
  let cumulativePercentage = 0;
  return paymentShares.map((paymentShare) => {
    cumulativePercentage += paymentShare;
    return percentageToRatio(cumulativePercentage);
  });
}

function PercentageInput({
  label,
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 100,
  placeholder,
}: PercentageInputProps) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className="pr-9"
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
      </div>
    </div>
  );
}

export function RepairProjectEditor() {
  const { hasPermission, setPage } = useStore();
  const [workflow, setWorkflow] = useState<Workflow>("BUILDING_REPAIR");
  const [projectName, setProjectName] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [problemCause, setProblemCause] = useState("");
  const [implementationScope, setImplementationScope] = useState("");
  const [allocationDescription, setAllocationDescription] = useState("");
  const [supplierSelectionMethod, setSupplierSelectionMethod] = useState<RepairPlanDraftInput["supplierSelectionMethod"]>("COMPETITIVE_QUOTATION");
  const [supplierSelectionReason, setSupplierSelectionReason] = useState("");
  const [constructionRequirements, setConstructionRequirements] = useState("");
  const [safetyRequirements, setSafetyRequirements] = useState("");
  const [affectedOwnerScope, setAffectedOwnerScope] = useState("");
  const [minimumAcceptors, setMinimumAcceptors] = useState("");
  const [passRule, setPassRule] = useState<"" | "ALL" | "AT_LEAST_RATIO">("");
  const [approvalPercent, setApprovalPercent] = useState("");
  const [settlementMethod, setSettlementMethod] = useState<"ACTUAL_QUANTITY" | "FIXED_TOTAL">("ACTUAL_QUANTITY");
  const [plannedStartDate, setPlannedStartDate] = useState(dateAfter(1));
  const [plannedCompletionDate, setPlannedCompletionDate] = useState(dateAfter(30));
  const [warrantyDays, setWarrantyDays] = useState("365");
  const [priceReviewRequired, setPriceReviewRequired] = useState(true);
  const [advanceSharePercent, setAdvanceSharePercent] = useState("");
  const [progressSharePercent, setProgressSharePercent] = useState("");
  const [completionSharePercent, setCompletionSharePercent] = useState("");
  const [warrantyReleaseSharePercent, setWarrantyReleaseSharePercent] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem(0)]);
  const [eligibleCases, setEligibleCases] = useState<RepairWorkOrder[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [locationBuildings, setLocationBuildings] = useState<Array<RepairLocationBuildingOption & { communityName: string }>>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canCreate = hasPermission("repair:workorder:manage");

  const selectedBuilding = useMemo(
    () => locationBuildings.find((item) => String(item.buildingId) === buildingId),
    [buildingId, locationBuildings],
  );
  const visibleEligibleCases = useMemo(() => eligibleCases.filter((item) => {
    if (workflow === "COMMUNITY_PUBLIC_REPAIR") return item.publicAreaScope === "COMMUNITY";
    return item.publicAreaScope === "BUILDING" && String(item.buildingId ?? "") === buildingId;
  }), [buildingId, eligibleCases, workflow]);

  useEffect(() => {
    if (workflow === "COMMUNITY_PUBLIC_REPAIR") {
      setBuildingId("");
      setUnitName("");
      setAffectedOwnerScope("");
    }
  }, [workflow]);

  useEffect(() => {
    if (!canCreate) return;
    setCasesLoading(true);
    pageRepairWorkOrders({ status: "SURVEY_COMPLETED", scope: "PUBLIC", page: 1, size: 100 })
      .then((result) => setEligibleCases(result.items.filter((item) => item.spaceScope === "PUBLIC")))
      .catch((error) => {
        setEligibleCases([]);
        toast.error(error instanceof Error ? error.message : "待交接报修事项加载失败");
      })
      .finally(() => setCasesLoading(false));
  }, [canCreate]);

  useEffect(() => {
    if (!canCreate || workflow !== "BUILDING_REPAIR") return;
    setLocationLoading(true);
    listRepairLocationOptions()
      .then((options) => {
        const buildings = options.communities.flatMap((community) => community.buildings.map((building) => ({
          ...building,
          communityName: community.communityName,
        })));
        setLocationBuildings(buildings);
        if (buildingId && !buildings.some((building) => String(building.buildingId) === buildingId)) {
          setBuildingId("");
          setUnitName("");
        }
      })
      .catch((error) => {
        setLocationBuildings([]);
        toast.error(error instanceof Error ? error.message : "楼栋范围加载失败");
      })
      .finally(() => setLocationLoading(false));
  }, [canCreate, workflow]);

  function updateItem(index: number, field: DraftItemTextField, value: string) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function toggleLinkedWorkOrder(index: number, workOrderId: number, checked: boolean) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const linkedWorkOrderIds = checked
        ? Array.from(new Set([...item.linkedWorkOrderIds, workOrderId]))
        : item.linkedWorkOrderIds.filter((id) => id !== workOrderId);
      return { ...item, linkedWorkOrderIds };
    }));
  }

  function resetLinkedWorkOrders() {
    setItems((current) => current.map((item) => ({ ...item, linkedWorkOrderIds: [] })));
  }

  async function submit() {
    const numericBuildingId = buildingId ? Number(buildingId) : undefined;
    const problemCauseHtml = toMiniappRichText(problemCause);
    const implementationScopeHtml = toMiniappRichText(implementationScope);
    const constructionRequirementsHtml = toMiniappRichText(constructionRequirements);
    const safetyRequirementsHtml = toMiniappRichText(safetyRequirements);
    if (!projectName.trim() || !richTextToPlain(problemCauseHtml)
      || !richTextToPlain(implementationScopeHtml)) {
      toast.error("请填写工程名称、问题原因和实施范围");
      return;
    }
    if (!supplierSelectionReason.trim() || !richTextToPlain(constructionRequirementsHtml)
      || !richTextToPlain(safetyRequirementsHtml)) {
      toast.error("请填写施工单位选择理由、施工管理要求和安全要求");
      return;
    }
    if (workflow === "BUILDING_REPAIR" && (!numericBuildingId || numericBuildingId <= 0)) {
      toast.error("楼栋维修必须选择楼栋范围");
      return;
    }
    if (items.some((item) => !item.itemNo.trim() || !item.locationText.trim() || !item.workContent.trim() || !item.unit.trim()
      || Number(item.quantity) <= 0 || Number(item.estimatedUnitPrice) < 0)) {
      toast.error("请完整填写每个工程项，数量必须大于 0，单价不能小于 0");
      return;
    }
    const building = workflow === "BUILDING_REPAIR";
    if (building && (!affectedOwnerScope.trim() || Number(minimumAcceptors) < 1 || !passRule)) {
      toast.error("请明确填写受影响业主范围、最低有效人数和通过规则，不使用平台默认值");
      return;
    }
    const approvalPercentValue = Number(approvalPercent);
    if (building && (!Number.isFinite(approvalPercentValue)
      || approvalPercentValue <= 0 || approvalPercentValue > 100)) {
      toast.error("最低同意比例须大于 0% 且不超过 100%");
      return;
    }
    if (!plannedStartDate || !plannedCompletionDate || plannedCompletionDate < plannedStartDate
      || Number(warrantyDays) < 0) {
      toast.error("请检查实施日期和质保天数");
      return;
    }
    const paymentShareInputs = [
      advanceSharePercent,
      progressSharePercent,
      completionSharePercent,
      warrantyReleaseSharePercent,
    ];
    if (paymentShareInputs.some((percentage) => percentage.trim() === "")) {
      toast.error("请明确填写 4 个付款节点比例，未发生付款的节点请填写 0%");
      return;
    }
    const paymentShares = paymentShareInputs.map(Number);
    if (paymentShares.some((percentage) => !Number.isFinite(percentage)
      || percentage < 0 || percentage > 100) || paymentShares[0] <= 0) {
      toast.error("付款比例须在 0% 至 100% 之间，首次支取比例须大于 0%");
      return;
    }
    const paymentTotal = paymentShares.reduce((total, percentage) => total + percentage, 0);
    if (Math.abs(paymentTotal - 100) > 0.000001) {
      toast.error(`4 个付款节点比例合计须为 100%，当前为 ${paymentTotal.toFixed(2).replace(/\.00$/, "")}%`);
      return;
    }
    const cumulativeProgressPercent = paymentShares[0] + paymentShares[1];
    if (paymentShares[0] > 30 || (priceReviewRequired && cumulativeProgressPercent > 90)) {
      toast.error("首次支取不得超过 30%；需审价项目在审价完成前的进度款累计比例不得超过 90%");
      return;
    }
    const paymentRatios = paymentSharesToCumulativeRatios(paymentShares);
    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.estimatedUnitPrice);
      return {
        itemNo: item.itemNo.trim(),
        buildingId: building ? numericBuildingId : undefined,
        unitName: building ? unitName.trim() || undefined : undefined,
        roomId: undefined,
        locationText: item.locationText.trim(),
        workContent: item.workContent.trim(),
        quantity,
        unit: item.unit.trim(),
        estimatedUnitPrice: unitPrice,
        estimatedAmount: Number((quantity * unitPrice).toFixed(2)),
        linkedWorkOrderIds: item.linkedWorkOrderIds,
      };
    });
    const budgetTotal = normalizedItems.reduce((sum, item) => sum + item.estimatedAmount, 0);
    if (budgetTotal <= 0) {
      toast.error("工程项预算合计必须大于 0");
      return;
    }
    const plan: RepairPlanDraftInput = {
      problemCause: problemCauseHtml,
      implementationScope: implementationScopeHtml,
      budgetTotal,
      allocationRuleType: "BY_BUILDING_AREA",
      allocationRuleDescription: allocationDescription.trim() || (building
        ? "按锁定楼栋或单元范围内房屋建筑面积分摊"
        : "按全小区锁定房屋建筑面积分摊"),
      supplierSelectionMethod,
      supplierSelectionReason: supplierSelectionReason.trim(),
      constructionManagementRequirements: constructionRequirementsHtml,
      evidenceRequirements: EVIDENCE_STAGES.map((stage) => ({
        stage,
        description: `${stage} 原始现场证据`,
        required: true,
      })),
      safetyRequirements: safetyRequirementsHtml,
      acceptanceMethod: building
        ? "楼组长与锁定受影响业主按最低人数及通过规则共同验收"
        : "主任或副主任在线同意、业委会用印，并由物业或第三方专业人员共同签署",
      affectedOwnerScopeDescription: building ? affectedOwnerScope.trim() : undefined,
      minimumAffectedOwnerAcceptors: building ? Number(minimumAcceptors) : undefined,
      affectedOwnerPassRule: building ? passRule || undefined : undefined,
      affectedOwnerApprovalRatio: building ? percentageToRatio(approvalPercentValue) : undefined,
      settlementMethod,
      plannedStartDate,
      plannedCompletionDate,
      warrantyDays: Number(warrantyDays),
      priceReviewRequired,
      paymentMilestones: [
        { type: "ADVANCE", maximumContractRatio: paymentRatios[0], requiredEvidenceCodes: ["SIGNED_CONTRACT"] },
        { type: "PROGRESS", maximumContractRatio: paymentRatios[1], requiredEvidenceCodes: ["PROGRESS_RECORD"] },
        { type: "COMPLETION", maximumContractRatio: paymentRatios[2], requiredEvidenceCodes: ["ACCEPTANCE", "SETTLEMENT"] },
        { type: "WARRANTY_RELEASE", maximumContractRatio: paymentRatios[3], requiredEvidenceCodes: ["WARRANTY_EXPIRED_CERTIFICATE"] },
      ],
      items: normalizedItems,
      attachments: [],
    };
    const payload: RepairProjectCreateInput = {
      projectName: projectName.trim(),
      scopeType: building ? (unitName.trim() ? "BUILDING_UNIT" : "BUILDING") : "COMMUNITY",
      buildingId: building ? numericBuildingId : undefined,
      unitName: building ? unitName.trim() || undefined : undefined,
      fundSource: building ? "BUILDING_MAINTENANCE_FUND" : "COMMUNITY_MAINTENANCE_FUND",
      governancePath: building ? "BUILDING_REPAIR_DECISION" : "COMMUNITY_ASSEMBLY_DECISION",
      plan,
    };
    setSubmitting(true);
    try {
      await createRepairProject(payload);
      toast.success("维修工程项目已创建");
      setPage("engineering");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "维修工程项目创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="新建维修工程项目"
          desc="当前角色没有维修工程项目创建权限"
          actions={(
            <Button variant="ghost" onClick={() => setPage("engineering")}>
              <ArrowLeft className="size-4" />返回项目台账
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="新建维修工程项目"
        desc="创建工程范围、首版实施方案和后续治理依据"
        actions={(
          <>
            <Button variant="ghost" onClick={() => setPage("engineering")}>
              <ArrowLeft className="size-4" />返回项目台账
            </Button>
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              创建项目
            </Button>
          </>
        )}
      />

      <div className="space-y-5">
        <SectionCard title="项目范围与资金">
          <div className="space-y-5">
            <div className="inline-flex rounded-md border bg-muted/30 p-1">
              <Button type="button" size="sm" variant={workflow === "BUILDING_REPAIR" ? "default" : "ghost"} onClick={() => { setWorkflow("BUILDING_REPAIR"); resetLinkedWorkOrders(); }}>楼栋/单元维修</Button>
              <Button type="button" size="sm" variant={workflow === "COMMUNITY_PUBLIC_REPAIR" ? "default" : "ghost"} onClick={() => { setWorkflow("COMMUNITY_PUBLIC_REPAIR"); resetLinkedWorkOrders(); }}>全小区公共维修</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2"><Label>工程名称</Label><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></div>
              {workflow === "BUILDING_REPAIR" ? (
                <div><Label>楼栋范围</Label><Select value={buildingId} onValueChange={(value) => { setBuildingId(value); setUnitName(""); resetLinkedWorkOrders(); }} disabled={locationLoading}><SelectTrigger><SelectValue placeholder={locationLoading ? "正在加载楼栋" : "选择楼栋"} /></SelectTrigger><SelectContent>{locationBuildings.map((building) => <SelectItem key={`${building.communityName}-${building.buildingId}`} value={String(building.buildingId)}>{building.communityName} · {building.buildingName}</SelectItem>)}</SelectContent></Select></div>
              ) : (
                <div><Label>资金范围</Label><Input value="小区公共维修资金" disabled /></div>
              )}
              {workflow === "BUILDING_REPAIR" && <div><Label>单元范围</Label><Select value={unitName || "__BUILDING__"} onValueChange={(value) => setUnitName(value === "__BUILDING__" ? "" : value)} disabled={!selectedBuilding}><SelectTrigger><SelectValue placeholder="整栋" /></SelectTrigger><SelectContent><SelectItem value="__BUILDING__">整栋</SelectItem>{selectedBuilding?.units.map((unit) => <SelectItem key={unit.unitName} value={unit.unitName}>{unit.unitName}</SelectItem>)}</SelectContent></Select></div>}
              <div className="md:col-span-3"><Label>分摊范围说明</Label><Input value={allocationDescription} onChange={(event) => setAllocationDescription(event.target.value)} /></div>
            </div>
            <RichTextEditor label="问题原因" value={problemCause} onChange={setProblemCause} rows={7} toolbar="basic" placeholder="填写现场问题、成因和勘验结论" />
            <RichTextEditor label="实施范围" value={implementationScope} onChange={setImplementationScope} rows={7} toolbar="basic" placeholder="填写施工位置、边界和主要工作内容" />
          </div>
        </SectionCard>

        <SectionCard
          title="工程项"
          extra={<Button type="button" size="sm" variant="outline" onClick={() => setItems((current) => [...current, emptyItem(current.length)])}><Plus className="mr-1 size-4" />增加工程项</Button>}
        >
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={`${item.itemNo}-${index}`} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">工程项 {index + 1}</span><Button type="button" size="icon" variant="ghost" title="删除工程项" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-4" /></Button></div>
                  <div className="grid gap-3 md:grid-cols-6">
                    <div><Label>编号</Label><Input value={item.itemNo} onChange={(event) => updateItem(index, "itemNo", event.target.value)} /></div>
                    <div className="md:col-span-2"><Label>位置</Label><Input value={item.locationText} onChange={(event) => updateItem(index, "locationText", event.target.value)} /></div>
                    <div className="md:col-span-3"><Label>工作内容</Label><Input value={item.workContent} onChange={(event) => updateItem(index, "workContent", event.target.value)} /></div>
                    <div><Label>数量</Label><Input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></div>
                    <div><Label>单位</Label><Input value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} /></div>
                    <div><Label>含税估算单价</Label><Input type="number" min="0" step="0.01" value={item.estimatedUnitPrice} onChange={(event) => updateItem(index, "estimatedUnitPrice", event.target.value)} /></div>
                    <div className="md:col-span-6">
                      <Label>关联已勘验报修事项</Label>
                      <div className="mt-1 max-h-36 overflow-y-auto rounded-md border">
                        {casesLoading ? (
                          <div className="flex items-center justify-center px-3 py-5 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />加载待交接事项</div>
                        ) : visibleEligibleCases.length === 0 ? (
                          <div className="px-3 py-5 text-center text-sm text-muted-foreground">当前工程范围没有待交接的已勘验共有部分报修事项</div>
                        ) : visibleEligibleCases.map((workOrder) => (
                          <label key={workOrder.workOrderId} className="flex cursor-pointer items-start gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/30">
                            <Checkbox
                              className="mt-0.5"
                              checked={item.linkedWorkOrderIds.includes(workOrder.workOrderId)}
                              onCheckedChange={(checked) => toggleLinkedWorkOrder(index, workOrder.workOrderId, checked === true)}
                            />
                            <span className="min-w-0 text-sm">
                              <span className="block truncate font-medium">{workOrder.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">{workOrder.orderNo} · {workOrder.locationText || "未填写位置"}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </SectionCard>

        <SectionCard title="实施与验收规则">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div><Label>施工单位选择方式</Label><Select value={supplierSelectionMethod} onValueChange={(value) => setSupplierSelectionMethod(value as RepairPlanDraftInput["supplierSelectionMethod"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COMPETITIVE_QUOTATION">竞争性询价</SelectItem><SelectItem value="FRAMEWORK_SUPPLIER">框架供应商</SelectItem><SelectItem value="DIRECT_AWARD">依法直接委托</SelectItem><SelectItem value="EMERGENCY_APPOINTMENT">紧急指定</SelectItem></SelectContent></Select></div>
              <div className="md:col-span-2"><Label>选择理由</Label><Input value={supplierSelectionReason} onChange={(event) => setSupplierSelectionReason(event.target.value)} /></div>
              {workflow === "BUILDING_REPAIR" && (
                <>
                  <div className="md:col-span-2"><Label>受影响业主范围</Label><Input value={affectedOwnerScope} onChange={(event) => setAffectedOwnerScope(event.target.value)} /></div>
                  <div><Label>最低有效业主人数</Label><Input type="number" min="1" value={minimumAcceptors} onChange={(event) => setMinimumAcceptors(event.target.value)} /></div>
                  <div><Label>通过规则</Label><Select value={passRule} onValueChange={(value) => { const next = value as "ALL" | "AT_LEAST_RATIO"; setPassRule(next); setApprovalPercent(next === "ALL" ? "100" : ""); }}><SelectTrigger><SelectValue placeholder="明确选择" /></SelectTrigger><SelectContent><SelectItem value="ALL">参与业主全部通过</SelectItem><SelectItem value="AT_LEAST_RATIO">达到同意比例</SelectItem></SelectContent></Select></div>
                  <PercentageInput label="最低同意比例" value={approvalPercent} disabled={!passRule || passRule === "ALL"} min={0.01} placeholder="例如 60" onChange={setApprovalPercent} />
                </>
              )}
              <div><Label>结算方式</Label><Select value={settlementMethod} onValueChange={(value) => setSettlementMethod(value as typeof settlementMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTUAL_QUANTITY">按实际工程量</SelectItem><SelectItem value="FIXED_TOTAL">固定总价</SelectItem></SelectContent></Select></div>
              <div><Label><CalendarDays className="mr-1 inline size-3.5" />计划开工</Label><Input type="date" value={plannedStartDate} onChange={(event) => setPlannedStartDate(event.target.value)} /></div>
              <div><Label>计划完工</Label><Input type="date" value={plannedCompletionDate} onChange={(event) => setPlannedCompletionDate(event.target.value)} /></div>
              <div><Label>质保天数</Label><Input type="number" min="0" value={warrantyDays} onChange={(event) => setWarrantyDays(event.target.value)} /></div>
              <div className="flex items-end gap-3 pb-2"><Switch checked={priceReviewRequired} onCheckedChange={setPriceReviewRequired} /><span className="text-sm">签约/完工需审价</span></div>
            </div>
            <RichTextEditor label="施工管理要求" value={constructionRequirements} onChange={setConstructionRequirements} rows={7} toolbar="basic" placeholder="填写现场管理、过程核验和资料归档要求" />
            <RichTextEditor label="安全要求" value={safetyRequirements} onChange={setSafetyRequirements} rows={7} toolbar="basic" placeholder="填写施工安全、人员防护和现场隔离要求" />
          </div>
        </SectionCard>

        <SectionCard title="分期付款比例（合计 100%）">
            <div className="grid gap-4 md:grid-cols-4">
              <PercentageInput label="首次支取比例" value={advanceSharePercent} min={0.01} max={30} placeholder="不超过 30" onChange={setAdvanceSharePercent} />
              <PercentageInput label="进度款比例" value={progressSharePercent} placeholder="例如 50" onChange={setProgressSharePercent} />
              <PercentageInput label="完工款比例" value={completionSharePercent} placeholder="例如 10" onChange={setCompletionSharePercent} />
              <PercentageInput label="质保金比例" value={warrantyReleaseSharePercent} placeholder="例如 10" onChange={setWarrantyReleaseSharePercent} />
            </div>
        </SectionCard>
      </div>

      <div className="flex items-center justify-end gap-3 border-t bg-background px-4 py-3">
          <Button variant="outline" onClick={() => setPage("engineering")}>取消</Button>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting && <Loader2 className="mr-1 size-4 animate-spin" />}创建项目</Button>
      </div>
    </div>
  );
}
