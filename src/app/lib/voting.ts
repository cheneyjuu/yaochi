// 议题（VotingSubject）管理端封装 —— 对齐后端 SubjectAdminController。
// M4-1：GET /voting-subjects 分页列表。
// M4-2：GET /voting-subjects/{id}/progress 双过半进度 + /vote-details 逐户明细。
// 方向 1：POST 立项 / 公示 / 撤回 写动作（仅管理员，C 端业主投票不在此）。

import { apiGet, apiPost } from "./api";

// ---- 后端枚举（按 name 序列化，与 com.pangu.domain.model.voting.* 一致）----
export type SubjectType = "ELECTION" | "MAJOR" | "GENERAL";
export type SubjectStatus =
  | "DRAFT"
  | "PENDING_COMMITTEE"
  | "PENDING_STREET"
  | "PUBLISHED"
  | "VOTING"
  | "CLOSED"
  | "SETTLED"
  | "CANCELLED";
export type VotingScope = "COMMUNITY" | "BUILDING" | "UNIT";

/** 对齐后端 AdminSubjectResponse。Instant → ISO 字符串。 */
export interface AdminSubject {
  subjectId: number;
  tenantId: number;
  title: string;
  content?: string | null;
  subjectType: SubjectType;
  status: SubjectStatus;
  scope: VotingScope;
  scopeReferenceId: number | null;
  partyRatioFloor: number | null;
  maxWinners: number | null;
  voteStartAt: string | null;
  voteEndAt: string | null;
  clockSuspendedAt: string | null;
  clockSuspendedBySubjectId: number | null;
  proposedByUserId: number | null;
  cancelledAt: string | null;
  cancelledByUserId: number | null;
  cancelReason: string | null;
  version: number;
}

/** 全平台统一分页返回体（对齐后端 PageResponse）。 */
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ListVotingSubjectsParams {
  page?: number;
  size?: number;
  status?: SubjectStatus;
  type?: SubjectType;
}

/** 议题分页列表（管理端）。 */
export function listVotingSubjects(
  params: ListVotingSubjectsParams = {},
): Promise<PageResponse<AdminSubject>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("size", String(params.size ?? 20));
  if (params.status) q.set("status", params.status);
  if (params.type) q.set("type", params.type);
  return apiGet<PageResponse<AdminSubject>>(`/voting-subjects?${q.toString()}`);
}

// ---- M4-2：双过半进度 ----

/** 对齐后端 SubjectProgressResponse。比例字段为 0~1 小数（4 位）。 */
export interface SubjectProgress {
  subjectId: number;
  status: SubjectStatus;
  scope: VotingScope;
  scopeReferenceId: number | null;
  totalArea: number;
  totalOwnerCount: number;
  participatingArea: number;
  participatingOwnerCount: number;
  participatingAreaRatio: number;
  participatingOwnerRatio: number;
  supportArea: number | null;
  supportOwnerCount: number | null;
  supportAreaRatio: number | null;
  supportOwnerRatio: number | null;
  /** 门槛分式：thresholdNumerator/thresholdDenominator = 2/3。 */
  thresholdNumerator: number;
  thresholdDenominator: number;
  quorumSatisfied: boolean;
  /** true 表示数据来自法定结算快照（此时 support* 为 null）。 */
  settled: boolean;
  passed: boolean;
  /** 立项时冻结的分母快照；存量或非选举议题可能为空。 */
  denominatorSnapshotId: number | null;
  denominatorMerkleRoot: string | null;
}

/** 议题双过半进度（实时或法定快照）。 */
export function getSubjectProgress(subjectId: number): Promise<SubjectProgress> {
  return apiGet<SubjectProgress>(`/voting-subjects/${subjectId}/progress`);
}

// ---- E2：投票监控基线 ----

/** 对齐后端 VoteMonitorResponse。比例字段为 0~1 小数（4 位）。 */
export interface VoteMonitor {
  subjectId: number;
  totalCount: number;
  unsignedCount: number;
  unsignedRatio: number;
  unsignedRatioThreshold: number;
  unsignedRatioAlert: boolean;
  rapidIntervalCount: number;
  rapidIntervalThreshold: number;
  rapidIntervalAlert: boolean;
}

