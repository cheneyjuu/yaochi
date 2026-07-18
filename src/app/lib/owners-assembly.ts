// 关联业务：为业主大会办理页提供会议筹备、材料归档、公示、纸质送达和计票的业务接口，屏蔽内部包号与文件摘要。
import { apiGet, apiPost, apiUpload } from "./api";
import type { SubjectType, VoteChoice } from "./voting";

export type OwnersAssemblyPreparationMode = "OFFLINE_MEETING" | "WRITTEN_DECISION" | "ONLINE_AND_OFFLINE";
export type OwnersAssemblyMaterialType =
  | "PUBLIC_NOTICE"
  | "PLAN_ATTACHMENT"
  | "PAPER_BALLOT_TEMPLATE"
  | "DELIVERY_EVIDENCE"
  | "PAPER_BALLOT";

export interface OwnersAssemblySession {
  sessionId: number;
  tenantId: number;
  title: string;
  preparationMode: OwnersAssemblyPreparationMode;
  status: string;
  createdByUserId: number;
  createTime: string;
}

export interface OwnersAssemblyArrangement {
  status: "PACKAGE_DRAFT" | "PUBLIC_NOTICE" | "VOTING" | "SETTLED";
  votingChannelPolicy: "PAPER_ONLY";
  publicNoticeDays: number;
  publicNoticeStartAt: string | null;
  publicNoticeEndAt: string | null;
  voteStartAt: string;
  voteEndAt: string;
  lockedAt: string | null;
}

export interface OwnersAssemblySubjectDraft {
  draftId: number;
  subjectType: Extract<SubjectType, "GENERAL" | "MAJOR">;
  title: string;
  content: string | null;
  createTime: string;
}

export interface OwnersAssemblyFormalSubject {
  subjectId: number;
  subjectType: Extract<SubjectType, "GENERAL" | "MAJOR">;
  title: string;
  status: string;
}

export interface OwnersAssemblyMaterial {
  materialId: number;
  materialType: OwnersAssemblyMaterialType;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  createTime: string;
}

export interface OwnersAssemblyWorkspace {
  assembly: OwnersAssemblySession;
  arrangement: OwnersAssemblyArrangement | null;
  draftSubjects: OwnersAssemblySubjectDraft[];
  formalSubjects: OwnersAssemblyFormalSubject[];
  materials: OwnersAssemblyMaterial[];
}

export interface OwnerListItem {
  uid: number;
  realName: string;
  phoneMasked: string;
  propertyCount: number;
}

export interface OwnerPropertyOption {
  opid: number;
  buildingName: string;
  unitName: string | null;
  roomName: string;
  communityName: string;
}

interface PageResponse<T> {
  items: T[];
  total: number;
}

interface OwnerDetailResponse {
  profile: OwnerListItem;
  properties: OwnerPropertyOption[];
}

export function listOwnersAssemblies(): Promise<OwnersAssemblySession[]> {
  return apiGet<OwnersAssemblySession[]>("/owners-assemblies");
}

export function getOwnersAssemblyWorkspace(sessionId: number): Promise<OwnersAssemblyWorkspace> {
  return apiGet<OwnersAssemblyWorkspace>(`/owners-assemblies/${sessionId}/workspace`);
}

export function createOwnersAssemblySession(input: {
  title: string;
  preparationMode: OwnersAssemblyPreparationMode;
}): Promise<OwnersAssemblySession> {
  return apiPost<OwnersAssemblySession>("/owners-assemblies", input);
}

export function createOwnersAssemblySubjectDraft(sessionId: number, input: {
  subjectType: Extract<SubjectType, "GENERAL" | "MAJOR">;
  title: string;
  content?: string | null;
}): Promise<OwnersAssemblySubjectDraft> {
  return apiPost<OwnersAssemblySubjectDraft>(`/owners-assemblies/${sessionId}/subjects`, input);
}

export function uploadOwnersAssemblyMaterial(
  sessionId: number,
  materialType: OwnersAssemblyMaterialType,
  file: File,
): Promise<OwnersAssemblyMaterial> {
  const form = new FormData();
  form.set("materialType", materialType);
  form.set("file", file);
  return apiUpload<OwnersAssemblyMaterial>(`/owners-assemblies/${sessionId}/materials`, form);
}

export function confirmOwnersAssemblyArrangement(sessionId: number, input: {
  publicNoticeDays: number;
  voteStartAt: string;
  voteEndAt: string;
  publicNoticeMaterialId: number;
  planAttachmentMaterialIds: number[];
  ballotTemplateMaterialId: number;
}): Promise<OwnersAssemblyArrangement> {
  return apiPost<OwnersAssemblyArrangement>(`/owners-assemblies/${sessionId}/arrangement`, input);
}

export function publishOwnersAssemblyArrangement(sessionId: number): Promise<OwnersAssemblyArrangement> {
  return apiPost<OwnersAssemblyArrangement>(`/owners-assemblies/${sessionId}/publish`);
}

export function startOwnersAssemblyVoting(sessionId: number): Promise<OwnersAssemblyArrangement> {
  return apiPost<OwnersAssemblyArrangement>(`/owners-assemblies/${sessionId}/start-voting`);
}

export function settleOwnersAssembly(sessionId: number): Promise<OwnersAssemblyArrangement> {
  return apiPost<OwnersAssemblyArrangement>(`/owners-assemblies/${sessionId}/settle`);
}

export function recordOwnersAssemblyPaperDelivery(sessionId: number, input: {
  opid: number;
  deliveryMethod: string;
  evidenceMaterialId: number;
}): Promise<void> {
  return apiPost<void>(`/owners-assemblies/${sessionId}/paper-deliveries`, input);
}

export function castOwnersAssemblyPaperVote(sessionId: number, input: {
  subjectId: number;
  opid: number;
  choice: VoteChoice;
  ballotMaterialId: number;
}): Promise<void> {
  return apiPost<void>(`/owners-assemblies/${sessionId}/paper-votes`, input);
}

/** 纸质办理仅用于定位房屋，页面不展示或要求手工输入内部房产编号。 */
export function searchOwnersByPhone(phonePrefix: string): Promise<OwnerListItem[]> {
  const query = new URLSearchParams({ page: "1", size: "20", phone: phonePrefix.trim() });
  return apiGet<PageResponse<OwnerListItem>>(`/owners?${query.toString()}`).then((page) => page.items);
}

export function getOwnerPropertyOptions(uid: number): Promise<OwnerDetailResponse> {
  return apiGet<OwnerDetailResponse>(`/owners/${uid}`);
}
