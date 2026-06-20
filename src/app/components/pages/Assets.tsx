import { useState } from "react";
import {
  PageHeader,
  SectionCard,
  StatusChip,
  ScopeChip,
  KpiCard,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Layers,
  Building2,
  ShieldCheck,
  Wrench,
  ChevronRight,
} from "lucide-react";

type AssetScope = "local" | "global";
type AssetStatus = "正常" | "维修中" | "待检";

interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  scope: AssetScope;
  building?: string;
  status: AssetStatus;
  lastRepair: string;
  repairHistory: { date: string; desc: string; cost: number; vendor: string }[];
}

const STATUS_TONE: Record<AssetStatus, Tone> = {
  正常: "success",
  维修中: "warning",
  待检: "danger",
};

const ASSETS: Asset[] = [
  {
    id: "A-001", name: "1号楼客梯（南）", category: "电梯",
    location: "1号楼南侧", scope: "local", building: "1号楼",
    status: "正常", lastRepair: "2026-04-15",
    repairHistory: [
      { date: "2026-04-15", desc: "年度例检保养", cost: 3200, vendor: "奥的斯电梯" },
      { date: "2025-11-03", desc: "钢丝绳张力调校", cost: 1800, vendor: "奥的斯电梯" },
    ],
  },
  {
    id: "A-002", name: "1号楼消防主机", category: "消防",
    location: "1号楼地下消防控制室", scope: "local", building: "1号楼",
    status: "正常", lastRepair: "2026-03-20",
    repairHistory: [
      { date: "2026-03-20", desc: "半年度消防联动测试", cost: 800, vendor: "中消协检测" },
    ],
  },
  {
    id: "A-003", name: "2号楼客梯", category: "电梯",
    location: "2号楼中厅", scope: "local", building: "2号楼",
    status: "维修中", lastRepair: "2026-06-10",
    repairHistory: [
      { date: "2026-06-10", desc: "门机故障更换", cost: 12600, vendor: "迅达电梯" },
      { date: "2026-01-05", desc: "曳引机润滑", cost: 1200, vendor: "迅达电梯" },
    ],
  },
  {
    id: "A-004", name: "3号楼屋面防水层", category: "路面/屋面",
    location: "3号楼屋顶", scope: "local", building: "3号楼",
    status: "待检", lastRepair: "2024-09-18",
    repairHistory: [
      { date: "2024-09-18", desc: "局部渗漏修补", cost: 28000, vendor: "建筑防水公司" },
    ],
  },
  {
    id: "A-005", name: "4号楼消防水泵", category: "消防",
    location: "4号楼地下泵房", scope: "local", building: "4号楼",
    status: "正常", lastRepair: "2026-05-22",
    repairHistory: [
      { date: "2026-05-22", desc: "水泵联动试验", cost: 600, vendor: "消防工程队" },
    ],
  },
  {
    id: "A-006", name: "5号楼监控系统", category: "监控",
    location: "5号楼各楼层", scope: "local", building: "5号楼",
    status: "正常", lastRepair: "2026-02-11",
    repairHistory: [
      { date: "2026-02-11", desc: "摄像头镜头清洁+校位", cost: 1600, vendor: "安防工程队" },
    ],
  },
  {
    id: "A-007", name: "中央监控系统", category: "监控",
    location: "物业管理中心", scope: "global",
    status: "正常", lastRepair: "2026-05-30",
    repairHistory: [
      { date: "2026-05-30", desc: "硬盘扩容 + 软件升级", cost: 156000, vendor: "海康威视" },
      { date: "2025-12-01", desc: "年度系统巡检", cost: 8000, vendor: "海康威视" },
    ],
  },
  {
    id: "A-008", name: "小区主干道（东西轴）", category: "路面",
    location: "小区主干道全段 680m", scope: "global",
    status: "待检", lastRepair: "2023-06-15",
    repairHistory: [
      { date: "2023-06-15", desc: "全段铺设沥青路面", cost: 680000, vendor: "市政路桥公司" },
    ],
  },
  {
    id: "A-009", name: "地面停车场地坪", category: "路面",
    location: "B 区地面停车场", scope: "global",
    status: "维修中", lastRepair: "2026-06-01",
    repairHistory: [
      { date: "2026-06-01", desc: "地坪裂缝修复施工中", cost: 45000, vendor: "地坪工程队" },
    ],
  },
  {
    id: "A-010", name: "中央绿化带景观系统", category: "绿化",
    location: "小区中心花园", scope: "global",
    status: "正常", lastRepair: "2026-05-05",
    repairHistory: [
      { date: "2026-05-05", desc: "春季绿化大修（剪枝/施肥）", cost: 32000, vendor: "绿化园艺公司" },
    ],
  },
  {
    id: "A-011", name: "小区消防主管网", category: "消防",
    location: "地下消防管网全线", scope: "global",
    status: "正常", lastRepair: "2026-04-20",
    repairHistory: [
      { date: "2026-04-20", desc: "地下管网全线测压", cost: 12000, vendor: "消防设施检测队" },
    ],
  },
  {
    id: "A-012", name: "6号楼客梯（北）", category: "电梯",
    location: "6号楼北侧电梯厅", scope: "local", building: "6号楼",
    status: "正常", lastRepair: "2026-03-08",
    repairHistory: [
      { date: "2026-03-08", desc: "季度例检", cost: 1500, vendor: "通力电梯" },
    ],
  },
  {
    id: "A-013", name: "公共区域路灯系统", category: "电气",
    location: "小区全域道路及绿化", scope: "global",
    status: "正常", lastRepair: "2026-05-15",
    repairHistory: [
      { date: "2026-05-15", desc: "LED 灯具批量更换", cost: 58000, vendor: "照明工程队" },
    ],
  },
  {
    id: "A-014", name: "7号楼屋面防水层", category: "路面/屋面",
    location: "7号楼屋顶平台", scope: "local", building: "7号楼",
    status: "待检", lastRepair: "2025-08-12",
    repairHistory: [
      { date: "2025-08-12", desc: "屋面防水涂料修补", cost: 18000, vendor: "建筑防水公司" },
    ],
  },
];