/** 投票监控基线与告警判定（管理端）。 */
export function getSubjectMonitor(subjectId: number): Promise<VoteMonitor> {
  return apiGet<VoteMonitor>(`/voting-subjects/${subjectId}/monitor`);
}

// ---- E 后续：投票期事件驱动动员权限 ----

/** 当前登录 sys_user 在某议题投票期内被事件激活的催票/线下代录权限。 */
export interface VotingMobilizationPermission {
  permissionId: number;
  subjectId: number;
  buildingId: number;
  roleKey: string;
  canRemind: boolean;
  canOfflineProxy: boolean;
  activatedAt: string;
  expiresAt: string | null;
}

/** 查询当前用户在该议题下的动态动员权限。非 VOTING 议题返回空数组。 */
export function getMyMobilizationPermissions(
  subjectId: number,
): Promise<VotingMobilizationPermission[]> {
  return apiGet<VotingMobilizationPermission[]>(
    `/voting-subjects/${subjectId}/mobilization-permissions/me`,
  );
}

/** 对齐后端 SendMobilizationReminderRequest。 */
export interface SendMobilizationReminderInput {
  buildingId: number;
  message?: string | null;
}

/** 对齐后端 VotingMobilizationReminderResponse。 */
export interface VotingMobilizationReminder {
  reminderId: number;
  subjectId: number;
  tenantId: number;
  buildingId: number;
  sentByUserId: number;
  permissionId: number | null;
  targetScope: "UNVOTED_BUILDING_OWNERS";
  targetCount: number;
  messageTemplate: "VOTE_REMINDER";
  message: string | null;
  outboxEventId: number;
  sentAt: string;
}

/** 对授权楼栋发起一次催票，后端会落催票记录并写入通知 outbox。 */
export function sendMobilizationReminder(
  subjectId: number,
  input: SendMobilizationReminderInput,
): Promise<VotingMobilizationReminder> {
  return apiPost<VotingMobilizationReminder>(
    `/voting-subjects/${subjectId}/mobilization-reminders`,
    {
      buildingId: input.buildingId,
      message: input.message?.trim() || null,
    },
  );
}

export type ReminderDeliveryStatusCode = 1 | 2 | 3 | 4;

/** 对齐后端 VotingReminderDeliveryStatusResponse。 */
export interface VotingReminderDeliveryStatus {
  deliveryId: number;
  outboxEventId: number;
  subjectId: number;
  buildingId: number;
  opid: number;
  uid: number;
  phoneMasked: string | null;
  channel: string;
  messageTemplate: string;
  deliveryStatus: ReminderDeliveryStatusCode;
  attempts: number;
  createdAt: string;
  lastAttemptAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  providerMessageId: string | null;
  lastError: string | null;
}

export interface ListReminderDeliveriesParams {
  buildingId?: number;
  status?: ReminderDeliveryStatusCode;
  limit?: number;
}

/** 查询某议题下逐户催票投递状态。 */
export function listReminderDeliveries(
  subjectId: number,
  params: ListReminderDeliveriesParams = {},
): Promise<VotingReminderDeliveryStatus[]> {
  const q = new URLSearchParams();
  if (params.buildingId != null) q.set("buildingId", String(params.buildingId));
  if (params.status != null) q.set("status", String(params.status));
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiGet<VotingReminderDeliveryStatus[]>(
    `/voting-subjects/${subjectId}/reminder-deliveries${qs ? `?${qs}` : ""}`,
  );
}

export type VoteChannel = "ONLINE" | "PAPER" | "OFFLINE_PROXY";

/** 对齐后端 OfflineProxyVoteRequest。管理端线下代录固定写 OFFLINE_PROXY 通道。 */
export interface OfflineProxyVoteInput {
  opid: number;
  targetId?: number | null;
  choice: VoteChoice;
  offlineEvidenceHash?: string | null;
}

