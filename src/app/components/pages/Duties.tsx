import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import { Check } from "lucide-react";

type DutyLevel = "主责" | "协办" | "参与" | null;

type Member = {
  name: string;
  role: string;
};

type DutyArea = {
  key: string;
  label: string;
  abbr: string;
};

const MEMBERS: Member[] = [
  { name: "李建华", role: "主任" },
  { name: "王秀英", role: "副主任" },
  { name: "张伟", role: "副主任" },
  { name: "刘洋", role: "委员" },
  { name: "陈静", role: "委员" },
  { name: "赵强", role: "委员" },
  { name: "孙晓梅", role: "委员" },
];

const DUTY_AREAS: DutyArea[] = [
  { key: "finance", label: "财务监督", abbr: "财务" },
  { key: "engineering", label: "工程维修", abbr: "工程" },
  { key: "election", label: "选举换届", abbr: "换届" },
  { key: "pr", label: "公共关系", abbr: "公关" },
  { key: "archive", label: "档案管理", abbr: "档案" },
  { key: "discipline", label: "纪律检查", abbr: "纪检" },
];

// Matrix: rows = members (7), cols = duty areas (6)
// "主责" | "协办" | "参与" | null
const DUTY_MATRIX: DutyLevel[][] = [
  // 李建华 (主任) — overall supervision
  ["协办", "协办", "主责", "主责", "协办", "主责"],
  // 王秀英 (副主任) — PR & archive
  ["协办", "参与", "协办", "主责", "主责", "协办"],
  // 张伟 (副主任) — discipline & election
  ["参与", "协办", "协办", "协办", "协办", "主责"],
  // 刘洋 (委员) — finance
  ["主责", null, null, "参与", "协办", "参与"],
  // 陈静 (委员) — archive & PR
  [null, "参与", "参与", "协办", "主责", null],
  // 赵强 (委员) — engineering
  ["参与", "主责", null, null, "参与", null],
  // 孙晓梅 (委员) — archive & election
  [null, "参与", "主责", "参与", "协办", null],
];

function DutyCell({ level }: { level: DutyLevel }) {
  if (level === "主责") {
    return (
      <div className="flex justify-center">
        <StatusChip tone="primary">主责</StatusChip>
      </div>
    );
  }
  if (level === "协办") {
    return (
      <div className="flex justify-center">
        <StatusChip tone="info">协办</StatusChip>
      </div>
    );
  }
  if (level === "参与") {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center justify-center size-5 rounded-full" style={{ backgroundColor: "#e8f0fb" }}>
          <Check className="size-3.5" style={{ color: "#1b4f9c" }} />
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <span className="text-muted-foreground/30 text-lg leading-none">—</span>
    </div>
  );
}

export function Duties() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="职责分工"
        desc="委员会成员 × 职责领域矩阵，清晰展示主责、协办、参与三态分工。"
      />

      {/* 图例说明 */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-3">
        <span className="text-sm text-muted-foreground font-medium shrink-0">图例：</span>
        <div className="flex items-center gap-2">
          <StatusChip tone="primary">主责</StatusChip>
          <span className="text-sm text-muted-foreground">该领域第一责任人，牵头推进</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone="info">协办</StatusChip>
          <span className="text-sm text-muted-foreground">配合主责委员推进，共同决策</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center size-5 rounded-full shrink-0" style={{ backgroundColor: "#e8f0fb" }}>
            <Check className="size-3.5" style={{ color: "#1b4f9c" }} />
          </span>
          <span className="text-sm text-muted-foreground">参与审议，提供意见</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/40 text-base">—</span>
          <span className="text-sm text-muted-foreground">暂无分工</span>
        </div>
      </div>

      {/* 矩阵表 */}
      <SectionCard
        title="成员 × 职责矩阵"
        desc="共 7 名成员 · 6 大职责领域"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="whitespace-nowrap min-w-[120px] border-r border-border">
                  委员
                </TableHead>
                <TableHead className="whitespace-nowrap min-w-[60px] text-xs text-muted-foreground">
                  职务
                </TableHead>
                {DUTY_AREAS.map((area) => (
                  <TableHead key={area.key} className="text-center min-w-[90px]">
                    <div className="font-semibold text-sm">{area.label}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MEMBERS.map((member, mi) => (
                <TableRow key={member.name} className={mi % 2 === 0 ? "bg-background" : "bg-muted/15"}>
                  <TableCell className="border-r border-border">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid place-items-center size-7 rounded-full text-white text-xs shrink-0 gov-primary-gradient"
                        style={{ fontWeight: 600 }}
                      >
                        {member.name.slice(0, 1)}
                      </span>
                      <span className="font-medium text-sm">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      tone={
                        member.role === "主任"
                          ? "primary"
                          : member.role === "副主任"
                          ? "info"
                          : "neutral"
                      }
                    >
                      {member.role}
                    </StatusChip>
                  </TableCell>
                  {DUTY_AREAS.map((area, di) => (
                    <TableCell key={area.key} className="py-3">
                      <DutyCell level={DUTY_MATRIX[mi][di]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* 按职责领域汇总 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {DUTY_AREAS.map((area, di) => {
          const primary = MEMBERS.filter((_, mi) => DUTY_MATRIX[mi][di] === "主责");
          const assistant = MEMBERS.filter((_, mi) => DUTY_MATRIX[mi][di] === "协办");
          return (
            <div key={area.key} className="rounded-xl border border-border bg-card p-4">
              <div className="font-semibold text-sm mb-3">{area.label}</div>
              <div className="space-y-2">
                {primary.map((m) => (
                  <div key={m.name} className="flex items-center gap-1.5">
                    <StatusChip tone="primary">主</StatusChip>
                    <span className="text-xs">{m.name}</span>
                  </div>
                ))}
                {assistant.map((m) => (
                  <div key={m.name} className="flex items-center gap-1.5">
                    <StatusChip tone="info">协</StatusChip>
                    <span className="text-xs text-muted-foreground">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
