// 议题（VotingSubject）管理端封装 —— 对齐后端 SubjectAdminController。
// M4-1：GET /voting-subjects 分页列表。
// M4-2：GET /voting-subjects/{id}/progress 双过半进度 + /vote-details 逐户明细。
// 方向 1：POST 立项 / 公示 / 撤回 写动作（仅管理员，C 端业主投票不在此）。

import { apiGet, apiPost } from "./api";

// ---- 后端枚举（按 name 序列化，与 com.pangu.domain.model.voting.* 一致）----
export type SubjectType = "ELECTION" | "MAJOR" | "GENERAL";
export type SubjectStatus =
  | "DRAFT"
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
  subjectType: SubjectType;
  status: SubjectStatus;
  scope: VotingScope;
  scopeReferenceId: number | null;
  partyRatioFloor: number | null;
  voteStartAt: string | null;
  voteEndAt: string | null;
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
}

/** 议题双过半进度（实时或法定快照）。 */
export function getSubjectProgress(subjectId: number): Promise<SubjectProgress> {
  return apiGet<SubjectProgress>(`/voting-subjects/${subjectId}/progress`);
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

/** 立项：落库为 DRAFT 草稿（需 voting:subject:create）。 */
export function proposeSubject(input: ProposeSubjectInput): Promise<AdminSubject> {
  return apiPost<AdminSubject>("/voting-subjects", input);
}

/** 公示：DRAFT → PUBLISHED（需 voting:subject:publish）。 */
export function publishSubject(subjectId: number): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/publish`);
}

/** 撤回：DRAFT（本人 / 政府）或 PUBLISHED（仅政府）。reason 必填 ≤500。 */
export function cancelSubject(subjectId: number, reason: string): Promise<AdminSubject> {
  return apiPost<AdminSubject>(`/voting-subjects/${subjectId}/cancel`, { reason });
}