/** 对齐后端 VoteAcknowledgement。 */
export interface VoteAcknowledgement {
  voteId: number;
  voted: boolean;
}

/** 对授权楼栋进行线下代录投票；后端会校验动态 canOfflineProxy。 */
export function castOfflineProxyVote(
  subjectId: number,
  input: OfflineProxyVoteInput,
): Promise<VoteAcknowledgement> {
  return apiPost<VoteAcknowledgement>(
    `/voting-subjects/${subjectId}/offline-proxy-votes`,
    {
      opid: input.opid,
      targetId: input.targetId ?? null,
      choice: input.choice,
      offlineEvidenceHash: input.offlineEvidenceHash?.trim() || null,
    },
  );
}

// ---- M4-2：逐户投票明细 ----

export type VoteChoice = "SUPPORT" | "AGAINST" | "ABSTAIN";

/** 对齐后端 VoteDetailResponse。姓名/房号为数据缺口占位（见后端端口文档）。 */
export interface VoteDetail {
  opid: number;
  uid: number;
  buildingId: number;
  roomId: number;
  propertyArea: number;
  /** 认证等级 1=L1 / 2=L2 / 3=L3。 */
  authLevel: number | null;
  voted: boolean;
  /** 未投时为 null。 */
  choice: VoteChoice | null;
  votedAt: string | null;
}

/** 逐户投票明细分页。 */
export function listVoteDetails(
  subjectId: number,
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<VoteDetail>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("size", String(params.size ?? 20));
  return apiGet<PageResponse<VoteDetail>>(
    `/voting-subjects/${subjectId}/vote-details?${q.toString()}`,
  );
}

// ---- 方向 1：议题生命周期写动作（仅管理员 SYS_USER）----

/** 对齐后端 ProposeRequest。时间为 ISO 字符串（Instant）。 */
export interface ProposeSubjectInput {
  title: string;
  content?: string | null;
  subjectType: SubjectType;
  scope: VotingScope;
  /** scope=BUILDING 时为楼栋 id；COMMUNITY 时留空。 */
  scopeReferenceId?: number | null;
  voteStartAt: string;
  voteEndAt: string;
  /** 党员比例下限（可空）。 */
  partyRatioFloor?: number | null;
  /** subjectType=ELECTION 时必填，应选名额 ≥1。 */
  maxWinners?: number | null;
}

/** 立项：GENERAL/MAJOR 需 voting:subject:create；ELECTION 需 voting:subject:create:election。 */
export function proposeSubject(input: ProposeSubjectInput): Promise<AdminSubject> {
  return apiPost<AdminSubject>("/voting-subjects", input);
}

/** 公示：DRAFT → PUBLISHED（需 voting:subject:publish）。 */
export function publishSubject(subjectId: number): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/publish`);
}

/** 提交居委会初审：ELECTION DRAFT -> PENDING_COMMITTEE，需 voting:subject:create:election。 */
export function submitSubjectForReview(subjectId: number): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/submit-for-review`);
}

/** 居委会初审：APPROVE -> PENDING_STREET；REJECT -> DRAFT。 */
export function committeeReviewSubject(
  subjectId: number,
  decision: "APPROVE" | "REJECT",
  reason?: string,
): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/committee-review`, {
    decision,
    reason: reason?.trim() || null,
  });
}

/** 街道办终审：APPROVE -> PUBLISHED；REJECT -> DRAFT。 */
export function streetReviewSubject(
  subjectId: number,
  decision: "APPROVE" | "REJECT",
  reason?: string,
): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/street-review`, {
    decision,
    reason: reason?.trim() || null,
  });
}

/** 街道办换届备案通过：HANDOVER_LOCK -> NORMAL。 */
export function confirmHandover(): Promise<string> {
  return apiPost<string>("/handover/confirm");
}

/** 撤回：DRAFT（本人 / 政府）或 PUBLISHED（仅政府）。reason 必填 ≤500。 */
export function cancelSubject(subjectId: number, reason: string): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/cancel`, { reason });
}
