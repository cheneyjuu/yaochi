// 关联业务：从真实维修范围创建楼栋或全小区维修工程项目，并固化首版结构化实施方案。
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import {
  listRepairLocationOptions,
  type RepairLocationBuildingOption,
} from "../../../lib/repair";
import {
  createRepairProject,
  type RepairPlanDraftInput,
  type RepairProjectCreateInput,
  type RepairProjectDetails,
  type RepairProjectStage,
} from "../../../lib/repair-project";

type Workflow = "BUILDING_REPAIR" | "COMMUNITY_PUBLIC_REPAIR";

interface DraftItem {
  itemNo: string;
  locationText: string;
  workContent: string;
  quantity: string;
  unit: string;
  estimatedUnitPrice: string;
  linkedWorkOrderIds: string;
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
    linkedWorkOrderIds: "",
  };
}

export function RepairProjectCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (details: RepairProjectDetails) => void;
}) {
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
  const [approvalRatio, setApprovalRatio] = useState("");
  const [settlementMethod, setSettlementMethod] = useState<"ACTUAL_QUANTITY" | "FIXED_TOTAL">("ACTUAL_QUANTITY");
  const [plannedStartDate, setPlannedStartDate] = useState(dateAfter(1));
  const [plannedCompletionDate, setPlannedCompletionDate] = useState(dateAfter(30));
  const [warrantyDays, setWarrantyDays] = useState("365");
  const [priceReviewRequired, setPriceReviewRequired] = useState(true);
  const [advanceRatio, setAdvanceRatio] = useState("");
  const [progressRatio, setProgressRatio] = useState("");
  const [completionRatio, setCompletionRatio] = useState("");
  const [warrantyReleaseRatio, setWarrantyReleaseRatio] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem(0)]);
  const [locationBuildings, setLocationBuildings] = useState<Array<RepairLocationBuildingOption & { communityName: string }>>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedBuilding = useMemo(
    () => locationBuildings.find((item) => String(item.buildingId) === buildingId),
    [buildingId, locationBuildings],
  );

  useEffect(() => {
    if (!open) return;
    if (workflow === "COMMUNITY_PUBLIC_REPAIR") {
      setBuildingId("");
      setUnitName("");
      setAffectedOwnerScope("");
    }
  }, [open, workflow]);

  useEffect(() => {
    if (!open || workflow !== "BUILDING_REPAIR") return;
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
  }, [open, workflow]);

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  async function submit() {
    const numericBuildingId = buildingId ? Number(buildingId) : undefined;
    if (!projectName.trim() || !problemCause.trim() || !implementationScope.trim()) {
      toast.error("请填写工程名称、问题原因和实施范围");
      return;
    }
    if (!supplierSelectionReason.trim() || !constructionRequirements.trim() || !safetyRequirements.trim()) {
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
    if (building && (!affectedOwnerScope.trim() || Number(minimumAcceptors) < 1 || !passRule
      || Number(approvalRatio) <= 0 || Number(approvalRatio) > 1)) {
      toast.error("请明确填写受影响业主范围、最低有效人数和通过规则，不使用平台默认值");
      return;
    }
    if (!plannedStartDate || !plannedCompletionDate || plannedCompletionDate < plannedStartDate
      || Number(warrantyDays) < 0) {
      toast.error("请检查实施日期和质保天数");
      return;
    }
    const paymentRatios = [advanceRatio, progressRatio, completionRatio, warrantyReleaseRatio].map(Number);
    if (paymentRatios.some((ratio) => ratio <= 0 || ratio > 1)
      || paymentRatios.some((ratio, index) => index > 0 && ratio < paymentRatios[index - 1])) {
      toast.error("请明确填写 4 个按业务顺序递增的累计付款比例，取值须大于 0 且不超过 1");
      return;
    }
    if (paymentRatios[0] > 0.3 || (priceReviewRequired && paymentRatios[1] > 0.9)) {
      toast.error("首次支取不得超过 30%；需审价项目在审价完成前的进度款累计比例不得超过 90%");
      return;
    }
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
        linkedWorkOrderIds: item.linkedWorkOrderIds
          .split(/[,，\s]+/)
          .map(Number)
          .filter((value) => Number.isSafeInteger(value) && value > 0),
      };
    });
    const budgetTotal = normalizedItems.reduce((sum, item) => sum + item.estimatedAmount, 0);
    if (budgetTotal <= 0) {
      toast.error("工程项预算合计必须大于 0");
      return;
    }
    const plan: RepairPlanDraftInput = {
      problemCause: problemCause.trim(),
      implementationScope: implementationScope.trim(),
      budgetTotal,
      allocationRuleType: "BY_BUILDING_AREA",
      allocationRuleDescription: allocationDescription.trim() || (building
        ? "按锁定楼栋或单元范围内房屋建筑面积分摊"
        : "按全小区锁定房屋建筑面积分摊"),
      supplierSelectionMethod,
      supplierSelectionReason: supplierSelectionReason.trim(),
      constructionManagementRequirements: constructionRequirements.trim(),
      evidenceRequirements: EVIDENCE_STAGES.map((stage) => ({
        stage,
        description: `${stage} 原始现场证据`,
        required: true,
      })),
      safetyRequirements: safetyRequirements.trim(),
      acceptanceMethod: building
        ? "楼组长与锁定受影响业主按最低人数及通过规则共同验收"
        : "主任或副主任在线同意、业委会用印，并由物业或第三方专业人员共同签署",
      affectedOwnerScopeDescription: building ? affectedOwnerScope.trim() : undefined,
      minimumAffectedOwnerAcceptors: building ? Number(minimumAcceptors) : undefined,
      affectedOwnerPassRule: building ? passRule || undefined : undefined,
      affectedOwnerApprovalRatio: building ? Number(approvalRatio) : undefined,
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
      const created = await createRepairProject(payload);
      toast.success("维修工程项目已创建");
      onCreated(created);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "维修工程项目创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建维修工程项目</DialogTitle>
          <DialogDescription>项目承载锁定方案、治理依据、合同、施工、验收、结算和付款；一项可关联多个报修工单。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-4">
            <div className="text-sm font-semibold">项目范围与资金</div>
            <div className="inline-flex rounded-md border bg-muted/30 p-1">
              <Button type="button" size="sm" variant={workflow === "BUILDING_REPAIR" ? "default" : "ghost"} onClick={() => setWorkflow("BUILDING_REPAIR")}>楼栋/单元维修</Button>
              <Button type="button" size="sm" variant={workflow === "COMMUNITY_PUBLIC_REPAIR" ? "default" : "ghost"} onClick={() => setWorkflow("COMMUNITY_PUBLIC_REPAIR")}>全小区公共维修</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2"><Label>工程名称</Label><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></div>
              {workflow === "BUILDING_REPAIR" ? (
                <div><Label>楼栋范围</Label><Select value={buildingId} onValueChange={(value) => { setBuildingId(value); setUnitName(""); }} disabled={locationLoading}><SelectTrigger><SelectValue placeholder={locationLoading ? "正在加载楼栋" : "选择楼栋"} /></SelectTrigger><SelectContent>{locationBuildings.map((building) => <SelectItem key={`${building.communityName}-${building.buildingId}`} value={String(building.buildingId)}>{building.communityName} · {building.buildingName}</SelectItem>)}</SelectContent></Select></div>
              ) : (
                <div><Label>资金范围</Label><Input value="小区公共维修资金" disabled /></div>
              )}
              {workflow === "BUILDING_REPAIR" && <div><Label>单元范围</Label><Select value={unitName || "__BUILDING__"} onValueChange={(value) => setUnitName(value === "__BUILDING__" ? "" : value)} disabled={!selectedBuilding}><SelectTrigger><SelectValue placeholder="整栋" /></SelectTrigger><SelectContent><SelectItem value="__BUILDING__">整栋</SelectItem>{selectedBuilding?.units.map((unit) => <SelectItem key={unit.unitName} value={unit.unitName}>{unit.unitName}</SelectItem>)}</SelectContent></Select></div>}
              <div className={workflow === "BUILDING_REPAIR" ? "md:col-span-2" : "md:col-span-3"}><Label>问题原因</Label><Textarea rows={3} value={problemCause} onChange={(event) => setProblemCause(event.target.value)} /></div>
              <div className="md:col-span-3"><Label>实施范围</Label><Textarea rows={3} value={implementationScope} onChange={(event) => setImplementationScope(event.target.value)} /></div>
              <div className="md:col-span-3"><Label>分摊范围说明</Label><Input value={allocationDescription} onChange={(event) => setAllocationDescription(event.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-5">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">工程项</div><Button type="button" size="sm" variant="outline" onClick={() => setItems((current) => [...current, emptyItem(current.length)])}><Plus className="mr-1 size-4" />增加工程项</Button></div>
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
                    <div className="md:col-span-3"><Label>关联工单 ID</Label><Input placeholder="多个 ID 用逗号分隔" value={item.linkedWorkOrderIds} onChange={(event) => updateItem(index, "linkedWorkOrderIds", event.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t pt-5">
            <div className="text-sm font-semibold">实施与验收规则</div>
            <div className="grid gap-4 md:grid-cols-3">
              <div><Label>施工单位选择方式</Label><Select value={supplierSelectionMethod} onValueChange={(value) => setSupplierSelectionMethod(value as RepairPlanDraftInput["supplierSelectionMethod"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COMPETITIVE_QUOTATION">竞争性询价</SelectItem><SelectItem value="FRAMEWORK_SUPPLIER">框架供应商</SelectItem><SelectItem value="DIRECT_AWARD">依法直接委托</SelectItem><SelectItem value="EMERGENCY_APPOINTMENT">紧急指定</SelectItem></SelectContent></Select></div>
              <div className="md:col-span-2"><Label>选择理由</Label><Input value={supplierSelectionReason} onChange={(event) => setSupplierSelectionReason(event.target.value)} /></div>
              <div className="md:col-span-2"><Label>施工管理要求</Label><Textarea rows={3} value={constructionRequirements} onChange={(event) => setConstructionRequirements(event.target.value)} /></div>
              <div><Label>安全要求</Label><Textarea rows={3} value={safetyRequirements} onChange={(event) => setSafetyRequirements(event.target.value)} /></div>
              {workflow === "BUILDING_REPAIR" && (
                <>
                  <div className="md:col-span-2"><Label>受影响业主范围</Label><Input value={affectedOwnerScope} onChange={(event) => setAffectedOwnerScope(event.target.value)} /></div>
                  <div><Label>最低有效业主人数</Label><Input type="number" min="1" value={minimumAcceptors} onChange={(event) => setMinimumAcceptors(event.target.value)} /></div>
                  <div><Label>通过规则</Label><Select value={passRule} onValueChange={(value) => { const next = value as "ALL" | "AT_LEAST_RATIO"; setPassRule(next); setApprovalRatio(next === "ALL" ? "1" : ""); }}><SelectTrigger><SelectValue placeholder="明确选择" /></SelectTrigger><SelectContent><SelectItem value="ALL">参与业主全部通过</SelectItem><SelectItem value="AT_LEAST_RATIO">达到同意比例</SelectItem></SelectContent></Select></div>
                  <div><Label>最低同意比例</Label><Input type="number" min="0.0001" max="1" step="0.0001" value={approvalRatio} disabled={!passRule || passRule === "ALL"} onChange={(event) => setApprovalRatio(event.target.value)} /></div>
                </>
              )}
              <div><Label>结算方式</Label><Select value={settlementMethod} onValueChange={(value) => setSettlementMethod(value as typeof settlementMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTUAL_QUANTITY">按实际工程量</SelectItem><SelectItem value="FIXED_TOTAL">固定总价</SelectItem></SelectContent></Select></div>
              <div><Label><CalendarDays className="mr-1 inline size-3.5" />计划开工</Label><Input type="date" value={plannedStartDate} onChange={(event) => setPlannedStartDate(event.target.value)} /></div>
              <div><Label>计划完工</Label><Input type="date" value={plannedCompletionDate} onChange={(event) => setPlannedCompletionDate(event.target.value)} /></div>
              <div><Label>质保天数</Label><Input type="number" min="0" value={warrantyDays} onChange={(event) => setWarrantyDays(event.target.value)} /></div>
              <div className="flex items-end gap-3 pb-2"><Switch checked={priceReviewRequired} onCheckedChange={setPriceReviewRequired} /><span className="text-sm">签约/完工需审价</span></div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-5">
            <div className="text-sm font-semibold">累计付款比例</div>
            <div className="grid gap-4 md:grid-cols-4">
              <div><Label>首次支取（不超过 0.30）</Label><Input type="number" min="0.0001" max="0.3" step="0.01" value={advanceRatio} onChange={(event) => setAdvanceRatio(event.target.value)} /></div>
              <div><Label>进度款</Label><Input type="number" min="0.0001" max="1" step="0.01" value={progressRatio} onChange={(event) => setProgressRatio(event.target.value)} /></div>
              <div><Label>完工款</Label><Input type="number" min="0.0001" max="1" step="0.01" value={completionRatio} onChange={(event) => setCompletionRatio(event.target.value)} /></div>
              <div><Label>质保金释放</Label><Input type="number" min="0.0001" max="1" step="0.01" value={warrantyReleaseRatio} onChange={(event) => setWarrantyReleaseRatio(event.target.value)} /></div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting && <Loader2 className="mr-1 size-4 animate-spin" />}创建项目</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
