// 关联业务：回归验证确认表决安排按钮必须显示可行动原因，并正确处理规则最早开始时间中的秒数。
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { toVotingDateTimeLocalValue, votingPreparationBlocker } = await vite.ssrLoadModule(
    "/src/app/components/pages/repair/RepairProjectVotingOperation.tsx",
  );
  const earliest = "2026-08-19T15:58:08.000Z";
  const suggested = toVotingDateTimeLocalValue(earliest, true);
  const suggestedAt = new Date(suggested).getTime();
  const earliestAt = new Date(earliest).getTime();
  if (!(suggestedAt >= earliestAt && suggestedAt - earliestAt < 60_000)) {
    throw new Error(`建议开始时间没有向上取整到可办理分钟：${suggested}`);
  }

  const base = {
    canGovern: true,
    projectStatus: "AUTHORIZATION_IN_PROGRESS",
    mode: "PAPER_AND_ONLINE",
    paperBallotTemplateAttachmentId: 12,
    startAt: suggested,
    endAt: toVotingDateTimeLocalValue("2026-08-29T15:59:00.000Z"),
    earliestVoteStartAt: earliest,
    optionsReady: true,
  };
  if (votingPreparationBlocker(base) !== null) {
    throw new Error("符合规则且资料完整时，业委会应能确认本次表决安排");
  }
  const earlyReason = votingPreparationBlocker({ ...base, startAt: "2026-07-20T23:57" });
  if (!earlyReason?.includes("开始时间早于本小区规则允许的最早时间")) {
    throw new Error(`开始时间过早时缺少明确原因：${earlyReason ?? "无"}`);
  }
  const propertyReason = votingPreparationBlocker({ ...base, canGovern: false });
  if (propertyReason !== "当前身份只能核对材料，表决安排由业委会确认。") {
    throw new Error(`物业身份提示不准确：${propertyReason ?? "无"}`);
  }

  console.log("维修表决安排按钮状态与业务原因校验通过");
} finally {
  await vite.close();
}
