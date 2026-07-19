// 关联业务：在独立工作页创建单一决定范围的维修工程筹备草稿，并登记首版结构化维修点位。
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "../common/RichTextEditor";
import { PageHeader, SectionCard, Stepper } from "../gov/common";
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
import { Textarea } from "../ui/textarea";
import {
  listRepairLocationOptions,
  pageRepairWorkOrders,
  type RepairLocationBuildingOption,
  type RepairWorkOrder,
} from "../../lib/repair";
import {
  createRepairProject,
  getRepairNarrativeImagePreview,
  uploadRepairNarrativeImage,
  type RepairPlanDraftInput,
  type RepairProjectCreateInput,
  type RepairWorkPointCreateInput,
} from "../../lib/repair-project";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { useStore } from "../../lib/store";

type Workflow = "BUILDING_REPAIR" | "COMMUNITY_PUBLIC_REPAIR";
interface EditorStep {
  key: string;
  label: string;
  title: string;
}

/** 建项草稿中的维修点位；浏览器仅保存临时键，稳定 ID 由后端创建后返回。 */
interface DraftWorkPoint {
  clientKey: string;
  businessName: string;
  buildingId: string;
  unitName: string;
  locationType: "" | "REFERENCE_ROOM" | "COMMON_AREA";
  referenceRoomId: string;
  commonAreaName: string;
  spaceName: string;
  orientation: string;
  component: string;
  specificPart: string;
  symptom: string;
  causeStatus: "PENDING_INVESTIGATION" | "CONFIRMED" | "UNCONFIRMED";
  causeBasis: string;
  proposedMeasure: string;
  technicalRequirements: string;
  quantity: string;
  unit: string;
  preliminaryEstimatedAmount: string;
  estimateSource: string;
  linkedWorkOrderIds: number[];
}

type DraftWorkPointTextField = Exclude<keyof DraftWorkPoint, "clientKey" | "linkedWorkOrderIds">;

const EDITOR_STEPS: EditorStep[] = [
  { key: "scope", label: "项目范围", title: "确定维修范围与待核验边界" },
  { key: "plan", label: "初步方案", title: "编制现场问题与初步预算" },
  { key: "work-points", label: "维修点位", title: "登记维修对象并关联已勘验来源" },
  { key: "review", label: "核对提交", title: "创建单一决定范围的工程草稿" },
];

const REVIEW_STEP_INDEX = EDITOR_STEPS.length - 1;

let draftWorkPointSequence = 0;

function emptyWorkPoint(): DraftWorkPoint {
  draftWorkPointSequence += 1;
  return {
    clientKey: `work-point-${draftWorkPointSequence}`,
    businessName: "",
    buildingId: "",
    unitName: "",
    locationType: "",
    referenceRoomId: "",
    commonAreaName: "",
    spaceName: "",
    orientation: "",
    component: "",
    specificPart: "",
    symptom: "",
    causeStatus: "PENDING_INVESTIGATION",
    causeBasis: "",
    proposedMeasure: "",
    technicalRequirements: "",
    quantity: "",
    unit: "",
    preliminaryEstimatedAmount: "",
    estimateSource: "",
    linkedWorkOrderIds: [],
  };
}

function optionalText(value: string): string | undefined {
  return value.trim() || undefined;
}

/**
 * 将页面中的字符串状态在唯一边界处转换为后端点位契约。
 * 不从报修摘要、照片数或旧工程项字段推导任何施工事实。
 */
function toWorkPointCreateInput(
  point: DraftWorkPoint,
  input: {
    workflow: Workflow;
    projectBuildingId?: number;
    projectUnitName?: string;
  },
): RepairWorkPointCreateInput {
  const locationType = point.locationType as Exclude<DraftWorkPoint["locationType"], "">;
  const referenceRoomId = locationType === "REFERENCE_ROOM" ? Number(point.referenceRoomId) : undefined;
  const preliminaryEstimatedAmount = point.preliminaryEstimatedAmount.trim()
    ? Number(point.preliminaryEstimatedAmount)
    : undefined;
  const quantity = point.quantity.trim() ? Number(point.quantity) : undefined;
  const pointBuildingId = input.workflow === "BUILDING_REPAIR"
    ? input.projectBuildingId
    : point.buildingId.trim() ? Number(point.buildingId) : undefined;
  const pointUnitName = input.workflow === "BUILDING_REPAIR" && input.projectUnitName
    ? input.projectUnitName
    : optionalText(point.unitName);

  return {
    businessName: point.businessName.trim(),
    buildingId: pointBuildingId,
    unitName: pointUnitName,
    locationType,
    referenceRoomId,
    commonAreaName: locationType === "COMMON_AREA" ? optionalText(point.commonAreaName) : undefined,
    spaceName: optionalText(point.spaceName),
    orientation: optionalText(point.orientation),
    component: optionalText(point.component),
    specificPart: optionalText(point.specificPart),
    symptom: point.symptom.trim(),
    causeStatus: point.causeStatus,
    causeBasis: optionalText(point.causeBasis),
    proposedMeasure: point.proposedMeasure.trim(),
    technicalRequirements: optionalText(point.technicalRequirements),
    quantity,
    unit: point.unit.trim() || undefined,
    preliminaryEstimatedAmount,
    estimateSource: optionalText(point.estimateSource),
    linkedWorkOrderIds: point.linkedWorkOrderIds,
  };
}

function ReviewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** 建项字段的必填状态以服务端草稿契约为准，避免把报价阶段资料提前强加给物业。 */
function FieldLabel({
  children,
  required = false,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <Label>
        {children}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {hint && <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b pb-5 last:border-b-0 last:pb-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          <PencilLine className="size-4" />
          修改
        </Button>
      </div>
      {children}
    </section>
  );
}

export function RepairProjectEditor() {
  const { hasPermission, setPage } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [workflow, setWorkflow] = useState<Workflow>("BUILDING_REPAIR");
  const [projectName, setProjectName] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [preliminaryBudget, setPreliminaryBudget] = useState("");
  const [workPoints, setWorkPoints] = useState<DraftWorkPoint[]>([emptyWorkPoint()]);
  const [eligibleCases, setEligibleCases] = useState<RepairWorkOrder[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [locationBuildings, setLocationBuildings] = useState<Array<RepairLocationBuildingOption & { communityName: string }>>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const narrativeImagePreviewUrls = useRef(new Map<string, string>());
  const canCreate = hasPermission("repair:workorder:manage");

  const uploadPlanImage = useCallback(async (file: File) => {
    const uploaded = await uploadRepairNarrativeImage(file);
    narrativeImagePreviewUrls.current.set(uploaded.source, uploaded.previewUrl);
    return uploaded.source;
  }, []);

  const previewPlanImage = useCallback(async (source: string) => {
    const cached = narrativeImagePreviewUrls.current.get(source);
    if (cached) return cached;
    const match = /^repair-image:\/\/(\d+)$/.exec(source);
    if (!match) throw new Error("维修方案仅支持上传本地图片");
    const preview = await getRepairNarrativeImagePreview(Number(match[1]));
    narrativeImagePreviewUrls.current.set(source, preview.previewUrl);
    return preview.previewUrl;
  }, []);

  const selectedBuilding = useMemo(
    () => locationBuildings.find((item) => String(item.buildingId) === buildingId),
    [buildingId, locationBuildings],
  );
  const visibleEligibleCases = useMemo(() => eligibleCases.filter((item) => {
    if (workflow === "COMMUNITY_PUBLIC_REPAIR") return item.publicAreaScope === "COMMUNITY";
    return item.publicAreaScope === "BUILDING" && String(item.buildingId ?? "") === buildingId;
  }), [buildingId, eligibleCases, workflow]);
  const preliminaryEstimateTotal = useMemo(() => workPoints.reduce((sum, point) => {
    const amount = Number(point.preliminaryEstimatedAmount);
    return Number.isFinite(amount) && amount >= 0 ? sum + amount : sum;
  }, 0), [workPoints]);
  useEffect(() => {
    if (workflow === "COMMUNITY_PUBLIC_REPAIR") {
      setBuildingId("");
      setUnitName("");
      setWorkPoints((current) => current.map((point) => ({
        ...point,
        buildingId: "",
        unitName: "",
        referenceRoomId: "",
        linkedWorkOrderIds: [],
      })));
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
    if (!canCreate) return;
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
  }, [canCreate]);

  function updateWorkPoint(index: number, field: DraftWorkPointTextField, value: string) {
    setWorkPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index ? { ...point, [field]: value } : point
    )));
  }

  function toggleLinkedWorkOrder(index: number, workOrder: RepairWorkOrder, checked: boolean) {
    setWorkPoints((current) => current.map((point, pointIndex) => {
      if (pointIndex !== index) return point;
      const workOrderId = workOrder.workOrderId;
      const linkedWorkOrderIds = checked
        ? Array.from(new Set([...point.linkedWorkOrderIds, workOrderId]))
        : point.linkedWorkOrderIds.filter((id) => id !== workOrderId);
      return { ...point, linkedWorkOrderIds };
    }));
  }

  function resetLinkedWorkOrders() {
    setWorkPoints((current) => current.map((point) => ({ ...point, linkedWorkOrderIds: [] })));
  }

  function updateWorkPointLocationType(
    index: number,
    locationType: DraftWorkPoint["locationType"],
  ) {
    setWorkPoints((current) => current.map((point, pointIndex) => {
      if (pointIndex !== index) return point;
      return {
        ...point,
        locationType,
        referenceRoomId: locationType === "REFERENCE_ROOM" ? point.referenceRoomId : "",
        commonAreaName: locationType === "COMMON_AREA" ? point.commonAreaName : "",
      };
    }));
  }

  function updateWorkPointBuilding(index: number, nextBuildingId: string) {
    setWorkPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index
        ? { ...point, buildingId: nextBuildingId, unitName: "", referenceRoomId: "" }
        : point
    )));
  }

  function updateWorkPointUnit(index: number, nextUnitName: string) {
    setWorkPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index
        ? { ...point, unitName: nextUnitName, referenceRoomId: "" }
        : point
    )));
  }

  function updateWorkPointReferenceRoom(index: number, referenceRoomId: string, roomUnitName?: string) {
    setWorkPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index
        ? {
          ...point,
          referenceRoomId,
          unitName: workflow === "BUILDING_REPAIR" && unitName
            ? point.unitName
            : roomUnitName ?? point.unitName,
        }
        : point
    )));
  }

  function locationBuildingForWorkPoint(point: DraftWorkPoint) {
    const pointBuildingId = workflow === "BUILDING_REPAIR" ? buildingId : point.buildingId;
    return locationBuildings.find((building) => String(building.buildingId) === pointBuildingId);
  }

  function roomsForWorkPoint(point: DraftWorkPoint) {
    const building = locationBuildingForWorkPoint(point);
    if (!building) return [];
    return building.units.flatMap((unit) => unit.rooms
      .filter(() => !point.unitName || unit.unitName === point.unitName)
      .map((room) => ({ ...room, unitName: unit.unitName })));
  }

  function moveToStep(stepIndex: number) {
    setCurrentStep(stepIndex);
    requestAnimationFrame(() => {
      stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 每一步只校验当前认知范围，最终提交前再按顺序完整复核。
  function validateStep(stepIndex: number): boolean {
    if (stepIndex === 0) {
      if (!projectName.trim()) {
        toast.error("请填写工程名称");
        return false;
      }
      const numericBuildingId = Number(buildingId);
      if (workflow === "BUILDING_REPAIR" && (!Number.isFinite(numericBuildingId) || numericBuildingId <= 0)) {
        toast.error("楼栋维修必须选择楼栋范围");
        return false;
      }
      return true;
    }
    if (stepIndex === 1) {
      const planDescriptionHtml = toMiniappRichText(planDescription);
      if (!richTextToPlain(planDescriptionHtml)) {
        toast.error("请填写问题与维修方案");
        return false;
      }
      const budget = Number(preliminaryBudget);
      if (!preliminaryBudget.trim() || !Number.isFinite(budget) || budget <= 0) {
        toast.error("请填写项目初步预算（含税）");
        return false;
      }
      return true;
    }
    if (stepIndex === 2) {
      if (workPoints.length === 0) {
        toast.error("请至少录入一个维修点位");
        return false;
      }
      for (const [index, point] of workPoints.entries()) {
        const hasPairQuantity = Boolean(point.quantity.trim()) === Boolean(point.unit.trim());
        const quantity = Number(point.quantity);
        const amount = Number(point.preliminaryEstimatedAmount);
        const hasEstimate = point.preliminaryEstimatedAmount.trim() !== "";
        const pointLabel = `维修点位 ${index + 1}`;
        if (!point.businessName.trim()) {
          toast.error(`${pointLabel}：请填写维修对象名称`);
          return false;
        }
        if (!point.locationType) {
          toast.error(`${pointLabel}：请选择位置类别`);
          return false;
        }
        if (workflow === "COMMUNITY_PUBLIC_REPAIR" && point.buildingId && Number(point.buildingId) <= 0) {
          toast.error(`${pointLabel}：所选楼栋无效`);
          return false;
        }
        if (point.locationType === "REFERENCE_ROOM") {
          const pointBuildingId = workflow === "BUILDING_REPAIR" ? buildingId : point.buildingId;
          if (Number(pointBuildingId) <= 0) {
            toast.error(`${pointLabel}：关联房屋位置需要先选择所在楼栋`);
            return false;
          }
          if (Number(point.referenceRoomId) <= 0) {
            toast.error(`${pointLabel}：请选择关联房屋`);
            return false;
          }
        }
        if (point.locationType === "COMMON_AREA" && !point.commonAreaName.trim()) {
          toast.error(`${pointLabel}：请填写公共部位名称`);
          return false;
        }
        if (!point.symptom.trim()) {
          toast.error(`${pointLabel}：请填写现场问题`);
          return false;
        }
        if (point.causeStatus === "CONFIRMED" && !point.causeBasis.trim()) {
          toast.error(`${pointLabel}：已确认原因时必须填写原因依据`);
          return false;
        }
        if (!point.proposedMeasure.trim()) {
          toast.error(`${pointLabel}：请填写拟定维修措施`);
          return false;
        }
        if (!hasPairQuantity) {
          toast.error(`${pointLabel}：范围数量和单位必须同时填写或同时留空`);
          return false;
        }
        if (point.quantity.trim() && (!Number.isFinite(quantity) || quantity <= 0)) {
          toast.error(`${pointLabel}：范围数量必须大于 0`);
          return false;
        }
        if (hasEstimate && (!Number.isFinite(amount) || amount < 0 || !point.estimateSource.trim())) {
          toast.error(`${pointLabel}：填写初步估算后必须填写有效金额和估算依据`);
          return false;
        }
        if (!hasEstimate && point.estimateSource.trim()) {
          toast.error(`${pointLabel}：未填写初步估算时不能单独填写估算依据`);
          return false;
        }
      }
      return true;
    }
    return true;
  }

  function nextStep() {
    if (currentStep >= REVIEW_STEP_INDEX || !validateStep(currentStep)) return;
    moveToStep(currentStep + 1);
  }

  function previousStep() {
    if (currentStep <= 0) return;
    moveToStep(currentStep - 1);
  }

  async function submit() {
    for (let stepIndex = 0; stepIndex < REVIEW_STEP_INDEX; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        moveToStep(stepIndex);
        return;
      }
    }

    const numericBuildingId = buildingId ? Number(buildingId) : undefined;
    const planDescriptionHtml = toMiniappRichText(planDescription);
    const building = workflow === "BUILDING_REPAIR";
    const workPointInputs = workPoints.map((point) => toWorkPointCreateInput(point, {
      workflow,
      projectBuildingId: building ? numericBuildingId : undefined,
      projectUnitName: building ? unitName.trim() || undefined : undefined,
    }));
    const plan: RepairPlanDraftInput = {
      planDescription: planDescriptionHtml,
      budgetTotal: Number(preliminaryBudget),
      workPoints: workPointInputs,
    };
    const payload: RepairProjectCreateInput = {
      projectName: projectName.trim(),
      scopeType: building ? (unitName.trim() ? "BUILDING_UNIT" : "BUILDING") : "COMMUNITY",
      buildingId: building ? numericBuildingId : undefined,
      unitName: building ? unitName.trim() || undefined : undefined,
      plan,
    };
    setSubmitting(true);
    try {
      await createRepairProject(payload);
      toast.success("维修工程草稿已创建，待后端核验决定与资金承担依据");
      setPage("engineering");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "维修工程项目创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  const scopeLabel = workflow === "BUILDING_REPAIR"
    ? selectedBuilding
      ? `${selectedBuilding.communityName} · ${selectedBuilding.buildingName} · ${unitName || "整栋"}`
      : "未选择楼栋"
    : "全小区公共区域";

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
        desc="分步核对单一决定范围、维修点位与实施方案"
        actions={(
          <Button variant="ghost" onClick={() => setPage("engineering")}>
            <ArrowLeft className="size-4" />返回项目台账
          </Button>
        )}
      />

      <SectionCard
        title="填写进度"
        extra={<span className="text-sm text-muted-foreground">步骤 {currentStep + 1} / {EDITOR_STEPS.length}</span>}
      >
        <Stepper steps={EDITOR_STEPS} current={currentStep} />
      </SectionCard>

      <div ref={stepContentRef} className="box-content min-h-[420px] scroll-mt-4 pb-32 sm:pb-24">
        {currentStep === 0 && (
          <SectionCard title="项目范围与核验边界">
            <div className="space-y-5">
              <div className="inline-flex rounded-md border bg-muted/30 p-1">
                <Button type="button" size="sm" variant={workflow === "BUILDING_REPAIR" ? "default" : "ghost"} onClick={() => { setWorkflow("BUILDING_REPAIR"); resetLinkedWorkOrders(); }}>楼栋/单元共用项目</Button>
                <Button type="button" size="sm" variant={workflow === "COMMUNITY_PUBLIC_REPAIR" ? "default" : "ghost"} onClick={() => { setWorkflow("COMMUNITY_PUBLIC_REPAIR"); resetLinkedWorkOrders(); }}>全体共用项目</Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2"><Label>工程名称</Label><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></div>
                {workflow === "BUILDING_REPAIR" ? (
                  <div><Label>楼栋范围</Label><Select value={buildingId} onValueChange={(value) => { setBuildingId(value); setUnitName(""); resetLinkedWorkOrders(); setWorkPoints((current) => current.map((point) => ({ ...point, unitName: "", referenceRoomId: "" }))); }} disabled={locationLoading}><SelectTrigger><SelectValue placeholder={locationLoading ? "正在加载楼栋" : "选择楼栋"} /></SelectTrigger><SelectContent>{locationBuildings.map((building) => <SelectItem key={`${building.communityName}-${building.buildingId}`} value={String(building.buildingId)}>{building.communityName} · {building.buildingName}</SelectItem>)}</SelectContent></Select></div>
                ) : (
                  <div><Label>项目范围</Label><Input value="全小区公共区域" disabled /></div>
                )}
                {workflow === "BUILDING_REPAIR" && <div><Label>单元范围</Label><Select value={unitName || "__BUILDING__"} onValueChange={(value) => setUnitName(value === "__BUILDING__" ? "" : value)} disabled={!selectedBuilding}><SelectTrigger><SelectValue placeholder="整栋" /></SelectTrigger><SelectContent><SelectItem value="__BUILDING__">整栋</SelectItem>{selectedBuilding?.units.map((unit) => <SelectItem key={unit.unitName} value={unit.unitName}>{unit.unitName}</SelectItem>)}</SelectContent></Select></div>}
                  <div className="md:col-span-3 border-y bg-muted/20 py-4">
                    <div className="text-sm font-medium">范围核对</div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <ReviewField label="直接受影响/效果确认范围">待依据关联的可信勘验来源和后续核验确认，不从其他范围推导。</ReviewField>
                      <ReviewField label="项目决定范围（待核验）">{scopeLabel}</ReviewField>
                      <ReviewField label="费用分摊范围">待后端核验，不由本页自动生成。</ReviewField>
                      <ReviewField label="资金来源">待后端核验，不由项目范围推导。</ReviewField>
                    </dl>
                  </div>
              </div>
            </div>
          </SectionCard>
        )}

        {currentStep === 1 && (
          <SectionCard title="问题与初步方案">
            <div className="space-y-4">
              <RichTextEditor
                label="问题与维修方案（必填）"
                value={planDescription}
                onChange={setPlanDescription}
                rows={14}
                placeholder="填写本项目的整体问题、实施边界和方案说明，可在正文中插入现场图片"
                imageUploadHandler={uploadPlanImage}
                imagePreviewHandler={previewPlanImage}
              />
              <div className="max-w-xl">
                <FieldLabel required hint="用于建项、方案比较和后续送审准备，不是业主已经决定、授权或签约的最终金额。">项目初步预算（含税）</FieldLabel>
                <Input type="number" min="0.01" step="0.01" value={preliminaryBudget} onChange={(event) => setPreliminaryBudget(event.target.value)} />
              </div>
            </div>
          </SectionCard>
        )}

        {currentStep === 2 && (
          <SectionCard
            title="维修点位与维修对象"
            extra={(
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-muted-foreground">点位暂估合计 ¥{preliminaryEstimateTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setWorkPoints((current) => [...current, emptyWorkPoint()])}><Plus className="size-4" />增加维修点位</Button>
              </div>
            )}
          >
            <div className="space-y-4">
              <div className="border-l-2 border-primary bg-muted/30 px-4 py-3 text-sm leading-6">
                带 <span className="font-medium text-destructive">*</span> 的字段必须填写；没有可靠现场依据的补充信息可以留空。只能关联当前决定范围内的已勘验来源。不同范围应分别建项；仅服务多个特定楼栋的共同设施当前不能进入本流程。
              </div>
              {workPoints.map((point, index) => {
                const pointBuilding = locationBuildingForWorkPoint(point);
                const effectiveUnitName = workflow === "BUILDING_REPAIR" && unitName
                  ? unitName
                  : point.unitName;
                const pointRooms = roomsForWorkPoint({ ...point, unitName: effectiveUnitName });
                return (
                  <div key={point.clientKey} className="rounded-md border p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">维修点位 {index + 1}</span>
                      <Button type="button" size="icon" variant="ghost" title="删除维修点位" disabled={workPoints.length === 1} onClick={() => setWorkPoints((current) => current.filter((_, pointIndex) => pointIndex !== index))}><Trash2 className="size-4" /></Button>
                    </div>
                    <div className="space-y-6">
                      <section>
                        <div className="mb-3">
                          <h5 className="text-sm font-medium">定位与维修对象</h5>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">关联房屋只用于准确定位，不决定共用范围、费用承担、资金账户或表决范围。</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-6">
                          <div className="md:col-span-3"><FieldLabel required>维修对象名称</FieldLabel><Input aria-required value={point.businessName} placeholder="例如：设备门、污水总排水管、地库排水泵" onChange={(event) => updateWorkPoint(index, "businessName", event.target.value)} /></div>
                          <div className="md:col-span-3">
                            <FieldLabel required>位置类别</FieldLabel>
                            <div className="inline-flex rounded-md border bg-muted/30 p-1">
                              <Button type="button" size="sm" variant={point.locationType === "REFERENCE_ROOM" ? "default" : "ghost"} aria-pressed={point.locationType === "REFERENCE_ROOM"} onClick={() => updateWorkPointLocationType(index, "REFERENCE_ROOM")}>关联房屋位置</Button>
                              <Button type="button" size="sm" variant={point.locationType === "COMMON_AREA" ? "default" : "ghost"} aria-pressed={point.locationType === "COMMON_AREA"} onClick={() => updateWorkPointLocationType(index, "COMMON_AREA")}>公共部位</Button>
                            </div>
                          </div>
                          {workflow === "BUILDING_REPAIR" ? (
                            <div className="md:col-span-2"><FieldLabel>楼栋</FieldLabel><Input value={selectedBuilding ? `${selectedBuilding.communityName} · ${selectedBuilding.buildingName}` : "请先选择项目楼栋"} disabled /></div>
                          ) : (
                            <div className="md:col-span-2"><FieldLabel hint={point.locationType === "REFERENCE_ROOM" ? "选择关联房屋时必须选择所在楼栋。" : "全小区公共部位可不限定到单栋。"}>所在楼栋</FieldLabel><Select value={point.buildingId || "__COMMUNITY_AREA__"} onValueChange={(value) => updateWorkPointBuilding(index, value === "__COMMUNITY_AREA__" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__COMMUNITY_AREA__">不限定到楼栋</SelectItem>{locationBuildings.map((building) => <SelectItem key={building.buildingId} value={String(building.buildingId)}>{building.communityName} · {building.buildingName}</SelectItem>)}</SelectContent></Select></div>
                          )}
                          {workflow === "BUILDING_REPAIR" && unitName ? (
                            <div className="md:col-span-2"><FieldLabel>单元</FieldLabel><Input value={unitName} disabled /></div>
                          ) : (
                            <div className="md:col-span-2"><FieldLabel>单元（可选）</FieldLabel><Select value={point.unitName || "__NO_UNIT__"} onValueChange={(value) => updateWorkPointUnit(index, value === "__NO_UNIT__" ? "" : value)} disabled={!pointBuilding}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__NO_UNIT__">未限定单元</SelectItem>{pointBuilding?.units.map((unit) => <SelectItem key={unit.unitName} value={unit.unitName}>{unit.unitName}</SelectItem>)}</SelectContent></Select></div>
                          )}
                          {point.locationType === "REFERENCE_ROOM" ? (
                            <div className="md:col-span-2"><FieldLabel required>关联房屋（用于定位）</FieldLabel>{pointRooms.length > 0 ? <Select value={point.referenceRoomId || "__NO_ROOM__"} onValueChange={(value) => { const nextRoomId = value === "__NO_ROOM__" ? "" : value; const room = pointRooms.find((candidate) => String(candidate.roomId) === nextRoomId); updateWorkPointReferenceRoom(index, nextRoomId, room?.unitName); }}><SelectTrigger aria-required><SelectValue placeholder="选择关联房屋" /></SelectTrigger><SelectContent><SelectItem value="__NO_ROOM__">选择房屋</SelectItem>{pointRooms.map((room) => <SelectItem key={room.roomId} value={String(room.roomId)}>{room.unitName} · {room.roomName}</SelectItem>)}</SelectContent></Select> : <Input value={pointBuilding ? "当前范围没有可选房屋" : "请先选择所在楼栋"} disabled />}</div>
                          ) : point.locationType === "COMMON_AREA" ? (
                            <div className="md:col-span-2"><FieldLabel required>公共部位名称</FieldLabel><Input aria-required value={point.commonAreaName} placeholder="例如：一层大厅、地库泵房、东大门" onChange={(event) => updateWorkPoint(index, "commonAreaName", event.target.value)} /></div>
                          ) : (
                            <div className="md:col-span-2"><FieldLabel>位置明细</FieldLabel><Input value="请先选择位置类别" disabled /></div>
                          )}
                          <div className="md:col-span-2"><FieldLabel>空间/具体位置（可选）</FieldLabel><Input value={point.spaceName} placeholder="例如：北次卧、门厅、泵房" onChange={(event) => updateWorkPoint(index, "spaceName", event.target.value)} /></div>
                          <div className="md:col-span-2"><FieldLabel>朝向（可选）</FieldLabel><Input value={point.orientation} placeholder="例如：北侧、东面" onChange={(event) => updateWorkPoint(index, "orientation", event.target.value)} /></div>
                        </div>
                      </section>

                      <section className="border-t pt-5">
                        <div className="mb-3">
                          <h5 className="text-sm font-medium">现场问题与拟定措施</h5>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">只记录已观察到的事实和拟采取的措施；原因未确认时不要把推测写成结论。</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-6">
                          <div className="md:col-span-3"><FieldLabel required>现场问题</FieldLabel><Textarea aria-required value={point.symptom} rows={3} placeholder="仅记录可观察到的现象" onChange={(event) => updateWorkPoint(index, "symptom", event.target.value)} /></div>
                          <div className="md:col-span-3"><FieldLabel required>拟定维修措施</FieldLabel><Textarea aria-required value={point.proposedMeasure} rows={3} placeholder="填写拟实施的维修措施" onChange={(event) => updateWorkPoint(index, "proposedMeasure", event.target.value)} /></div>
                          <div className="md:col-span-2"><FieldLabel required>原因状态</FieldLabel><Select value={point.causeStatus} onValueChange={(value) => updateWorkPoint(index, "causeStatus", value as DraftWorkPoint["causeStatus"])}><SelectTrigger aria-required><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING_INVESTIGATION">待勘验</SelectItem><SelectItem value="CONFIRMED">已确认</SelectItem><SelectItem value="UNCONFIRMED">未能确认</SelectItem></SelectContent></Select></div>
                          <div className="md:col-span-4"><FieldLabel required={point.causeStatus === "CONFIRMED"}>{point.causeStatus === "CONFIRMED" ? "原因依据" : "原因依据或未能确认说明（可选）"}</FieldLabel><Input aria-required={point.causeStatus === "CONFIRMED"} value={point.causeBasis} placeholder={point.causeStatus === "CONFIRMED" ? "填写可靠勘验或鉴定依据" : "可填写已核验材料或待补充事项"} onChange={(event) => updateWorkPoint(index, "causeBasis", event.target.value)} /></div>
                          <div className="md:col-span-2"><FieldLabel>构件（可选）</FieldLabel><Input value={point.component} placeholder="例如：窗框、外墙、玻璃、排水泵" onChange={(event) => updateWorkPoint(index, "component", event.target.value)} /></div>
                          <div className="md:col-span-4"><FieldLabel>具体部位（可选）</FieldLabel><Input value={point.specificPart} placeholder="例如：窗框与外墙交界、玻璃左上角" onChange={(event) => updateWorkPoint(index, "specificPart", event.target.value)} /></div>
                          <div className="md:col-span-6"><FieldLabel>技术要求（可选）</FieldLabel><Textarea value={point.technicalRequirements} rows={3} placeholder="例如：材料规格、施工边界、过程要求；无可靠依据时留空，后续由报价清单补充。" onChange={(event) => updateWorkPoint(index, "technicalRequirements", event.target.value)} /></div>
                        </div>
                      </section>

                      <section className="border-t pt-5">
                        <div className="mb-3">
                          <h5 className="text-sm font-medium">范围量与初步估算（可选）</h5>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">只在已有勘验、历史结算或其他可核验依据时填写；报价阶段再形成工程清单、单价、税率和含税报价。</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-6">
                          <div className="md:col-span-2"><FieldLabel>范围数量（可选）</FieldLabel><Input type="number" min="0.001" step="0.001" value={point.quantity} onChange={(event) => updateWorkPoint(index, "quantity", event.target.value)} /></div>
                          <div className="md:col-span-2"><FieldLabel required={Boolean(point.quantity.trim())}>单位</FieldLabel><Input aria-required={Boolean(point.quantity.trim())} value={point.unit} placeholder="填写数量时必填" onChange={(event) => updateWorkPoint(index, "unit", event.target.value)} /></div>
                          <div className="md:col-span-2"><FieldLabel>初步估算金额（可选）</FieldLabel><Input type="number" min="0" step="0.01" value={point.preliminaryEstimatedAmount} onChange={(event) => updateWorkPoint(index, "preliminaryEstimatedAmount", event.target.value)} /></div>
                          <div className="md:col-span-4"><FieldLabel required={Boolean(point.preliminaryEstimatedAmount.trim())}>初步估算依据</FieldLabel><Input aria-required={Boolean(point.preliminaryEstimatedAmount.trim())} value={point.estimateSource} disabled={!point.preliminaryEstimatedAmount.trim()} placeholder="填写初步估算后必填，例如：历史结算、第三方估算" onChange={(event) => updateWorkPoint(index, "estimateSource", event.target.value)} /></div>
                        </div>
                      </section>

                      <section className="border-t pt-5">
                        <FieldLabel>关联已勘验来源（可选）</FieldLabel>
                        <div className="max-h-40 overflow-y-auto rounded-md border">
                          {casesLoading ? (
                            <div className="flex items-center justify-center px-3 py-5 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />加载已勘验来源</div>
                          ) : visibleEligibleCases.length === 0 ? (
                            <div className="px-3 py-5 text-center text-sm text-muted-foreground">当前决定范围没有可关联的已勘验来源</div>
                          ) : visibleEligibleCases.map((workOrder) => (
                            <label key={workOrder.workOrderId} className="flex cursor-pointer items-start gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/30">
                              <Checkbox className="mt-0.5" checked={point.linkedWorkOrderIds.includes(workOrder.workOrderId)} onCheckedChange={(checked) => toggleLinkedWorkOrder(index, workOrder, checked === true)} />
                              <span className="min-w-0 text-sm"><span className="block truncate font-medium">{workOrder.title}</span><span className="block truncate text-xs text-muted-foreground">{workOrder.orderNo} · {workOrder.locationText || "未填写位置"}</span></span>
                            </label>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {currentStep === REVIEW_STEP_INDEX && (
          <SectionCard title="核对并提交">
            <div className="space-y-5">
              <ReviewBlock title="项目范围" onEdit={() => moveToStep(0)}>
                <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ReviewField label="工程名称">{projectName}</ReviewField>
                  <ReviewField label="项目类型">{workflow === "BUILDING_REPAIR" ? "楼栋/单元共用项目" : "全体共用项目"}</ReviewField>
                  <ReviewField label="项目决定范围（待核验）">{scopeLabel}</ReviewField>
                  <ReviewField label="费用分摊范围">待后端核验，不由本页自动生成。</ReviewField>
                  <ReviewField label="资金来源">待后端核验，不由项目范围推导。</ReviewField>
                  <div className="md:col-span-2 xl:col-span-4"><ReviewField label="直接受影响/效果确认范围">待依据关联的可信勘验来源和后续核验确认，不从项目决定范围或费用分摊范围推导。</ReviewField></div>
                </dl>
              </ReviewBlock>

              <ReviewBlock title="初步方案" onEdit={() => moveToStep(1)}>
                <dl className="grid gap-4 md:grid-cols-2">
                  <ReviewField label="问题与维修方案"><span className="line-clamp-4">{richTextToPlain(toMiniappRichText(planDescription))}</span></ReviewField>
                  <ReviewField label="项目初步预算（含税）">¥{Number(preliminaryBudget || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</ReviewField>
                </dl>
              </ReviewBlock>

              <ReviewBlock title="维修点位与维修对象" onEdit={() => moveToStep(2)}>
                <dl className="grid gap-4 md:grid-cols-3">
                  <ReviewField label="维修点位数量">{workPoints.length} 个</ReviewField>
                  <ReviewField label="点位初步暂估合计">¥{preliminaryEstimateTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</ReviewField>
                  <ReviewField label="关联已勘验来源">{workPoints.reduce((sum, point) => sum + point.linkedWorkOrderIds.length, 0)} 项</ReviewField>
                </dl>
              </ReviewBlock>

            </div>
          </SectionCard>
        )}
      </div>

      <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium">{EDITOR_STEPS[currentStep].label}</div>
          <div className="truncate text-xs text-muted-foreground">{EDITOR_STEPS[currentStep].title}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setPage("engineering")}>取消</Button>
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={previousStep}>
              <ChevronLeft className="size-4" />
              上一步
            </Button>
          )}
          {currentStep < REVIEW_STEP_INDEX ? (
            <Button type="button" onClick={nextStep}>
              下一步
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              创建草稿并进入询价
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
