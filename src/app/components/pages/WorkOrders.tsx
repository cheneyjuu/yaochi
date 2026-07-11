import { useEffect, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  Upload,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import {
  listRepairLocationOptions,
  getRepairPlanningPolicy,
  listRepairDecisionRooms,
  listRepairFrameworkRelations,
  listRepairEvents,
  listRepairSupplierOrganizations,
  listRepairSupplierQuotes,
  listRepairQuoteInvitations,
  pageRepairWorkOrders,
  createSupplierActivationInvitation,
  registerSupplierOrganization,
  repairAction,
  deletePropertyQuoteAttachment,
  uploadPropertyQuoteAttachment,
  type RepairLocationBuildingOption,
  type RepairPlanningPolicy,
  type RepairLocationCommunityOption,
  type RepairLocationRoomOption,
  type RepairEvent,
  type RepairDecisionRoom,
  type RepairFrameworkRelation,
  type RepairStatus,
  type RepairSupplierOrganization,
  type RepairSupplierQuote,
  type RepairQuoteInvitation,
  type RepairAttachment,
  type RepairWorkOrder,
} from "../../lib/repair";

const STATUS_LABEL: Record<RepairStatus, string> = {
  SUBMITTED: "已提交",
  PENDING_VERIFY: "待现场核验",
  NEED_MANUAL_LOCATION: "待补充位置",
  VERIFIED: "已核验",
  ASSIGNED: "已派单",
  SURVEYING: "初勘中",
  SURVEY_COMPLETED: "初勘已完成",
  QUOTE_COLLECTING: "询价中",
  QUOTE_SUBMITTED: "已报价",
  SUPPLIER_RECOMMENDED: "物业已推荐供应商",
  PLAN_SUBMITTED: "待邀价",
  LOCAL_DECISION_PENDING: "楼栋接龙中",
  LOCAL_DECISION_PASSED: "接龙已通过",
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
  SUBMIT_SUPPLIER_QUOTE: "提交供应商报价",
  RECOMMEND_SUPPLIER: "物业推荐供应商",
  START_LOCAL_DECISION: "发起楼栋接龙",
  COMPLETE_LOCAL_DECISION: "确认楼栋接龙结果",
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
      return "本工单拟使用楼栋维修资金。物业推荐供应商后，由楼主发起本楼栋接龙；物业根据接龙结果形成正式报审文件并附接龙截图，经业委会审价、主任或副主任任一人确认，再由业委会盖章后，方可签订合同并安排施工。";
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

const STEPS = [
  { key: "accept", label: "受理" },
  { key: "verify", label: "核验" },
  { key: "survey", label: "初勘" },
  { key: "plan", label: "方案" },
  { key: "quote", label: "报价" },
  { key: "supplier", label: "推荐供应商" },
  { key: "decision", label: "接龙/业主大会" },
  { key: "package", label: "报审" },
  { key: "price", label: "审价" },
  { key: "confirm", label: "主任/副主任" },
  { key: "seal", label: "盖章" },
  { key: "contract", label: "合同" },
  { key: "work", label: "施工" },
  { key: "acceptance", label: "验收" },
];

const STATUS_STEP: Record<RepairStatus, number> = {
  SUBMITTED: 0,
  NEED_MANUAL_LOCATION: 1,
  PENDING_VERIFY: 1,
  VERIFIED: 2,
  ASSIGNED: 2,
  SURVEYING: 2,
  SURVEY_COMPLETED: 3,
  PLAN_SUBMITTED: 3,
  QUOTE_COLLECTING: 4,
  QUOTE_SUBMITTED: 4,
  SUPPLIER_RECOMMENDED: 5,
  LOCAL_DECISION_PENDING: 6,
  ASSEMBLY_DECISION_PENDING: 6,
  LOCAL_DECISION_PASSED: 7,
  APPROVAL_DOCUMENT_PREPARING: 7,
  PRICE_REVIEW_PENDING: 8,
  GOVERNANCE_PENDING: 9,
  GOVERNANCE_CONFIRMED: 10,
  SEALED: 10,
  CONTRACT_SIGNING: 11,
  CONTRACT_EFFECTIVE: 11,
  APPROVED: 11,
  IN_PROGRESS: 12,
  PENDING_ACCEPTANCE: 13,
  ACCEPTANCE_EXCEPTION: 13,
  RECTIFICATION_REQUIRED: 12,
  COMPLETED: 13,
  EVALUATED: 13,
  ARCHIVED: 13,
  REJECTED: 0,
  CANCELLED: 0,
  SUSPENDED: 0,
  ESCALATED: 0,
  REASSIGN_REQUIRED: 2,
  PLAN_REVISION_REQUIRED: 3,
  CHANGE_REVIEW_PENDING: 9,
  PAYMENT_EXCEPTION: 13,
  HANDOVER_LOCK: 13,
  EMERGENCY_REPORTED: 2,
  EMERGENCY_MITIGATION: 2,
  EMERGENCY_PLAN_PENDING: 3,
  EMERGENCY_REPAIRING: 12,
};

type BuildingChoice = RepairLocationBuildingOption & { communityName: string };
type RoomChoice = RepairLocationRoomOption & { unitName: string };
type EvidenceFile = { name: string; dataUrl: string; base64: string };

function fmtDate(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
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
        base64: dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function WorkOrders() {
  const { hasPermission, setPage } = useStore();
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
  const [surveySummary, setSurveySummary] = useState("");
  const [riskLevel, setRiskLevel] = useState("LOW");
  const [planningPolicy, setPlanningPolicy] = useState<RepairPlanningPolicy>({ internalEstimateRequired: false });
  const [planBudget, setPlanBudget] = useState("");
  const [publicCeilingEnabled, setPublicCeilingEnabled] = useState(false);
  const [publicCeilingPrice, setPublicCeilingPrice] = useState("");
  const [fundSource, setFundSource] = useState("PROPERTY_INTERNAL");

  const canRead = hasPermission("repair:workorder:read");
  const canIntake = hasPermission("repair:workorder:intake");
  const canManage = hasPermission("repair:workorder:manage");
  const canField = hasPermission("repair:workorder:field");
  const canGovernance = hasPermission("repair:workorder:governance");
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
        canField ? getRepairPlanningPolicy() : Promise.resolve({ internalEstimateRequired: false }),
      ]);
      setOrders(page.items);
      setLocationCommunities(options.communities);
      setPlanningPolicy(policy);
      const next = page.items.find((item) => item.workOrderId === (keepSelectedId ?? selected?.workOrderId)) ?? page.items[0] ?? null;
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] gap-5">
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
                <SelectItem value="LOCAL_DECISION_PENDING">楼栋接龙中</SelectItem>
                <SelectItem value="LOCAL_DECISION_PASSED">接龙已通过</SelectItem>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.workOrderId}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        {selected ? (
          <div className="space-y-4">
            <SectionCard title="工单详情" desc={`${selected.orderNo} · ${fmtDate(selected.createTime)}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{selected.title}</div>
                    <div className="mt-2">
                      <RichTextView html={selected.description} />
                    </div>
                  </div>
                  <StatusChip tone={STATUS_TONE[selected.status]} dot>{STATUS_LABEL[selected.status]}</StatusChip>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <Detail label="范围" value={scopeLabel(selected)} />
                  <Detail label="位置锁定" value={selected.locationLocked ? "已锁定" : "未锁定"} />
                  <Detail label="资金闸门" value={selected.fundGateBlocked ? "关闭" : "已打开"} />
                  <Detail label="分类" value={selected.category || "-"} />
                </div>
                {selected.needManualLocation && (
                  <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    该工单位置不足，必须由物业或网格现场补充并锁定位置后，才能进入方案和资金链路。
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="工单进度">
              <Stepper steps={STEPS} current={STATUS_STEP[selected.status]} locked={selected.fundGateBlocked ? 4 : undefined} />
            </SectionCard>

            <ActionPanel
              selected={selected}
              acting={acting}
              canIntake={canIntake}
              canManage={canManage}
              canField={canField}
              canGovernance={canGovernance}
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

            <SectionCard title="方案与资金">
              <div className="space-y-2 text-sm">
                <Detail label="初勘结论" value={selected.surveySummary || "-"} />
                <Detail label="风险等级" value={selected.riskLevel ? RISK_LEVEL_LABEL[selected.riskLevel] ?? selected.riskLevel : "-"} />
                <Detail label="资金来源" value={selected.fundSource ? FUND_SOURCE_LABEL[selected.fundSource] ?? selected.fundSource : "-"} />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">物业内部参考估算</span>
                  {amount(selected) > 0 ? <Money value={amount(selected)} /> : <span>-</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">向供应商公开的最高限价</span>
                  {Number(selected.publicCeilingPrice ?? 0) > 0
                    ? <Money value={Number(selected.publicCeilingPrice)} />
                    : <span>-</span>}
                </div>
                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Banknote className="size-3 inline mr-1" />
                  {fundingProcessDescription(selected.fundSource)}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="审计流水" bodyClassName="p-0">
              {events.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">暂无流水</div>
              ) : (
                <div className="divide-y">
                  {events.map((event) => (
                    <div key={event.eventId} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{EVENT_ACTION_LABEL[event.action] ?? event.action}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(event.createTime)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {event.fromStatus ? STATUS_LABEL[event.fromStatus] : "创建"} {"->"} {event.toStatus ? STATUS_LABEL[event.toStatus] : "-"}
                        {event.remark ? ` · ${event.remark}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        ) : (
          <SectionCard>
            <div className="py-16 text-center text-sm text-muted-foreground">请选择工单</div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function ActionPanel(props: {
  selected: RepairWorkOrder;
  acting: boolean;
  canIntake: boolean;
  canManage: boolean;
  canField: boolean;
  canGovernance: boolean;
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
  const [supplierOrganizations, setSupplierOrganizations] = useState<RepairSupplierOrganization[]>([]);
  const [supplierQuotes, setSupplierQuotes] = useState<RepairSupplierQuote[]>([]);
  const [quoteInvitations, setQuoteInvitations] = useState<RepairQuoteInvitation[]>([]);
  const [frameworkRelations, setFrameworkRelations] = useState<RepairFrameworkRelation[]>([]);
  const [invitedSupplierDeptIds, setInvitedSupplierDeptIds] = useState<number[]>([]);
  const [appendInvitationOpen, setAppendInvitationOpen] = useState(false);
  const [appendInvitationReason, setAppendInvitationReason] = useState("");
  const [quoteSupplierDeptId, setQuoteSupplierDeptId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteSummary, setQuoteSummary] = useState("");
  const [quoteSource, setQuoteSource] = useState("PAPER");
  const [quoteOriginalConfirmed, setQuoteOriginalConfirmed] = useState(false);
  const [quoteAttachment, setQuoteAttachment] = useState<RepairAttachment | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteUploading, setQuoteUploading] = useState(false);
  const [quoteId, setQuoteId] = useState("");
  const [selectionMethod, setSelectionMethod] = useState("COMPETITIVE_QUOTATION");
  const [insufficientQuoteReason, setInsufficientQuoteReason] = useState("");
  const [frameworkRelationId, setFrameworkRelationId] = useState("");
  const [recommendationReason, setRecommendationReason] = useState("");
  const [localScopeType, setLocalScopeType] = useState("BUILDING");
  const [localUnitName, setLocalUnitName] = useState("");
  const [localScopeLabel, setLocalScopeLabel] = useState("");
  const [decisionRooms, setDecisionRooms] = useState<RepairDecisionRoom[]>([]);
  const [decisionChoices, setDecisionChoices] = useState<Record<number, string>>({});
  const [localEvidenceHash, setLocalEvidenceHash] = useState("");
  const [assemblyPackageId, setAssemblyPackageId] = useState("");
  const [officialDocumentHash, setOfficialDocumentHash] = useState("");
  const [mergedPackageHash, setMergedPackageHash] = useState("");
  const [priceReviewMode, setPriceReviewMode] = useState("INTERNAL_PRICE_REVIEW");
  const [reviewedAmount, setReviewedAmount] = useState("");
  const [reviewReportHash, setReviewReportHash] = useState("");
  const [sealedFileHash, setSealedFileHash] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    const loadOrganizations = props.canManage || props.canField
      ? listRepairSupplierOrganizations()
      : Promise.resolve([]);
    const loadQuotes = props.canManage
      ? listRepairSupplierQuotes(props.selected.workOrderId)
      : Promise.resolve([]);
    const loadInvitations = props.canManage
      ? listRepairQuoteInvitations(props.selected.workOrderId)
      : Promise.resolve([]);
    const loadRelations = props.canManage
      ? listRepairFrameworkRelations(props.selected.category)
      : Promise.resolve([]);
    void Promise.all([loadOrganizations, loadQuotes, loadRelations, loadInvitations])
      .then(([organizations, quotes, relations, invitations]) => {
        if (cancelled) return;
        setSupplierOrganizations(organizations);
        setSupplierQuotes(quotes);
        setFrameworkRelations(relations);
        setQuoteInvitations(invitations);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "供应商资料加载失败"));
    return () => {
      cancelled = true;
    };
  }, [props.canField, props.canManage, props.selected.category, props.selected.status, props.selected.workOrderId]);

  useEffect(() => {
    if (props.selected.status !== "LOCAL_DECISION_PENDING") {
      setDecisionRooms([]);
      setDecisionChoices({});
      return;
    }
    void listRepairDecisionRooms(props.selected.workOrderId)
      .then((rooms) => {
        setDecisionRooms(rooms);
        setDecisionChoices(Object.fromEntries(rooms.map((room) => [room.roomId, "NOT_VOTED"])));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "接龙房屋清单加载失败"));
  }, [props.selected.status, props.selected.workOrderId]);

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

  const selectedSupplierQuote = supplierQuotes.find((quote) => String(quote.quoteId) === quoteId);
  const applicableFrameworkRelations = frameworkRelations.filter(
    (relation) => !selectedSupplierQuote || relation.supplierDeptId === selectedSupplierQuote.supplierDeptId,
  );
  const invitedSupplierIds = new Set(quoteInvitations.map((invitation) => invitation.supplierDeptId));
  const appendableSuppliers = supplierOrganizations.filter(
    (supplier) => !invitedSupplierIds.has(supplier.supplierDeptId),
  );

  return (
    <SectionCard title="当前动作">
      <div className="space-y-3">
        {s === "SUBMITTED" && props.canIntake && (
          <Button onClick={() => props.doAction("accept", { remark: "受理报修" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 受理
          </Button>
        )}

        {canCorrectLocation && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>锁定楼栋</Label>
                <Select
                  value={props.locationBuildingId}
                  onValueChange={(value) => {
                    props.setLocationBuildingId(value);
                    props.setLocationRoomId("");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="选择楼栋" /></SelectTrigger>
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
                <Label>房号</Label>
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
              <div>
                <Label>现场位置</Label>
                <Input value={props.locationText} onChange={(e) => props.setLocationText(e.target.value)} placeholder="如：2号楼大堂门禁" />
              </div>
              <div>
                <Label>现场证据</Label>
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
            </div>
            <div>
              <Label>物业现场补充信息</Label>
              <Textarea
                value={props.fieldSupplement}
                onChange={(e) => props.setFieldSupplement(e.target.value)}
                rows={3}
                placeholder="现场情况、纠偏原因、处理建议"
              />
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
              onClick={() => props.doAction("correct-location", {
                buildingId: props.locationBuildingId ? Number(props.locationBuildingId) : undefined,
                roomId: selectedRoom ? Number(selectedRoom.roomId) : undefined,
                locationText: props.locationText,
                reason: "现场补充并纠偏位置",
                fieldSupplement: props.fieldSupplement,
                evidenceImagesBase64: props.evidenceFiles.map((file) => file.base64),
              })}
              disabled={props.acting || !props.locationBuildingId}
            >
              <Route className="size-4 mr-1" /> 补充并纠偏位置
            </Button>
          </div>
        )}

        {s === "PENDING_VERIFY" && props.canField && (
          <Button onClick={() => props.doAction("verify-location", { remark: "现场核验通过" })} disabled={props.acting}>
            <ShieldCheck className="size-4 mr-1" /> 核验通过
          </Button>
        )}

        {s === "VERIFIED" && props.canManage && (
          <Button onClick={() => props.doAction("assign", { remark: "派给当前处理人" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 派单
          </Button>
        )}

        {s === "ASSIGNED" && props.canField && (
          <Button onClick={() => props.doAction("start-survey", { remark: "开始现场初勘" })} disabled={props.acting}>
            <Wrench className="size-4 mr-1" /> 开始初勘
          </Button>
        )}

        {s === "SURVEYING" && props.canField && (
          <div className="space-y-3">
            <div>
              <Label>初勘结论与维修建议</Label>
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
              <div>
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
              onClick={() => props.doAction("submit-survey", {
                surveySummary: props.surveySummary,
                riskLevel: props.riskLevel,
                evidenceImagesBase64: props.evidenceFiles.map((file) => file.base64),
                remark: "提交现场初勘记录",
              })}
              disabled={props.acting || !props.surveySummary.trim() || props.evidenceFiles.length === 0}
            >
              <ClipboardList className="size-4 mr-1" /> 提交初勘
            </Button>
          </div>
        )}

        {s === "SURVEY_COMPLETED" && props.canField && (
          <div className="space-y-3">
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
            <Button
              onClick={() => props.doAction("submit-plan", {
                planBudget: props.planBudget ? Number(props.planBudget) : undefined,
                publicCeilingPrice: props.fundSource !== "PROPERTY_INTERNAL" && props.publicCeilingEnabled
                  ? Number(props.publicCeilingPrice)
                  : undefined,
                fundSource: props.fundSource,
                remark: props.fundSource === "PROPERTY_INTERNAL" ? "确认物业包干维修范围" : "确认维修范围与询价口径",
              })}
              disabled={props.acting
                || (props.planningPolicy.internalEstimateRequired && !props.planBudget)
                || (props.publicCeilingEnabled && !props.publicCeilingPrice)}
            >
              <ClipboardList className="size-4 mr-1" />
              {props.fundSource === "PROPERTY_INTERNAL" ? "确认维修范围" : "确认维修范围与询价口径"}
            </Button>
          </div>
        )}

        {["PLAN_SUBMITTED", "QUOTE_COLLECTING"].includes(s) && props.canManage && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Button
              type="button"
              variant="outline"
              onClick={() => void createSupplierOrganization()}
              disabled={!supplierLegalName.trim()}
            >
              <Building2 className="mr-1 size-4" />登记供应商
            </Button>
            {s === "PLAN_SUBMITTED" && (
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
          <Button type="button" variant="outline" onClick={() => setQuoteDialogOpen(true)}>
            <ClipboardList className="mr-1 size-4" />代录供应商报价
          </Button>
        )}

        {s === "QUOTE_SUBMITTED" && props.canManage && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>选定报价</Label>
                <Select value={quoteId} onValueChange={(value) => {
                  setQuoteId(value);
                  setFrameworkRelationId("");
                }}>
                  <SelectTrigger><SelectValue placeholder="选择供应商报价" /></SelectTrigger>
                  <SelectContent>
                    {supplierQuotes.map((quote) => (
                      <SelectItem key={quote.quoteId} value={String(quote.quoteId)}>
                        {quote.supplierName} · ¥{Number(quote.quoteAmount).toLocaleString("zh-CN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>供应商选择方式</Label>
                <Select value={selectionMethod} onValueChange={setSelectionMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPETITIVE_QUOTATION">竞争性比价</SelectItem>
                    <SelectItem value="FRAMEWORK_SUPPLIER">长期合作供应商</SelectItem>
                    <SelectItem value="DIRECT_AWARD">直接选定</SelectItem>
                    <SelectItem value="EMERGENCY_APPOINTMENT">应急指定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea value={recommendationReason} onChange={(e) => setRecommendationReason(e.target.value)} rows={3} placeholder="物业选定供应商的理由" />
            {selectionMethod === "COMPETITIVE_QUOTATION" && (
              <Input value={insufficientQuoteReason} onChange={(e) => setInsufficientQuoteReason(e.target.value)} placeholder="响应不足三家时填写继续推荐理由" />
            )}
            {selectionMethod === "FRAMEWORK_SUPPLIER" && (
              <div>
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
                {selectedSupplierQuote && applicableFrameworkRelations.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">该供应商没有适用于当前维修类别的有效长期合作关系。</p>
                )}
              </div>
            )}
            <Button
              onClick={() => props.doAction("recommend-supplier", {
                quoteId: Number(quoteId || 0),
                selectionMethod,
                recommendationReason,
                insufficientQuoteReason,
                frameworkRelationId: frameworkRelationId ? Number(frameworkRelationId) : undefined,
                remark: "物业选定推荐供应商",
              })}
              disabled={props.acting || !quoteId || !recommendationReason || (selectionMethod === "FRAMEWORK_SUPPLIER" && !frameworkRelationId)}
            >
              <CheckCircle2 className="size-4 mr-1" /> 选定供应商
            </Button>
          </div>
        )}

        {s === "SUPPLIER_RECOMMENDED" && (
          <div className="space-y-3">
            {props.canField && props.selected.fundSource === "BUILDING_MAINTENANCE_FUND" && (
              <div className="space-y-2 border-l pl-3">
                <Label>楼栋接龙范围</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select value={localScopeType} onValueChange={setLocalScopeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUILDING">整栋</SelectItem>
                      <SelectItem value="BUILDING_UNIT">单元</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={localUnitName}
                    onChange={(e) => setLocalUnitName(e.target.value)}
                    placeholder="单元名称"
                    disabled={localScopeType !== "BUILDING_UNIT"}
                  />
                </div>
                <Input value={localScopeLabel} onChange={(e) => setLocalScopeLabel(e.target.value)} placeholder="如：46号楼 1 单元公共区域维修" />
                <Button
                  onClick={() => props.doAction("start-local-decision", {
                    scopeType: localScopeType,
                    unitName: localScopeType === "BUILDING_UNIT" ? localUnitName : undefined,
                    scopeLabel: localScopeLabel,
                    remark: "楼组长发起微信接龙，作为楼栋维修正式表决",
                  })}
                  disabled={props.acting || (localScopeType === "BUILDING_UNIT" && !localUnitName)}
                >
                  <ClipboardList className="size-4 mr-1" /> 发起楼栋接龙
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
            <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
              {decisionRooms.map((room) => (
                <div key={room.roomId} className="grid grid-cols-1 items-center gap-3 px-3 py-2 sm:grid-cols-[1fr_180px]">
                  <div>
                    <div className="text-sm font-medium">房屋 {room.roomId}</div>
                    <div className="text-xs text-muted-foreground">专有面积 {room.buildArea} ㎡</div>
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
            <Input value={localEvidenceHash} onChange={(e) => setLocalEvidenceHash(e.target.value)} placeholder="微信接龙截图文件标识" />
            <Button
              onClick={() => props.doAction("complete-local-decision", {
                entries: decisionRooms.map((room) => ({
                  roomId: room.roomId,
                  choice: decisionChoices[room.roomId] ?? "NOT_VOTED",
                })),
                evidenceAttachmentHash: localEvidenceHash,
                remark: "物业完成微信接龙明细核验",
              })}
              disabled={props.acting || decisionRooms.length === 0 || !localEvidenceHash || Object.values(decisionChoices).includes("CONFLICTED")}
            >
              <CheckCircle2 className="size-4 mr-1" /> 完成楼栋接龙
            </Button>
          </div>
        )}

        {s === "ASSEMBLY_DECISION_PENDING" && props.canManage && (
          <Button onClick={() => props.doAction("complete-assembly-decision", { remark: "业主大会表决包已结算并通过" })} disabled={props.acting}>
            <CheckCircle2 className="size-4 mr-1" /> 确认业主大会结果
          </Button>
        )}

        {["LOCAL_DECISION_PASSED", "APPROVAL_DOCUMENT_PREPARING"].includes(s) && props.canManage && (
          <div className="space-y-3">
            <div>
              <Label>物业正式报审文件</Label>
              <Input value={officialDocumentHash} onChange={(e) => setOfficialDocumentHash(e.target.value)} placeholder="已上传正式文件的文件标识" />
            </div>
            <div>
              <Label>系统合并报审包</Label>
              <Input value={mergedPackageHash} onChange={(e) => setMergedPackageHash(e.target.value)} placeholder="不可变合并文件标识" />
            </div>
            <Button
              onClick={() => props.doAction("approval-package", {
                officialDocumentHash,
                mergedPackageHash,
                printedAndAttached: s === "LOCAL_DECISION_PASSED",
                attachments: s === "LOCAL_DECISION_PASSED"
                  ? [{ attachmentType: "SOLITAIRE_SCREENSHOT", attachmentHash: localEvidenceHash || officialDocumentHash, originalFileName: "微信接龙截图", sortOrder: 1 }]
                  : [{ attachmentType: "ASSEMBLY_RESULT", attachmentHash: officialDocumentHash, originalFileName: "业主大会表决结果", sortOrder: 1 }],
                remark: "物业上传正式报审文件并锁定版本",
              })}
              disabled={props.acting || !officialDocumentHash || !mergedPackageHash || (s === "LOCAL_DECISION_PASSED" && !localEvidenceHash)}
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

        {s === "GOVERNANCE_PENDING" && props.canGovernance && (
          <Button onClick={() => props.doAction("governance-confirm", { remark: "业委会主任或副主任确认" })} disabled={props.acting}>
            <CheckCircle2 className="size-4 mr-1" /> 主任/副主任确认
          </Button>
        )}

        {s === "GOVERNANCE_CONFIRMED" && props.canGovernance && (
          <div className="space-y-3">
            <Input value={sealedFileHash} onChange={(e) => setSealedFileHash(e.target.value)} placeholder="盖章报批文件哈希" />
            <Button
              onClick={() => props.doAction("seal", {
                sealType: "COMMITTEE_SEAL",
                sealedFileHash,
                remark: "业委会盖章完成",
              })}
              disabled={props.acting || !sealedFileHash}
            >
              <ShieldCheck className="size-4 mr-1" /> 加盖业委会章
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