const CATEGORIES = ["全部类别", "电梯", "消防", "监控", "路面", "路面/屋面", "绿化", "电气"];
const LOCATIONS = ["全部位置", "1号楼", "2号楼", "3号楼", "4号楼", "5号楼", "6号楼", "7号楼", "公共区域"];
const STATUSES = ["全部状态", "正常", "维修中", "待检"];

export function Assets() {
  const [category, setCategory] = useState("全部类别");
  const [location, setLocation] = useState("全部位置");
  const [status, setStatus] = useState("全部状态");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const filtered = ASSETS.filter((a) => {
    if (category !== "全部类别" && a.category !== category) return false;
    if (status !== "全部状态" && a.status !== status) return false;
    if (location !== "全部位置") {
      if (location === "公共区域") return a.scope === "global";
      return a.building === location;
    }
    return true;
  });

  const totalCount = ASSETS.length;
  const localCount = ASSETS.filter((a) => a.scope === "local").length;
  const globalCount = ASSETS.filter((a) => a.scope === "global").length;
  const repairCount = ASSETS.filter((a) => a.status === "维修中").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="资产台账"
        desc="小区公共资产登记与维修记录 · 楼栋专属资产与公共全局资产分类管理，决定后续维修工单走局部专项维修资金还是公共维修资金。"
      />

      {/* KPI 行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="资产总数"
          value={totalCount}
          unit="项"
          tone="primary"
          icon={<Layers className="size-4" />}
        />
        <KpiCard
          label="楼栋专属"
          value={localCount}
          unit="项"
          tone="warning"
          icon={<Building2 className="size-4" />}
        />
        <KpiCard
          label="全局公共"
          value={globalCount}
          unit="项"
          tone="tech"
          icon={<ShieldCheck className="size-4" />}
        />
        <KpiCard
          label="维修中"
          value={repairCount}
          unit="项"
          tone="danger"
          icon={<Wrench className="size-4" />}
        />
      </div>

      {/* 筛选栏 */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="资产类别" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="所属楼栋/区域" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="ml-auto text-sm text-muted-foreground">
            共 <span className="font-mono-num font-semibold">{filtered.length}</span> 条
          </span>
        </div>
      </SectionCard>

      {/* 说明条：范围 Chip 含义 */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <span className="text-muted-foreground">范围说明：</span>
        <ScopeChip scope="local" building="楼栋" />
        <span className="text-muted-foreground">仅该楼栋业主分摊，走楼栋专项维修资金；</span>
        <ScopeChip scope="global" />
        <span className="text-muted-foreground">全体业主分摊，走公共维修资金或公共收益。</span>
      </div>

      {/* 资产表 */}
      <SectionCard title="资产列表" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>资产名称</TableHead>
              <TableHead>类别</TableHead>
              <TableHead>位置</TableHead>
              <TableHead>关联范围</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>最近维修</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedAsset(a)}>
                <TableCell style={{ fontWeight: 500 }}>{a.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.location}</TableCell>
                <TableCell>
                  <ScopeChip scope={a.scope} building={a.building} />
                </TableCell>
                <TableCell>
                  <StatusChip tone={STATUS_TONE[a.status]} dot>{a.status}</StatusChip>
                </TableCell>
                <TableCell className="font-mono-num text-sm text-right">{a.lastRepair}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAsset(a); }}>
                    详情 <ChevronRight className="size-3 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {/* 详情 Sheet */}
      <Sheet open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <SheetContent className="w-[480px] overflow-y-auto">
          {selectedAsset && (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle>{selectedAsset.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <StatusChip tone={STATUS_TONE[selectedAsset.status]} dot>{selectedAsset.status}</StatusChip>
                  <ScopeChip scope={selectedAsset.scope} building={selectedAsset.building} />
                </div>
              </SheetHeader>

              {/* 基础信息 */}
              <div className="rounded-lg border border-border p-4 mb-5 space-y-3 text-sm">
                <h4 className="font-semibold text-base mb-2">基础信息</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">资产编号</span>
                  <span className="font-mono-num">{selectedAsset.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">类别</span>
                  <span>{selectedAsset.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">位置</span>
                  <span>{selectedAsset.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联范围</span>
                  <ScopeChip scope={selectedAsset.scope} building={selectedAsset.building} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最近维修日期</span>
                  <span className="font-mono-num">{selectedAsset.lastRepair}</span>
                </div>
                <div
                  className="rounded-md p-3 text-xs leading-relaxed mt-2"
                  style={{
                    backgroundColor: selectedAsset.scope === "local" ? "#fcf3da" : "#e6f6fa",
                    color: selectedAsset.scope === "local" ? "#8a6406" : "#0e6e88",
                  }}
                >
                  {selectedAsset.scope === "local"
                    ? `本资产属楼栋专属，维修工单仅向 ${selectedAsset.building} 业主推送表决，资金仅动用该楼栋专项维修资金，不波及其他楼栋。`
                    : "本资产属全局公共资产，维修工单向全小区业主推送表决，资金动用公共维修资金或公共收益，全体业主按专有面积分摊。"}
                </div>
              </div>

              {/* 维修历史时间轴 */}
              <div>
                <h4 className="font-semibold text-base mb-4">维修历史</h4>
                <div className="relative space-y-0 pl-5">
                  {/* 竖线 */}
                  {selectedAsset.repairHistory.length > 1 && (
                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />
                  )}
                  {selectedAsset.repairHistory.map((h, i) => (
                    <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                      <div
                        className="absolute -left-5 mt-1 size-4 rounded-full border-2 border-white flex items-center justify-center"
                        style={{ backgroundColor: i === 0 ? "#1b4f9c" : "#9aa5b5" }}
                      />
                      <div className="flex-1 rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono-num text-xs text-muted-foreground">{h.date}</span>
                          <span className="font-mono-num text-xs font-semibold" style={{ color: "#1b4f9c" }}>
                            ¥{h.cost.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontWeight: 500 }}>{h.desc}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">施工方：{h.vendor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
