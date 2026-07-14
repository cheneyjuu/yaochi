import { useState } from "react";
import {
  PageHeader,
  SectionCard,
  StatusChip,
  ScopeChip,
  Money,
  KpiCard,
  FileCard,
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
  Layers,
  CheckCircle2,
  Upload,
  ClipboardCheck,
  AlertCircle,
  Banknote,
  CalendarDays,
  HardHat,
} from "lucide-react";
import { toast } from "sonner";

type Phase = "方案评审" | "施工中" | "验收中" | "已验收" | "已归档";
type EScope = "local" | "global";

interface Engineering {
  id: string;
  name: string;
  workOrderId: string;
  cost: number;
  duration: string;
  startDate: string;
  endDate: string;
  contractor: string;
  phase: Phase;
  scope: EScope;
  building?: string;
  fundSource: string;
  fundAccount: string;
  superviser: string;
  acceptResult?: string;
  acceptDate?: string;
  acceptBy?: string;
  desc: string;
}

const PHASE_TONE: Record<Phase, Tone> = {
  方案评审: "info",
  施工中: "warning",
  验收中: "tech",
  已验收: "success",
  已归档: "neutral",
};

const PROJECTS: Engineering[] = [
  {
    id: "ENG-2026-011",
    name: "小区主干道路面翻修工程",
    workOrderId: "WO-2026-035",
    cost: 680000,
    duration: "45 天",
    startDate: "2026-07-01",
    endDate: "2026-08-15",
    contractor: "市政路桥集团有限公司",
    phase: "方案评审",
    scope: "global",
    fundSource: "公共维修资金",
    fundAccount: "公共维修资金专户·农业银行尾号2297",
    superviser: "第三方监理·华建工程顾问",
    desc: "小区东西主干道（680m）路面整体翻修，含地下管网探查、旧路面铣刨、新层摊铺、交通组织，工期 45 天。",
  },
  {
    id: "ENG-2026-009",
    name: "1号楼屋面防水层翻新工程",
    workOrderId: "WO-2026-041",
    cost: 128000,
    duration: "20 天",
    startDate: "2026-06-25",
    endDate: "2026-07-15",
    contractor: "建筑防水科技公司",
    phase: "方案评审",
    scope: "local",
    building: "1号楼",
    fundSource: "1号楼专项维修资金",
    fundAccount: "专维专户-01·建设银行尾号6621",
    superviser: "业委会委员现场核验",
    desc: "1号楼屋面防水层整体翻新，采用 SBS 改性沥青防水卷材，保修期 10 年。施工期间做好临时防水，保障住户正常居住。",
  },
  {
    id: "ENG-2026-007",
    name: "2号楼客梯门机更换工程",
    workOrderId: "WO-2026-038",
    cost: 12600,
    duration: "3 天",
    startDate: "2026-06-10",
    endDate: "2026-06-13",
    contractor: "迅达电梯服务公司",
    phase: "施工中",
    scope: "local",
    building: "2号楼",
    fundSource: "2号楼专项维修资金",
    fundAccount: "专维专户-02·工商银行尾号3814",
    superviser: "物业工程部现场监管",
    desc: "更换 2 号楼电梯原厂门机模块（型号 SEMATIC SBM），含调试、安全回路测试，完工后经特检所验收。",
  },
  {
    id: "ENG-2026-006",
    name: "地面停车场地坪修复工程",
    workOrderId: "WO-2026-028",
    cost: 45000,
    duration: "15 天",
    startDate: "2026-06-01",
    endDate: "2026-06-16",
    contractor: "地坪工程队",
    phase: "施工中",
    scope: "global",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·农业银行尾号2297",
    superviser: "物业工程部现场监管",
    desc: "B 区停车场地坪裂缝切割扩缝、灌注修复材料、表面磨平处理，约 2,200㎡，完工后划车位线。",
  },
  {
    id: "ENG-2026-005",
    name: "3号楼屋面渗漏修复工程",
    workOrderId: "WO-2026-029",
    cost: 28000,
    duration: "10 天",
    startDate: "2026-05-20",
    endDate: "2026-05-30",
    contractor: "建筑防水公司",
    phase: "验收中",
    scope: "local",
    building: "3号楼",
    fundSource: "3号楼专项维修资金",
    fundAccount: "专维专户-03·中国银行尾号5509",
    superviser: "业委会委员现场核验",
    desc: "3号楼屋面局部渗漏区域防水涂料铲除重涂，涉及 6 处渗漏节点，施工已完成，待业委会核验。",
  },
  {
    id: "ENG-2026-003",
    name: "公共区域 LED 路灯更换工程",
    workOrderId: "WO-2026-025",
    cost: 58000,
    duration: "7 天",
    startDate: "2026-05-15",
    endDate: "2026-05-22",
    contractor: "照明工程队",
    phase: "已验收",
    scope: "global",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·建设银行尾号8843",
    superviser: "第三方监理·华建工程顾问",
    acceptResult: "合格 · 照度检测达标，节能改造完成",
    acceptDate: "2026-05-23",
    acceptBy: "李建华（业委会主任）",
    desc: "全区 186 盏路灯更换为 LED 节能灯具，含灯头改造、线路整理，经照度仪检测所有点位达标。",
  },
  {
    id: "ENG-2026-002",
    name: "中央监控系统扩容升级工程",
    workOrderId: "WO-2026-033",
    cost: 156000,
    duration: "5 天",
    startDate: "2026-05-28",
    endDate: "2026-06-02",
    contractor: "海康威视技术公司",
    phase: "已归档",
    scope: "global",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·建设银行尾号8843",
    superviser: "第三方监理·华建工程顾问",
    acceptResult: "优良 · 存储至 90 天，AI 分析功能测试通过",
    acceptDate: "2026-06-04",
    acceptBy: "陈静（物业经理）+ 李建华（业委会主任）",
    desc: "NVR 硬盘由 20TB 扩容至 80TB，部署 AI 行为分析模块（烟火识别、人员聚集预警），录像保留期 90 天。",
  },
  {
    id: "ENG-2026-001",
    name: "中央绿化带春季大修工程",
    workOrderId: "WO-2026-012",
    cost: 32000,
    duration: "8 天",
    startDate: "2026-05-05",
    endDate: "2026-05-13",
    contractor: "绿化园艺公司",
    phase: "已归档",
    scope: "global",
    fundSource: "公共收益",
    fundAccount: "公共收益专户·建设银行尾号8843",
    superviser: "业委会委员现场核验",
    acceptResult: "合格 · 绿化覆盖率恢复至设计标准",
    acceptDate: "2026-05-14",
    acceptBy: "王秀英（业委会委员）",
    desc: "小区中心花园乔灌木修剪、地被补植、施有机肥，景观覆盖率由 62% 恢复至 88%，达设计标准。",
  },
];

