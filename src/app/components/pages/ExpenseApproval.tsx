import { useState } from "react";
import { PageHeader, SectionCard, StatusChip, Money, Stepper, FileCard, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { FileDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { key: "submit", label: "物业提交" },
  { key: "review", label: "待业委会初审" },
  { key: "done", label: "已核销" },
];

type Status = "review" | "done" | "rejected";
const STATUS_META: Record<Status, { label: string; tone: Tone }> = {
  review: { label: "待初审", tone: "warning" },
  done: { label: "已核销", tone: "success" },
  rejected: { label: "已驳回", tone: "danger" },
};

type Expense = {
  id: string; subject: string; amount: number; usage: string; org: string; status: Status; date: string;
};

const DATA: Expense[] = [
  { id: "EX-0631", subject: "消防器材", amount: 4280, usage: "采购消防水带 8 条 + 接口", org: "嘉和物业", status: "review", date: "2026-06-15" },
  { id: "EX-0630", subject: "公共照明", amount: 1860, usage: "维修地下车库路灯 12 盏", org: "嘉和物业", status: "review", date: "2026-06-14" },
  { id: "EX-0628", subject: "绿化养护", amount: 9600, usage: "二季度绿化修剪外包", org: "嘉和物业", status: "done", date: "2026-06-10" },
  { id: "EX-0625", subject: "电梯维保", amount: 12400, usage: "电梯季度维保（6 部）", org: "嘉和物业", status: "rejected", date: "2026-06-08" },
];

export function ExpenseApproval() {
  const [rows, setRows] = useState(DATA);
  const [active, setActive] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [auditOn, setAuditOn] = useState(false);

  const act = (id: string, status: Status, msg: string) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setActive(null);
    setReason("");
    toast.success(msg);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="酬金制开支审批"
        desc="物业经理录入的每笔物业费开支不立即扣款，自动进入“待业委会初审”状态机；主任点【同意核销】后资金科目才核销。可一键激活第三方审计师全小区只读权限做离任审计。"
      />

      {/* 第三方审计入口卡 */}
      <SectionCard className="border-[#3a6fbf]/40" >
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid place-items-center size-11 rounded-lg bg-[#e8f0fb] text-primary shrink-0">
            <ShieldCheck className="size-5.5" />
          </span>
          <div className="flex-1 min-w-[240px]">
            <div style={{ fontWeight: 600 }}>激活年度酬金制离任审计</div>
            <p className="text-sm text-muted-foreground">激活后第三方审计师获得全小区财务<b>纯只读</b>权限，并可一键导出全部物业费代理内账。</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">权限</span>
            <Switch checked={auditOn} onCheckedChange={(v) => { setAuditOn(v); toast(v ? "已激活审计师只读权限" : "已关闭审计权限"); }} />
            <StatusChip tone={auditOn ? "success" : "neutral"}>{auditOn ? "已激活" : "未激活"}</StatusChip>
          </div>
          <Button variant="outline" disabled={!auditOn} onClick={() => toast.success("已导出全部物业费代理内账（CSV）")}>
            <FileDown className="size-4" /> 导出全部内账
          </Button>
        </div>
      </SectionCard>

      {/* 开支单列表 */}
      <SectionCard title="物业费开支单" desc="酬金制 · 全小区只读 + 委员会审核" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>单号</TableHead>
              <TableHead>科目</TableHead>
              <TableHead>用途</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>提交物业</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono-num text-sm">{r.id}</TableCell>
                <TableCell><StatusChip tone="info">{r.subject}</StatusChip></TableCell>
                <TableCell className="max-w-[220px] truncate">{r.usage}</TableCell>
                <TableCell className="text-right"><Money value={r.amount} className="text-sm" /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.org}</TableCell>
                <TableCell><StatusChip tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</StatusChip></TableCell>
                <TableCell className="text-right">
                  <Sheet onOpenChange={(o) => !o && setActive(null)}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setActive(r)}>详情</Button>
                    </SheetTrigger>
                    <SheetContent className="w-[460px] sm:max-w-[460px] overflow-y-auto gov-scroll">
                      <SheetHeader>
                        <SheetTitle>开支单详情 · {active?.id}</SheetTitle>
                      </SheetHeader>
                      {active && (
                        <div className="px-4 pb-6 space-y-5">
                          <div className="pt-2">
                            <Stepper
                              steps={STEPS}
                              current={active.status === "done" ? 3 : active.status === "rejected" ? 1 : 1}
                              rejected={active.status === "rejected"}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-muted-foreground">科目</span><span>{active.subject}</span>
                            <span className="text-muted-foreground">金额</span><Money value={active.amount} />
                            <span className="text-muted-foreground">用途</span><span>{active.usage}</span>
                            <span className="text-muted-foreground">提交物业</span><span>{active.org}</span>
                            <span className="text-muted-foreground">提交时间</span><span className="font-mono-num">{active.date}</span>
                          </div>
                          <FileCard name={`${active.subject}发票.pdf`} meta={`增值税普通发票 · ¥${active.amount.toLocaleString()}`} />
                          {active.status === "review" ? (
                            <div className="space-y-3 rounded-lg border border-border p-4">
                              <div style={{ fontWeight: 600 }}>主任操作区</div>
                              <Textarea placeholder="如需驳回，请填写驳回理由…" value={reason} onChange={(e) => setReason(e.target.value)} />
                              <div className="flex gap-2">
                                <Button className="flex-1" onClick={() => act(active.id, "done", "已同意核销")}>同意核销</Button>
                                <Button variant="destructive" className="flex-1" disabled={!reason} onClick={() => act(active.id, "rejected", "已驳回")}>驳回</Button>
                              </div>
                            </div>
                          ) : (
                            <StatusChip tone={STATUS_META[active.status].tone}>当前状态：{STATUS_META[active.status].label}</StatusChip>
                          )}
                        </div>
                      )}
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
