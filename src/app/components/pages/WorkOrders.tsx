import { useState } from "react";
import {
  PageHeader,
  SectionCard,
  StatusChip,
  ScopeChip,
  Money,
  KpiCard,
  Stepper,
  type Tone,
} from "../gov/common";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { useStore } from "../../lib/store";
import {
  Plus,
  AlertTriangle,
  Building2,
  Globe,
  ImageIcon,
  ArrowRight,
  Banknote,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type WOStatus = "待受理" | "勘察中" | "表决中" | "施工中" | "验收中" | "资金核销" | "已归档";
type WOScope = "local" | "global";

interface WorkOrder {
  id: string;
  title: string;
  scope: WOScope;
  building?: string;
  asset: string;
  fundSource: string;
  status: WOStatus;
  amount: number;
  reporter: string;
  reportDate: string;
  contractor: string;
  budget: number;
  fundAccount: string;
  currentStep: number;
  desc: string;
}

const STATUS_TONE: Record<WOStatus, Tone> = {
  待受理: "neutral",
  勘察中: "info",
  表决中: "warning",
  施工中: "primary",
  验收中: "tech",
  资金核销: "danger",
  已归档: "success",
};

const WO_STEPS = [
  { key: "accept", label: "报修受理" },
  { key: "survey", label: "勘察出方案" },
  { key: "vote", label: "表决" },
  { key: "work", label: "施工" },
  { key: "check", label: "验收" },
  { key: "fund", label: "资金核销" },
  { key: "archive", label: "归档" },
];

const STATUS_STEP: Record<WOStatus, number> = {
  待受理: 0,
  勘察中: 1,
  表决中: 2,
  施工中: 3,
  验收中: 4,
  资金核销: 5,
  已归档: 6,
};

const WORK_ORDERS: WorkOrder[] = [
  {
    id: "WO-2026-041",
    title: "1号楼屋面防水层翻新",
    scope: "local", building: "1号楼",
    asset: "1号楼屋面防水层",
    fundSource: "1号楼专项维修资金",
    fundAccount: "专维专户-01·建设银行尾号6621",
    status: "表决中",
    amount: 128000,
    reporter: "张建国（楼栋代表）",
    reportDate: "2026-05-20",
    contractor: "建筑防水科技公司",
    budget: 128000,
    currentStep: 2,
    desc: "1号楼顶层多户出现漏水，屋面防水层已超设计年限（12年），需整体翻新，工期约 20 天。",
  },
  {
    id: "WO-2026-038",
    title: "2号楼客梯门机故障更换",
    scope: "local", building: "2号楼",
    asset: "2号楼客梯",
    fundSource: "2号楼专项维修资金",
    fundAccount: "专维专户-02·工商银行尾号3814",
    status: "施工中",
    amount: 12600,
    reporter: "王秀英（业主）",
    reportDate: "2026-06-08",
    contractor: "迅达电梯服务公司",
    budget: 12600,
    currentStep: 3,
    desc: "2号楼唯一电梯门机模块损坏，门无法正常开关，已紧急封梯，需立即更换门机组件。",
  },
  {
    id: "WO-2026-035",
    title: "小区主干道路面翻修",
    scope: "global",
    asset: "小区主干道（东西轴）",
    fundSource: "公共维修资金",
    fundAccount: "公共维修资金专户·农业银行尾号2297",
    status: "表决中",
    amount: 680000,
    reporter: "李建华（业委会主任）",
    reportDate: "2026-05-15",
    contractor: "市政路桥集团",
    budget: 680000,
    currentStep: 2,
    desc: "小区东西主干道（680m）路面沉降、裂缝严重，经专业检测机构评定需整体翻修，预计工期 45 天。",
  },
  {
    id: "WO-2026-033",
    title: "中央监控系统硬盘扩容升级",
    scope: "global",
    asset: "中央监控系统",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·建设银行尾号8843",
    status: "已归档",
    amount: 156000,
    reporter: "陈静（物业经理）",
    reportDate: "2026-04-01",
    contractor: "海康威视技术公司",
    budget: 156000,
    currentStep: 6,
    desc: "中央监控存储容量不足（原 30 天循环降至 7 天），本次扩容至 90 天保留+AI智能分析模块。",
  },
  {
    id: "WO-2026-029",
    title: "3号楼屋面渗漏修复",
    scope: "local", building: "3号楼",
    asset: "3号楼屋面防水层",
    fundSource: "3号楼专项维修资金",
    fundAccount: "专维专户-03·中国银行尾号5509",
    status: "验收中",
    amount: 28000,
    reporter: "刘洋（3号楼业主）",
    reportDate: "2026-03-10",
    contractor: "建筑防水公司",
    budget: 28000,
    currentStep: 4,
    desc: "3号楼顶层 15 户不同程度渗漏，局部防水涂料已老化剥落，施工已完成，待业委会组织验收。",
  },
  {
    id: "WO-2026-028",
    title: "地面停车场地坪裂缝修复",
    scope: "global",
    asset: "地面停车场地坪",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·农业银行尾号2297",
    status: "施工中",
    amount: 45000,
    reporter: "陈静（物业经理）",
    reportDate: "2026-05-28",
    contractor: "地坪工程队",
    budget: 45000,
    currentStep: 3,
    desc: "B 区地面停车场约 2200㎡ 地坪出现多处纵横裂缝，部分区域下沉，需切割修复并重新灌缝。",
  },
  {
    id: "WO-2026-025",
    title: "公共区域 LED 路灯批量更换",
    scope: "global",
    asset: "公共区域路灯系统",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·建设银行尾号8843",
    status: "资金核销",
    amount: 58000,
    reporter: "李建华（业委会主任）",
    reportDate: "2026-04-20",
    contractor: "照明工程队",
    budget: 58000,
    currentStep: 5,
    desc: "小区路灯系统老化，光照严重不均，本次批量更换为 LED 节能灯具，全年节电约 40%。",
  },
  {
    id: "WO-2026-022",
    title: "4号楼消防水泵年度联动试验",
    scope: "local", building: "4号楼",
    asset: "4号楼消防水泵",
    fundSource: "4号楼专项维修资金",
    fundAccount: "专维专户-04·邮政储蓄尾号7726",
    status: "已归档",
    amount: 600,
    reporter: "陈静（物业经理）",
    reportDate: "2026-05-10",
    contractor: "消防工程队",
    budget: 600,
    currentStep: 6,
    desc: "依据《消防设施维护保养规程》，对4号楼消防水泵进行年度联动试验并出具报告。",
  },
  {
    id: "WO-2026-019",
    title: "6号楼电梯季度例检保养",
    scope: "local", building: "6号楼",
    asset: "6号楼客梯（北）",
    fundSource: "6号楼专项维修资金",
    fundAccount: "专维专户-06·招商银行尾号4418",
    status: "已归档",
    amount: 1500,
    reporter: "王秀英（业主代表）",
    reportDate: "2026-03-01",
    contractor: "通力电梯",
    budget: 1500,
    currentStep: 6,
    desc: "6号楼北侧电梯季度例检保养，检查制动器、润滑部件、安全回路等。",
  },
  {
    id: "WO-2026-012",
    title: "中央绿化带春季大修",
    scope: "global",
    asset: "中央绿化带景观系统",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·建设银行尾号8843",
    status: "已归档",
    amount: 32000,
    reporter: "陈静（物业经理）",
    reportDate: "2026-04-25",
    contractor: "绿化园艺公司",
    budget: 32000,
    currentStep: 6,
    desc: "小区中心花园绿化带春季大修：修剪乔灌木、补植地被、施有机肥，恢复景观效果。",
  },
];

export function WorkOrders() {
  const { lockdown, setPage } = useStore();
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(WORK_ORDERS[0]);
  const [newOpen, setNewOpen] = useState(false);

  // 新建工单表单状态
  const [newScope, setNewScope] = useState<"local" | "global">("local");
  const [newBuilding, setNewBuilding] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAsset, setNewAsset] = useState("");

  const totalCount = WORK_ORDERS.length;
  const localCount = WORK_ORDERS.filter((w) => w.scope === "local").length;
  const globalCount = WORK_ORDERS.filter((w) => w.scope === "global").length;
  const activeCount = WORK_ORDERS.filter((w) => !["已归档"].includes(w.status)).length;

  function handleCreate() {
    if (!newTitle || (newScope === "local" && !newBuilding)) {
      toast.error("请填写完整的工单信息");
      return;
    }
    toast.success(`工单「${newTitle}」已提交，系统将推送至${newScope === "local" ? newBuilding + " 业主" : "全小区业主"}。`);
    setNewOpen(false);
    setNewTitle("");
    setNewDesc("");
    setNewAsset("");
    setNewBuilding("");
    setNewScope("local");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="维修工单"
        desc="局部工单仅影响对应楼栋，资金走该楼栋专项维修资金，不波及其他楼栋；公共工单影响全小区，走公共维修资金或公共收益。"
        actions={
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1" />
                新建工单
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>新建维修工单</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* 范围选择 */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">工单范围 *</Label>
                  <RadioGroup
                    value={newScope}
                    onValueChange={(v) => setNewScope(v as "local" | "global")}
                    className="space-y-2"
                  >
                    <div
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
                      style={{ borderColor: newScope === "local" ? "#e0a310" : undefined, backgroundColor: newScope === "local" ? "#fcf3da" : undefined }}
                      onClick={() => setNewScope("local")}
                    >
                      <RadioGroupItem value="local" id="scope-local" className="mt-0.5" />
                      <div>
                        <Label htmlFor="scope-local" className="cursor-pointer flex items-center gap-2 font-semibold">
                          <Building2 className="size-4 text-amber-600" />
                          🏠 局部 · 楼栋专属
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          仅影响指定楼栋，表决分母 = 该楼栋户数+面积，资金仅动用该楼栋专项维修资金。<strong>不波及其他楼栋。</strong>
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
                      style={{ borderColor: newScope === "global" ? "#19a0c4" : undefined, backgroundColor: newScope === "global" ? "#e6f6fa" : undefined }}
                      onClick={() => setNewScope("global")}
                    >
                      <RadioGroupItem value="global" id="scope-global" className="mt-0.5" />
                      <div>
                        <Label htmlFor="scope-global" className="cursor-pointer flex items-center gap-2 font-semibold">
                          <Globe className="size-4 text-cyan-600" />
                          🌐 公共 · 全局
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          影响全小区公共区域，表决分母 = 全小区总户数+总面积，资金动用公共维修资金或公共收益。
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {newScope === "local" && (
                  <div>
                    <Label className="text-sm font-semibold mb-1 block">选择楼栋 *</Label>
                    <Select value={newBuilding} onValueChange={setNewBuilding}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择楼栋" />
                      </SelectTrigger>
                      <SelectContent>
                        {["1号楼","2号楼","3号楼","4号楼","5号楼","6号楼","7号楼"].map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold mb-1 block">工单标题 *</Label>
                  <Input
                    placeholder="如：1号楼屋面漏水维修"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-1 block">关联资产</Label>
                  <Input
                    placeholder="如：1号楼屋面防水层"
                    value={newAsset}
                    onChange={(e) => setNewAsset(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-1 block">问题描述</Label>
                  <Textarea
                    placeholder="详细描述故障现象、影响范围..."
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>

                {/* 范围影响说明 */}
                <div
                  className="rounded-lg p-3 text-xs leading-relaxed"
                  style={{
                    backgroundColor: newScope === "local" ? "#fcf3da" : "#e6f6fa",
                    color: newScope === "local" ? "#8a6406" : "#0e6e88",
                  }}
                >
                  {newScope === "local" ? (
                    <>
                      <strong>局部工单影响说明：</strong>系统将仅向{newBuilding || "指定楼栋"}业主推送表决通知，表决分母锁定为该楼栋户数与专有面积，后续维修费用仅从该楼栋专项维修资金专户划付，<strong>其他楼栋业主不参与、不分摊。</strong>
                    </>
                  ) : (
                    <>
                      <strong>公共工单影响说明：</strong>系统将向全小区 1240 户业主推送表决通知，表决分母 = 全小区总面积 156,800㎡，资金从公共维修资金专户或公共收益专户划付，全体业主按专有面积比例分摊。
                    </>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleCreate}>提交工单</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setNewOpen(false)}>取消</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPI 行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="工单总数" value={totalCount} unit="单" tone="primary" />
        <KpiCard label="楼栋专属" value={localCount} unit="单" tone="warning" />
        <KpiCard label="全局公共" value={globalCount} unit="单" tone="tech" />
        <KpiCard label="进行中" value={activeCount} unit="单" tone="danger" />
      </div>

      {/* 熔断提示 */}
      {lockdown && (
        <div className="flex items-center gap-2 rounded-lg border border-[#d14343]/30 bg-[#fbe9e9] px-4 py-3 text-sm" style={{ color: "#a32f2f" }}>
          <AlertTriangle className="size-4 shrink-0" />
          <span><strong>换届熔断已激活：</strong>资金核销节点已锁定，所有工单无法执行资金划付，待换届完成后由新任业委会解锁。</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 工单列表 */}
        <SectionCard title="工单列表" bodyClassName="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工单</TableHead>
                <TableHead>范围</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WORK_ORDERS.map((wo) => (
                <TableRow
                  key={wo.id}
                  className={`cursor-pointer ${selectedWO?.id === wo.id ? "bg-primary/5" : "hover:bg-muted/40"}`}
                  onClick={() => setSelectedWO(wo)}
                >
                  <TableCell>
                    <div style={{ fontWeight: 500 }} className="text-sm">{wo.title}</div>
                    <div className="text-xs text-muted-foreground font-mono-num">{wo.id}</div>
                  </TableCell>
                  <TableCell>
                    <ScopeChip scope={wo.scope} building={wo.building} />
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={STATUS_TONE[wo.status]} dot>{wo.status}</StatusChip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={wo.amount} className="text-sm" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        {/* 工单详情 */}
        {selectedWO ? (
          <div className="space-y-4">
            {/* 报修信息卡 */}
            <SectionCard title="报修信息" desc={`工单号 ${selectedWO.id}`}>
              {/* 现场照片占位 */}
              <div className="flex gap-2 mb-4">
                {[1,2,3].map((n) => (
                  <div
                    key={n}
                    className="flex-1 aspect-video rounded-lg border border-dashed border-border bg-muted flex flex-col items-center justify-center text-muted-foreground text-xs"
                  >
                    <ImageIcon className="size-5 mb-1" />
                    现场照片 {n}
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">报修人</span>
                  <span style={{ fontWeight: 500 }}>{selectedWO.reporter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">报修日期</span>
                  <span className="font-mono-num">{selectedWO.reportDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联资产</span>
                  <span>{selectedWO.asset}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">当前状态</span>
                  <StatusChip tone={STATUS_TONE[selectedWO.status]} dot>{selectedWO.status}</StatusChip>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t border-border pt-3">{selectedWO.desc}</p>
            </SectionCard>

            {/* 状态机步骤条 */}
            <SectionCard title="工单进度">
              <div className="overflow-x-auto pb-1">
                <Stepper
                  steps={WO_STEPS}
                  current={selectedWO.currentStep}
                  locked={lockdown ? 5 : undefined}
                />
              </div>
              {lockdown && selectedWO.currentStep < 6 && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-[#d14343]/30 bg-[#fbe9e9] px-3 py-2 text-xs" style={{ color: "#a32f2f" }}>
                  <span>⚠</span>
                  <span><strong>熔断锁定：</strong>资金核销节点（第6步）已被换届熔断机制锁定，待新任业委会解锁后方可执行。</span>
                </div>
              )}
              {selectedWO.status === "表决中" && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">当前节点：业主表决进行中</span>
                  <Button variant="outline" size="sm" onClick={() => setPage("voting")}>
                    前往表决看板 <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* ABAC 范围可视化 */}
            <SectionCard title="影响范围 · ABAC 权限边界">
              <div
                className="rounded-lg p-4 space-y-3"
                style={{
                  backgroundColor: selectedWO.scope === "local" ? "#fcf3da" : "#e6f6fa",
                  border: `1.5px solid ${selectedWO.scope === "local" ? "#e0a310" : "#19a0c4"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  {selectedWO.scope === "local"
                    ? <Building2 className="size-5 text-amber-600" />
                    : <Globe className="size-5 text-cyan-600" />}
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    本工单影响范围 = {selectedWO.scope === "local" ? `仅 ${selectedWO.building}` : "全小区"}
                  </span>
                  <ScopeChip scope={selectedWO.scope} building={selectedWO.building} />
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: selectedWO.scope === "local" ? "#8a6406" : "#0e6e88" }}
                >
                  {selectedWO.scope === "local" ? (
                    <>
                      <p>表决分母：仅 <strong>{selectedWO.building}</strong> 的业主户数与专有面积</p>
                      <p className="mt-1">资金来源：<strong>{selectedWO.fundSource}</strong></p>
                      <p className="mt-1 font-semibold">⚡ 其他楼栋业主无需参与表决，费用不侵染其他楼栋专项维修资金。</p>
                    </>
                  ) : (
                    <>
                      <p>表决分母：全小区 <strong>1,240 户</strong>，总专有面积 <strong>156,800 ㎡</strong></p>
                      <p className="mt-1">资金来源：<strong>{selectedWO.fundSource}</strong></p>
                      <p className="mt-1">全体业主按专有面积比例分摊，维修完成后录入公开账目。</p>
                    </>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* 工程方案卡 */}
            <SectionCard title="工程方案">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">预算造价</span>
                  <Money value={selectedWO.budget} className="text-base font-semibold" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">施工方</span>
                  <span style={{ fontWeight: 500 }}>{selectedWO.contractor}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">资金来源专户</span>
                  <div className="text-right">
                    <div style={{ fontWeight: 500 }}>{selectedWO.fundSource}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Banknote className="size-3" />
                      {selectedWO.fundAccount}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/40 text-xs">
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: "#1b4f9c", fontWeight: 600 }}>
                    <Users className="size-3" />
                    资金隔离说明
                  </div>
                  {selectedWO.scope === "local"
                    ? `本工单资金仅从「${selectedWO.fundAccount}」专户划付，与其他楼栋资金严格隔离，不得混用。`
                    : `本工单资金从「${selectedWO.fundAccount}」专户划付，用于全小区公共区域，经业委会审批、监理核验后拨付。`}
                </div>
              </div>
            </SectionCard>
          </div>
        ) : (
          <SectionCard>
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
              <span className="text-3xl mb-3">📋</span>
              请从左侧列表选择工单查看详情
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