export function Engineering() {
  const [selectedEng, setSelectedEng] = useState<Engineering | null>(PROJECTS[0]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const totalCost = PROJECTS.reduce((s, p) => s + p.cost, 0);
  const activeCount = PROJECTS.filter((p) => ["方案评审", "施工中", "验收中"].includes(p.phase)).length;
  const acceptedCount = PROJECTS.filter((p) => p.phase === "已验收" || p.phase === "已归档").length;

  function openDetail(eng: Engineering) {
    setSelectedEng(eng);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="工程方案与验收"
        desc="维修工程方案管理、施工跟踪、验收记录与合同附件归档。关联维修工单，资金核销前须通过验收。"
      />

      {/* KPI 行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="工程总造价"
          value={(totalCost / 10000).toFixed(1)}
          unit="万元"
          tone="primary"
          icon={<Layers className="size-4" />}
        />
        <KpiCard
          label="进行中"
          value={activeCount}
          unit="个"
          tone="warning"
          icon={<HardHat className="size-4" />}
        />
        <KpiCard
          label="已验收/归档"
          value={acceptedCount}
          unit="个"
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
        />
        <KpiCard
          label="工程总数"
          value={PROJECTS.length}
          unit="个"
          tone="neutral"
          icon={<ClipboardCheck className="size-4" />}
        />
      </div>

      {/* 工程列表 */}
      <SectionCard title="工程列表" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>工程名称</TableHead>
              <TableHead>关联工单</TableHead>
              <TableHead>范围</TableHead>
              <TableHead className="text-right">造价</TableHead>
              <TableHead>工期</TableHead>
              <TableHead>施工方</TableHead>
              <TableHead>阶段</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PROJECTS.map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/40">
                <TableCell style={{ fontWeight: 500 }}>{p.name}</TableCell>
                <TableCell className="font-mono-num text-sm text-muted-foreground">{p.workOrderId}</TableCell>
                <TableCell>
                  <ScopeChip scope={p.scope} building={p.building} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={p.cost} className="text-sm" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.duration}</TableCell>
                <TableCell className="text-sm">{p.contractor}</TableCell>
                <TableCell>
                  <StatusChip tone={PHASE_TONE[p.phase]} dot>{p.phase}</StatusChip>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openDetail(p)}>
                    详情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {/* 详情 Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[520px] overflow-y-auto">
          {selectedEng && (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle>{selectedEng.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusChip tone={PHASE_TONE[selectedEng.phase]} dot>{selectedEng.phase}</StatusChip>
                  <ScopeChip scope={selectedEng.scope} building={selectedEng.building} />
                  <span className="font-mono-num text-xs text-muted-foreground">{selectedEng.id}</span>
                </div>
              </SheetHeader>

              {/* 方案信息 */}
              <div className="rounded-lg border border-border p-4 mb-4 space-y-3 text-sm">
                <h4 className="font-semibold text-base mb-1">方案信息</h4>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">预算造价</span>
                  <Money value={selectedEng.cost} className="text-base font-semibold" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">工期</span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    {selectedEng.duration}（{selectedEng.startDate} ~ {selectedEng.endDate}）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">施工方</span>
                  <span style={{ fontWeight: 500 }}>{selectedEng.contractor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">监理方</span>
                  <span>{selectedEng.superviser}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联工单</span>
                  <span className="font-mono-num">{selectedEng.workOrderId}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-start gap-1.5 mb-1.5" style={{ color: "#1b4f9c", fontWeight: 600 }}>
                    <Banknote className="size-4 mt-0.5" />
                    资金来源专户
                  </div>
                  <div style={{ fontWeight: 500 }}>{selectedEng.fundSource}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{selectedEng.fundAccount}</div>
                  <div
                    className="mt-2 rounded-md px-3 py-2 text-xs leading-relaxed"
                    style={{
                      backgroundColor: selectedEng.scope === "local" ? "#fcf3da" : "#e6f6fa",
                      color: selectedEng.scope === "local" ? "#8a6406" : "#0e6e88",
                    }}
                  >
                    {selectedEng.scope === "local"
                      ? `本工程资金仅从「${selectedEng.building}专项维修资金专户」划付，不波及其他楼栋，资金严格隔离。`
                      : "本工程资金从公共资金专户划付，用于全小区公共区域，受全体业主监督。"}
                  </div>
                </div>
                <div className="text-muted-foreground text-xs leading-relaxed border-t border-border pt-3">{selectedEng.desc}</div>
              </div>

              {/* 合同/预算附件 */}
              <div className="mb-4">
                <h4 className="font-semibold text-base mb-3">合同 & 预算附件</h4>
                <div className="space-y-2">
                  <FileCard
                    name={`${selectedEng.name}_施工合同.pdf`}
                    meta={`${selectedEng.contractor} · 签订于 ${selectedEng.startDate}`}
                  />
                  <FileCard
                    name={`${selectedEng.name}_工程预算书.xlsx`}
                    meta={`预算总额 ¥${selectedEng.cost.toLocaleString()} · 已经业委会审核`}
                  />
                  {selectedEng.phase !== "方案评审" && (
                    <FileCard
                      name={`${selectedEng.name}_施工方案技术说明.pdf`}
                      meta="施工工艺、材料规格、安全措施"
                    />
                  )}
                </div>
              </div>

              {/* 验收区 */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h4 className="font-semibold text-base">验收记录</h4>

                {selectedEng.acceptResult ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-600" />
                      <span style={{ fontWeight: 600, color: "#1f7a45" }}>验收通过</span>
                      <span className="text-xs text-muted-foreground font-mono-num">{selectedEng.acceptDate}</span>
                    </div>
                    <div
                      className="rounded-md bg-[#e8f6ee] p-3 text-sm"
                      style={{ color: "#1f7a45" }}
                    >
                      {selectedEng.acceptResult}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">验收签字：</span>
                      <span style={{ fontWeight: 500 }}>{selectedEng.acceptBy}</span>
                    </div>

                    {/* 验收报告附件 */}
                    <FileCard
                      name={`${selectedEng.name}_验收报告.pdf`}
                      meta={`验收日期 ${selectedEng.acceptDate} · 已归档`}
                    />
                  </>
                ) : selectedEng.phase === "验收中" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-cyan-600" />
                      <span style={{ fontWeight: 600, color: "#0e6e88" }}>验收进行中</span>
                    </div>
                    <p className="text-sm text-muted-foreground">施工已完成，待业委会现场核验并签署验收报告。</p>
                    {/* 验收报告上传占位 */}
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-left hover:bg-muted/80 transition-colors"
                      onClick={() => toast.info("请通过文件管理上传验收报告")}
                    >
                      <span className="grid place-items-center size-9 rounded-md bg-[#e6f6fa] text-cyan-600 shrink-0">
                        <Upload className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm" style={{ fontWeight: 500 }}>上传验收报告</span>
                        <span className="block text-xs text-muted-foreground">支持 PDF / Word，不超过 50MB</span>
                      </span>
                    </button>
                    <div className="pt-1">
                      <div className="text-sm mb-1.5 font-semibold">验收结论</div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => toast.success("已记录验收结论：合格")}
                          style={{ borderColor: "#2e9e5b", color: "#1f7a45" }}
                        >
                          合格 ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => toast.error("已记录验收结论：不合格，退回施工方整改")}
                          style={{ borderColor: "#d14343", color: "#a32f2f" }}
                        >
                          不合格 ✗
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="size-4" />
                    {selectedEng.phase === "方案评审"
                      ? "工程尚在方案评审阶段，待投票通过后开工，验收功能届时解锁。"
                      : "施工进行中，验收功能将在施工完成后解锁。"}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
