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
  Loader2,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../../lib/store";
import {
  listRepairEvents,
  pageRepairWorkOrders,
  repairAction,
  type RepairEvent,
  type RepairStatus,
  type RepairWorkOrder,
} from "../../lib/repair";

const STATUS_LABEL: Record<RepairStatus, string> = {
  SUBMITTED: "已提交",
  PENDING_VERIFY: "待现场核验",
  NEED_MANUAL_LOCATION: "待补充位置",
  VERIFIED: "已核验",
  ASSIGNED: "已派单",
  SURVEYING: "初勘中",
  PLAN_SUBMITTED: "方案已提交",
  GOVERNANCE_PENDING: "治理审批中",
  APPROVED: "已批准",
  IN_PROGRESS: "施工中",
  PENDING_ACCEPTANCE: "待验收",
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
};

const STATUS_TONE: Record<RepairStatus, Tone> = {
  SUBMITTED: "neutral",
  PENDING_VERIFY: "info",
  NEED_MANUAL_LOCATION: "warning",
  VERIFIED: "tech",
  ASSIGNED: "primary",
  SURVEYING: "info",
  PLAN_SUBMITTED: "warning",
  GOVERNANCE_PENDING: "warning",
  APPROVED: "success",
  IN_PROGRESS: "primary",
  PENDING_ACCEPTANCE: "tech",
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
};

const STEPS = [
  { key: "accept", label: "受理" },
  { key: "verify", label: "核验" },
  { key: "assign", label: "派单" },
  { key: "survey", label: "初勘" },
  { key: "plan", label: "方案" },
  { key: "approve", label: "审批" },
  { key: "work", label: "施工" },
  { key: "acceptance", label: "验收" },
  { key: "archive", label: "归档" },
];

const STATUS_STEP: Record<RepairStatus, number> = {
  SUBMITTED: 0,
  NEED_MANUAL_LOCATION: 1,
  PENDING_VERIFY: 1,
  VERIFIED: 2,
  ASSIGNED: 3,
  SURVEYING: 4,
  PLAN_SUBMITTED: 5,
  GOVERNANCE_PENDING: 5,
  APPROVED: 6,
  IN_PROGRESS: 7,
  PENDING_ACCEPTANCE: 8,
  RECTIFICATION_REQUIRED: 7,
  COMPLETED: 8,
  EVALUATED: 8,
  ARCHIVED: 8,
  REJECTED: 0,
  CANCELLED: 0,
  SUSPENDED: 0,
  ESCALATED: 0,
  REASSIGN_REQUIRED: 2,
  PLAN_REVISION_REQUIRED: 5,
  CHANGE_REVIEW_PENDING: 5,
  PAYMENT_EXCEPTION: 8,
  HANDOVER_LOCK: 8,
};

const BUILDINGS = [30001, 30002, 30003, 30005];

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

