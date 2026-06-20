import { useState } from "react";
import { PageHeader, SectionCard, StatusChip, KpiCard } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import { Progress } from "../ui/progress";
import { Label } from "../ui/label";
import { Megaphone, Plus, Eye, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";

type ScopeType = "全小区" | "指定楼栋" | "指定角色";

interface Announcement {
  id: string;
  title: string;
  scope: ScopeType;
  scopeTone: "success" | "primary" | "info";
  publishTime: string;
  readRate: number;
  readCount: number;
  totalCount: number;
  content: string;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ANN-2026-041",
    title: "二季度公共收益分配公示",
    scope: "全小区",
    scopeTone: "success",
    publishTime: "2026-06-18 09:00",
    readRate: 82,
    readCount: 1017,
    totalCount: 1240,
    content:
      "各位业主好，本小区二季度公共收益共计 386,000 元，其中停车费收益 218,000 元，广告位租赁 48,000 元，其他收益 120,000 元。经业委会审定，本次分配方案已由第三方审计机构核查完毕，按专有面积比例分摊至各业主权益账户，详情请登录业主端 APP 查看明细。",
  },
  {
    id: "ANN-2026-038",
    title: "1号楼屋面防水维修施工公告",
    scope: "指定楼栋",
    scopeTone: "primary",
    publishTime: "2026-06-15 10:30",
    readRate: 94,
    readCount: 81,
    totalCount: 86,
    content:
      "1号楼全体业主，因1号楼屋面防水层老化，计划于2026年6月20日至6月30日进行防水维修施工，届时顶层业主（18楼、19楼）可能受噪音影响，请提前做好准备。施工期间屋面封闭，请勿进入。专项维修资金预算 62,000 元，已经三分之二业主表决通过。",
  },
  {
    id: "ANN-2026-035",
    title: "夏季消防安全检查通知",
    scope: "全小区",
    scopeTone: "success",
    publishTime: "2026-06-12 08:00",
    readRate: 68,
    readCount: 843,
    totalCount: 1240,
    content:
      "根据社区消防安全要求，本小区将于2026年6月25日（周三）上午9:00至12:00进行年度消防设施检查，届时消防通道须保持畅通，请各业主自觉清理楼道堆放物品，并配合检查人员入户检查。",
  },
  {
    id: "ANN-2026-033",
    title: "业委会新成员名单公示",
    scope: "全小区",
    scopeTone: "success",
    publishTime: "2026-06-10 14:00",
    readRate: 76,
    readCount: 942,
    totalCount: 1240,
    content:
      "根据2026年业委会换届选举结果，新一届业委会成员名单如下：主任 王志远（3栋1单元801）、副主任 李秀兰（5栋2单元302）、成员 张明华、刘建国、陈丽华。任期三年，自2026年7月1日起正式履职。",
  },
  {
    id: "ANN-2026-029",
    title: "物业费缴纳提醒（楼栋长/网格员）",
    scope: "指定角色",
    scopeTone: "info",
    publishTime: "2026-06-08 09:00",
    readRate: 100,
    readCount: 12,
    totalCount: 12,
    content:
      "各位楼栋长、网格员，请于2026年6月30日前协助催收所负责区域的物业费，当前欠费户数统计已同步至您的工作台，请重点跟进欠费3个月以上的住户，必要时配合物业进行上门催缴。",
  },
  {
    id: "ANN-2026-024",
    title: "地下车库改造施工通知（B区）",
    scope: "指定楼栋",
    scopeTone: "primary",
    publishTime: "2026-05-28 16:00",
    readRate: 89,
    readCount: 254,
    totalCount: 286,
    content:
      "B区（4栋、5栋、6栋）地下车库改造工程将于2026年6月1日正式开工，预计历时45天，施工期间B区地下车库临时关闭，请B区业主车辆临时停放至A区地面停车场（每天限停8小时，免费）。",
  },
  {
    id: "ANN-2026-020",
    title: "6月业委会例会纪要",
    scope: "全小区",
    scopeTone: "success",
    publishTime: "2026-05-20 11:00",
    readRate: 54,
    readCount: 670,
    totalCount: 1240,
    content:
      "2026年6月业委会例会于2026年6月5日召开，出席委员5人，列席监事1人。会议主要议题：1）审定二季度财务报告；2）讨论主干道翻修预算；3）通报维修工单处理进展。会议纪要全文已上链存证，请扫码查看。",
  },
  {
    id: "ANN-2026-015",
    title: "高温天气温馨提示",
    scope: "全小区",
    scopeTone: "success",
    publishTime: "2026-05-15 08:00",
    readRate: 61,
    readCount: 756,
    totalCount: 1240,
    content:
      "近期持续高温，请各位业主注意防暑降温，户外活动尽量避开11:00-15:00高温时段。同时提醒大家注意用电安全，空调等大功率设备不得长时间无人运行，预防火灾事故。",
  },
];

