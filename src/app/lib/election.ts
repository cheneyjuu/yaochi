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
}

/** 管理端候选人名册（含所有资格状态）。需权限 voting:subject:audit。 */
export function listCandidates(subjectId: number): Promise<Candidate[]> {
  return apiGet<Candidate[]>(`/voting-subjects/${subjectId}/candidates`);
}

// ---- 写动作：提名 + 两段资格审查（管理端）----
// 对齐后端 ElectionCandidateController：
//   提名 candidate:nominate（GB，网格员/筹备组）；
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
 * 需权限 candidate:nominate。返回新建候选人 id。
 */
export function nominateCandidate(
  subjectId: number,
  input: NominateCandidateInput,
): Promise<{ candidateId: number }> {
  return apiPost<{ candidateId: number }>(`/voting-subjects/${subjectId}/candidates`, input);
}

/**
 * 党组书记前置审查：PENDING_PARTY_REVIEW → PENDING_COMMITTEE_REVIEW（通过）/ REJECTED（驳回）。
 * 需权限 candidate:review:party。
 */
export function partyReviewCandidate(candidateId: number, approve: boolean): Promise<Candidate> {
  return apiPost<Candidate>(`/candidates/${candidateId}/party-review`, { approve });
}

/**
 * 居委会资格审查：PENDING_COMMITTEE_REVIEW → APPROVED（通过）/ REJECTED（驳回）。
 * 需权限 candidate:approve。
 */
export function reviewCandidate(candidateId: number, approve: boolean): Promise<Candidate> {
  return apiPost<Candidate>(`/candidates/${candidateId}/review`, { approve });
}

// ---- 业主按手机号检索（提名时关联 uid）----
// 对齐后端 GET /owners/search?phone=，权限复用 candidate:nominate，手机号脱敏回显。
// uid 内部 id 不便记忆 → 输手机号定位业主，自动带入隐藏 uid；姓名仍手填。

/** 对齐后端 OwnerSearchResponse：uid 用于提名调用，phoneMasked/楼栋/房号用于辨识。 */
export interface OwnerOption {
  uid: number;
  phoneMasked: string;
  buildingId: number | null;
  roomId: number | null;
}

/**
 * 按手机号前缀检索本租户业主。后端守卫 <3 位返回空列表，最多 20 条。
 * 需权限 candidate:nominate。
 */
export function searchOwners(phone: string): Promise<OwnerOption[]> {
  return apiGet<OwnerOption[]>(`/owners/search?phone=${encodeURIComponent(phone)}`);
}
