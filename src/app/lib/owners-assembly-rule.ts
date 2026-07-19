// 关联业务：管理业主大会议事规则原件、结构化条款、逐项核对和生效版本。
import { apiGet, apiPost, apiUpload } from "./api";

export type MeetingForm = "WRITTEN_CONSULTATION" | "INTERNET" | "ONLINE_AND_OFFLINE" | "OFFLINE_MEETING";
export type DeliveryMethod = "DOOR_TO_DOOR" | "POSTAL" | "ELECTRONIC" | "PUBLIC_NOTICE_BOARD";
export type NonResponsePolicy = "NOT_PARTICIPATED" | "FOLLOW_MAJORITY" | "ABSTAIN";
export type ProxyVotingPolicy = "NOT_ALLOWED" | "WRITTEN_AUTHORIZATION_REQUIRED";
export type VotingChannelPolicy = "PAPER_ONLY" | "ONLINE_ONLY" | "PAPER_AND_ONLINE";
export type DuplicateVotePolicy = "NOT_APPLICABLE" | "FIRST_VALID_WINS" | "PAPER_PREVAILS" | "ONLINE_PREVAILS";
export type DecisionType = "GENERAL" | "MAJOR";
export type ThresholdComparison = "AT_LEAST" | "GREATER_THAN";

export const RULE_CONFIGURATION_FIELDS = [
  "ALLOWED_MEETING_FORMS",
  "PLAN_PUBLICITY_DAYS",
  "MEETING_NOTICE_DAYS",
  "VALID_DELIVERY_METHODS",
  "NON_RESPONSE_POLICY",
  "PROXY_VOTING_POLICY",
  "VOTING_CHANNEL_POLICY",
  "ONLINE_IDENTITY_VERIFICATION",
  "PAPER_BALLOT_SEAL",
  "DUPLICATE_VOTE_POLICY",
  "COUNTING_RULES",
  "RESULT_ANNOUNCEMENT_DAYS",
] as const;

export type RuleConfigurationField = typeof RULE_CONFIGURATION_FIELDS[number];

export interface VotingThreshold {
  numerator: number | null;
  denominator: number | null;
  comparison: ThresholdComparison | null;
}

export interface CountingRule {
  participationOwnerThreshold: VotingThreshold;
  participationAreaThreshold: VotingThreshold;
  approvalOwnerThreshold: VotingThreshold;
  approvalAreaThreshold: VotingThreshold;
}

export interface RuleSourceReference {
  pageNumber: number | null;
  clause: string;
}

export interface OwnersAssemblyRuleConfiguration {
  allowedMeetingForms: MeetingForm[];
  planPublicityDays: number | null;
  meetingNoticeDays: number | null;
  validDeliveryMethods: DeliveryMethod[];
  nonResponsePolicy: NonResponsePolicy | null;
  proxyVotingPolicy: ProxyVotingPolicy | null;
  votingChannelPolicy: VotingChannelPolicy | null;
  onlineIdentityVerificationRequired: boolean | null;
  paperBallotSealRequired: boolean | null;
  duplicateVotePolicy: DuplicateVotePolicy | null;
  countingRules: Partial<Record<DecisionType, CountingRule>>;
  resultAnnouncementDays: number | null;
  sourceClauseReferences: Partial<Record<RuleConfigurationField, RuleSourceReference>>;
}

export interface OwnersAssemblyRule {
  ruleId: number;
  ruleName: string;
  ruleVersion: string;
  effectiveDate: string;
  changeReason: string;
  configuration: OwnersAssemblyRuleConfiguration;
  configurationSha256: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  status: "DRAFT" | "PENDING_CONFIRMATION" | "ACTIVE" | "SUPERSEDED";
  submittedAt?: string | null;
  activatedAt?: string | null;
  createTime: string;
  updateTime: string;
}

export interface RuleFieldConfirmation {
  field: RuleConfigurationField;
  sourcePageNumber: number;
  sourceClause: string;
  status: "PENDING" | "CONFIRMED";
  confirmedByCommitteePosition?: string | null;
  confirmedAt?: string | null;
}

export function listOwnersAssemblyRules(): Promise<OwnersAssemblyRule[]> {
  return apiGet("/admin/owners-assembly-rules");
}

export function getActiveOwnersAssemblyRule(): Promise<OwnersAssemblyRule> {
  return apiGet("/admin/owners-assembly-rules/active");
}

export function createOwnersAssemblyRuleDraft(input: {
  ruleName: string;
  ruleVersion: string;
  effectiveDate: string;
  changeReason: string;
  configuration: OwnersAssemblyRuleConfiguration;
  file: File;
}): Promise<OwnersAssemblyRule> {
  const form = new FormData();
  form.append("ruleName", input.ruleName);
  form.append("ruleVersion", input.ruleVersion);
  form.append("effectiveDate", input.effectiveDate);
  form.append("changeReason", input.changeReason);
  form.append("configuration", new Blob([JSON.stringify(input.configuration)], { type: "application/json" }));
  form.append("file", input.file);
  return apiUpload("/admin/owners-assembly-rules/drafts", form);
}

export function submitOwnersAssemblyRule(ruleId: number): Promise<OwnersAssemblyRule> {
  return apiPost(`/admin/owners-assembly-rules/${ruleId}/submit`);
}

export function listRuleFieldConfirmations(ruleId: number): Promise<RuleFieldConfirmation[]> {
  return apiGet(`/admin/owners-assembly-rules/${ruleId}/field-confirmations`);
}

export function confirmRuleField(ruleId: number, field: RuleConfigurationField): Promise<RuleFieldConfirmation> {
  return apiPost(`/admin/owners-assembly-rules/${ruleId}/field-confirmations/${field}/confirm`);
}

export function activateOwnersAssemblyRule(ruleId: number): Promise<OwnersAssemblyRule> {
  return apiPost(`/admin/owners-assembly-rules/${ruleId}/activate`);
}

export function getOwnersAssemblyRulePreviewTicket(ruleId: number): Promise<{ previewUrl: string; expiresAt: string }> {
  return apiGet(`/admin/owners-assembly-rules/${ruleId}/preview-ticket`);
}
