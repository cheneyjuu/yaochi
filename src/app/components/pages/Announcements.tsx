import { PageHeader, SectionCard, StatusChip, KpiCard } from "../gov/common";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Progress } from "../ui/progress";
import { RichTextView } from "../common/RichTextEditor";
import { Plus, Eye, Users, BookOpen } from "lucide-react";
import { useStore } from "../../lib/store";
import { useState } from "react";

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

export function Announcements() {
  const { setPage } = useStore();
  const [detailAnn, setDetailAnn] = useState<Announcement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
          <Button onClick={() => setPage("announcement-editor")}>
            <Plus className="size-4" />
            发布公告
          </Button>
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
                <RichTextView html={detailAnn.content} />
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
