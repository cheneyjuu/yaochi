// 关联业务：承载维修工单从登记、勘验、表决、报审、盖章到验收的管理端工作台。
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  PageHeader,
  SectionCard,
  StatusChip,
  Money,
  KpiCard,
  Stepper,
  type Tone,
} from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { RichTextView } from "../common/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Info,
  FileText,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Route,
  Send,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import {
  listRepairLocationOptions,
  getRepairPlanningPolicy,
  getRepairLocalDecision,
  getPropertyQuoteAttachmentDownload,
  getPropertyQuoteAttachmentPreview,
  listRepairDecisionRooms,
  listRepairFrameworkRelations,
  listRepairEvents,
  listRepairSupplierOrganizations,
  listRepairSupplierQuoteHistory,
  listRepairSupplierQuotes,
  listRepairQuoteInvitations,
  pageRepairWorkOrders,
  createSupplierActivationInvitation,
  registerSupplierOrganization,
  repairAction,
  deleteRepairAttachment,
  deletePropertyQuoteAttachment,
  uploadRepairFieldAttachment,
  uploadPropertyQuoteAttachment,
  uploadRepairApprovalDocument,
  uploadGovernanceSealedDocument,
  uploadSolitaireScreenshot,
  type RepairLocationBuildingOption,
  type RepairPlanningPolicy,
  type RepairLocationCommunityOption,
  type RepairLocationRoomOption,
  type RepairEvent,
  type RepairDecisionRoom,
  type RepairLocalDecision,
  type RepairFrameworkRelation,
  type RepairStatus,
  type RepairSupplierOrganization,
  type RepairSupplierQuote,
  type RepairQuoteInvitation,
  type RepairAttachment,
  type RepairAttachmentPreviewTicket,
  type RepairWorkOrder,
} from "../../lib/repair";
import {
  listCommitteeSeals,
  type CommitteeElectronicSeal,
} from "../../lib/committee-seals";

const STATUS_LABEL: Record<RepairStatus, string> = {
  SUBMITTED: "已提交",
  PENDING_VERIFY: "待现场核验",
  NEED_MANUAL_LOCATION: "待补充位置",
  VERIFIED: "已核验",
  ASSIGNED: "已派单",
  SURVEYING: "勘验中",
  SURVEY_COMPLETED: "勘验已完成",
  QUOTE_COLLECTING: "询价中",
  QUOTE_SUBMITTED: "已报价",
  SUPPLIER_RECOMMENDED: "物业已推荐供应商",
  PLAN_SUBMITTED: "待邀价",
  LOCAL_DECISION_PENDING: "楼栋表决中",
  LOCAL_DECISION_PASSED: "楼栋表决已通过",
  ASSEMBLY_DECISION_PENDING: "业主大会表决中",
  APPROVAL_DOCUMENT_PREPARING: "报审文件编制中",
  PRICE_REVIEW_PENDING: "待审价",
  GOVERNANCE_PENDING: "待主任/副主任确认",
  GOVERNANCE_CONFIRMED: "主任/副主任已确认",
  SEALED: "已盖章",
  CONTRACT_SIGNING: "合同签署中",
  CONTRACT_EFFECTIVE: "合同已生效",
  APPROVED: "已批准",
  IN_PROGRESS: "施工中",
  PENDING_ACCEPTANCE: "待验收",
  ACCEPTANCE_EXCEPTION: "验收例外待处理",
  RECTIFICATION_REQUIRED: "需整改",
  COMPLETED: "已完成",
  EVALUATED: "已评价",
  ARCHIVED: "已归档",
  REJECTED: "已驳回",
  CANCELLED: "已撤销",
  SUSPENDED: "已暂停",
  ESCALATED: "已升级",
  REASSIGN_REQUIRED: "需改派",
  PLAN_REVISION_REQUIRED: "方案需修改",
  CHANGE_REVIEW_PENDING: "变更审核中",
  PAYMENT_EXCEPTION: "支付异常",
  HANDOVER_LOCK: "交接锁定",
  EMERGENCY_REPORTED: "应急已报告",
  EMERGENCY_MITIGATION: "应急止损中",
  EMERGENCY_PLAN_PENDING: "应急方案待审",
  EMERGENCY_REPAIRING: "应急抢修中",
};

const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: "低风险",
  MEDIUM: "中风险",
  HIGH: "高风险",
};

const FUND_SOURCE_LABEL: Record<string, string> = {
  PROPERTY_INTERNAL: "物业包干成本",
  BUILDING_MAINTENANCE_FUND: "楼栋维修资金",
  COMMUNITY_MAINTENANCE_FUND: "小区公共维修资金",
  PUBLIC_REVENUE: "小区公共收益",
};

const REPAIR_CATEGORY_LABEL: Record<string, string> = {
  PLUMBING: "给排水",
  PUBLIC_PIPE: "给排水",
  ELECTRICAL: "电气",
  ELECTRIC: "电气",
  ELEVATOR: "电梯",
  FIRE_PROTECTION: "消防",
  FIRE: "消防",
  WATERPROOFING: "防水",
  WALL_LEAK: "防水",
  STRUCTURAL: "房屋结构",
  ACCESS_CONTROL: "门禁",
  PUBLIC_LIGHTING: "公共照明",
  ROAD: "道路",
  GREENING: "绿化",
  SANITATION: "环卫",
  DOOR_WINDOW: "门窗",
  PUBLIC_AREA_FACILITY: "公共区域设施",
  PUBLIC_FACILITY: "公共区域设施",
  OTHER: "其他",
};

const QUOTE_SOURCE_LABEL: Record<string, string> = {
  SUPPLIER_ONLINE: "供应商在线提交",
  PROPERTY_ENTRY: "物业代录",
};

const QUOTE_CONFIRMATION_LABEL: Record<string, string> = {
  PENDING_SUPPLIER_CONFIRMATION: "待供应商确认",
  ONLINE_CONFIRMED: "供应商已确认",
  OFFLINE_EVIDENCE_VERIFIED: "原件已核验",
  CONTRACT_CONFIRMED: "合同已确认",
};

const EVENT_ACTION_LABEL: Record<string, string> = {
  OWNER_SUBMIT_PRIVATE: "业主提交报修",
  OWNER_SUBMIT_PUBLIC: "业主提交公共报修",
  ADMIN_REGISTER_PUBLIC: "物业登记公共报修",
  ACCEPT: "物业受理",
  CORRECT_LOCATION: "补充并纠偏位置",
  VERIFY_LOCATION: "现场核验",
  ASSIGN: "派单",
  START_SURVEY: "开始初勘",
  SUBMIT_SURVEY: "提交初勘记录",
  SUBMIT_PLAN: "确认维修范围与询价口径",
  INVITE_REPAIR_SUPPLIERS: "发出维修邀价",
  APPEND_REPAIR_SUPPLIERS: "追加维修邀价",
  REQUEST_SUPPLIER_QUOTE_REVISIONS: "要求供应商修订报价",
  SUBMIT_SUPPLIER_QUOTE: "提交供应商报价",
  RECOMMEND_SUPPLIER: "物业推荐供应商",
  REUSE_SUPPLIER_QUOTE: "沿用上一轮推荐报价",
  START_LOCAL_DECISION: "发起楼栋表决",
  COMPLETE_LOCAL_DECISION: "确认楼栋表决结果",
  START_ASSEMBLY_DECISION: "关联业主大会表决",
  COMPLETE_ASSEMBLY_DECISION: "确认业主大会表决结果",
  SUBMIT_APPROVAL_PACKAGE: "提交正式报审文件",
  REVIEW_PRICE: "完成审价",
  GOVERNANCE_CONFIRM: "主任/副主任确认",
  GOVERNANCE_SEAL: "加盖业委会公章",
  CREATE_CONTRACT: "创建维修合同",
  COMPLETE_CONTRACT: "确认合同生效",
  START_WORK: "供应商进场维修",
  SUBMIT_ACCEPTANCE: "发起维修验收",
  SET_ACCEPTANCE_SCOPE: "设置受影响房屋",
  RECORD_ACCEPTANCE: "记录组织代表验收",
  OWNER_RECORD_ACCEPTANCE: "记录受影响业主验收",
  ACCEPT_COMPLETED: "完成验收",
  REQUEST_RECTIFICATION: "要求供应商整改",
  OWNER_EVALUATE: "业主评价",
  ARCHIVE: "工单归档",
};

function fundingProcessDescription(fundSource?: string | null) {
  switch (fundSource) {
    case "PROPERTY_INTERNAL":
      return "本工单由物业包干成本承担，不动用楼栋维修资金或小区公共维修资金；确认维修范围后由物业按内部流程执行。";
    case "BUILDING_MAINTENANCE_FUND":
      return "本工单拟使用楼栋维修资金。物业推荐供应商后，可选择 C 端在线表决或微信接龙；表决通过后，物业整理正式报审材料，经业委会审价、主任或副主任任一人确认，再由业委会盖章后，方可签订合同并安排施工。";
    case "COMMUNITY_MAINTENANCE_FUND":
      return "本工单拟使用小区公共维修资金。物业推荐供应商后，须经业主大会表决，并完成物业报审、业委会审价、主任或副主任任一人确认，再由业委会盖章后，方可签订合同并安排施工。";
    case "PUBLIC_REVENUE":
      return "本工单拟使用小区公共收益。物业推荐供应商后，须经业主大会表决，并完成物业报审、业委会审价、主任或副主任任一人确认，再由业委会盖章后，方可签订合同并安排施工。";
    default:
      return "资金来源确认后，系统将按对应规则进入后续审批与执行流程。";
  }
}

const STATUS_TONE: Record<RepairStatus, Tone> = {
  SUBMITTED: "neutral",
  PENDING_VERIFY: "info",
  NEED_MANUAL_LOCATION: "warning",
  VERIFIED: "tech",
  ASSIGNED: "primary",
  SURVEYING: "info",
  SURVEY_COMPLETED: "tech",
  QUOTE_COLLECTING: "warning",
  QUOTE_SUBMITTED: "tech",
  SUPPLIER_RECOMMENDED: "primary",
  PLAN_SUBMITTED: "warning",
  LOCAL_DECISION_PENDING: "warning",
  LOCAL_DECISION_PASSED: "tech",
  ASSEMBLY_DECISION_PENDING: "warning",
  APPROVAL_DOCUMENT_PREPARING: "warning",
  PRICE_REVIEW_PENDING: "warning",
  GOVERNANCE_PENDING: "warning",
  GOVERNANCE_CONFIRMED: "tech",
  SEALED: "success",
  CONTRACT_SIGNING: "warning",
  CONTRACT_EFFECTIVE: "success",
  APPROVED: "success",
  IN_PROGRESS: "primary",
  PENDING_ACCEPTANCE: "tech",
  ACCEPTANCE_EXCEPTION: "warning",
  RECTIFICATION_REQUIRED: "danger",
  COMPLETED: "success",
  EVALUATED: "success",
  ARCHIVED: "neutral",
  REJECTED: "danger",
  CANCELLED: "neutral",
  SUSPENDED: "warning",
  ESCALATED: "danger",
  REASSIGN_REQUIRED: "warning",
  PLAN_REVISION_REQUIRED: "warning",
  CHANGE_REVIEW_PENDING: "warning",
  PAYMENT_EXCEPTION: "danger",
  HANDOVER_LOCK: "danger",
  EMERGENCY_REPORTED: "danger",
  EMERGENCY_MITIGATION: "danger",
  EMERGENCY_PLAN_PENDING: "warning",
  EMERGENCY_REPAIRING: "danger",
};

const BASE_STEPS = [
  { key: "survey", label: "勘验" },
  { key: "plan", label: "方案" },
  { key: "quote", label: "报价" },
  { key: "supplier", label: "推荐供应商" },
  { key: "decision", label: "待定路径" },
  { key: "package", label: "报审" },
  { key: "price", label: "审价" },
  { key: "confirm", label: "主任/副主任" },
  { key: "seal", label: "盖章" },
  { key: "contract", label: "合同" },
  { key: "work", label: "施工" },
  { key: "acceptance", label: "验收" },
];

function workOrderSteps(order: RepairWorkOrder) {
  const decisionLabel = order.fundSource === "BUILDING_MAINTENANCE_FUND"
    ? "楼栋表决"
    : ["COMMUNITY_MAINTENANCE_FUND", "PUBLIC_REVENUE"].includes(order.fundSource || "")
      ? "业主大会"
      : order.fundSource === "PROPERTY_INTERNAL"
        ? "无需表决"
        : "待定路径";
  return BASE_STEPS.map((step) => step.key === "decision" ? { ...step, label: decisionLabel } : step);
}

const STATUS_STEP: Record<RepairStatus, number> = {
  SUBMITTED: 0,
  NEED_MANUAL_LOCATION: 0,
  PENDING_VERIFY: 0,
  VERIFIED: 0,
  ASSIGNED: 0,
  SURVEYING: 0,
  SURVEY_COMPLETED: 1,
  PLAN_SUBMITTED: 2,
  QUOTE_COLLECTING: 2,
  QUOTE_SUBMITTED: 3,
  SUPPLIER_RECOMMENDED: 4,
  LOCAL_DECISION_PENDING: 4,
  ASSEMBLY_DECISION_PENDING: 4,
  LOCAL_DECISION_PASSED: 5,
  APPROVAL_DOCUMENT_PREPARING: 5,
  PRICE_REVIEW_PENDING: 6,
  GOVERNANCE_PENDING: 7,
  GOVERNANCE_CONFIRMED: 8,
  SEALED: 9,
  CONTRACT_SIGNING: 9,
  CONTRACT_EFFECTIVE: 10,
  APPROVED: 10,
  IN_PROGRESS: 10,
  PENDING_ACCEPTANCE: 11,
  ACCEPTANCE_EXCEPTION: 11,
  RECTIFICATION_REQUIRED: 10,
  COMPLETED: 12,
  EVALUATED: 12,
  ARCHIVED: 12,
  REJECTED: 0,
  CANCELLED: 0,
  SUSPENDED: 0,
  ESCALATED: 0,
  REASSIGN_REQUIRED: 0,
  PLAN_REVISION_REQUIRED: 1,
  CHANGE_REVIEW_PENDING: 7,
  PAYMENT_EXCEPTION: 11,
  HANDOVER_LOCK: 11,
  EMERGENCY_REPORTED: 0,
  EMERGENCY_MITIGATION: 0,
  EMERGENCY_PLAN_PENDING: 1,
  EMERGENCY_REPAIRING: 10,
};

