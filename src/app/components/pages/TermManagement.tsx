import { useState } from "react";
import { useStore } from "../../lib/store";
import { PageHeader, SectionCard, StatusChip, Stepper } from "../gov/common";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";
import { AlertTriangle, ShieldCheck, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

const HANDOVER_STEPS = [
  { key: "announce", label: "换届公告" },
  { key: "election", label: "选举" },
  { key: "handover", label: "新老交接" },
  { key: "complete", label: "完成" },
];

const PREV_TERM = [
  { name: "李建华", role: "主任" },
  { name: "王秀英", role: "副主任" },
  { name: "张伟", role: "副主任" },
  { name: "刘洋", role: "委员" },
  { name: "陈静", role: "委员" },
];

const NEW_TERM = [
  { name: "孙晓梅", role: "主任（候任）" },
  { name: "赵强", role: "副主任（候任）" },
  { name: "黄明", role: "副主任（候任）" },
  { name: "周丽华", role: "委员（候任）" },
  { name: "吴建国", role: "委员（候任）" },
];

type CheckItem = { id: string; label: string; done: boolean };

const INITIAL_CHECKLIST: CheckItem[] = [
  { id: "1", label: "财务账册（近三年）移交确认", done: true },
  { id: "2", label: "公章 / 财务章 / 法人章移交", done: true },
  { id: "3", label: "银行预留印鉴变更办理", done: false },
  { id: "4", label: "档案资料（合同/协议/会议纪要）打包移交", done: false },
  { id: "5", label: "物业服务合同及附件扫描归档", done: false },
  { id: "6", label: "维修资金账户授权更新", done: false },
  { id: "7", label: "业委会官方公告渠道管理员变更", done: false },
  { id: "8", label: "新届成员身份认证（街道办备案）", done: false },
];

export function TermManagement() {
  const { lockdown, setLockdown } = useStore();
  const [checklist, setChecklist] = useState<CheckItem[]>(INITIAL_CHECKLIST);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="换届管理"
        desc="业主委员会换届全流程管控：换届进度、届次对照、交接清单，以及换届熔断（HANDOVER_LOCK）控制。"
      />

      {/* 换届进度步骤条 */}
      <SectionCard title="换届进度" desc="第三届 → 第四届 · 预计完成时间 2026-09-01">
        <Stepper steps={HANDOVER_STEPS} current={1} />
      </SectionCard>

      {/* 届次对照卡 */}
      <SectionCard title="届次成员对照" desc="上届与新届候任成员对比">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StatusChip tone="neutral" dot>第三届（届满）</StatusChip>
            </div>
            <div className="space-y-2">
              {PREV_TERM.map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm bg-muted/30">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground text-xs">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StatusChip tone="primary" dot>第四届（候任）</StatusChip>
            </div>
            <div className="space-y-2">
              {NEW_TERM.map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-lg border border-primary/30 px-3 py-2 text-sm bg-[#e8f0fb]/40">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground text-xs">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 换届熔断控制区 */}
      <div>
        {lockdown ? (
          /* 熔断生效态 */
          <div className="rounded-xl border-2 border-[#d14343] overflow-hidden">
            <div className="gov-lock-stripes px-5 py-4 flex items-center gap-3">
              <AlertTriangle className="size-6 shrink-0" style={{ color: "#a32f2f" }} />
              <div className="flex-1">
                <div className="font-bold text-base" style={{ color: "#a32f2f" }}>
                  换届熔断生效中（HANDOVER_LOCK = ON）
                </div>
                <div className="text-sm mt-0.5" style={{ color: "#a32f2f" }}>
                  已冻结大额资金划拨，防止离任突击花钱。所有单笔 ≥5,000 元的支出审批接口已锁定，直至换届完成并由街道办解除。
                </div>
              </div>
            </div>
            <div className="bg-card px-5 py-4 flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                熔断将冻结大额资金划拨（单笔 ≥5,000 元）；解除操作需二次确认，并自动生成操作日志上链存证。
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="shrink-0 border-[#d14343] text-[#d14343] hover:bg-[#fbe9e9]">
                    解除熔断
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认解除换届熔断？</AlertDialogTitle>
                    <AlertDialogDescription>
                      解除熔断后，大额资金划拨接口将恢复正常。请确认换届纠纷已处置完毕、新届委员会已完成街道办备案，再执行此操作。该操作将生成链上操作日志。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setLockdown(false);
                        toast.success("熔断已解除，资金划拨接口恢复正常", {
                          description: "操作已记录并上链存证",
                        });
                      }}
                    >
                      确认解除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          /* 正常态 */
          <div className="rounded-xl border border-[#2e9e5b]/30 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">换届熔断控制区</div>
                <div className="text-sm text-muted-foreground mt-0.5">HANDOVER_LOCK · 影响大额资金划拨审批链路</div>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 rounded-lg border border-[#2e9e5b]/30 bg-[#e8f6ee] px-4 py-3 mb-4">
                <ShieldCheck className="size-5 text-[#2e9e5b] shrink-0" />
                <div>
                  <div className="font-semibold text-sm" style={{ color: "#1f7a45" }}>当前无熔断，系统运行正常</div>
                  <div className="text-xs text-muted-foreground mt-0.5">大额资金划拨通道开放，审批链路工作正常。</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#fbe9e9] bg-[#fff8f8]">
                <div>
                  <div className="text-sm font-medium">启用换届熔断</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    熔断将冻结大额资金划拨（单笔 ≥5,000 元），防止离任突击花钱。
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      启动熔断
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认启动换届熔断？</AlertDialogTitle>
                      <AlertDialogDescription>
                        启动熔断后，系统将立即冻结所有单笔 ≥5,000 元的大额资金划拨审批，防止离任委员突击花钱。此操作将通知所有委员并生成链上存证记录。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => {
                          setLockdown(true);
                          toast.error("换届熔断已启动", {
                            description: "大额资金划拨已冻结，操作已上链存证",
                          });
                        }}
                      >
                        确认启动熔断
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 交接清单 */}
      <SectionCard
        title="交接清单"
        desc={`账册 / 印章 / 资料交接核对 · 已完成 ${doneCount}/${checklist.length} 项`}
        extra={
          <StatusChip tone={doneCount === checklist.length ? "success" : doneCount > 0 ? "warning" : "neutral"} dot>
            {doneCount === checklist.length ? "全部完成" : `${doneCount}/${checklist.length} 已完成`}
          </StatusChip>
        }
      >
        <div className="space-y-2">
          {checklist.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className="flex items-center gap-3 w-full rounded-lg border border-border px-4 py-3 text-left hover:border-primary/40 transition-colors"
              style={{ backgroundColor: item.done ? "#e8f6ee" : undefined }}
            >
              {item.done ? (
                <CheckSquare className="size-5 shrink-0" style={{ color: "#2e9e5b" }} />
              ) : (
                <Square className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm flex-1" style={{ textDecoration: item.done ? "line-through" : undefined, color: item.done ? "#5a6677" : undefined }}>
                {item.label}
              </span>
              {item.done && <StatusChip tone="success">已完成</StatusChip>}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