const BUILDINGS = ["1号楼", "2号楼", "3号楼", "4号楼", "5号楼", "6号楼", "7号楼", "8号楼"];
const ROLES = ["楼栋长", "网格员", "业委会委员", "监事", "物业管理员"];

export function Announcements() {
  const [publishOpen, setPublishOpen] = useState(false);
  const [detailAnn, setDetailAnn] = useState<Announcement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 发布表单状态
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [pushScope, setPushScope] = useState<"全小区" | "指定楼栋" | "指定角色">("全小区");
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  function toggleBuilding(b: string) {
    setSelectedBuildings((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  }

  function toggleRole(r: string) {
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function handlePublish() {
    if (!formTitle.trim()) {
      toast.error("请填写公告标题");
      return;
    }
    if (!formContent.trim()) {
      toast.error("请填写公告正文");
      return;
    }
    const scopeLabel =
      pushScope === "指定楼栋"
        ? `指定楼栋（${selectedBuildings.join("、") || "未选择"}）`
        : pushScope === "指定角色"
          ? `指定角色（${selectedRoles.join("、") || "未选择"}）`
          : "全小区";
    toast.success(`公告「${formTitle}」已发布，推送范围：${scopeLabel}`);
    setPublishOpen(false);
    setFormTitle("");
    setFormContent("");
    setPushScope("全小区");
    setSelectedBuildings([]);
    setSelectedRoles([]);
  }

  function openDetail(ann: Announcement) {
    setDetailAnn(ann);
    setSheetOpen(true);
  }

  const scopeToneMap: Record<ScopeType, "success" | "primary" | "info"> = {
    全小区: "success",
    指定楼栋: "primary",
    指定角色: "info",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="通知公告"
        desc="向全小区或指定楼栋 / 角色精准推送治理公告，支持阅读率统计与详情回溯。"
        actions={
          <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                发布公告
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>发布新公告</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>公告标题</Label>
                  <Input
                    placeholder="请输入公告标题"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>公告正文</Label>
                  <Textarea
                    placeholder="请输入公告内容（支持富文本格式，此处为纯文本预览）"
                    rows={6}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>附件</Label>
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors">
                    <Megaphone className="size-4" />
                    点击上传附件（PDF / 图片，最大 20MB）
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>推送范围</Label>
                  <RadioGroup
                    value={pushScope}
                    onValueChange={(v) => setPushScope(v as typeof pushScope)}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="全小区" id="scope-all" />
                      <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                        全小区（1240 户）
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="指定楼栋" id="scope-building" />
                      <Label htmlFor="scope-building" className="font-normal cursor-pointer">
                        指定楼栋
                      </Label>
                    </div>
                    {pushScope === "指定楼栋" && (
                      <div className="ml-6 grid grid-cols-4 gap-2">
                        {BUILDINGS.map((b) => (
                          <div key={b} className="flex items-center gap-1.5">
                            <Checkbox
                              id={`b-${b}`}
                              checked={selectedBuildings.includes(b)}
                              onCheckedChange={() => toggleBuilding(b)}
                            />
                            <Label htmlFor={`b-${b}`} className="font-normal text-xs cursor-pointer">
                              {b}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="指定角色" id="scope-role" />
                      <Label htmlFor="scope-role" className="font-normal cursor-pointer">
                        指定角色
                      </Label>
                    </div>
                    {pushScope === "指定角色" && (
                      <div className="ml-6 space-y-1.5">
                        {ROLES.map((r) => (
                          <div key={r} className="flex items-center gap-1.5">
                            <Checkbox
                              id={`r-${r}`}
                              checked={selectedRoles.includes(r)}
                              onCheckedChange={() => toggleRole(r)}
                            />
                            <Label htmlFor={`r-${r}`} className="font-normal text-sm cursor-pointer">
                              {r}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </RadioGroup>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handlePublish}>
                    确认发布
                  </Button>
                  <Button variant="outline" onClick={() => setPublishOpen(false)}>
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard title="公告列表" desc={`共 ${ANNOUNCEMENTS.length} 条，按发布时间倒序`} bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>公告标题</TableHead>
              <TableHead>推送范围</TableHead>
              <TableHead>发布时间</TableHead>
              <TableHead className="w-48">阅读率</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ANNOUNCEMENTS.map((ann) => (
              <TableRow key={ann.id}>
                <TableCell>
                  <div style={{ fontWeight: 500 }}>{ann.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono-num">{ann.id}</div>
                </TableCell>
                <TableCell>
                  <StatusChip tone={scopeToneMap[ann.scope]} dot>
                    {ann.scope}
                  </StatusChip>
                </TableCell>
                <TableCell className="font-mono-num text-sm">{ann.publishTime}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={ann.readRate} className="h-1.5 flex-1" />
                    <span className="font-mono-num text-xs w-10 text-right">{ann.readRate}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono-num">
                    {ann.readCount} / {ann.totalCount} 户已读
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetail(ann)}
                  >
                    <Eye className="size-4" />
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
        <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
          {detailAnn && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-base leading-snug">{detailAnn.title}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <StatusChip tone={detailAnn.scopeTone} dot>
                    {detailAnn.scope}
                  </StatusChip>
                  <span className="text-xs text-muted-foreground font-mono-num">{detailAnn.publishTime}</span>
                </div>
              </SheetHeader>

              {/* 公告正文 */}
              <SectionCard title="公告正文" className="mb-4">
                <p className="text-sm leading-7 text-foreground/90">{detailAnn.content}</p>
              </SectionCard>

              {/* 阅读统计 */}
              <SectionCard title="阅读统计">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <KpiCard
                    label="已读"
                    value={detailAnn.readCount}
                    unit="户"
                    tone="success"
                    icon={<BookOpen className="size-4" />}
                  />
                  <KpiCard
                    label="未读"
                    value={detailAnn.totalCount - detailAnn.readCount}
                    unit="户"
                    tone="neutral"
                    icon={<Users className="size-4" />}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">整体阅读率</span>
                    <span className="font-mono-num" style={{ color: "#1b4f9c", fontWeight: 600 }}>
                      {detailAnn.readRate}%
                    </span>
                  </div>
                  <Progress value={detailAnn.readRate} className="h-2.5" />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono-num">
                    <span>0%</span>
                    <span>
                      {detailAnn.readCount} / {detailAnn.totalCount} 户
                    </span>
                    <span>100%</span>
                  </div>
                </div>
                {detailAnn.readRate < 70 && (
                  <div className="mt-3 rounded-md border border-[#e0a310]/40 bg-[#fcf3da] px-3 py-2 text-xs" style={{ color: "#8a6406" }}>
                    阅读率低于 70%，建议补发提醒或联系楼栋长协助通知未读业主。
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
