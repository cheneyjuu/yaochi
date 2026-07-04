import { useState } from "react";
import { PageHeader, SectionCard, StatusChip, FileCard } from "../gov/common";
import { Button } from "../ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { RichTextEditor, RichTextView } from "../common/RichTextEditor";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";

type Minute = {
  id: string;
  date: string;
  topic: string;
  resolution: string;
  attendees: number;
  hasAttachment: boolean;
  tone: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  fullText: string;
  attendeeList: { name: string; role: string }[];
  relatedTopics: { label: string; tone: "primary" | "success" | "warning" | "info" | "neutral" }[];
};

const MINUTES: Minute[] = [
  {
    id: "1",
    date: "2026-06-15",
    topic: "二季度公共收益分配方案审议",
    resolution: "表决通过按专有面积比例分配方案，人均约 312 元，委托财务委员于 6 月 30 日前完成划账。",
    attendees: 7,
    hasAttachment: true,
    tone: "success",
    fullText: `会议时间：2026年6月15日 14:00–16:30\n会议地点：小区物业中心二楼会议室\n主持人：李建华（主任）\n记录人：孙晓梅\n\n一、议题背景\n本季度公共区域广告位、停车场、快递柜等收益合计 386,000 元，扣除管理费用 22,600 元后，可分配收益 363,400 元，覆盖全小区 1,163 户。\n\n二、表决过程\n委员会全体 7 名成员出席，经充分讨论，对"按专有面积比例分配"方案进行表决。\n\n三、表决结果\n赞成 6 票，弃权 1 票，反对 0 票。方案正式通过。\n\n四、执行安排\n1. 财务委员刘洋负责核对业主银行信息；\n2. 6月30日前完成全部划账；\n3. 公示期 7 天，公示结束后方可执行。\n\n五、其他事项\n无。`,
    attendeeList: [
      { name: "李建华", role: "主任" },
      { name: "王秀英", role: "副主任" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员·财务" },
      { name: "陈静", role: "委员" },
      { name: "赵强", role: "委员" },
      { name: "孙晓梅", role: "委员·记录" },
    ],
    relatedTopics: [
      { label: "公共收益分配", tone: "success" },
      { label: "财务审计", tone: "primary" },
    ],
  },
  {
    id: "2",
    date: "2026-05-28",
    topic: "主干道翻修 15 万元预算审议",
    resolution: "议题进入业主大会表决流程，需达到双过半门槛（专有面积 + 户数均超 50%）方可通过。",
    attendees: 6,
    hasAttachment: true,
    tone: "warning",
    fullText: `会议时间：2026年5月28日 10:00–12:00\n主持人：李建华\n记录人：陈静\n\n一、工程背景\n小区主干道（东区段约 420 米）路面老化严重，多处破损，雨天积水，需整体翻修。维修公司报价 15 万元，已经两家单位比价。\n\n二、审议要点\n该项目金额超过维修资金年度预算单次 5 万元上限，须进入业主大会表决程序。\n\n三、决定事项\n1. 委员会一致同意将议题提交业主大会；\n2. 公告期 7 天，投票期 15 天；\n3. 表决门槛：专有面积过半 + 户数过半。`,
    attendeeList: [
      { name: "李建华", role: "主任" },
      { name: "王秀英", role: "副主任" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员" },
      { name: "赵强", role: "委员" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [
      { label: "工程维修", tone: "warning" },
      { label: "维修资金", tone: "primary" },
    ],
  },
  {
    id: "3",
    date: "2026-05-10",
    topic: "物业服务合同续签评审",
    resolution: "同意与现物业公司续签两年合同，并新增电梯维保 KPI 条款，合同金额每年 84 万元。",
    attendees: 7,
    hasAttachment: true,
    tone: "primary",
    fullText: `会议时间：2026年5月10日 15:00–17:30\n主持人：李建华\n记录人：孙晓梅\n\n一、合同评审\n现合同将于 2026-06-30 到期。物业公司提交续签方案，年服务费 84 万元（较上期持平），并承诺新增电梯年度维保次数由 2 次提升至 4 次。\n\n二、委员意见\n张伟（副主任）建议增加违约金条款及满意度考核机制。经协商，物业公司同意纳入合同附件。\n\n三、表决结果\n赞成 7 票，通过。`,
    attendeeList: [
      { name: "李建华", role: "主任" },
      { name: "王秀英", role: "副主任" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员" },
      { name: "陈静", role: "委员" },
      { name: "赵强", role: "委员" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [
      { label: "物业合同", tone: "primary" },
      { label: "服务考核", tone: "info" },
    ],
  },
  {
    id: "4",
    date: "2026-04-22",
    topic: "1号楼屋面防水维修方案审批",
    resolution: "批准维修方案，动用维修资金 62,000 元，委托赵强全程监工，完工后须提交验收报告。",
    attendees: 7,
    hasAttachment: false,
    tone: "success",
    fullText: `会议时间：2026年4月22日 14:30–15:45\n主持人：李建华\n记录人：陈静\n\n一、工程背景\n1号楼顶层 4 户业主反映漏水，物业已排查确认屋面防水层老化，需整体修缮。\n\n二、维修方案\n由具备资质的防水工程公司施工，总报价 62,000 元，工期 10 天。\n\n三、表决结果\n全票通过，动用维修资金专项列支。`,
    attendeeList: [
      { name: "李建华", role: "主任" },
      { name: "王秀英", role: "副主任" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员" },
      { name: "陈静", role: "委员" },
      { name: "赵强", role: "委员·监工" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [{ label: "工程维修", tone: "warning" }],
  },
  {
    id: "5",
    date: "2026-04-05",
    topic: "电梯广告位招商方案审议",
    resolution: "批准以年框架协议形式对外招商，起始价 4.8 万元/年，收益全额纳入公共收益账户。",
    attendees: 5,
    hasAttachment: false,
    tone: "info",
    fullText: `会议时间：2026年4月5日 10:00–11:30\n主持人：王秀英（副主任·代主持）\n记录人：孙晓梅\n\n一、招商背景\n小区 12 部电梯轿厢广告位长期闲置，经市场调研，年框架广告价值约 4.8–8 万元。\n\n二、方案要点\n1. 广告内容须符合公序良俗，不得含赌博、医疗等敏感内容；\n2. 合同期 1 年，可续签；\n3. 收益进入公共收益账户，按季度公示。\n\n三、表决结果\n赞成 5 票，通过。`,
    attendeeList: [
      { name: "王秀英", role: "副主任·代主持" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员" },
      { name: "陈静", role: "委员" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [
      { label: "公共收益", tone: "success" },
      { label: "招商合作", tone: "info" },
    ],
  },
  {
    id: "6",
    date: "2026-03-18",
    topic: "第三届委员会年度工作总结",
    resolution: "审议通过年度工作报告，确认资金收支平衡，任期内完成重大事项 11 项，形成会议决议存档。",
    attendees: 7,
    hasAttachment: true,
    tone: "neutral",
    fullText: `会议时间：2026年3月18日 14:00–17:00\n主持人：李建华\n记录人：孙晓梅\n\n一、年度总结\n本届委员会自 2023 年 3 月成立，任期三年，共召开全体会议 24 次，专题会议 8 次，处理业主投诉 186 件。\n\n二、财务情况\n年度公共收益 142 万元，支出 108 万元，账面结余 34 万元，维修资金专户余额 312 万元，财务状况健康。\n\n三、重大事项\n完成换届选举准备、物业合同续签、停车位增扩等 11 项重大事项。`,
    attendeeList: [
      { name: "李建华", role: "主任" },
      { name: "王秀英", role: "副主任" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员" },
      { name: "陈静", role: "委员" },
      { name: "赵强", role: "委员" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [{ label: "年度总结", tone: "neutral" }],
  },
  {
    id: "7",
    date: "2026-02-20",
    topic: "停车位扩建方案及费用分摊审议",
    resolution: "批准扩建地面车位 40 个，总投入 18 万元，费用由维修资金列支，新增收益按季度分配。",
    attendees: 6,
    hasAttachment: true,
    tone: "primary",
    fullText: `会议时间：2026年2月20日 15:00–16:30\n主持人：李建华\n记录人：陈静\n\n一、项目背景\n现有车位 320 个，长期供不应求，北区闲置绿化带经勘测适合改建为地面停车位。\n\n二、扩建方案\n新增地面车位 40 个，施工费 18 万元，预计新增年收益约 28.8 万元，回本周期约 8 个月。\n\n三、表决结果\n赞成 6 票，通过。`,
    attendeeList: [
      { name: "李建华", role: "主任" },
      { name: "王秀英", role: "副主任" },
      { name: "张伟", role: "副主任" },
      { name: "刘洋", role: "委员" },
      { name: "赵强", role: "委员" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [
      { label: "工程维修", tone: "warning" },
      { label: "公共收益", tone: "success" },
    ],
  },
  {
    id: "8",
    date: "2026-01-12",
    topic: "春节安保及公共区域布置预算审批",
    resolution: "批准春节期间增派安保 2 人，彩灯装饰预算 8,500 元，动用日常运营经费列支。",
    attendees: 5,
    hasAttachment: false,
    tone: "info",
    fullText: `会议时间：2026年1月12日 10:30–11:30\n主持人：王秀英（副主任·代主持）\n记录人：孙晓梅\n\n一、议题\n春节（2026年1月28日–2月6日）期间小区人员流动大，需加强安保并美化公共区域。\n\n二、预算明细\n增派安保 2 人×10天×350元/天 = 7,000元；彩灯装饰材料及安装 = 1,500元；合计 8,500元。\n\n三、表决结果\n赞成 5 票，通过。费用从日常运营经费列支。`,
    attendeeList: [
      { name: "王秀英", role: "副主任·代主持" },
      { name: "刘洋", role: "委员" },
      { name: "陈静", role: "委员" },
      { name: "赵强", role: "委员" },
      { name: "孙晓梅", role: "委员" },
    ],
    relatedTopics: [{ label: "日常管理", tone: "neutral" }],
  },
];

function MinuteDetail({ minute }: { minute: Minute }) {
  return (
    <div className="space-y-6">
      {/* 关联议题 */}
      <div className="flex flex-wrap gap-2">
        {minute.relatedTopics.map((t) => (
          <StatusChip key={t.label} tone={t.tone} dot>
            {t.label}
          </StatusChip>
        ))}
      </div>

      {/* 正文 */}
      <div className="rounded-lg border border-border bg-muted/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="size-4 text-primary" />
          <span className="font-semibold text-sm">会议纪要正文</span>
        </div>
        <RichTextView html={minute.fullText} />
      </div>

      {/* 出席名单 */}
      <div>
        <div className="font-semibold text-sm mb-3">出席委员（{minute.attendeeList.length} 人）</div>
        <div className="flex flex-wrap gap-3">
          {minute.attendeeList.map((a) => (
            <div key={a.name} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-card">
              <Avatar className="size-8">
                <AvatarFallback className="gov-primary-gradient text-white text-xs">
                  {a.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 附件 */}
      {minute.hasAttachment && (
        <div>
          <div className="font-semibold text-sm mb-3">附件</div>
          <div className="space-y-2">
            <FileCard name={`${minute.topic}——会议决议.pdf`} meta={`${minute.date} · PDF · 1 份`} />
            <FileCard name={`出席签到表.jpg`} meta={`${minute.date} · 图片`} />
          </div>
        </div>
      )}
    </div>
  );
}

export function MeetingMinutes() {
  const [selectedMinute, setSelectedMinute] = useState<Minute | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  return (
    <div className="space-y-5">
      <PageHeader
        title="会议纪要"
        desc="委员会全体会议及专题会议纪要存档，含议题决议、出席名单及附件资料。"
        actions={
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1.5" />
                新建纪要
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新建会议纪要</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">议题标题</label>
                  <Input
                    placeholder="请输入议题标题"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <RichTextEditor
                  label="纪要正文"
                  value={newContent}
                  onChange={setNewContent}
                  rows={10}
                  placeholder="请输入会议时间、地点、出席人员、议题背景、表决过程、表决结果和执行安排；支持 Markdown 小标题、列表、加粗和引用。"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setNewOpen(false)}>取消</Button>
                  <Button onClick={() => {
                    if (!newTitle.trim()) { toast.error("请填写议题标题"); return; }
                    if (!richTextToPlain(toMiniappRichText(newContent))) { toast.error("请填写纪要正文"); return; }
                    toast.success("纪要已保存草稿", { description: "可在纪要列表中继续编辑" });
                    setNewOpen(false);
                    setNewTitle("");
                    setNewContent("");
                  }}>
                    保存草稿
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard title="纪要列表" desc={`共 ${MINUTES.length} 份 · 按会议日期倒序`} bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>议题</TableHead>
              <TableHead>决议摘要</TableHead>
              <TableHead className="text-center">出席</TableHead>
              <TableHead className="text-center">附件</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MINUTES.map((m) => (
              <TableRow key={m.id} className="hover:bg-muted/30">
                <TableCell className="font-mono-num text-sm text-muted-foreground whitespace-nowrap">{m.date}</TableCell>
                <TableCell className="font-medium text-sm max-w-[180px]">
                  <div className="flex items-center gap-2">
                    <StatusChip tone={m.tone} dot />
                    <span className="truncate">{m.topic}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[260px]">
                  <span className="line-clamp-2">{m.resolution}</span>
                </TableCell>
                <TableCell className="text-center font-mono-num text-sm">{m.attendees} 人</TableCell>
                <TableCell className="text-center">
                  {m.hasAttachment ? (
                    <span className="text-xs text-primary">有</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Sheet open={selectedMinute?.id === m.id} onOpenChange={(open) => !open && setSelectedMinute(null)}>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedMinute(m)}>
                        查看详情
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                      <SheetHeader className="pb-4 border-b border-border">
                        <div className="text-xs text-muted-foreground font-mono-num">{m.date}</div>
                        <SheetTitle className="text-lg leading-snug">{m.topic}</SheetTitle>
                      </SheetHeader>
                      <div className="pt-5">
                        <MinuteDetail minute={m} />
                      </div>
                    </SheetContent>
                  </Sheet>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