export function WorkOrders() {
  const { hasPermission, setPage } = useStore();
  const [orders, setOrders] = useState<RepairWorkOrder[]>([]);
  const [selected, setSelected] = useState<RepairWorkOrder | null>(null);
  const [events, setEvents] = useState<RepairEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [locationBuildingId, setLocationBuildingId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [surveySummary, setSurveySummary] = useState("");
  const [riskLevel, setRiskLevel] = useState("LOW");
  const [planBudget, setPlanBudget] = useState("600");
  const [fundSource, setFundSource] = useState("PROPERTY_INTERNAL");

  const canRead = hasPermission("repair:workorder:read");
  const canManage = hasPermission("repair:workorder:manage");
  const canField = hasPermission("repair:workorder:field");
  const canGovernance = hasPermission("repair:workorder:governance");

  async function reload(keepSelectedId?: number) {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await pageRepairWorkOrders({
        status: statusFilter,
        keyword,
        page: 1,
        size: 50,
      });
      setOrders(page.items);
      const next = page.items.find((item) => item.workOrderId === (keepSelectedId ?? selected?.workOrderId)) ?? page.items[0] ?? null;
      setSelected(next);
      if (next) {
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
    setLocationBuildingId(order.buildingId ? String(order.buildingId) : "");
    setLocationText(order.locationText ?? "");
    setSurveySummary(order.surveySummary ?? "");
    setPlanBudget(String(order.planBudget ?? 600));
    setFundSource(order.fundSource ?? "PROPERTY_INTERNAL");
    try {
      setEvents(await listRepairEvents(order.workOrderId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "审计流水加载失败");
    }
  }

  async function doAction(action: string, body: unknown = {}, success = "操作已完成") {
    if (!selected) return;
    setActing(true);
    try {
      const next = await repairAction(selected.workOrderId, action, body);
      toast.success(success);
      await reload(next.workOrderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
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
            {(canManage || canField) && (
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
                <SelectItem value="PLAN_SUBMITTED">方案已提交</SelectItem>
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
                <div className="grid grid-cols-2 gap-3 text-sm">
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
              canManage={canManage}
              canField={canField}
              canGovernance={canGovernance}
              locationBuildingId={locationBuildingId}
              setLocationBuildingId={setLocationBuildingId}
              locationText={locationText}
              setLocationText={setLocationText}
              surveySummary={surveySummary}
              setSurveySummary={setSurveySummary}
              riskLevel={riskLevel}
              setRiskLevel={setRiskLevel}
              planBudget={planBudget}
              setPlanBudget={setPlanBudget}
              fundSource={fundSource}
              setFundSource={setFundSource}
              doAction={doAction}
            />

            <SectionCard title="方案与资金">
              <div className="space-y-2 text-sm">
                <Detail label="初勘结论" value={selected.surveySummary || "-"} />
                <Detail label="风险等级" value={selected.riskLevel || "-"} />
                <Detail label="资金来源" value={selected.fundSource || "-"} />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预算金额</span>
                  {amount(selected) > 0 ? <Money value={amount(selected)} /> : <span>-</span>}
                </div>
                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <Banknote className="size-3 inline mr-1" />
                  工单到达 VERIFIED 且位置锁定后，后端才打开资金闸门；大额方案会在路径判定时进入治理审批或换届熔断。
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
                        <span className="font-medium">{event.action}</span>
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
  canManage: boolean;
  canField: boolean;
  canGovernance: boolean;
  locationBuildingId: string;
  setLocationBuildingId: (v: string) => void;
  locationText: string;
  setLocationText: (v: string) => void;
  surveySummary: string;
  setSurveySummary: (v: string) => void;
  riskLevel: string;
  setRiskLevel: (v: string) => void;
  planBudget: string;
  setPlanBudget: (v: string) => void;
  fundSource: string;
  setFundSource: (v: string) => void;
  doAction: (action: string, body?: unknown, success?: string) => Promise<void>;
}) {
  const s = props.selected.status;

  return (
    <SectionCard title="当前动作">
      <div className="space-y-3">
        {s === "SUBMITTED" && (props.canManage || props.canField) && (
          <Button onClick={() => props.doAction("accept", { remark: "受理报修" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 受理
          </Button>
        )}

        {s === "NEED_MANUAL_LOCATION" && props.canField && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>锁定楼栋</Label>
                <Select value={props.locationBuildingId || "30002"} onValueChange={props.setLocationBuildingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUILDINGS.map((id) => <SelectItem key={id} value={String(id)}>楼栋 {id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>现场位置</Label>
                <Input value={props.locationText} onChange={(e) => props.setLocationText(e.target.value)} placeholder="如：2号楼大堂门禁" />
              </div>
            </div>
            <Button
              onClick={() => props.doAction("correct-location", {
                buildingId: Number(props.locationBuildingId || 30002),
                locationText: props.locationText,
                reason: "现场补充位置",
              })}
              disabled={props.acting}
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

        {["SURVEYING", "ASSIGNED", "VERIFIED", "PLAN_SUBMITTED"].includes(s) && props.canField && (
          <div className="space-y-3">
            <Textarea value={props.surveySummary} onChange={(e) => props.setSurveySummary(e.target.value)} rows={3} placeholder="初勘结论、维修建议、现场证据摘要" />
            <div className="grid grid-cols-3 gap-3">
              <Select value={props.riskLevel} onValueChange={props.setRiskLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">低风险</SelectItem>
                  <SelectItem value="MEDIUM">中风险</SelectItem>
                  <SelectItem value="HIGH">高风险</SelectItem>
                </SelectContent>
              </Select>
              <Input value={props.planBudget} onChange={(e) => props.setPlanBudget(e.target.value)} placeholder="预算金额" />
              <Select value={props.fundSource} onValueChange={props.setFundSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPERTY_INTERNAL">物业包干成本</SelectItem>
                  <SelectItem value="PUBLIC_REVENUE">公共收益</SelectItem>
                  <SelectItem value="BUILDING_MAINTENANCE_FUND">楼栋专项维修资金</SelectItem>
                  <SelectItem value="COMMUNITY_MAINTENANCE_FUND">公共维修资金</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => props.doAction("submit-plan", {
                surveySummary: props.surveySummary,
                riskLevel: props.riskLevel,
                planBudget: Number(props.planBudget || 0),
                fundSource: props.fundSource,
                remark: "提交方案预算",
              })}
              disabled={props.acting}
            >
              <ClipboardList className="size-4 mr-1" /> 提交方案预算
            </Button>
          </div>
        )}

        {s === "PLAN_SUBMITTED" && props.canManage && (
          <Button onClick={() => props.doAction("route-plan", { remark: "执行治理路径判定" })} disabled={props.acting}>
            <Route className="size-4 mr-1" /> 治理路径判定
          </Button>
        )}

        {s === "GOVERNANCE_PENDING" && props.canGovernance && (
          <Button onClick={() => props.doAction("governance-approve", { remark: "治理审批通过" })} disabled={props.acting}>
            <CheckCircle2 className="size-4 mr-1" /> 审批通过
          </Button>
        )}

        {s === "APPROVED" && props.canField && (
          <Button onClick={() => props.doAction("start-work", { remark: "开始施工" })} disabled={props.acting}>
            <Wrench className="size-4 mr-1" /> 开工
          </Button>
        )}

        {["IN_PROGRESS", "RECTIFICATION_REQUIRED"].includes(s) && props.canField && (
          <Button onClick={() => props.doAction("submit-acceptance", { remark: "提交验收" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 提交验收
          </Button>
        )}

        {s === "PENDING_ACCEPTANCE" && props.canGovernance && (
          <div className="flex gap-2">
            <Button onClick={() => props.doAction("accept-completed", { remark: "验收通过" })} disabled={props.acting}>
              <CheckCircle2 className="size-4 mr-1" /> 验收通过
            </Button>
            <Button variant="outline" onClick={() => props.doAction("request-rectification", { remark: "要求整改" })} disabled={props.acting}>
              要求整改
            </Button>
          </div>
        )}

        {["COMPLETED", "EVALUATED"].includes(s) && props.canGovernance && (
          <Button onClick={() => props.doAction("archive", { remark: "归档" })} disabled={props.acting}>
            <ClipboardList className="size-4 mr-1" /> 归档
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