type BuildingChoice = RepairLocationBuildingOption & { communityName: string };
type RoomChoice = RepairLocationRoomOption & { unitName: string };
type EvidenceFile = { name: string; dataUrl: string; file: File };
type GovernanceSealingMethod =
  | "PLATFORM_ELECTRONIC"
  | "UPLOADED_PHYSICAL"
  | "UPLOADED_EXTERNAL_ELECTRONIC";

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function scopeLabel(order: RepairWorkOrder) {
  if (order.spaceScope === "PRIVATE") return `私有 · 房屋 ${order.roomId ?? "-"}`;
  return order.buildingId ? `公共 · 楼栋 ${order.buildingId}` : "公共 · 待定位";
}

function amount(order: RepairWorkOrder) {
  return Number(order.planBudget ?? 0);
}

function flattenBuildings(communities: RepairLocationCommunityOption[]): BuildingChoice[] {
  return communities.flatMap((community) =>
    community.buildings.map((building) => ({
      ...building,
      communityName: community.communityName,
    })),
  );
}

function flattenRooms(building: RepairLocationBuildingOption): RoomChoice[] {
  return building.units.flatMap((unit) =>
    unit.rooms.map((room) => ({
      ...room,
      unitName: unit.unitName,
    })),
  );
}

async function readEvidenceFiles(
  files: FileList | null,
  setEvidenceFiles: (v: EvidenceFile[] | ((current: EvidenceFile[]) => EvidenceFile[])) => void,
) {
  if (!files || files.length === 0) return;
  try {
    const selected = Array.from(files).slice(0, 3);
    const items = await Promise.all(selected.map(readEvidenceFile));
    setEvidenceFiles((current) => [...current, ...items].slice(0, 3));
  } catch {
    toast.error("现场证据读取失败");
  }
}

