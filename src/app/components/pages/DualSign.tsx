import { useState } from "react";
import { PageHeader, SectionCard, StatusChip, Money, HashReceipt, FileCard } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../ui/alert-dialog";
import { ShieldAlert, Check, Lock } from "lucide-react";
import { toast } from "sonner";

type Bill = {
  id: string;
  amount: number;
  usage: string;
  org: string;
  signA: boolean;
  signB: boolean;
};

const INIT: Bill[] = [
  { id: "TRUST-2026-0612", amount: 86400, usage: "保安公司 6 月月度劳务费", org: "嘉和物业", signA: true, signB: false },
  { id: "TRUST-2026-0610", amount: 23800, usage: "公共区域绿化养护费", org: "嘉和物业", signA: true, signB: false },
  { id: "TRUST-2026-0605", amount: 156000, usage: "中央监控系统升级款", org: "嘉和物业", signA: true, signB: true },
];

export function DualSign() {
  const [bills, setBills] = useState(INIT);
  const [sel, setSel] = useState("TRUST-2026-0612");
  const [pwd, setPwd] = useState("");
  const bill = bills.find((b) => b.id === sel)!;
  const done = bill.signA && bill.signB;

  const sign = () => {
    setBills((bs) => bs.map((b) => (b.id === sel ? { ...b, signB: true } : b)));
    setPwd("");
    toast.success("第二签完成，双签已合并并写入司法链");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="信托制双签核销台"
        desc="动用信托资金须“双密码双签”：物业经理输密码 A 签名提交 → 业委会主任核对后输密码 B 签名 → 双签合并经国密签名打包写入最高院司法链，生成全网唯一交易哈希。"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 待签流水列表 */}
        <SectionCard title="待签 / 已签流水" desc="信托资金动用单据" className="lg:col-span-1" bodyClassName="p-0">
          <div className="divide-y divide-border">
            {bills.map((b) => {
              const finished = b.signA && b.signB;
              return (
                <button
                  key={b.id}
                  onClick={() => setSel(b.id)}
                  className={`w-full text-left p-4 transition-colors ${sel === b.id ? "bg-accent" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-num text-xs text-muted-foreground">{b.id}</span>
                    {finished ? <StatusChip tone="success">已上链</StatusChip> : <StatusChip tone="danger" dot>待第二签</StatusChip>}
                  </div>
                  <div className="text-sm" style={{ fontWeight: 500 }}>{b.usage}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <Money value={b.amount} className="text-sm" />
                    <span className="text-xs flex items-center gap-1">
                      <span style={{ color: "#2e9e5b" }}>A✓</span>
                      <span style={{ color: b.signB ? "#2e9e5b" : "#9aa5b5" }}>B{b.signB ? "✓" : "○"}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* 双签详情 */}
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title={`双签详情 · ${bill.id}`} desc={bill.usage}>
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

              {/* 第一签 */}
              <div className="relative mb-6">
                <span className="absolute -left-6 top-0.5 grid place-items-center size-4 rounded-full bg-[#2e9e5b] text-white">
                  <Check className="size-2.5" />
                </span>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontWeight: 600 }}>第一签 · 密码 A（物业经理）</span>
                    <StatusChip tone="success">已签 ✓</StatusChip>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">申请人</span><span>赵明（{bill.org}）</span>
                    <span className="text-muted-foreground">金额</span><Money value={bill.amount} />
                    <span className="text-muted-foreground">用途</span><span>{bill.usage}</span>
                    <span className="text-muted-foreground">签名时间</span><span className="font-mono-num">2026-06-12 09:24:11</span>
                  </div>
                  <div className="mt-3"><FileCard name="保安服务月度结算发票.pdf" meta="增值税专用发票 · ¥86,400.00" /></div>
                </div>
              </div>

              {/* 第二签 */}
              <div className="relative mb-6">
                <span
                  className="absolute -left-6 top-0.5 grid place-items-center size-4 rounded-full text-white"
                  style={{ backgroundColor: bill.signB ? "#2e9e5b" : "#1b4f9c" }}
                >
                  {bill.signB ? <Check className="size-2.5" /> : <span className="text-[9px]">2</span>}
                </span>
                {bill.signB ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 600 }}>第二签 · 密码 B（业委会主任）</span>
                      <StatusChip tone="success">已签 ✓</StatusChip>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 font-mono-num">签名时间 2026-06-12 14:08:55</div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-[#1b4f9c] bg-[#e8f0fb] p-4">
                    <div className="flex items-center gap-2 mb-2" style={{ fontWeight: 600, color: "#143c78" }}>
                      <ShieldAlert className="size-4" /> 第二签 · 密码 B（业委会主任）— 待您操作
                    </div>
                    <div className="flex items-start gap-2 rounded-md bg-[#fbe9e9] p-2.5 text-xs mb-3" style={{ color: "#a32f2f" }}>
                      <Lock className="size-3.5 mt-0.5 shrink-0" />
                      此操作将动用信托资金 <b className="font-mono-num mx-1">¥{bill.amount.toLocaleString()}</b> 并永久上链，<b>不可撤销</b>。
                    </div>
                    <label className="text-sm">输入动态安全口令完成第二签</label>
                    <div className="flex gap-2 mt-1.5">
                      <Input type="password" placeholder="动态安全口令" value={pwd} onChange={(e) => setPwd(e.target.value)} className="bg-card" />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={pwd.length < 4}>确认第二签并上链</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认动用信托资金？</AlertDialogTitle>
                            <AlertDialogDescription>
                              将动用信托资金 ¥{bill.amount.toLocaleString()} 用于「{bill.usage}」，双签合并后写入最高院司法链，<b>该操作不可撤销</b>。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={sign} className="bg-destructive text-white hover:bg-destructive/90">确认上链</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>

              {/* 司法链存证 */}
              <div className="relative">
                <span
                  className="absolute -left-6 top-0.5 grid place-items-center size-4 rounded-full text-white"
                  style={{ backgroundColor: done ? "#19a0c4" : "#cbd4e1" }}
                >
                  3
                </span>
                {done ? (
                  <HashReceipt
                    txHash="0x7f3a9c2e1b4d8f60a5e7c9d2f1b3a8e6c4d7f9a0b2e5c8d1f4a7b3e9c6d0f2a5b"
                    timestamp="2026-06-12 14:09:02"
                    amount={bill.amount}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    司法链存证（自动）：双签合并后将在此展示哈希回执。
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
