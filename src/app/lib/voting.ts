// 议题（VotingSubject）管理端查询封装 —— 对齐后端 SubjectAdminController。
// M4-1：GET /voting-subjects 分页列表。结算/进度明细数据待后续里程碑接入。

import { apiGet } from "./api";

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
