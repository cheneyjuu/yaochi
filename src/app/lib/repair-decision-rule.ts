// 关联业务：封装小区维修征询规则的备案、历史查询和私有原件预览接口。
import { apiGet, apiUpload } from "./api";

export type RepairDecisionNonResponseRule =
  | "NOT_PARTICIPATED"
  | "FOLLOW_MAJORITY"
  | "ABSTAIN";

export interface RepairDecisionRule {
  ruleId: number;
  ruleName: string;
  ruleVersion: string;
  effectiveAt: string;
  deliveryRule: string;
  nonResponseRule: RepairDecisionNonResponseRule;
  originalFileName: string;
  fileSize: number;
  sha256: string;
  status: "ACTIVE" | "SUPERSEDED";
  registeredByUserId: number;
  createTime: string;
}

export interface RegisterRepairDecisionRuleInput {
  ruleName: string;
  ruleVersion: string;
  effectiveDate: string;
  deliveryRule: string;
  nonResponseRule: RepairDecisionNonResponseRule;
  file: File;
}

export interface RepairDecisionRulePreviewTicket {
  ruleId: number;
  previewUrl: string;
  expiresAt: string;
}

export function getRepairDecisionRules(): Promise<RepairDecisionRule[]> {
  return apiGet<RepairDecisionRule[]>("/admin/repair-decision-rules");
}

export function getActiveRepairDecisionRule(): Promise<RepairDecisionRule> {
  return apiGet<RepairDecisionRule>("/admin/repair-decision-rules/active");
}

export function registerRepairDecisionRule(
  input: RegisterRepairDecisionRuleInput,
): Promise<RepairDecisionRule> {
  const form = new FormData();
  form.append("ruleName", input.ruleName);
  form.append("ruleVersion", input.ruleVersion);
  form.append("effectiveDate", input.effectiveDate);
  form.append("deliveryRule", input.deliveryRule);
  form.append("nonResponseRule", input.nonResponseRule);
  form.append("file", input.file);
  return apiUpload<RepairDecisionRule>("/admin/repair-decision-rules", form);
}

export function getRepairDecisionRulePreviewTicket(
  ruleId: number,
): Promise<RepairDecisionRulePreviewTicket> {
  return apiGet<RepairDecisionRulePreviewTicket>(
    `/admin/repair-decision-rules/${ruleId}/preview-ticket`,
  );
}
