import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Users, CalendarDays, Clock, Hash } from "lucide-react";

type Member = {
  id: string;
  name: string;
  role: "主任" | "副主任" | "委员";
  building: string;
  termStart: string;
  termEnd: string;
  phone: string;
};

const MEMBERS: Member[] = [
  { id: "1", name: "李建华", role: "主任", building: "1号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "138****6201" },
  { id: "2", name: "王秀英", role: "副主任", building: "3号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "139****8820" },
  { id: "3", name: "张伟", role: "副主任", building: "5号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "135****4473" },
  { id: "4", name: "刘洋", role: "委员", building: "2号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "137****9912" },
  { id: "5", name: "陈静", role: "委员", building: "4号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "186****3341" },
  { id: "6", name: "赵强", role: "委员", building: "6号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "150****7788" },
  { id: "7", name: "孙晓梅", role: "委员", building: "7号楼", termStart: "2023-03-15", termEnd: "2026-03-14", phone: "177****5523" },
];

const ROLE_TONE: Record<Member["role"], "primary" | "info" | "neutral"> = {
  主任: "primary",
  副主任: "info",
  委员: "neutral",
};

// Calculate days remaining until 2026-03-14
const TERM_END = new Date("2026-03-14");
const TODAY = new Date("2026-06-20");
const DAYS_REMAINING = Math.ceil((TERM_END.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));

export function CommitteeRoster() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="委员会名册"
        desc="第三届业主委员会成员基本信息、职务分工及任期管理。任期 2023-03-15 至 2026-03-14。"
      />

      {/* 当届概览条 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <span className="grid place-items-center size-10 rounded-lg bg-[#e8f0fb] text-[#1b4f9c] shrink-0">
            <Hash className="size-5" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">当前届次</div>
            <div className="font-mono-num text-lg font-bold text-[#1b4f9c]">第三届</div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <span className="grid place-items-center size-10 rounded-lg bg-[#e8f6ee] text-[#2e9e5b] shrink-0">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">成立日期</div>
            <div className="font-mono-num text-sm font-bold text-[#1f7a45]">2023-03-15</div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <span className={`grid place-items-center size-10 rounded-lg shrink-0 ${DAYS_REMAINING < 0 ? "bg-[#fbe9e9] text-[#d14343]" : "bg-[#fcf3da] text-[#e0a310]"}`}>
            <Clock className="size-5" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">任期剩余</div>
            <div className={`font-mono-num text-lg font-bold ${DAYS_REMAINING < 0 ? "text-[#d14343]" : "text-[#8a6406]"}`}>
              {DAYS_REMAINING < 0 ? `已届满 ${Math.abs(DAYS_REMAINING)} 天` : `${DAYS_REMAINING} 天`}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <span className="grid place-items-center size-10 rounded-lg bg-[#e6f6fa] text-[#19a0c4] shrink-0">
            <Users className="size-5" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">成员数</div>
            <div className="font-mono-num text-lg font-bold text-[#0e6e88]">{MEMBERS.length} 人</div>
          </div>
        </div>
      </div>

      {/* 成员卡片网格 */}
      <SectionCard title="委员会成员" desc="主任卡片以主色边框突出显示，联系方式已脱敏处理">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MEMBERS.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border bg-card p-5 flex flex-col gap-3 transition-shadow hover:shadow-md ${
                m.role === "主任" ? "border-2 border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback
                    className="gov-primary-gradient text-white text-base font-semibold"
                  >
                    {m.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base leading-tight">{m.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.building}</div>
                </div>
                <StatusChip tone={ROLE_TONE[m.role]} dot>
                  {m.role}
                </StatusChip>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">任期</span>
                  <span className="font-mono-num text-xs">{m.termStart} ~ {m.termEnd}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">联系方式</span>
                  <span className="font-mono-num text-xs">{m.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
