import { useState } from "react";
import { PageHeader, SectionCard, StatusChip, Money, FileCard } from "../gov/common";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../ui/alert-dialog";
import { useStore } from "../../lib/store";
import { AlertTriangle, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";

type Project = {
  id: string; name: string; amount: number; community: string; date: string; status: "review" | "passed" | "rejected";
};

const INIT: Project[] = [
  { id: "FR-1501", name: "主干道翻修专项工程", amount: 150000, community: "盘古·和畅雅苑", date: "2026-06-16", status: "review" },
  { id: "FR-1502", name: "中央监控系统整体升级", amount: 286000, community: "盘古·锦绣华庭", date: "2026-06-14", status: "review" },
  { id: "FR-1498", name: "消防管网改造工程", amount: 98000, community: "盘古·和畅雅苑", date: "2026-06-09", status: "passed" },
];

export function FundReview() {
  const { lockdown } = useStore();
  const [rows, setRows] = useState(INIT);
  const [sel, setSel] = useState("FR-1501");
  const [reason, setReason] = useState("");
  const p = rows.find((r) => r.id === sel)!;

  const act = (status: "passed" | "rejected", msg: string) => {
    setRows((rs) => rs.map((r) => (r.id === sel ? { ...r, status } : r)));
    setReason("");
    toast.success(msg);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="大额资金前置审查"
        desc="大额资金划拨表决通过后不直接核销，状态机切入“待社区党组织书记审核”。书记调取招投标合同、预算明细做政治与合规前置审查，防突击花钱、防利益输送。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 待审查工程列表 */}
        <SectionCard title="待审查工程" desc="大额资金划拨" className="lg:col-span-2" bodyClassName="p-0">
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <button key={r.id} onClick={() => setSel(r.id)} className={`w-full text-left p-4 transition-colors ${sel === r.id ? "bg-accent" : "hover:bg-muted"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono-num text-xs text-muted-foreground">{r.id}</span>
                  <StatusChip tone={r.status === "review" ? "warning" : r.status === "passed" ? "success" : "danger"}>
                    {r.status === "review" ? "待审查" : r.status === "passed" ? "已放行" : "已驳回"}
                  </StatusChip>
                </div>
                <div className="text-sm" style={{ fontWeight: 500 }}>{r.name}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <Money value={r.amount} className="text-sm" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="size-3" />{r.community}</span>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* 审查详情 */}
        <div className="lg:col-span-3 space-y-5">
          <SectionCard title="审查详情" desc={`${p.id} · ${p.community}`}>
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-sm text-muted-foreground">工程名称</div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{p.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">划拨金额</div>
                <Money value={p.amount} className="text-2xl" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-2">合规材料调阅</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FileCard name="招投标合同（中标）.pdf" meta="市政工程有限公司 · 已盖章" />
              <FileCard name="工程预算明细表.xlsx" meta="逐项造价 · 含人工材料" />
              <FileCard name="施工方案设计图.pdf" meta="含工期与节点" />
              <FileCard name="资质与履约能力证明.pdf" meta="三级资质 · 履约记录" />
            </div>
          </SectionCard>

          {/* 审查操作区 / 熔断遮罩 */}
          <SectionCard title="审查操作">
            <div className="relative">
              {p.status !== "review" ? (
                <div className={`rounded-lg p-4 text-sm ${p.status === "passed" ? "bg-[#e8f6ee] border border-[#2e9e5b]/30" : "bg-[#fbe9e9] border border-[#d14343]/30"}`} style={{ color: p.status === "passed" ? "#1f7a45" : "#a32f2f" }}>
                  {p.status === "passed" ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="size-5 shrink-0" />
                      <div>
                        <div style={{ fontWeight: 600 }}>已审查通过 · 资金已放行</div>
                        <p className="mt-1">资金已通过 Outbox 划拨，支出已穿透上链，实时公示于业主端财务看板。</p>
                      </div>
                    </div>
                  ) : <div style={{ fontWeight: 600 }}>该工程已被驳回</div>}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Textarea placeholder="如需驳回，请填写审查意见 / 驳回理由…" value={reason} onChange={(e) => setReason(e.target.value)} disabled={lockdown} />
                    <div className="flex gap-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="flex-1" disabled={lockdown}>审查通过 · 放行划拨</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认放行大额划拨？</AlertDialogTitle>
                            <AlertDialogDescription>
                              将放行「{p.name}」资金 ¥{p.amount.toLocaleString()}。放行后资金经 Outbox 划拨并穿透上链公示，请确认已完成合规审查。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => act("passed", "已放行划拨，支出穿透上链")}>确认放行</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="destructive" className="flex-1" disabled={lockdown || !reason} onClick={() => act("rejected", "已驳回")}>驳回</Button>
                    </div>
                  </div>

                  {/* 换届熔断锁定遮罩 */}
                  {lockdown && (
                    <div className="absolute inset-0 -m-1 rounded-lg gov-lock-stripes border-2 border-[#d14343] grid place-items-center">
                      <div className="flex items-center gap-2 rounded-md bg-card border border-[#d14343] px-4 py-2.5 text-sm shadow-sm" style={{ color: "#a32f2f" }}>
                        <AlertTriangle className="size-4" />
                        <span style={{ fontWeight: 600 }}>⚠ 换届熔断期，大额资金划拨接口已死锁，禁止放行</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