function readEvidenceFile(file: File): Promise<EvidenceFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve({
        name: file.name,
        dataUrl,
        file,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function WorkOrders() {
  const { hasPermission, roleKey, setPage } = useStore();
  const [orders, setOrders] = useState<RepairWorkOrder[]>([]);
  const [selected, setSelected] = useState<RepairWorkOrder | null>(null);
  const [events, setEvents] = useState<RepairEvent[]>([]);
  const [locationCommunities, setLocationCommunities] = useState<RepairLocationCommunityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [locationBuildingId, setLocationBuildingId] = useState("");
  const [locationRoomId, setLocationRoomId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [fieldSupplement, setFieldSupplement] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [evidenceVideo, setEvidenceVideo] = useState<File | null>(null);
  const [surveySummary, setSurveySummary] = useState("");
  const [riskLevel, setRiskLevel] = useState("LOW");
  const [planningPolicy, setPlanningPolicy] = useState<RepairPlanningPolicy>({
    internalEstimateRequired: false,
    buildingRepairDefaultDecisionChannel: "WECHAT",
  });
  const [planBudget, setPlanBudget] = useState("");
  const [publicCeilingEnabled, setPublicCeilingEnabled] = useState(false);
  const [publicCeilingPrice, setPublicCeilingPrice] = useState("");
  const [fundSource, setFundSource] = useState("PROPERTY_INTERNAL");
  const switchingOrderRef = useRef(false);

  const canRead = hasPermission("repair:workorder:read");
  const canIntake = hasPermission("repair:workorder:intake");
  const canManage = hasPermission("repair:workorder:manage");
  const canField = hasPermission("repair:workorder:field");
  const canGovernance = hasPermission("repair:workorder:governance");
  const canSealGovernance = canGovernance
    && (roleKey === "COMMITTEE_DIRECTOR" || roleKey === "COMMITTEE_MEMBER");
  const canUseElectronicSeal = hasPermission("committee:seal:use");
  const canCreateAssembly = hasPermission("voting:subject:create");
  const locationBuildings = useMemo(() => flattenBuildings(locationCommunities), [locationCommunities]);

  async function reload(keepSelectedId?: number) {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [page, options, policy] = await Promise.all([
        pageRepairWorkOrders({
          status: statusFilter,
          keyword,
          page: 1,
          size: 50,
        }),
        canField ? listRepairLocationOptions() : Promise.resolve({ communities: [] }),
        canField ? getRepairPlanningPolicy() : Promise.resolve({
          internalEstimateRequired: false,
          buildingRepairDefaultDecisionChannel: "WECHAT" as const,
        }),
      ]);
      setOrders(page.items);
      setLocationCommunities(options.communities);
      setPlanningPolicy(policy);
      const selectedId = keepSelectedId ?? selected?.workOrderId;
      const next = selectedId == null
        ? null
        : page.items.find((item) => item.workOrderId === selectedId) ?? null;
      setSelected(next);
      if (next) {
        applySelected(next);
        setEvents(await listRepairEvents(next.workOrderId));
      } else {
        setEvents([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "维修工单加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, canRead]);

  async function selectOrder(order: RepairWorkOrder) {
    setSelected(order);
    applySelected(order);
    try {
      setEvents(await listRepairEvents(order.workOrderId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "审计流水加载失败");
    }
  }

  function applySelected(order: RepairWorkOrder) {
    setLocationBuildingId(order.buildingId ? String(order.buildingId) : "");
    setLocationRoomId(order.roomId ? String(order.roomId) : "");
    setLocationText(order.locationText ?? "");
    setFieldSupplement("");
    setEvidenceFiles([]);
    setEvidenceVideo(null);
    setSurveySummary(order.surveySummary ?? "");
    setPlanBudget(order.planBudget == null ? "" : String(order.planBudget));
    setPublicCeilingEnabled(order.publicCeilingPrice != null);
    setPublicCeilingPrice(order.publicCeilingPrice == null ? "" : String(order.publicCeilingPrice));
    setFundSource(order.fundSource ?? "PROPERTY_INTERNAL");
  }

  async function doAction(action: string, body: unknown = {}, success = "操作已完成") {
    if (!selected) return false;
    setActing(true);
    try {
      const next = await repairAction(selected.workOrderId, action, body);
      toast.success(success);
      await reload(next.workOrderId);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
      return false;
    } finally {
      setActing(false);
    }
  }

  const stats = useMemo(() => {
    const active = orders.filter((o) => !["ARCHIVED", "CANCELLED", "REJECTED"].includes(o.status)).length;
    const needLocation = orders.filter((o) => o.needManualLocation).length;
    const acceptance = orders.filter((o) => o.status === "PENDING_ACCEPTANCE").length;
    return { total: orders.length, active, needLocation, acceptance };
  }, [orders]);

  if (!canRead) {
    return (
      <div className="space-y-5">
        <PageHeader title="维修工单" desc="当前角色没有维修工单查看权限" />
      </div>
    );
  }

  if (selected) {
    const showSupplierTab = STATUS_STEP[selected.status] >= STATUS_STEP.PLAN_SUBMITTED;
    return (
      <>
        {renderWorkOrderList()}
        <Sheet
          open
          modal={false}
          onOpenChange={(open) => {
            if (!open) {
              if (switchingOrderRef.current) {
                switchingOrderRef.current = false;
                return;
              }
              setSelected(null);
              setEvents([]);
            }
          }}
        >
          <SheetContent
            side="right"
            showOverlay={false}
            onInteractOutside={(event) => {
              const target = event.target;
              switchingOrderRef.current = target instanceof Element
                && Boolean(target.closest("[data-work-order-row]"));
            }}
            className="w-full max-w-none gap-0 p-0 sm:w-[78vw] sm:max-w-[1120px] lg:w-[72vw]"
          >
            <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6">
              <div className="flex items-start justify-between gap-4 pr-7">
                <div className="min-w-0">
                  <SheetTitle className="text-lg leading-7 sm:text-xl">{selected.title}</SheetTitle>
                  <SheetDescription className="mt-1">
                    工单详情 · {selected.orderNo} · {fmtDate(selected.createTime)}
                  </SheetDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="刷新工单"
                  onClick={() => reload(selected.workOrderId)}
                  disabled={loading}
                  className="shrink-0"
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </SheetHeader>

            <div className="gov-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="space-y-5">

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-y bg-background px-1 py-4 text-sm md:grid-cols-3 xl:grid-cols-6">
          <SummaryItem label="当前状态"><StatusChip tone={STATUS_TONE[selected.status]} dot>{STATUS_LABEL[selected.status]}</StatusChip></SummaryItem>
          <SummaryItem label="维修范围" value={scopeLabel(selected)} />
          <SummaryItem label="现场位置" value={selected.locationText || "未填写"} />
          <SummaryItem label="维修分类" value={selected.category ? REPAIR_CATEGORY_LABEL[selected.category] ?? selected.category : "未分类"} />
          <SummaryItem label="资金来源" value={selected.fundSource ? FUND_SOURCE_LABEL[selected.fundSource] ?? selected.fundSource : "待确认"} />
          <SummaryItem label="参考估算" value={amount(selected) > 0 ? `¥${amount(selected).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` : "待填写"} />
        </div>

        {selected.needManualLocation && (
          <div className="flex gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            该工单位置不足，必须由物业或网格现场补充并锁定位置后，才能进入方案和资金链路。
          </div>
        )}

        <SectionCard title="工单进度">
          <Stepper steps={workOrderSteps(selected)} current={STATUS_STEP[selected.status]} locked={selected.fundGateBlocked ? 2 : undefined} />
        </SectionCard>

        <Tabs defaultValue="handling" className="gap-4">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md p-1">
            <TabsTrigger value="handling" className="flex-none rounded px-4">
              <Wrench className="size-4" />办理
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-none rounded px-4">
              <Info className="size-4" />详情与记录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="handling" className="mt-0 space-y-4">
            <ActionPanel
              selected={selected}
              acting={acting}
              canManage={canManage}
              canField={canField}
              canGovernance={canGovernance}
              canSealGovernance={canSealGovernance}
              canUseElectronicSeal={canUseElectronicSeal}
              hasPreviousRecommendation={events.some((event) =>
                ["RECOMMEND_SUPPLIER", "REUSE_SUPPLIER_QUOTE"].includes(event.action))}
              locationBuildings={locationBuildings}
              locationBuildingId={locationBuildingId}
              setLocationBuildingId={setLocationBuildingId}
              locationRoomId={locationRoomId}
              setLocationRoomId={setLocationRoomId}
              locationText={locationText}
              setLocationText={setLocationText}
              fieldSupplement={fieldSupplement}
              setFieldSupplement={setFieldSupplement}
              evidenceFiles={evidenceFiles}
              setEvidenceFiles={setEvidenceFiles}
              evidenceVideo={evidenceVideo}
              setEvidenceVideo={setEvidenceVideo}
              surveySummary={surveySummary}
              setSurveySummary={setSurveySummary}
              riskLevel={riskLevel}
              setRiskLevel={setRiskLevel}
              planBudget={planBudget}
              setPlanBudget={setPlanBudget}
              planningPolicy={planningPolicy}
              publicCeilingEnabled={publicCeilingEnabled}
              setPublicCeilingEnabled={setPublicCeilingEnabled}
              publicCeilingPrice={publicCeilingPrice}
              setPublicCeilingPrice={setPublicCeilingPrice}
              fundSource={fundSource}
              setFundSource={setFundSource}
              doAction={doAction}
            />
            {showSupplierTab && (
              <SupplierQuoteArchive
                workOrder={selected}
                canManage={canManage}
                acting={acting}
                doAction={doAction}
              />
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-0 space-y-4">
            <SectionCard title="工单信息与资金">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
                <div>
                  <div className="mb-2 text-sm font-medium">报修内容</div>
                  <RichTextView html={selected.description} />
                </div>
                <div className="space-y-2 border-l-0 text-sm lg:border-l lg:pl-6">
                  <Detail label="初勘结论" value={selected.surveySummary || "-"} />
                  <Detail label="风险等级" value={selected.riskLevel ? RISK_LEVEL_LABEL[selected.riskLevel] ?? selected.riskLevel : "-"} />
                  <Detail label="资金来源" value={selected.fundSource ? FUND_SOURCE_LABEL[selected.fundSource] ?? selected.fundSource : "-"} />
                  <Detail label="物业内部参考估算" value={amount(selected) > 0 ? `¥${amount(selected).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` : "-"} />
                  <Detail label="向供应商公开的最高限价" value={Number(selected.publicCeilingPrice ?? 0) > 0 ? `¥${Number(selected.publicCeilingPrice).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` : "-"} />
                </div>
              </div>
              <div className="mt-5 border-t pt-4 text-sm text-muted-foreground">
                <Banknote className="mr-1 inline size-4" />{fundingProcessDescription(selected.fundSource)}
              </div>
            </SectionCard>
            <AuditTimeline events={events} />
          </TabsContent>
        </Tabs>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  function renderWorkOrderList() {
    return (
    <div className="space-y-5">
      <PageHeader
        title="维修工单"
        desc="业主报修、物业受理、网格/工程现场核验、方案预算、治理审批、验收评价的真实闭环"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => reload()} disabled={loading}>
              <RefreshCw className="size-4 mr-1" /> 刷新
            </Button>
            {canCreateAssembly && (
              <Button variant="outline" onClick={() => setPage("owners-assembly")}>
                <ClipboardList className="size-4 mr-1" /> 业主大会
              </Button>
            )}
            {canIntake && (
              <Button onClick={() => setPage("work-order-editor")}>
                <Plus className="size-4 mr-1" /> 登记工单
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="工单总数" value={stats.total} unit="单" tone="primary" />
        <KpiCard label="进行中" value={stats.active} unit="单" tone="warning" />
        <KpiCard label="待定位" value={stats.needLocation} unit="单" tone="danger" />
        <KpiCard label="待验收" value={stats.acceptance} unit="单" tone="tech" />
      </div>

      <div>
        <SectionCard title="工单列表" bodyClassName="p-0">
          <div className="flex flex-col md:flex-row gap-3 p-3 border-b">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reload()}
              placeholder="搜索工单号、标题、位置"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="SUBMITTED">已提交</SelectItem>
                <SelectItem value="NEED_MANUAL_LOCATION">待补充位置</SelectItem>
                <SelectItem value="PENDING_VERIFY">待核验</SelectItem>
                <SelectItem value="SURVEY_COMPLETED">初勘已完成</SelectItem>
                <SelectItem value="PLAN_SUBMITTED">方案已提交</SelectItem>
                <SelectItem value="QUOTE_COLLECTING">询价中</SelectItem>
                <SelectItem value="QUOTE_SUBMITTED">已报价</SelectItem>
                <SelectItem value="LOCAL_DECISION_PENDING">楼栋表决中</SelectItem>
                <SelectItem value="LOCAL_DECISION_PASSED">楼栋表决已通过</SelectItem>
                <SelectItem value="ASSEMBLY_DECISION_PENDING">业主大会表决中</SelectItem>
                <SelectItem value="PRICE_REVIEW_PENDING">待审价</SelectItem>
                <SelectItem value="GOVERNANCE_PENDING">待主任确认</SelectItem>
                <SelectItem value="GOVERNANCE_CONFIRMED">待盖章</SelectItem>
                <SelectItem value="CONTRACT_SIGNING">合同签署中</SelectItem>
                <SelectItem value="PENDING_ACCEPTANCE">待验收</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => reload()}>查询</Button>
          </div>
          {loading ? (
            <div className="py-10 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="size-4 mr-2 animate-spin" /> 加载中
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">暂无维修工单</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工单</TableHead>
                  <TableHead>范围</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">预算</TableHead>
                  <TableHead className="w-20 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.workOrderId}
                    data-work-order-row
                    className={`cursor-pointer ${selected?.workOrderId === order.workOrderId ? "bg-primary/5" : "hover:bg-muted/40"}`}
                    onClick={() => selectOrder(order)}
                  >
                    <TableCell>
                      <div className="text-sm font-medium">{order.title}</div>
                      <div className="text-xs text-muted-foreground font-mono-num">{order.orderNo}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="size-3 text-muted-foreground" /> {scopeLabel(order)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={STATUS_TONE[order.status]} dot>{STATUS_LABEL[order.status]}</StatusChip>
                    </TableCell>
                    <TableCell className="text-right">
                      {amount(order) > 0 ? <Money value={amount(order)} className="text-sm" /> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="查看工单"
                        onClick={(event) => {
                          event.stopPropagation();
                          void selectOrder(order);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

      </div>
    </div>
    );
  }

  return renderWorkOrderList();
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium" title={value}>{children ?? value}</div>
    </div>
  );
}

function SupplierQuoteArchive({
  workOrder,
  canManage,
  acting,
  doAction,
}: {
  workOrder: RepairWorkOrder;
  canManage: boolean;
  acting: boolean;
  doAction: (action: string, body?: unknown, success?: string) => Promise<boolean>;
}) {
  const [quotes, setQuotes] = useState<RepairSupplierQuote[]>([]);
  const [frameworkRelations, setFrameworkRelations] = useState<RepairFrameworkRelation[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTicket, setPreviewTicket] = useState<RepairAttachmentPreviewTicket | null>(null);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySupplierName, setHistorySupplierName] = useState("");
  const [historyQuotes, setHistoryQuotes] = useState<RepairSupplierQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [selectionMethod, setSelectionMethod] = useState("COMPETITIVE_QUOTATION");
  const [recommendationReason, setRecommendationReason] = useState("");
  const [insufficientQuoteReason, setInsufficientQuoteReason] = useState("");
  const [frameworkRelationId, setFrameworkRelationId] = useState("");

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      listRepairSupplierQuotes(workOrder.workOrderId),
      workOrder.status === "QUOTE_SUBMITTED"
        ? listRepairFrameworkRelations(workOrder.category)
        : Promise.resolve([]),
    ])
      .then(([items, relations]) => {
        if (cancelled) return;
        setQuotes(items);
        setFrameworkRelations(relations);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "供应商报价加载失败"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, workOrder.category, workOrder.workOrderId, workOrder.status]);

  async function openAttachment(attachmentId: number) {
    setOpeningAttachmentId(attachmentId);
    setPreviewAttachmentId(attachmentId);
    setPreviewTicket(null);
    setPreviewError("");
    setPreviewOpen(true);
    try {
      setPreviewTicket(await getPropertyQuoteAttachmentPreview(workOrder.workOrderId, attachmentId));
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "报价附件预览失败");
    } finally {
      setOpeningAttachmentId(null);
    }
  }

  async function downloadAttachment(attachmentId: number) {
    const downloadWindow = window.open("", "_blank");
    setDownloadingAttachmentId(attachmentId);
    try {
      const ticket = await getPropertyQuoteAttachmentDownload(workOrder.workOrderId, attachmentId);
      if (downloadWindow) {
        downloadWindow.opener = null;
        downloadWindow.location.replace(ticket.downloadUrl);
      } else {
        window.open(ticket.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      downloadWindow?.close();
      toast.error(error instanceof Error ? error.message : "报价原件下载失败");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  function openRecommendation(quoteId: number) {
    setSelectedQuoteId(quoteId);
    setSelectionMethod("COMPETITIVE_QUOTATION");
    setRecommendationReason("");
    setInsufficientQuoteReason("");
    setFrameworkRelationId("");
    setRecommendationOpen(true);
  }

  async function openQuoteHistory(quote: RepairSupplierQuote) {
    setHistorySupplierName(quote.supplierName);
    setHistoryQuotes([]);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      setHistoryQuotes(await listRepairSupplierQuoteHistory(
        workOrder.workOrderId,
        quote.supplierDeptId,
      ));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价修订记录加载失败");
      setHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function submitRecommendation() {
    if (!selectedQuoteId) return;
    const succeeded = await doAction("recommend-supplier", {
      quoteId: selectedQuoteId,
      selectionMethod,
      recommendationReason: recommendationReason.trim(),
      insufficientQuoteReason: insufficientQuoteReason.trim(),
      frameworkRelationId: frameworkRelationId ? Number(frameworkRelationId) : undefined,
      remark: "物业推荐供应商",
    });
    if (succeeded) setRecommendationOpen(false);
  }

  const selectedQuote = quotes.find((quote) => quote.quoteId === selectedQuoteId);
  const applicableFrameworkRelations = frameworkRelations.filter(
    (relation) => !selectedQuote || relation.supplierDeptId === selectedQuote.supplierDeptId,
  );
  const needsInsufficientQuoteReason = selectionMethod === "COMPETITIVE_QUOTATION" && quotes.length < 3;

  return (
    <>
      <SectionCard title="供应商与报价" desc="查看报价资料，并直接从报价记录中推荐供应商" bodyClassName="p-0">
        {!canManage ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">当前身份无权查看供应商报价</div>
        ) : loading ? (
          <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />加载报价
          </div>
        ) : quotes.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">尚未收到供应商报价</div>
        ) : (
          <div className="divide-y">
            {quotes.map((quote) => (
              <div key={quote.quoteId} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(160px,1fr)_120px_130px_minmax(150px,1.2fr)_232px] md:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{quote.supplierName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    第 {quote.revisionNo} 版 · {fmtDate(quote.createTime)}
                  </div>
                </div>
                <div className="text-base font-semibold tabular-nums">
                  ¥{Number(quote.quoteAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </div>
                <div className="space-y-1">
                  <StatusChip tone={quote.confirmationStatus === "PENDING_SUPPLIER_CONFIRMATION" ? "warning" : "success"}>
                    {QUOTE_CONFIRMATION_LABEL[quote.confirmationStatus] ?? quote.confirmationStatus}
                  </StatusChip>
                  <div className="text-xs text-muted-foreground">{QUOTE_SOURCE_LABEL[quote.submissionSource] ?? quote.submissionSource}</div>
                </div>
                <div className="text-sm leading-6 text-foreground/80">{quote.quoteSummary || "未填写报价说明"}</div>
                <div className="flex flex-nowrap items-center gap-2 md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="预览报价附件"
                    title="预览报价附件"
                    onClick={() => void openAttachment(quote.attachmentId)}
                    disabled={openingAttachmentId === quote.attachmentId}
                  >
                    {openingAttachmentId === quote.attachmentId
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Eye className="size-4" />}
                  </Button>
                  {quote.revisionNo > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="查看报价修订记录"
                      title="查看报价修订记录"
                      onClick={() => void openQuoteHistory(quote)}
                    >
                      <ClipboardList className="size-4" />
                    </Button>
                  )}
                  {workOrder.status === "QUOTE_SUBMITTED" && (
                    <Button type="button" className="shrink-0" onClick={() => openRecommendation(quote.quoteId)}>
                      <CheckCircle2 className="mr-1 size-4" />推荐此供应商
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setPreviewTicket(null);
            setPreviewAttachmentId(null);
            setPreviewError("");
          }
        }}
      >
        <DialogContent className="h-[100dvh] w-full max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none border-0 p-0 sm:h-[85vh] sm:w-[calc(100vw-3rem)] sm:max-w-6xl sm:rounded-lg sm:border">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle>报价附件预览</DialogTitle>
            <DialogDescription className="break-all">
              {previewTicket
                ? `${previewTicket.originalFileName} · ${formatFileSize(previewTicket.actualSize)}${previewTicket.converted ? " · Excel 已转换为 PDF 预览" : ""}`
                : previewError ? "未能生成附件预览" : "正在读取附件信息"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-hidden bg-muted/30">
            {previewError ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <AlertTriangle className="mb-4 size-12 text-amber-600" />
                <div className="font-medium">附件预览生成失败</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{previewError}</p>
                <p className="mt-1 text-sm text-muted-foreground">原始报价附件不受影响，可以下载原件查看。</p>
              </div>
            ) : !previewTicket ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />加载预览
              </div>
            ) : previewTicket.contentType.startsWith("image/") ? (
              <div className="flex h-full items-center justify-center overflow-auto p-4">
                <img
                  src={previewTicket.previewUrl}
                  alt={previewTicket.originalFileName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : previewTicket.contentType === "application/pdf" ? (
              <iframe
                src={previewTicket.previewUrl}
                title={previewTicket.originalFileName}
                className="h-full w-full border-0 bg-background"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <FileText className="mb-4 size-12 text-muted-foreground" />
                <div className="max-w-full break-all font-medium">{previewTicket.originalFileName}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {previewTicket.contentType} · {formatFileSize(previewTicket.actualSize)}
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  该文件格式暂不支持稳定的浏览器内预览，请点击下方按钮下载原件后查看。
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>关闭</Button>
            <Button
              type="button"
              onClick={() => previewAttachmentId && void downloadAttachment(previewAttachmentId)}
              disabled={!previewAttachmentId || downloadingAttachmentId === previewAttachmentId}
            >
              {previewAttachmentId && downloadingAttachmentId === previewAttachmentId
                ? <Loader2 className="mr-1 size-4 animate-spin" />
                : <Download className="mr-1 size-4" />}
              下载原件
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>报价修订记录</DialogTitle>
            <DialogDescription>{historySupplierName} · 历史报价仅用于追溯，不能参与推荐或比价。</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />加载修订记录
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>版本</TableHead>
                    <TableHead>报价金额</TableHead>
                    <TableHead>提交方式</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className="text-right">附件</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuotes.map((quote) => (
                    <TableRow key={quote.quoteId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>第 {quote.revisionNo} 版</span>
                          <StatusChip tone={quote.quoteStatus === "ACTIVE"
                            ? "success"
                            : quote.quoteStatus === "REVISION_REQUESTED" ? "warning" : "neutral"}>
                            {quote.quoteStatus === "ACTIVE"
                              ? "当前有效"
                              : quote.quoteStatus === "REVISION_REQUESTED" ? "待修订" : "已被替代"}
                          </StatusChip>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        ¥{Number(quote.quoteAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{QUOTE_SOURCE_LABEL[quote.submissionSource] ?? quote.submissionSource}</TableCell>
                      <TableCell>{fmtDate(quote.createTime)}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setHistoryOpen(false);
                          void openAttachment(quote.attachmentId);
                        }}>
                          <Eye className="mr-1 size-4" />预览
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHistoryOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recommendationOpen} onOpenChange={setRecommendationOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>推荐供应商</DialogTitle>
            <DialogDescription>确认推荐方式并记录物业推荐依据，提交后进入楼栋接龙或业主大会流程。</DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{selectedQuote.supplierName}</div>
                <div className="mt-1 text-xs text-muted-foreground">已选报价</div>
              </div>
              <div className="shrink-0 text-lg font-semibold tabular-nums">
                ¥{Number(selectedQuote.quoteAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>供应商推荐方式</Label>
            <Select value={selectionMethod} onValueChange={(value) => {
              setSelectionMethod(value);
              setFrameworkRelationId("");
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPETITIVE_QUOTATION">竞争性比价</SelectItem>
                <SelectItem value="FRAMEWORK_SUPPLIER">长期合作供应商</SelectItem>
                <SelectItem value="DIRECT_AWARD">直接推荐</SelectItem>
                <SelectItem value="EMERGENCY_APPOINTMENT">应急指定</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-recommendation-reason">推荐理由</Label>
            <Textarea
              id="supplier-recommendation-reason"
              value={recommendationReason}
              onChange={(event) => setRecommendationReason(event.target.value)}
              rows={4}
              placeholder="说明价格、方案、工期、保修或既往服务等推荐依据"
            />
          </div>
          {needsInsufficientQuoteReason && (
            <div className="space-y-2">
              <Label htmlFor="insufficient-quote-reason">响应不足三家说明</Label>
              <Textarea
                id="insufficient-quote-reason"
                value={insufficientQuoteReason}
                onChange={(event) => setInsufficientQuoteReason(event.target.value)}
                rows={3}
                placeholder={`当前收到 ${quotes.length} 家报价，请说明继续推荐的原因`}
              />
            </div>
          )}
          {selectionMethod === "FRAMEWORK_SUPPLIER" && (
            <div className="space-y-2">
              <Label>长期合作关系</Label>
              <Select value={frameworkRelationId} onValueChange={setFrameworkRelationId}>
                <SelectTrigger><SelectValue placeholder="选择已审批且在有效期内的合作关系" /></SelectTrigger>
                <SelectContent>
                  {applicableFrameworkRelations.map((relation) => (
                    <SelectItem key={relation.relationId} value={String(relation.relationId)}>
                      {relation.supplierLegalName}{relation.validUntil ? ` · 有效至 ${relation.validUntil}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {applicableFrameworkRelations.length === 0 && (
                <p className="text-xs text-amber-700">该供应商没有适用于当前维修类别的有效长期合作关系。</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRecommendationOpen(false)}>取消</Button>
            <Button
              type="button"
              onClick={() => void submitRecommendation()}
              disabled={acting
                || !selectedQuoteId
                || !recommendationReason.trim()
                || (needsInsufficientQuoteReason && !insufficientQuoteReason.trim())
                || (selectionMethod === "FRAMEWORK_SUPPLIER" && !frameworkRelationId)}
            >
              <CheckCircle2 className="mr-1 size-4" />确认推荐
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditTimeline({ events }: { events: RepairEvent[] }) {
  return (
    <SectionCard title="流程记录" desc="系统自动记录每次状态变化和操作人留痕" bodyClassName="p-0">
      {events.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">暂无流程记录</div>
      ) : (
        <div className="divide-y">
          {events.map((event) => (
            <div key={event.eventId} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[180px_minmax(0,1fr)_140px] md:items-center">
              <span className="font-medium">{EVENT_ACTION_LABEL[event.action] ?? event.action}</span>
              <span className="text-muted-foreground">
                {event.fromStatus ? STATUS_LABEL[event.fromStatus] : "创建"} {"->"} {event.toStatus ? STATUS_LABEL[event.toStatus] : "-"}
                {event.remark ? ` · ${event.remark}` : ""}
              </span>
              <span className="text-xs text-muted-foreground md:text-right">{fmtDate(event.createTime)}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ActionPanel(props: {
  selected: RepairWorkOrder;
  acting: boolean;
  canManage: boolean;
  canField: boolean;
  canGovernance: boolean;
  canSealGovernance: boolean;
  canUseElectronicSeal: boolean;
  hasPreviousRecommendation: boolean;
  locationBuildings: BuildingChoice[];
  locationBuildingId: string;
  setLocationBuildingId: (v: string) => void;
  locationRoomId: string;
  setLocationRoomId: (v: string) => void;
  locationText: string;
  setLocationText: (v: string) => void;
  fieldSupplement: string;
  setFieldSupplement: (v: string) => void;
  evidenceFiles: EvidenceFile[];
  setEvidenceFiles: (v: EvidenceFile[] | ((current: EvidenceFile[]) => EvidenceFile[])) => void;
  evidenceVideo: File | null;
  setEvidenceVideo: (v: File | null) => void;
  surveySummary: string;
  setSurveySummary: (v: string) => void;
  riskLevel: string;
  setRiskLevel: (v: string) => void;
  planBudget: string;
  setPlanBudget: (v: string) => void;
  planningPolicy: RepairPlanningPolicy;
  publicCeilingEnabled: boolean;
  setPublicCeilingEnabled: (v: boolean) => void;
  publicCeilingPrice: string;
  setPublicCeilingPrice: (v: string) => void;
  fundSource: string;
  setFundSource: (v: string) => void;
  doAction: (action: string, body?: unknown, success?: string) => Promise<boolean>;
}) {
  const s = props.selected.status;
  const selectedBuilding = props.locationBuildings.find((item) => String(item.buildingId) === props.locationBuildingId);
  const roomOptions = selectedBuilding ? flattenRooms(selectedBuilding) : [];
  const selectedRoom = roomOptions.find((item) => String(item.roomId) === props.locationRoomId);
  const canCorrectLocation = s === "NEED_MANUAL_LOCATION" && props.canField;
  const [supplierLegalName, setSupplierLegalName] = useState("");
  const [supplierUscc, setSupplierUscc] = useState("");
  const [supplierContactName, setSupplierContactName] = useState("");
  const [supplierContactPhone, setSupplierContactPhone] = useState("");
  const [supplierRegistrationOpen, setSupplierRegistrationOpen] = useState(false);
  const [supplierOrganizations, setSupplierOrganizations] = useState<RepairSupplierOrganization[]>([]);
  const [quoteInvitations, setQuoteInvitations] = useState<RepairQuoteInvitation[]>([]);
  const [availableQuotes, setAvailableQuotes] = useState<RepairSupplierQuote[]>([]);
  const [invitedSupplierDeptIds, setInvitedSupplierDeptIds] = useState<number[]>([]);
  const [appendInvitationOpen, setAppendInvitationOpen] = useState(false);
  const [appendInvitationReason, setAppendInvitationReason] = useState("");
  const [reuseQuoteReason, setReuseQuoteReason] = useState("");
  const [quoteRevisionOpen, setQuoteRevisionOpen] = useState(false);
  const [quoteRevisionReason, setQuoteRevisionReason] = useState("");
  const [revisionSupplierDeptIds, setRevisionSupplierDeptIds] = useState<number[]>([]);
  const [quoteSupplierDeptId, setQuoteSupplierDeptId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteSummary, setQuoteSummary] = useState("");
  const [quoteSource, setQuoteSource] = useState("PAPER");
  const [quoteOriginalConfirmed, setQuoteOriginalConfirmed] = useState(false);
  const [quoteAttachment, setQuoteAttachment] = useState<RepairAttachment | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteUploading, setQuoteUploading] = useState(false);
  const [inspectionUploading, setInspectionUploading] = useState(false);
  const [localScopeType, setLocalScopeType] = useState("BUILDING");
  const [localUnitName, setLocalUnitName] = useState("");
  const [localDecisionChannel, setLocalDecisionChannel] = useState<"ONLINE" | "WECHAT">("ONLINE");
  const [activeLocalDecision, setActiveLocalDecision] = useState<RepairLocalDecision | null>(null);
  const [decisionRooms, setDecisionRooms] = useState<RepairDecisionRoom[]>([]);
  const [decisionChoices, setDecisionChoices] = useState<Record<number, string>>({});
  const [solitaireScreenshot, setSolitaireScreenshot] = useState<RepairAttachment | null>(null);
  const [solitaireUploading, setSolitaireUploading] = useState(false);
  const [decisionConfirmation, setDecisionConfirmation] = useState<"pause" | "complete" | null>(null);
  const solitaireFileInputRef = useRef<HTMLInputElement>(null);
  const [assemblyPackageId, setAssemblyPackageId] = useState("");
  const [approvalDocument, setApprovalDocument] = useState<RepairAttachment | null>(null);
  const [approvalSolitaireScreenshot, setApprovalSolitaireScreenshot] = useState<RepairAttachment | null>(null);
  const [approvalDocumentUploading, setApprovalDocumentUploading] = useState(false);
  const [approvalSolitaireUploading, setApprovalSolitaireUploading] = useState(false);
  const approvalDocumentInputRef = useRef<HTMLInputElement>(null);
  const approvalSolitaireInputRef = useRef<HTMLInputElement>(null);
  const [priceReviewMode, setPriceReviewMode] = useState("INTERNAL_PRICE_REVIEW");
  const [reviewedAmount, setReviewedAmount] = useState("");
  const [reviewReportHash, setReviewReportHash] = useState("");
  const [sealingMethod, setSealingMethod] = useState<GovernanceSealingMethod>(
    props.canUseElectronicSeal ? "PLATFORM_ELECTRONIC" : "UPLOADED_PHYSICAL",
  );
  const [committeeSeals, setCommitteeSeals] = useState<CommitteeElectronicSeal[]>([]);
  const [electronicSealId, setElectronicSealId] = useState("");
  const [sealedDocument, setSealedDocument] = useState<RepairAttachment | null>(null);
  const [sealedDocumentUploading, setSealedDocumentUploading] = useState(false);
  const sealedDocumentInputRef = useRef<HTMLInputElement>(null);
  const [contractAmount, setContractAmount] = useState("");
  const [contractScopeHash, setContractScopeHash] = useState("");
  const [contractFileHash, setContractFileHash] = useState("");
  const [contractSupplierDeptId, setContractSupplierDeptId] = useState("");
  const [contractSigningMethod, setContractSigningMethod] = useState("MIXED");
  const [affectedRoomId, setAffectedRoomId] = useState("");
  const [acceptanceParticipantName, setAcceptanceParticipantName] = useState("");
  const [acceptanceConclusion, setAcceptanceConclusion] = useState("PASSED");
  const [acceptanceOpinion, setAcceptanceOpinion] = useState("");
  const [paymentMilestone, setPaymentMilestone] = useState("ACCEPTANCE");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentEvidenceHash, setPaymentEvidenceHash] = useState("");
  const localDecisionBuilding = props.locationBuildings.find(
    (item) => item.buildingId === props.selected.buildingId,
  );
  const localDecisionUnits = localDecisionBuilding?.units ?? [];
  const localDecisionScopeLabel = `${props.selected.title}（${localScopeType === "BUILDING_UNIT" ? localUnitName : "整栋"}）`;
  const selectedElectronicSeal = committeeSeals.find((item) => String(item.sealId) === electronicSealId);

  useEffect(() => {
    setLocalScopeType("BUILDING");
    setLocalUnitName("");
    setLocalDecisionChannel(props.planningPolicy.buildingRepairDefaultDecisionChannel);
    setActiveLocalDecision(null);
    setDecisionConfirmation(null);
    setApprovalDocument(null);
    setApprovalSolitaireScreenshot(null);
    setSolitaireScreenshot(null);
    setSealingMethod(props.canUseElectronicSeal ? "PLATFORM_ELECTRONIC" : "UPLOADED_PHYSICAL");
    setCommitteeSeals([]);
    setElectronicSealId("");
    setSealedDocument(null);
    setReuseQuoteReason("");
    setQuoteRevisionOpen(false);
    setQuoteRevisionReason("");
    setRevisionSupplierDeptIds([]);
  }, [props.canUseElectronicSeal, props.planningPolicy.buildingRepairDefaultDecisionChannel, props.selected.workOrderId]);

  useEffect(() => {
    if (props.selected.status !== "GOVERNANCE_CONFIRMED" || !props.canSealGovernance) {
      setCommitteeSeals([]);
      setElectronicSealId("");
      return;
    }
    let cancelled = false;
    void listCommitteeSeals()
      .then((items) => {
        if (cancelled) return;
        const active = items.filter((item) => item.status === "ACTIVE");
        setCommitteeSeals(active);
        setElectronicSealId((current) => current || (active[0] ? String(active[0].sealId) : ""));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "电子印章台账加载失败"));
    return () => {
      cancelled = true;
    };
  }, [props.canSealGovernance, props.selected.status, props.selected.workOrderId]);

  useEffect(() => {
    let cancelled = false;
    const loadOrganizations = props.canManage || props.canField
      ? listRepairSupplierOrganizations()
      : Promise.resolve([]);
    const loadInvitations = props.canManage
      ? listRepairQuoteInvitations(props.selected.workOrderId)
      : Promise.resolve([]);
    const loadQuotes = props.canManage
      ? listRepairSupplierQuotes(props.selected.workOrderId)
      : Promise.resolve([]);
    void Promise.all([loadOrganizations, loadInvitations, loadQuotes])
      .then(([organizations, invitations, quotes]) => {
        if (cancelled) return;
        setSupplierOrganizations(organizations);
        setQuoteInvitations(invitations);
        setAvailableQuotes(quotes);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "供应商资料加载失败"));
    return () => {
      cancelled = true;
    };
  }, [props.canField, props.canManage, props.selected.status, props.selected.workOrderId]);

  useEffect(() => {
    if (!["LOCAL_DECISION_PENDING", "LOCAL_DECISION_PASSED"].includes(props.selected.status)) {
      setActiveLocalDecision(null);
      setDecisionRooms([]);
      setDecisionChoices({});
      return;
    }
    let cancelled = false;
    let intervalId: number | undefined;
    let errorReported = false;
    const loadDecision = async () => {
      try {
        const decision = await getRepairLocalDecision(props.selected.workOrderId);
        if (cancelled) return;
        setActiveLocalDecision(decision);
        if (props.selected.status === "LOCAL_DECISION_PENDING"
          && decision.decisionChannel === "ONLINE" && intervalId === undefined) {
          intervalId = window.setInterval(() => void loadDecision(), 5000);
        }
        if (props.selected.status !== "LOCAL_DECISION_PENDING" || decision.decisionChannel !== "WECHAT") {
          setDecisionRooms([]);
          setDecisionChoices({});
          return;
        }
        const rooms = await listRepairDecisionRooms(props.selected.workOrderId);
        if (cancelled) return;
        setDecisionRooms(rooms);
        setDecisionChoices(Object.fromEntries(rooms.map((room) => [room.roomId, "NOT_VOTED"])));
      } catch (error) {
        if (!errorReported) {
          errorReported = true;
          toast.error(error instanceof Error ? error.message : "楼栋表决信息加载失败");
        }
      }
    };
    void loadDecision();
    return () => {
      cancelled = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [props.selected.status, props.selected.workOrderId]);

  async function uploadLocalDecisionScreenshot(file: File) {
    setSolitaireUploading(true);
    try {
      if (solitaireScreenshot) {
        await deletePropertyQuoteAttachment(props.selected.workOrderId, solitaireScreenshot.attachmentId);
      }
      setSolitaireScreenshot(await uploadSolitaireScreenshot(props.selected.workOrderId, file));
      toast.success("微信接龙截图已上传");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "微信接龙截图上传失败");
    } finally {
      setSolitaireUploading(false);
      if (solitaireFileInputRef.current) solitaireFileInputRef.current.value = "";
    }
  }

  async function uploadApprovalAttachment(kind: "document" | "solitaire", file: File) {
    const setUploading = kind === "document" ? setApprovalDocumentUploading : setApprovalSolitaireUploading;
    const current = kind === "document" ? approvalDocument : approvalSolitaireScreenshot;
    const inputRef = kind === "document" ? approvalDocumentInputRef : approvalSolitaireInputRef;
    setUploading(true);
    try {
      const uploaded = kind === "document"
        ? await uploadRepairApprovalDocument(props.selected.workOrderId, file)
        : await uploadSolitaireScreenshot(props.selected.workOrderId, file);
      if (kind === "document") setApprovalDocument(uploaded);
      else setApprovalSolitaireScreenshot(uploaded);
      if (current) {
        await deleteRepairAttachment(props.selected.workOrderId, current.attachmentId).catch(() => undefined);
      }
      toast.success(kind === "document" ? "报审文件已上传" : "微信接龙截图已上传");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报审附件上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeApprovalAttachment(kind: "document" | "solitaire") {
    const attachment = kind === "document" ? approvalDocument : approvalSolitaireScreenshot;
    if (!attachment) return;
    try {
      await deleteRepairAttachment(props.selected.workOrderId, attachment.attachmentId);
      if (kind === "document") setApprovalDocument(null);
      else setApprovalSolitaireScreenshot(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除报审附件失败");
    }
  }

  async function createSupplierOrganization() {
    try {
      const supplierDeptId = await registerSupplierOrganization({
        legalName: supplierLegalName.trim(),
        unifiedSocialCreditCode: supplierUscc.trim() || undefined,
        contactName: supplierContactName.trim() || undefined,
        contactPhone: supplierContactPhone.trim() || undefined,
      });
      setQuoteSupplierDeptId(String(supplierDeptId));
      setInvitedSupplierDeptIds((current) => Array.from(new Set([...current, supplierDeptId])));
      setSupplierOrganizations(await listRepairSupplierOrganizations());
      setSupplierLegalName("");
      setSupplierUscc("");
      setSupplierContactName("");
      setSupplierContactPhone("");
      setSupplierRegistrationOpen(false);
      toast.success("供应商已登记，企业资料可稍后补充");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "供应商登记失败");
    }
  }

  async function inviteSupplierAccount(supplierDeptId: number) {
    try {
      const invitation = await createSupplierActivationInvitation(supplierDeptId);
      setSupplierOrganizations(await listRepairSupplierOrganizations());
      toast.success(`账号激活邀请已创建，邀请编号 ${invitation.invitationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "供应商账号邀请失败");
    }
  }

  async function issueQuoteInvitations() {
    const succeeded = await props.doAction("quote-invitations", {
      supplierDeptIds: invitedSupplierDeptIds,
      remark: "物业发出维修邀价",
    });
    if (succeeded) {
      setInvitedSupplierDeptIds([]);
      setQuoteInvitations(await listRepairQuoteInvitations(props.selected.workOrderId));
    }
  }

  async function appendQuoteInvitations() {
    const succeeded = await props.doAction("quote-invitations", {
      supplierDeptIds: invitedSupplierDeptIds,
      remark: appendInvitationReason.trim(),
    });
    if (!succeeded) return;
    setInvitedSupplierDeptIds([]);
    setAppendInvitationReason("");
    setQuoteInvitations(await listRepairQuoteInvitations(props.selected.workOrderId));
    setAppendInvitationOpen(false);
  }

  async function reusePreviousSupplierQuote() {
    const succeeded = await props.doAction("reuse-supplier-quote", {
      remark: reuseQuoteReason.trim(),
    }, "已沿用上一轮推荐报价");
    if (succeeded) setReuseQuoteReason("");
  }

  async function requestSupplierQuoteRevisions() {
    const succeeded = await props.doAction("revision-quote-invitations", {
      supplierDeptIds: revisionSupplierDeptIds,
      remark: quoteRevisionReason.trim(),
    }, "已通知供应商修订报价");
    if (!succeeded) return;
    setQuoteRevisionOpen(false);
    setQuoteRevisionReason("");
    setRevisionSupplierDeptIds([]);
    setQuoteInvitations(await listRepairQuoteInvitations(props.selected.workOrderId));
    setAvailableQuotes(await listRepairSupplierQuotes(props.selected.workOrderId));
  }

  async function uploadQuoteDocument(file: File) {
    setQuoteUploading(true);
    try {
      if (quoteAttachment) {
        await deletePropertyQuoteAttachment(props.selected.workOrderId, quoteAttachment.attachmentId);
      }
      setQuoteAttachment(await uploadPropertyQuoteAttachment(props.selected.workOrderId, file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价原件上传失败");
    } finally {
      setQuoteUploading(false);
    }
  }

  async function setQuoteDialog(nextOpen: boolean) {
    if (!nextOpen && quoteAttachment) {
      try {
        await deletePropertyQuoteAttachment(props.selected.workOrderId, quoteAttachment.attachmentId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "未提交附件清理失败");
        return;
      }
      setQuoteAttachment(null);
    }
    setQuoteDialogOpen(nextOpen);
  }

  async function submitPropertyQuote() {
    if (!quoteAttachment) return;
    const succeeded = await props.doAction("supplier-quotes", {
      supplierDeptId: Number(quoteSupplierDeptId),
      quoteAmount: Number(quoteAmount),
      quoteSummary,
      attachmentId: quoteAttachment.attachmentId,
      originalSource: quoteSource,
      confirmationStatus: quoteOriginalConfirmed
        ? "OFFLINE_EVIDENCE_VERIFIED"
        : "PENDING_SUPPLIER_CONFIRMATION",
      remark: "物业代录供应商原始报价",
    });
    if (!succeeded) return;
    setQuoteAttachment(null);
    setQuoteSupplierDeptId("");
    setQuoteAmount("");
    setQuoteSummary("");
    setQuoteSource("PAPER");
    setQuoteOriginalConfirmed(false);
    setQuoteDialogOpen(false);
  }

  const invitedSupplierIds = new Set(quoteInvitations.map((invitation) => invitation.supplierDeptId));
  const appendableSuppliers = supplierOrganizations.filter(
    (supplier) => !invitedSupplierIds.has(supplier.supplierDeptId),
  );
  const participatedOwnerCount = activeLocalDecision?.participatedOwnerCount ?? 0;
  const participatedArea = activeLocalDecision?.participatedArea ?? 0;
  const ownerParticipationPercent = activeLocalDecision?.totalOwnerCount
    ? Math.min(100, (participatedOwnerCount / activeLocalDecision.totalOwnerCount) * 100)
    : 0;
  const areaParticipationPercent = activeLocalDecision?.totalArea
    ? Math.min(100, (participatedArea / activeLocalDecision.totalArea) * 100)
    : 0;
  const onlineDecisionProgress = activeLocalDecision?.decisionChannel === "ONLINE" ? (
    <div className="space-y-3 pt-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">参与人数</span>
            <span className="font-medium">{participatedOwnerCount} / {activeLocalDecision.totalOwnerCount} 人</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-muted">
            <div className="h-full bg-primary" style={{ width: `${ownerParticipationPercent}%` }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">参与面积</span>
            <span className="font-medium">{participatedArea} / {activeLocalDecision.totalArea} ㎡</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-muted">
            <div className="h-full bg-primary" style={{ width: `${areaParticipationPercent}%` }} />
          </div>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        每 5 秒自动更新参与进度。为避免影响表决，进行中不展示各选项票数，结束结算后再展示汇总结果。
      </p>
    </div>
  ) : null;

  async function submitInspection() {
    if (!props.surveySummary.trim() || props.evidenceFiles.length === 0) return;
    if (canCorrectLocation && props.selected.spaceScope === "PRIVATE" && !props.locationBuildingId) {
      toast.error("请先确认维修楼栋");
      return;
    }
    if (canCorrectLocation && props.selected.spaceScope === "PUBLIC"
      && !props.locationBuildingId && !props.locationText.trim()) {
      toast.error("请确认维修楼栋，或填写小区公共区域的具体位置");
      return;
    }

    const uploadedIds: number[] = [];
    setInspectionUploading(true);
    try {
      const imageIds: number[] = [];
      for (const evidence of props.evidenceFiles) {
        const attachment = await uploadRepairFieldAttachment(
          props.selected.workOrderId,
          "SURVEY_IMAGE",
          evidence.file,
        );
        imageIds.push(attachment.attachmentId);
        uploadedIds.push(attachment.attachmentId);
      }
      let videoId: number | undefined;
      if (props.evidenceVideo) {
        const attachment = await uploadRepairFieldAttachment(
          props.selected.workOrderId,
          "SURVEY_VIDEO",
          props.evidenceVideo,
        );
        videoId = attachment.attachmentId;
        uploadedIds.push(attachment.attachmentId);
      }
      const succeeded = await props.doAction("submit-inspection", {
        publicAreaScope: canCorrectLocation && props.selected.spaceScope === "PUBLIC"
          ? (props.locationBuildingId ? "BUILDING" : "COMMUNITY")
          : undefined,
        buildingId: canCorrectLocation && props.locationBuildingId
          ? Number(props.locationBuildingId)
          : undefined,
        roomId: canCorrectLocation && selectedRoom ? Number(selectedRoom.roomId) : undefined,
        locationText: canCorrectLocation ? props.locationText : undefined,
        fieldSupplement: canCorrectLocation ? props.fieldSupplement : undefined,
        surveySummary: props.surveySummary,
        riskLevel: props.riskLevel,
        evidenceImageAttachmentIds: imageIds,
        evidenceVideoAttachmentId: videoId,
        remark: "管理后台提交现场勘验记录",
      }, "勘验记录已提交");
      if (succeeded) {
        uploadedIds.length = 0;
        props.setEvidenceFiles([]);
        props.setEvidenceVideo(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "勘验附件上传失败");
    } finally {
      await Promise.all(uploadedIds.map((attachmentId) =>
        deleteRepairAttachment(props.selected.workOrderId, attachmentId).catch(() => undefined)));
      setInspectionUploading(false);
    }
  }

  async function uploadSealedDocument(file?: File) {
    if (!file) return;
    const supported = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!supported) {
      toast.error("已盖章文件仅支持 PDF 或图片");
      return;
    }
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      toast.error("单个已盖章文件大小必须在 20MB 以内");
      return;
    }
    setSealedDocumentUploading(true);
    try {
      const uploaded = await uploadGovernanceSealedDocument(props.selected.workOrderId, file);
      const previous = sealedDocument;
      setSealedDocument(uploaded);
      if (previous) {
        await deleteRepairAttachment(props.selected.workOrderId, previous.attachmentId).catch(() => undefined);
      }
      toast.success("已盖章文件上传成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "已盖章文件上传失败");
    } finally {
      setSealedDocumentUploading(false);
    }
  }

  async function submitGovernanceSeal() {
    const body = sealingMethod === "PLATFORM_ELECTRONIC"
      ? {
          sealingMethod,
          electronicSealId: Number(electronicSealId),
          remark: "业委会使用平台电子印章完成盖章",
        }
      : {
          sealingMethod,
          sealedAttachmentId: sealedDocument?.attachmentId,
          remark: sealingMethod === "UPLOADED_PHYSICAL"
            ? "业委会上传实物章盖章文件"
            : "业委会上传外部电子签章文件并验签",
        };
    const succeeded = await props.doAction("seal", body, "盖章文件已归档");
    if (succeeded) {
      setSealedDocument(null);
    }
  }

  return (
    <SectionCard title="当前动作">
      <div className="space-y-3">
        {["SUBMITTED", "NEED_MANUAL_LOCATION", "PENDING_VERIFY", "VERIFIED", "ASSIGNED", "SURVEYING"].includes(s)
          && props.canField && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              填写勘验结论并上传现场照片；可在现场使用物业端提交，也可返回管理后台补录。
            </div>
            {canCorrectLocation && (
              <div className="space-y-3 border-b pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>维修楼栋</Label>
                    <Select value={props.locationBuildingId} onValueChange={(value) => {
                      props.setLocationBuildingId(value);
                      props.setLocationRoomId("");
                    }}>
                      <SelectTrigger><SelectValue placeholder="小区公共区域可不选" /></SelectTrigger>
                      <SelectContent>
                        {props.locationBuildings.map((building) => (
                          <SelectItem key={`${building.communityName}-${building.buildingId}`} value={String(building.buildingId)}>
                            {building.communityName} · {building.buildingName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>房号（选填）</Label>
                    <Select value={props.locationRoomId} onValueChange={props.setLocationRoomId} disabled={!selectedBuilding || roomOptions.length === 0}>
                      <SelectTrigger><SelectValue placeholder="公共区域可不选" /></SelectTrigger>
                      <SelectContent>
                        {roomOptions.map((room) => (
                          <SelectItem key={`${room.unitName}-${room.roomId}`} value={String(room.roomId)}>
                            {room.unitName} {room.roomName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>具体位置</Label>
                  <Input value={props.locationText} onChange={(e) => props.setLocationText(e.target.value)} placeholder="如：2号楼大堂门禁、中心花园东侧" />
                </div>
                <div>
                  <Label>位置补充说明（选填）</Label>
                  <Textarea value={props.fieldSupplement} onChange={(e) => props.setFieldSupplement(e.target.value)} rows={2} placeholder="现场定位依据和范围说明" />
                </div>
              </div>
            )}
            <div>
              <Label>勘验结论与维修建议</Label>
              <Textarea
                value={props.surveySummary}
                onChange={(e) => props.setSurveySummary(e.target.value)}
                rows={4}
                placeholder="故障现状、原因判断、影响范围、维修建议"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>风险等级</Label>
                <Select value={props.riskLevel} onValueChange={props.setRiskLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">低风险</SelectItem>
                    <SelectItem value="MEDIUM">中风险</SelectItem>
                    <SelectItem value="HIGH">高风险</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>现场照片（至少 1 张，最多 3 张）</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    void readEvidenceFiles(e.currentTarget.files, props.setEvidenceFiles);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>现场视频（选填，最多 1 段）</Label>
                <Input type="file" accept="video/mp4,video/quicktime" onChange={(e) => {
                  const file = e.currentTarget.files?.[0] ?? null;
                  if (file && file.size > 20 * 1024 * 1024) {
                    toast.error("现场视频不能超过 20MB");
                  } else {
                    props.setEvidenceVideo(file);
                  }
                  e.currentTarget.value = "";
                }} />
                {props.evidenceVideo && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="truncate">{props.evidenceVideo.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => props.setEvidenceVideo(null)}>移除</Button>
                  </div>
                )}
              </div>
            </div>
            {props.evidenceFiles.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {props.evidenceFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative size-20 overflow-hidden rounded-md border bg-muted">
                    <img src={file.dataUrl} alt={file.name} className="size-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-background/90 px-1 text-xs shadow"
                      onClick={() => props.setEvidenceFiles((current) => current.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={() => void submitInspection()}
              disabled={props.acting || inspectionUploading || !props.surveySummary.trim() || props.evidenceFiles.length === 0}
            >
              {inspectionUploading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ClipboardList className="size-4 mr-1" />}
              提交勘验记录
            </Button>
          </div>
        )}

        {["SURVEY_COMPLETED", "PLAN_REVISION_REQUIRED"].includes(s) && props.canField && (
          <div className="space-y-3">
            {s === "PLAN_REVISION_REQUIRED" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-sm font-medium text-amber-900">上一轮表决未通过</div>
                <div className="mt-1 text-xs leading-5 text-amber-800">
                  请调整维修范围、资金安排或询价口径。提交后将进入新一轮询价和表决，上一轮结果保留在流程记录中。
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>物业内部估算{props.planningPolicy.internalEstimateRequired ? " *" : "（选填）"}</Label>
                <Input type="number" min="0.01" value={props.planBudget} onChange={(e) => props.setPlanBudget(e.target.value)} placeholder="内部参考金额" />
              </div>
              <div>
                <Label>拟使用资金</Label>
                <Select
                  value={props.fundSource}
                  onValueChange={(value) => {
                    props.setFundSource(value);
                    if (value === "PROPERTY_INTERNAL") {
                      props.setPublicCeilingEnabled(false);
                      props.setPublicCeilingPrice("");
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROPERTY_INTERNAL">物业包干成本</SelectItem>
                    <SelectItem value="PUBLIC_REVENUE">公共收益</SelectItem>
                    <SelectItem value="BUILDING_MAINTENANCE_FUND">楼栋维修资金</SelectItem>
                    <SelectItem value="COMMUNITY_MAINTENANCE_FUND">小区公共维修资金</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {props.fundSource !== "PROPERTY_INTERNAL" && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="public-ceiling-price">向供应商公开最高限价</Label>
                  <Switch
                    id="public-ceiling-price"
                    checked={props.publicCeilingEnabled}
                    onCheckedChange={(checked) => {
                      props.setPublicCeilingEnabled(checked);
                      if (!checked) props.setPublicCeilingPrice("");
                    }}
                  />
                </div>
                {props.publicCeilingEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="public-ceiling-price-amount">公开最高限价 *</Label>
                    <Input id="public-ceiling-price-amount" type="number" min="0.01" value={props.publicCeilingPrice} onChange={(e) => props.setPublicCeilingPrice(e.target.value)} placeholder="供应商报价不得超过的金额" />
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => props.doAction("submit-plan", {
                  planBudget: props.planBudget ? Number(props.planBudget) : undefined,
                  publicCeilingPrice: props.fundSource !== "PROPERTY_INTERNAL" && props.publicCeilingEnabled
                    ? Number(props.publicCeilingPrice)
                    : undefined,
                  fundSource: props.fundSource,
                  remark: s === "PLAN_REVISION_REQUIRED"
                    ? "根据上一轮表决结果提交修订方案"
                    : props.fundSource === "PROPERTY_INTERNAL" ? "确认物业包干维修范围" : "确认维修范围与询价口径",
                })}
                disabled={props.acting
                  || (props.planningPolicy.internalEstimateRequired && !props.planBudget)
                  || (props.publicCeilingEnabled && !props.publicCeilingPrice)}
              >
                <ClipboardList className="size-4 mr-1" />
                {s === "PLAN_REVISION_REQUIRED"
                  ? "提交修订方案"
                  : props.fundSource === "PROPERTY_INTERNAL" ? "确认维修范围" : "确认维修范围与询价口径"}
              </Button>
            </div>
          </div>
        )}

        {["PLAN_SUBMITTED", "QUOTE_COLLECTING", "QUOTE_SUBMITTED"].includes(s) && props.canManage && (
          <div className="space-y-4">
            {props.hasPreviousRecommendation && availableQuotes.length > 0 && (
              <div className="space-y-3 border-l-2 border-primary pl-4">
                <div>
                  <div className="text-sm font-medium">上一轮推荐报价仍有效</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    方案重新提交不会自动覆盖历史报价。维修范围和询价条件未变化时可沿用；发生变化时应要求供应商提交新版本。
                  </p>
                </div>
                <div className="divide-y rounded-md border">
                  {availableQuotes.map((quote) => (
                    <div key={quote.quoteId} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{quote.supplierName}</span>
                        <span className="block text-xs text-muted-foreground">第 {quote.revisionNo} 版 · 已确认报价</span>
                      </span>
                      <Money value={quote.quoteAmount} className="shrink-0 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reuse-quote-reason">沿用原因</Label>
                  <Textarea
                    id="reuse-quote-reason"
                    value={reuseQuoteReason}
                    onChange={(event) => setReuseQuoteReason(event.target.value)}
                    rows={2}
                    placeholder="说明维修范围、预算口径和供应商报价条件未发生变化"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRevisionSupplierDeptIds(availableQuotes.map((quote) => quote.supplierDeptId));
                      setQuoteRevisionOpen(true);
                    }}
                  >
                    <RefreshCw className="mr-1 size-4" />要求修订报价
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void reusePreviousSupplierQuote()}
                    disabled={props.acting || !reuseQuoteReason.trim()}
                  >
                    <CheckCircle2 className="mr-1 size-4" />沿用上一轮推荐
                  </Button>
                </div>
                {quoteRevisionOpen && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="text-sm font-medium">选择需要修订报价的供应商</div>
                    <div className="divide-y rounded-md border">
                      {availableQuotes.map((quote) => (
                        <label key={quote.quoteId} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                          <Checkbox
                            checked={revisionSupplierDeptIds.includes(quote.supplierDeptId)}
                            onCheckedChange={(checked) => setRevisionSupplierDeptIds((current) => checked
                              ? Array.from(new Set([...current, quote.supplierDeptId]))
                              : current.filter((id) => id !== quote.supplierDeptId))}
                          />
                          <span className="min-w-0 flex-1 truncate">{quote.supplierName}</span>
                          <span className="text-xs text-muted-foreground">第 {quote.revisionNo} 版</span>
                        </label>
                      ))}
                    </div>
                    <Textarea
                      value={quoteRevisionReason}
                      onChange={(event) => setQuoteRevisionReason(event.target.value)}
                      rows={3}
                      placeholder="填写方案、工程量、预算口径或报价条件的具体变化"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setQuoteRevisionOpen(false)}>取消</Button>
                      <Button
                        type="button"
                        onClick={() => void requestSupplierQuoteRevisions()}
                        disabled={props.acting || revisionSupplierDeptIds.length === 0 || !quoteRevisionReason.trim()}
                      >
                        <Send className="mr-1 size-4" />发送修订通知
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {s !== "QUOTE_SUBMITTED" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupplierRegistrationOpen(true)}
              >
                <Plus className="mr-1 size-4" />登记新供应商
              </Button>
            )}
            {s === "PLAN_SUBMITTED" && !(props.hasPreviousRecommendation && availableQuotes.length > 0) && (
              <div className="space-y-2">
                <Label>选择邀价供应商</Label>
                <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {supplierOrganizations.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">暂无已登记供应商</div>
                ) : supplierOrganizations.map((supplier) => (
                  <div key={supplier.supplierDeptId} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={invitedSupplierDeptIds.includes(supplier.supplierDeptId)}
                      onCheckedChange={(checked) => setInvitedSupplierDeptIds((current) => checked
                        ? Array.from(new Set([...current, supplier.supplierDeptId]))
                        : current.filter((id) => id !== supplier.supplierDeptId))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{supplier.legalName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {supplier.contactName && supplier.contactPhone
                          ? `${supplier.contactName} · ${supplier.contactPhone}`
                          : supplier.contactName || supplier.contactPhone || "联系人未补充"}
                      </span>
                      {supplier.accountStatus === "ACTIVATED" && supplier.loginPhone && (
                        <span className="block text-xs text-emerald-700">
                          登录手机号 {supplier.loginPhone}
                          {supplier.activeAccountCount > 1 ? ` · 共 ${supplier.activeAccountCount} 个账号` : ""}
                        </span>
                      )}
                      {supplier.accountStatus === "PENDING_ACTIVATION" && (
                        <span className="block text-xs text-primary">
                          激活邀请 #{supplier.activationInvitationId} · 登录手机号 {supplier.contactPhone}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusChip tone={supplier.verificationStatus === "VERIFIED"
                        ? "success"
                        : supplier.verificationStatus === "REJECTED" ? "danger" : supplier.verificationStatus === "DISABLED" ? "neutral" : "warning"}>
                        {supplier.verificationStatus === "VERIFIED"
                          ? "企业已核验"
                          : supplier.verificationStatus === "REJECTED"
                            ? "企业核验未通过"
                            : supplier.verificationStatus === "DISABLED" ? "企业已停用" : "企业待核验"}
                      </StatusChip>
                      <StatusChip tone={supplier.accountStatus === "ACTIVATED"
                        ? "success"
                        : supplier.accountStatus === "PENDING_ACTIVATION" ? "info" : "neutral"}>
                        {supplier.accountStatus === "ACTIVATED"
                          ? "账号已激活"
                          : supplier.accountStatus === "PENDING_ACTIVATION"
                            ? "账号待激活"
                            : supplier.accountStatus === "CONTACT_MISSING" ? "联系人待补充" : "账号未邀请"}
                      </StatusChip>
                    </span>
                    {supplier.contactName && supplier.contactPhone && supplier.accountStatus !== "ACTIVATED" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={supplier.accountStatus === "PENDING_ACTIVATION"
                          ? "重新生成登录账号激活邀请（不会发出维修邀价）"
                          : "发送登录账号激活邀请（不会发出维修邀价）"}
                        onClick={() => void inviteSupplierAccount(supplier.supplierDeptId)}
                      >
                        <Send className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  发出邀价后，系统会为联系人资料完整且尚无账号的供应商创建账号激活邀请。企业核验与账号激活相互独立，签约前仍需完成企业核验。
                </p>
                <Button
                  onClick={() => void issueQuoteInvitations()}
                  disabled={props.acting || invitedSupplierDeptIds.length === 0}
                >
                  <Banknote className="size-4 mr-1" />发出邀价
                </Button>
              </div>
            )}
            {s === "QUOTE_COLLECTING" && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <div className="text-sm font-medium">邀价已发出</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {quoteInvitations.length > 0
                      ? `已邀请 ${quoteInvitations.map((item) => item.supplierName).join("、")}`
                      : "正在读取已邀价供应商"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInvitedSupplierDeptIds([]);
                    setAppendInvitationOpen(true);
                  }}
                  disabled={appendableSuppliers.length === 0}
                >
                  <Plus className="mr-1 size-4" />追加邀价供应商
                </Button>
              </div>
            )}
          </div>
        )}

        {["QUOTE_COLLECTING", "QUOTE_SUBMITTED"].includes(s) && props.canField && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setQuoteDialogOpen(true)}>
              <ClipboardList className="mr-1 size-4" />代录供应商报价
            </Button>
          </div>
        )}

        {s === "SUPPLIER_RECOMMENDED" && (
          <div className="space-y-3">
            {props.canField && props.selected.fundSource === "BUILDING_MAINTENANCE_FUND" && (
              <div className="space-y-2 border-l pl-3">
                <div className="space-y-2">
                  <Label>表决方式</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setLocalDecisionChannel("ONLINE")}
                      className={`rounded-md border px-3 py-3 text-left transition-colors ${localDecisionChannel === "ONLINE"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background hover:bg-muted/40"}`}
                    >
                      <span className="block text-sm font-medium">C 端在线表决</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">范围内实名业主登录 C 端查看方案并表决</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalDecisionChannel("WECHAT")}
                      className={`rounded-md border px-3 py-3 text-left transition-colors ${localDecisionChannel === "WECHAT"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background hover:bg-muted/40"}`}
                    >
                      <span className="block text-sm font-medium">微信接龙</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">楼栋长在微信群发起，完成后由物业上传并核验</span>
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    社区默认：{props.planningPolicy.buildingRepairDefaultDecisionChannel === "ONLINE" ? "C 端在线表决" : "微信接龙"}。
                    当前工单可在发起前调整，发起后渠道锁定且不能混用。
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>表决范围</Label>
                    <Select value={localScopeType} onValueChange={(value) => {
                      setLocalScopeType(value);
                      setLocalUnitName(value === "BUILDING_UNIT" ? localDecisionUnits[0]?.unitName ?? "" : "");
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUILDING">整栋业主</SelectItem>
                        <SelectItem value="BUILDING_UNIT">单元业主</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>具体范围</Label>
                    {localScopeType === "BUILDING_UNIT" ? (
                      <Select value={localUnitName} onValueChange={setLocalUnitName}>
                        <SelectTrigger><SelectValue placeholder="选择资产台账中的单元" /></SelectTrigger>
                        <SelectContent>
                          {localDecisionUnits.map((unit) => (
                            <SelectItem key={unit.unitName} value={unit.unitName}>{unit.unitName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">整栋</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>表决事项</Label>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm leading-6">{localDecisionScopeLabel}</div>
                </div>
                <Button
                  onClick={() => props.doAction("start-local-decision", {
                    scopeType: localScopeType,
                    decisionChannel: localDecisionChannel,
                    unitName: localScopeType === "BUILDING_UNIT" ? localUnitName : undefined,
                    scopeLabel: localDecisionScopeLabel,
                    remark: localDecisionChannel === "ONLINE"
                      ? "物业选择C端在线表决"
                      : "物业登记由楼栋长发起微信接龙",
                  })}
                  disabled={props.acting
                    || (localScopeType === "BUILDING_UNIT" && (!localUnitName || localDecisionUnits.length === 0))}
                >
                  <ClipboardList className="size-4 mr-1" />
                  {localDecisionChannel === "ONLINE" ? "发起 C 端表决" : "登记微信接龙"}
                </Button>
              </div>
            )}
            {props.canManage && ["COMMUNITY_MAINTENANCE_FUND", "PUBLIC_REVENUE"].includes(props.selected.fundSource || "") && (
              <div className="space-y-2 border-l pl-3">
                <Label>业主大会表决包 ID</Label>
                <Input value={assemblyPackageId} onChange={(e) => setAssemblyPackageId(e.target.value)} placeholder="仅小区整体事项使用" />
                <Button
                  variant="outline"
                  onClick={() => props.doAction("start-assembly-decision", {
                    packageId: Number(assemblyPackageId || 0),
                    remark: "关联业主大会表决包",
                  })}
                  disabled={props.acting || !assemblyPackageId}
                >
                  <Route className="size-4 mr-1" /> 关联业主大会
                </Button>
              </div>
            )}
          </div>
        )}

        {s === "LOCAL_DECISION_PENDING" && props.canField && (
          <div className="space-y-3">
            {activeLocalDecision?.decisionChannel === "ONLINE" && activeLocalDecision.result === "PAUSED" ? (
              <>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-medium text-amber-900">C 端在线表决已暂停</div>
                  <div className="mt-1 text-xs leading-5 text-amber-800">
                    已提交的选票完整保留，暂停期间业主无法继续表决。恢复后仍沿用原表决范围和已有选票。
                  </div>
                  {onlineDecisionProgress}
                </div>
                <Button
                  onClick={() => props.doAction("resume-local-decision", { remark: "物业恢复C端在线表决" }, "在线表决已恢复")}
                  disabled={props.acting}
                >
                  <Play className="mr-1 size-4" />恢复表决
                </Button>
              </>
            ) : activeLocalDecision?.decisionChannel === "ONLINE" ? (
              <>
                <div className="rounded-md border bg-muted/30 px-4 py-3">
                  <div className="text-sm font-medium">C 端在线表决进行中</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    已向范围内 {activeLocalDecision.totalOwnerCount} 名产权人开放。结束表决后，系统按已提交选择计票，未提交的产权人记为未参与。
                  </div>
                  {onlineDecisionProgress}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDecisionConfirmation("pause")}
                    disabled={props.acting}
                  >
                    <Pause className="mr-1 size-4" />暂停表决
                  </Button>
                  <Button
                    onClick={() => setDecisionConfirmation("complete")}
                    disabled={props.acting}
                  >
                    <CheckCircle2 className="mr-1 size-4" />结束并结算表决
                  </Button>
                </div>
              </>
            ) : activeLocalDecision?.decisionChannel === "WECHAT" ? (
              <>
                <div className="rounded-md border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  楼栋长在微信群完成接龙并将截图交给物业。物业在此逐户核对结果并上传原始截图，系统不会向业主开放 C 端表决入口。
                </div>
                <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
                  {decisionRooms.map((room) => (
                    <div key={room.roomId} className="grid grid-cols-1 items-center gap-3 px-3 py-2 sm:grid-cols-[1fr_180px]">
                      <div>
                        <div className="text-sm font-medium">产权范围 {room.roomLabel || room.roomId}</div>
                        <div className="text-xs text-muted-foreground">合计专有面积 {room.buildArea} ㎡</div>
                      </div>
                      <Select
                        value={decisionChoices[room.roomId] ?? "NOT_VOTED"}
                        onValueChange={(value) => setDecisionChoices((current) => ({ ...current, [room.roomId]: value }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AGREE">同意</SelectItem>
                          <SelectItem value="DISAGREE">不同意</SelectItem>
                          <SelectItem value="ABSTAIN">弃权</SelectItem>
                          <SelectItem value="INVALID">无效</SelectItem>
                          <SelectItem value="NOT_VOTED">未参与</SelectItem>
                          <SelectItem value="CONFLICTED">待核验冲突</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={solitaireFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadLocalDecisionScreenshot(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => solitaireFileInputRef.current?.click()}
                    disabled={solitaireUploading}
                  >
                    {solitaireUploading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                    上传微信接龙截图
                  </Button>
                  {solitaireScreenshot && (
                    <span className="text-xs text-muted-foreground">{solitaireScreenshot.originalFileName}</span>
                  )}
                </div>
                <Button
                  onClick={() => props.doAction("complete-local-decision", {
                    entries: decisionRooms.map((room) => ({
                      roomId: room.roomId,
                      choice: decisionChoices[room.roomId] ?? "NOT_VOTED",
                    })),
                    evidenceAttachmentId: solitaireScreenshot?.attachmentId,
                    remark: "物业完成微信接龙明细及截图核验",
                  })}
                  disabled={props.acting || decisionRooms.length === 0 || !solitaireScreenshot || Object.values(decisionChoices).includes("CONFLICTED")}
                >
                  <CheckCircle2 className="mr-1 size-4" />核验并提交微信接龙
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">正在读取表决方式…</div>
            )}
          </div>
        )}

        {s === "ASSEMBLY_DECISION_PENDING" && props.canManage && (
          <Button onClick={() => props.doAction("complete-assembly-decision", { remark: "业主大会表决包已结算并通过" })} disabled={props.acting}>
            <CheckCircle2 className="size-4 mr-1" /> 确认业主大会结果
          </Button>
        )}

        {["LOCAL_DECISION_PASSED", "APPROVAL_DOCUMENT_PREPARING"].includes(s) && props.canManage && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>物业正式报审文件 <span className="text-red-600">*</span></Label>
              <input
                ref={approvalDocumentInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadApprovalAttachment("document", file);
                }}
              />
              {approvalDocument ? (
                <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{approvalDocument.originalFileName}</div>
                    <div className="text-xs text-muted-foreground">{formatFileSize(approvalDocument.actualSize)}</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => approvalDocumentInputRef.current?.click()} disabled={approvalDocumentUploading}>
                    替换
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void removeApprovalAttachment("document")} aria-label="移除报审文件">
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => approvalDocumentInputRef.current?.click()} disabled={approvalDocumentUploading}>
                  {approvalDocumentUploading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                  上传报审文件
                </Button>
              )}
              <p className="text-xs text-muted-foreground">支持 PDF、图片、Word 或 Excel，单个文件不超过 20MB。</p>
            </div>
            {activeLocalDecision?.decisionChannel === "WECHAT" && (
              <div className="space-y-2 border-t pt-4">
                <Label>微信接龙截图 <span className="text-red-600">*</span></Label>
                <input
                  ref={approvalSolitaireInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadApprovalAttachment("solitaire", file);
                  }}
                />
                {approvalSolitaireScreenshot ? (
                  <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{approvalSolitaireScreenshot.originalFileName}</div>
                      <div className="text-xs text-muted-foreground">将替换表决阶段上传的截图</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => approvalSolitaireInputRef.current?.click()} disabled={approvalSolitaireUploading}>
                      替换
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => void removeApprovalAttachment("solitaire")} aria-label="移除微信接龙截图">
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : activeLocalDecision.evidenceAttachmentHash ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-emerald-800">
                      <CheckCircle2 className="size-4 shrink-0" />
                      表决阶段上传的微信接龙截图将自动加入报审包
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => approvalSolitaireInputRef.current?.click()} disabled={approvalSolitaireUploading}>
                      {approvalSolitaireUploading && <Loader2 className="mr-1 size-4 animate-spin" />}
                      重新上传
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => approvalSolitaireInputRef.current?.click()} disabled={approvalSolitaireUploading}>
                    {approvalSolitaireUploading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                    上传微信接龙截图
                  </Button>
                )}
              </div>
            )}
            <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              提交时系统会将报审文件与表决材料生成不可变报审包摘要，无需手工填写文件标识。
            </div>
            <Button
              onClick={() => props.doAction("approval-package", {
                officialDocumentAttachmentId: approvalDocument?.attachmentId,
                solitaireScreenshotAttachmentIds: approvalSolitaireScreenshot
                  ? [approvalSolitaireScreenshot.attachmentId]
                  : [],
                remark: "物业上传正式报审文件并锁定版本",
              })}
              disabled={props.acting || approvalDocumentUploading || approvalSolitaireUploading || !approvalDocument
                || (s === "LOCAL_DECISION_PASSED" && !activeLocalDecision)
                || (activeLocalDecision?.decisionChannel === "WECHAT"
                  && !activeLocalDecision.evidenceAttachmentHash && !approvalSolitaireScreenshot)}
            >
              <ClipboardList className="mr-1 size-4" />提交报审文件
            </Button>
          </div>
        )}

        {s === "PRICE_REVIEW_PENDING" && props.canGovernance && (
          <div className="space-y-3">
            <Select value={priceReviewMode} onValueChange={setPriceReviewMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL_PRICE_REVIEW">业委会内部审价</SelectItem>
                <SelectItem value="THIRD_PARTY_COST_AUDIT">第三方专业审价</SelectItem>
              </SelectContent>
            </Select>
            <Input value={reviewedAmount} onChange={(e) => setReviewedAmount(e.target.value)} placeholder="审定金额" />
            {priceReviewMode === "THIRD_PARTY_COST_AUDIT" && (
              <Input value={reviewReportHash} onChange={(e) => setReviewReportHash(e.target.value)} placeholder="第三方审价报告文件标识" />
            )}
            <Button
              onClick={() => props.doAction("price-review", {
                reviewMode: priceReviewMode,
                reviewedAmount: Number(reviewedAmount || 0),
                reviewReportHash: reviewReportHash || undefined,
                conclusion: "APPROVED",
                opinion: "审价通过",
              })}
              disabled={props.acting || !reviewedAmount || (priceReviewMode === "THIRD_PARTY_COST_AUDIT" && !reviewReportHash)}
            >
              <Banknote className="mr-1 size-4" />审价通过
            </Button>
          </div>
        )}

        {s === "PRICE_REVIEW_PENDING" && !props.canGovernance && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-amber-950">等待业委会审价</div>
              <p className="text-sm leading-6 text-amber-900/80">
                物业报审已完成，当前工单已移交业委会。请由具有维修治理权限的业委会账号登录，完成内部审价或发起第三方专业审价。
              </p>
            </div>
          </div>
        )}

        {s === "GOVERNANCE_PENDING" && props.canGovernance && (
          <Button onClick={() => props.doAction("governance-confirm", { remark: "业委会主任或副主任确认" })} disabled={props.acting}>
            <CheckCircle2 className="size-4 mr-1" /> 主任/副主任确认
          </Button>
        )}

        {s === "GOVERNANCE_CONFIRMED" && props.canSealGovernance && (
          <div className="space-y-4">
            <div>
              <Label>盖章方式</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSealingMethod("PLATFORM_ELECTRONIC")}
                  disabled={!props.canUseElectronicSeal}
                  className={`min-h-20 rounded-md border px-3 py-3 text-left transition-colors ${
                    sealingMethod === "PLATFORM_ELECTRONIC"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="block text-sm font-medium">平台电子签章</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {props.canUseElectronicSeal ? "由登记保管人调用当前届期印章" : "当前账号无电子印章使用权限"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSealingMethod("UPLOADED_PHYSICAL")}
                  className={`min-h-20 rounded-md border px-3 py-3 text-left transition-colors ${
                    sealingMethod === "UPLOADED_PHYSICAL"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <span className="block text-sm font-medium">上传实物盖章文件</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">上传纸质盖章文件的扫描件或照片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSealingMethod("UPLOADED_EXTERNAL_ELECTRONIC")}
                  className={`min-h-20 rounded-md border px-3 py-3 text-left transition-colors ${
                    sealingMethod === "UPLOADED_EXTERNAL_ELECTRONIC"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <span className="block text-sm font-medium">上传外部电子签章文件</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">上传 PDF 并记录服务商验签结果</span>
                </button>
              </div>
            </div>

            {sealingMethod === "PLATFORM_ELECTRONIC" ? (
              <div className="space-y-3">
                <div>
                  <Label>电子印章</Label>
                  <Select value={electronicSealId} onValueChange={setElectronicSealId}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="选择当前届期有效印章" /></SelectTrigger>
                    <SelectContent>
                      {committeeSeals.map((seal) => (
                        <SelectItem key={seal.sealId} value={String(seal.sealId)}>
                          {seal.sealName} · 保管人 {seal.custodianName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {committeeSeals.length === 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    当前届期没有有效电子印章，请先在“委员会操作 / 印章管理”中启用模拟印章。
                  </div>
                )}
                {selectedElectronicSeal?.simulated && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                    当前为模拟电子印章。生成文件会标记“NO LEGAL EFFECT”，仅用于开发测试，不得作为正式报审文件。
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={sealedDocumentInputRef}
                  type="file"
                  accept={sealingMethod === "UPLOADED_EXTERNAL_ELECTRONIC" ? "application/pdf" : "application/pdf,image/*"}
                  className="hidden"
                  onChange={(event) => {
                    void uploadSealedDocument(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <div className="flex min-h-16 items-center justify-between gap-3 rounded-md border border-dashed px-3 py-3">
                  <div className="min-w-0">
                    {sealedDocument ? (
                      <>
                        <div className="truncate text-sm font-medium">{sealedDocument.originalFileName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatFileSize(sealedDocument.actualSize)}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium">尚未上传已盖章文件</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {sealingMethod === "UPLOADED_EXTERNAL_ELECTRONIC" ? "仅支持 PDF，单个不超过 20MB" : "支持 PDF 或图片，单个不超过 20MB"}
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => sealedDocumentInputRef.current?.click()}
                    disabled={sealedDocumentUploading}
                  >
                    {sealedDocumentUploading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                    {sealedDocument ? "重新上传" : "选择文件"}
                  </Button>
                </div>
                {sealingMethod === "UPLOADED_EXTERNAL_ELECTRONIC" && (
                  <div className="text-xs leading-5 text-muted-foreground">
                    开发环境只验证 PDF 可读取性并记录模拟验签结果，不代表外部电子签章真实有效。
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => void submitGovernanceSeal()}
              disabled={props.acting || sealedDocumentUploading
                || (sealingMethod === "PLATFORM_ELECTRONIC" ? !electronicSealId : !sealedDocument)}
            >
              <ShieldCheck className="mr-1 size-4" />
              {sealingMethod === "PLATFORM_ELECTRONIC" ? "生成模拟盖章文件" : "确认并归档盖章文件"}
            </Button>
          </div>
        )}

        {s === "SEALED" && props.canManage && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={contractSupplierDeptId} onValueChange={setContractSupplierDeptId}>
                <SelectTrigger><SelectValue placeholder="选择签约供应商" /></SelectTrigger>
                <SelectContent>
                  {supplierOrganizations.filter((supplier) => supplier.verificationStatus === "VERIFIED").map((supplier) => (
                    <SelectItem key={supplier.supplierDeptId} value={String(supplier.supplierDeptId)}>
                      {supplier.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="合同金额" />
            </div>
            <Input value={contractScopeHash} onChange={(e) => setContractScopeHash(e.target.value)} placeholder="锁定维修范围文件标识" />
            <Input value={contractFileHash} onChange={(e) => setContractFileHash(e.target.value)} placeholder="三方合同文件标识" />
            <Select value={contractSigningMethod} onValueChange={setContractSigningMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">全线上签署</SelectItem>
                <SelectItem value="OFFLINE">纸质签署</SelectItem>
                <SelectItem value="MIXED">混合签署</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => props.doAction("contracts", {
                supplierDeptId: Number(contractSupplierDeptId),
                contractAmount: Number(contractAmount || 0),
                repairScopeHash: contractScopeHash,
                fundSource: props.selected.fundSource || "BUILDING_MAINTENANCE_FUND",
                signingMethod: contractSigningMethod,
                contractFileHash,
                remark: "物业发起三方施工合同签署",
              })}
              disabled={props.acting || !contractSupplierDeptId || !contractAmount || !contractScopeHash || !contractFileHash}
            >
              <ClipboardList className="mr-1 size-4" />发起合同签署
            </Button>
          </div>
        )}

        {s === "CONTRACT_SIGNING" && props.canManage && (
          <Button
            onClick={() => props.doAction("contracts/complete", {
              signatures: [
                { partyType: "OWNERS_ASSEMBLY_OR_GROUP", signerName: "业主组织", signatureMethod: "PAPER_SCAN", signatureFileHash: contractFileHash, signedAt: new Date().toISOString().slice(0, 19) },
                { partyType: "PROPERTY", signerName: "物业服务企业", signatureMethod: "PAPER_SCAN", signatureFileHash: contractFileHash, signedAt: new Date().toISOString().slice(0, 19) },
                { partyType: "SUPPLIER", signerName: "维修供应商", signatureMethod: "PAPER_SCAN", signatureFileHash: contractFileHash, signedAt: new Date().toISOString().slice(0, 19) },
              ],
              finalContractFileHash: contractFileHash,
              remark: "确认三方合同全部签署",
            })}
            disabled={props.acting || !contractFileHash}
          >
            <CheckCircle2 className="mr-1 size-4" />确认三方签署完成
          </Button>
        )}

        {s === "CONTRACT_EFFECTIVE" && props.canManage && (
          <div className="space-y-3">
            <Input value={affectedRoomId} onChange={(e) => setAffectedRoomId(e.target.value)} placeholder="受影响房屋 ID，可逐户录入" />
            <Button
              variant="outline"
              onClick={() => props.doAction("acceptance-scope", {
                rooms: [{ roomId: Number(affectedRoomId), affectedReason: "本次维修直接受影响房屋" }],
                remark: "锁定验收范围",
              })}
              disabled={props.acting || !affectedRoomId}
            >
              <Building2 className="mr-1 size-4" />保存受影响房屋
            </Button>
          </div>
        )}

        {["APPROVED", "CONTRACT_EFFECTIVE"].includes(s) && props.canField && (
          <Button
            onClick={() => props.doAction("start-work", {
              remark: s === "APPROVED" ? "物业包干维修开始执行" : "合同已生效，供应商进场",
            })}
            disabled={props.acting}
          >
            <Wrench className="size-4 mr-1" /> 开工
          </Button>
        )}

        {["IN_PROGRESS", "RECTIFICATION_REQUIRED"].includes(s) && props.canField && (
          <Button onClick={() => props.doAction("submit-acceptance", { remark: "提交验收" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 提交验收
          </Button>
        )}

        {["PENDING_ACCEPTANCE", "ACCEPTANCE_EXCEPTION"].includes(s) && props.canField && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input value={affectedRoomId} onChange={(e) => setAffectedRoomId(e.target.value)} placeholder="受影响房屋 ID" />
              <Input value={acceptanceParticipantName} onChange={(e) => setAcceptanceParticipantName(e.target.value)} placeholder="验收业主姓名" />
            </div>
            <Select value={acceptanceConclusion} onValueChange={setAcceptanceConclusion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PASSED">验收通过</SelectItem>
                <SelectItem value="RECTIFICATION_REQUIRED">要求整改</SelectItem>
                <SelectItem value="UNREACHABLE">无法联系</SelectItem>
                <SelectItem value="AUTHORIZED">委托验收</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={acceptanceOpinion} onChange={(e) => setAcceptanceOpinion(e.target.value)} rows={3} placeholder="验收意见或整改事项" />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => props.doAction("acceptance-records", {
                  roomId: Number(affectedRoomId),
                  participantType: "AFFECTED_OWNER",
                  participantName: acceptanceParticipantName,
                  conclusion: acceptanceConclusion,
                  opinion: acceptanceOpinion,
                  signatureHash: "PROPERTY_PROXY_ENTRY",
                  remark: "物业代录受影响业主验收记录",
                })}
                disabled={props.acting || !affectedRoomId || !acceptanceParticipantName || (acceptanceConclusion === "RECTIFICATION_REQUIRED" && !acceptanceOpinion)}
              >
                <ClipboardList className="mr-1 size-4" />记录业主验收
              </Button>
              <Button variant="outline" onClick={() => props.doAction("accept-completed", { remark: "核验验收参与人和结论" })} disabled={props.acting}>
                完成验收定案
              </Button>
            </div>
          </div>
        )}

        {["PENDING_ACCEPTANCE", "ACCEPTANCE_EXCEPTION"].includes(s) && props.canGovernance && (
          <div className="space-y-3">
            <Input value={acceptanceParticipantName} onChange={(e) => setAcceptanceParticipantName(e.target.value)} placeholder="业委会见证人姓名（可选）" />
            <Button
              variant="outline"
              onClick={() => props.doAction("acceptance-records", {
                participantType: "COMMITTEE_REPRESENTATIVE",
                participantName: acceptanceParticipantName,
                conclusion: "PASSED",
                remark: "业委会代表自愿参与验收见证",
              })}
              disabled={props.acting || !acceptanceParticipantName}
            >
              记录可选见证
            </Button>
          </div>
        )}

        {["COMPLETED", "EVALUATED"].includes(s) && props.canGovernance && (
          <Button onClick={() => props.doAction("archive", { remark: "归档" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 归档
          </Button>
        )}

        {["CONTRACT_EFFECTIVE", "IN_PROGRESS", "PENDING_ACCEPTANCE", "ACCEPTANCE_EXCEPTION", "COMPLETED"].includes(s) && props.canManage && (
          <div className="space-y-3 border-t pt-3">
            <Label>向财务模块发起付款申请</Label>
            <Select value={paymentMilestone} onValueChange={setPaymentMilestone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADVANCE">预付款</SelectItem>
                <SelectItem value="PROGRESS">进度款</SelectItem>
                <SelectItem value="ACCEPTANCE">验收款</SelectItem>
                <SelectItem value="WARRANTY">质保金</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="申请金额" />
              <Input value={paymentEvidenceHash} onChange={(e) => setPaymentEvidenceHash(e.target.value)} placeholder="付款条件证明文件标识" />
            </div>
            <Button
              variant="outline"
              onClick={() => props.doAction("payment-requests", {
                milestoneType: paymentMilestone,
                requestedAmount: Number(paymentAmount || 0),
                conditionEvidenceHash: paymentEvidenceHash,
                remark: "维修模块向财务模块发起付款申请",
              })}
              disabled={props.acting || !paymentAmount || !paymentEvidenceHash}
            >
              <Banknote className="mr-1 size-4" />提交付款申请
            </Button>
          </div>
        )}
      </div>
      <AlertDialog
        open={decisionConfirmation !== null}
        onOpenChange={(open) => {
          if (!open && !props.acting) setDecisionConfirmation(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <div className={`mb-1 flex size-10 items-center justify-center rounded-md ${
              decisionConfirmation === "complete"
                ? "bg-red-50 text-red-600"
                : "bg-amber-50 text-amber-600"
            }`}>
              {decisionConfirmation === "complete"
                ? <AlertTriangle className="size-5" />
                : <Pause className="size-5" />}
            </div>
            <AlertDialogTitle>
              {decisionConfirmation === "complete" ? "确认结束并结算表决？" : "确认暂停表决？"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-6">
              {decisionConfirmation === "complete"
                ? "系统将立即按现有选票结算，未提交的产权人记为未参与。"
                : "暂停期间业主将无法继续投票，已经提交的选票会完整保留。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {decisionConfirmation === "complete" && (
            <div className="space-y-2.5">
              <div className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 ${
                activeLocalDecision?.currentThresholdPassed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}>
                {activeLocalDecision?.currentThresholdPassed
                  ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                <div>
                  <div className="text-sm font-medium">
                    {activeLocalDecision?.currentThresholdPassed
                      ? "当前已达到表决通过条件"
                      : "当前尚未达到表决通过条件"}
                  </div>
                  <div className="mt-0.5 text-xs leading-5 opacity-90">
                    {activeLocalDecision?.currentThresholdPassed
                      ? "参与人数、面积均已达到 2/3，且赞成人数、面积均超过已参与的 1/2。"
                      : "当前尚未同时满足参与人数、面积达到 2/3，以及赞成人数、面积过半；此刻结束将进入“方案需修改”。"}
                  </div>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                最终结果以系统结算时锁定的选票为准。本轮表决结束后不能恢复。
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={props.acting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className={decisionConfirmation === "complete"
                ? "bg-red-600 text-white hover:bg-red-700"
                : undefined}
              disabled={props.acting}
              onClick={(event) => {
                event.preventDefault();
                const action = decisionConfirmation;
                if (!action) return;
                void (async () => {
                  const success = action === "complete"
                    ? await props.doAction("complete-local-decision", {
                        entries: [],
                        remark: "物业结束C端在线表决并生成结果",
                      }, "表决已结束并完成结算")
                    : await props.doAction(
                        "pause-local-decision",
                        { remark: "物业暂停C端在线表决" },
                        "在线表决已暂停",
                      );
                  if (success) setDecisionConfirmation(null);
                })();
              }}
            >
              {props.acting && <Loader2 className="mr-1 size-4 animate-spin" />}
              {decisionConfirmation === "complete" ? "结束并结算" : "确认暂停"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={supplierRegistrationOpen} onOpenChange={setSupplierRegistrationOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>登记新供应商</DialogTitle>
            <DialogDescription>先登记企业名称即可参与邀价，其余主体资料可稍后补齐。</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier-legal-name">企业名称</Label>
              <Input id="supplier-legal-name" value={supplierLegalName} onChange={(e) => setSupplierLegalName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-uscc">统一社会信用代码（选填）</Label>
              <Input id="supplier-uscc" value={supplierUscc} onChange={(e) => setSupplierUscc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-contact-name">企业联系人（选填）</Label>
              <Input id="supplier-contact-name" value={supplierContactName} onChange={(e) => setSupplierContactName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-contact-phone">联系人手机号（选填）</Label>
              <Input id="supplier-contact-phone" value={supplierContactPhone} onChange={(e) => setSupplierContactPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierRegistrationOpen(false)}>取消</Button>
            <Button onClick={() => void createSupplierOrganization()} disabled={!supplierLegalName.trim()}>
              <Building2 className="mr-1 size-4" />确认登记
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={appendInvitationOpen} onOpenChange={(open) => {
        setAppendInvitationOpen(open);
        if (!open) {
          setInvitedSupplierDeptIds([]);
          setAppendInvitationReason("");
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>追加邀价供应商</DialogTitle>
            <DialogDescription>首次邀价记录保持不变；这里仅向尚未受邀的供应商追加发送。</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
            {appendableSuppliers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">没有可追加的供应商</div>
            ) : appendableSuppliers.map((supplier) => (
              <label key={supplier.supplierDeptId} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                <Checkbox
                  checked={invitedSupplierDeptIds.includes(supplier.supplierDeptId)}
                  onCheckedChange={(checked) => setInvitedSupplierDeptIds((current) => checked
                    ? [...current, supplier.supplierDeptId]
                    : current.filter((id) => id !== supplier.supplierDeptId))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{supplier.legalName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {supplier.contactName && supplier.contactPhone
                      ? `${supplier.contactName} · ${supplier.contactPhone}`
                      : "联系人资料未补充"}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="append-invitation-reason">追加原因</Label>
            <Textarea
              id="append-invitation-reason"
              rows={3}
              value={appendInvitationReason}
              onChange={(event) => setAppendInvitationReason(event.target.value)}
              placeholder="如：原受邀供应商未响应，需要补充询价"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppendInvitationOpen(false)}>取消</Button>
            <Button
              onClick={() => void appendQuoteInvitations()}
              disabled={props.acting || invitedSupplierDeptIds.length === 0 || !appendInvitationReason.trim()}
            >
              <Send className="mr-1 size-4" />发送追加邀价
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quoteDialogOpen} onOpenChange={(open) => void setQuoteDialog(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>代录供应商报价</DialogTitle>
            <DialogDescription>录入物业收到的纸质、微信或电子报价，并保留原始文件。</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>报价供应商</Label>
              <Select value={quoteSupplierDeptId} onValueChange={setQuoteSupplierDeptId}>
                <SelectTrigger><SelectValue placeholder="选择供应商" /></SelectTrigger>
                <SelectContent>
                  {supplierOrganizations.map((supplier) => (
                    <SelectItem key={supplier.supplierDeptId} value={String(supplier.supplierDeptId)}>
                      {supplier.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-quote-amount">含税总价</Label>
              <Input id="property-quote-amount" type="number" min="0" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>报价来源</Label>
            <Select value={quoteSource} onValueChange={setQuoteSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAPER">纸质报价单</SelectItem>
                <SelectItem value="WECHAT">微信接收</SelectItem>
                <SelectItem value="EMAIL">邮件接收</SelectItem>
                <SelectItem value="OTHER">其他来源</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-quote-summary">报价说明</Label>
            <Textarea id="property-quote-summary" rows={4} value={quoteSummary} onChange={(e) => setQuoteSummary(e.target.value)} placeholder="报价范围、工期、保修、材料说明" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-quote-file">报价原件</Label>
            <Input
              id="property-quote-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadQuoteDocument(file);
                event.target.value = "";
              }}
              disabled={quoteUploading}
            />
            <div className="flex min-h-6 items-center text-xs text-muted-foreground">
              {quoteUploading ? <><Loader2 className="mr-1 size-3.5 animate-spin" />正在上传</> : quoteAttachment ? (
                <><FileText className="mr-1 size-3.5" />{quoteAttachment.originalFileName}</>
              ) : "支持 PDF、图片、Word、Excel，单个文件不超过 20MB"}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">供应商已在原件上签字或盖章</div>
              <div className="text-xs text-muted-foreground">未确认时，报价将标记为待供应商确认。</div>
            </div>
            <Switch checked={quoteOriginalConfirmed} onCheckedChange={setQuoteOriginalConfirmed} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void setQuoteDialog(false)} disabled={quoteUploading}>取消</Button>
            <Button
              onClick={() => void submitPropertyQuote()}
              disabled={props.acting || quoteUploading || !quoteSupplierDeptId || !quoteAmount || !quoteAttachment}
            >
              <Upload className="mr-1 size-4" />提交代录报价
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </SectionCard>
  );
}
