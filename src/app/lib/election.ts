// 业委会选举（换届）管理端读封装 —— 对齐后端 ElectionCandidateController。
// 方向 2（读接线）：GET /voting-subjects/{id}/candidates 候选人名册 + 资格状态。
// 注：投票看板进度复用 voting.ts 的 getSubjectProgress；议题选择复用 listVotingSubjects({type:'ELECTION'})。
// 数据缺口：候选人 DTO 不含楼栋/简介；per-candidate 得票与当选名单后端未经 HTTP 暴露（仅结算引擎内部计算）。

import { apiGet, apiPost } from "./api";

// ---- 后端枚举（按 name 序列化，与 com.pangu.domain.model.voting.CandidateStatus 一致）----
// 两段资格审查：PENDING_PARTY_REVIEW(党组前置) → PENDING_COMMITTEE_REVIEW(居委会) → APPROVED/REJECTED。
export type CandidateStatus =
  | "PENDING_PARTY_REVIEW"
  | "PENDING_COMMITTEE_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

/** 对齐后端 CandidateResponse（管理端 + C 端共用）。无楼栋/简介/得票字段。 */
export interface Candidate {
  candidateId: number;
  subjectId: number;
  uid: number;
  name: string;
  partyMember: boolean;
  qualificationStatus: CandidateStatus;
  rejectReasonCode?: RejectReasonCode | null;
  rejectEvidenceJson?: string | null;
  rejectReviewerUserId?: number | null;
  rejectReviewStage?: "PARTY_REVIEW" | "COMMITTEE_REVIEW" | null;
}

/** 管理端候选人名册（含所有资格状态）。需权限 voting:subject:audit。 */
export function listCandidates(subjectId: number): Promise<Candidate[]> {
  return apiGet<Candidate[]>(`/voting-subjects/${subjectId}/candidates`);
}

// ---- 写动作：提名 + 两段资格审查（管理端）----
// 对齐后端 ElectionCandidateController：
//   提名 candidate:nominate + GOV_OPERATOR/dept_type 护栏（G 端基层经办员）；
//   党组前置审查 candidate:review:party（G，党组书记）；
//   居委会资格审查 candidate:approve（G，居委会）。
// 议题状态 / 候选人归属 / 状态机由后端 service 层强校验，前端仅按权限+状态做按钮门控。

/** 对齐后端 NominateCandidateRequest：uid(必填) / name(必填 ≤64) / partyMember。 */
export interface NominateCandidateInput {
  uid: number;
  name: string;
  partyMember: boolean;
}

/**
 * 提名候选人：写入 PENDING_PARTY_REVIEW，仅 ELECTION 且议题处于 DRAFT/PUBLISHED。
 * 需权限 candidate:nominate，且后端要求 roleKey=GOV_OPERATOR + dept_type IN (2,5)。返回新建候选人 id。
 */
export function nominateCandidate(
  subjectId: number,
  input: NominateCandidateInput,
): Promise<{ candidateId: number }> {
  return apiPost<{ candidateId: number }>(`/voting-subjects/${subjectId}/candidates`, input);
}

export type RejectReasonCode = "C1" | "C2" | "C3" | "C4" | "C5";

export interface RejectEvidenceInput {
  rejectReasonCode: RejectReasonCode;
  rejectEvidence: Record<string, unknown>;
}

/**
 * 党组书记前置审查：PENDING_PARTY_REVIEW → PENDING_COMMITTEE_REVIEW（通过）/ REJECTED（驳回）。
 * 需权限 candidate:review:party。
 */
export function partyReviewCandidate(
  candidateId: number,
  approve: boolean,
  reject?: RejectEvidenceInput,
): Promise<Candidate> {
  return apiPost<Candidate>(`/candidates/${candidateId}/party-review`, approve ? { approve } : { approve, ...reject });
}

/**
 * 居委会资格审查：PENDING_COMMITTEE_REVIEW → APPROVED（通过）/ REJECTED（驳回）。
 * 需权限 candidate:approve。
 */
export function reviewCandidate(
  candidateId: number,
  approve: boolean,
  reject?: RejectEvidenceInput,
): Promise<Candidate> {
  return apiPost<Candidate>(`/candidates/${candidateId}/review`, approve ? { approve } : { approve, ...reject });
}

// ---- 业主按手机号检索（提名时关联 uid）----
// 对齐后端 GET /owners/search?phone=，权限复用 candidate:nominate，手机号脱敏回显。
// uid 内部 id 不便记忆 → 输手机号定位业主，自动带入隐藏 uid；姓名仍手填。

/** 对齐后端 OwnerSearchResponse：uid 用于提名调用，name/phoneMasked/楼栋/房号用于辨识。 */
export interface OwnerOption {
  uid: number;
  name: string | null;
  phoneMasked: string;
  buildingId: number | null;
  roomId: number | null;
}

/**
 * 按关键词检索本租户业主，用于候选人提名定位 uid。
 *
 * <p>支持的关键词维度（由后端 application 层自动分流）：
 *   - 全数字 → 手机号模糊（前缀 / 中段 / 尾号，≥3 位生效）
 *   - 含非数字字符 → 姓名 contains（解密 real_name 后匹配）
 * 命中 20 条以内。需权限 candidate:nominate。
 */
export function searchOwners(keyword: string): Promise<OwnerOption[]> {
  return apiGet<OwnerOption[]>(`/owners/search?q=${encodeURIComponent(keyword)}`);
}
