// 关联业务：在表决结果中区分业主实际票和依据生效规则认定的未反馈票。
import type { VotingNonResponseSummary } from "../../lib/voting";

const CHOICE_LABEL: Record<NonNullable<VotingNonResponseSummary["majorityChoice"]>, string> = {
  SUPPORT: "同意",
  AGAINST: "不同意",
  ABSTAIN: "弃权",
};

export function NonResponseTallySummary({ summary }: { summary?: VotingNonResponseSummary | null }) {
  if (!summary) return null;
  const actual = summary.actual;
  const deemed = summary.deemed;
  const explanation = summary.policy === "FOLLOW_MAJORITY"
    ? `实际有效票的人数多数和面积多数均为“${summary.majorityChoice ? CHOICE_LABEL[summary.majorityChoice] : "待核对"}”，符合规则的未反馈票按该意见计入。`
    : summary.policy === "ABSTAIN"
      ? "符合规则的未反馈票按弃权计入。"
      : `已有效送达但未反馈的 ${summary.eligibleOwnerCount} 人 / ${summary.eligibleArea} ㎡未计入参与。`;

  return (
    <div className="mt-3 border-t pt-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <div><span className="text-muted-foreground">实际有效票：</span>涉及 {actual.participatingOwnerCount} 人 / {actual.participatingArea} ㎡</div>
        <div><span className="text-muted-foreground">依规则认定：</span>涉及 {deemed.participatingOwnerCount} 人 / {deemed.participatingArea} ㎡</div>
      </div>
      <p className="mt-2 text-muted-foreground">{explanation}</p>
      {summary.derivationAggregateHash && deemed.participatingArea > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">逐条认定依据已留存，可供后续复核。同一业主名下多个专有部分可能分属两类，来源人数不直接相加。</p>
      )}
    </div>
  );
}
