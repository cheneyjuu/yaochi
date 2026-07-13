// 关联业务：连接物业管理模式的业主大会决议申请、属地审核执行和不可变审计接口。
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "./api";
import type { BackendPropertyManagementMode } from "./types";

export type PropertyManagementModeChangeStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "RETURNED"
  | "REJECTED"
  | "EXECUTED";

export type PropertyManagementModeChangeMaterialType =
  | "OWNERS_ASSEMBLY_RESOLUTION"
  | "SUPPORTING_EVIDENCE";

export type PropertyManagementModeChangeDecision = "RETURN" | "REJECT" | "EXECUTE";

export interface PropertyManagementModeChangeMaterial {
  materialId: number;
  materialType: PropertyManagementModeChangeMaterialType;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  uploadedByAccountId: number;
  createdAt: string;
}

export interface PropertyManagementModeChangeAudit {
  auditId: number;
  actorAccountId: number;
  actorUserId: number;
  actorDeptId: number;
  eventType: string;
  fromStatus: PropertyManagementModeChangeStatus | null;
  toStatus: PropertyManagementModeChangeStatus | null;
  payloadJson: string;
  createdAt: string;
}

export interface PropertyManagementModeChange {
  effectivePropertyMode: BackendPropertyManagementMode | null;
  requestId: number;
  tenantId: number;
  currentPropertyMode: BackendPropertyManagementMode | null;
  requestedPropertyMode: BackendPropertyManagementMode;
  ownersAssemblyResolutionReference: string;
  changeReason: string;
  status: PropertyManagementModeChangeStatus;
  applicantAccountId: number;
  applicantUserId: number;
  applicantDeptId: number;
  submittedAt: string | null;
  reviewerAccountId: number | null;
  reviewerUserId: number | null;
  reviewerDeptId: number | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  executedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  materials: PropertyManagementModeChangeMaterial[];
  audits: PropertyManagementModeChangeAudit[];
}

export interface UpsertPropertyManagementModeChangeInput {
  requestedPropertyMode: BackendPropertyManagementMode;
  ownersAssemblyResolutionReference: string;
  changeReason: string;
  expectedVersion?: number;
}

export interface PropertyManagementModeChangeMaterialPreview {
  materialId: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  previewUrl: string;
  expiresAt: string;
}

const ROOT = "/admin/property-management-mode-changes";

/** 当前租户的有效模式及其全部申请历史。 */
export function listPropertyManagementModeChanges(): Promise<PropertyManagementModeChange[]> {
  return apiGet<PropertyManagementModeChange[]>(ROOT);
}

export function createPropertyManagementModeChange(
  input: UpsertPropertyManagementModeChangeInput,
): Promise<PropertyManagementModeChange> {
  return apiPost<PropertyManagementModeChange>(ROOT, input);
}

export function revisePropertyManagementModeChange(
  requestId: number,
  input: UpsertPropertyManagementModeChangeInput,
): Promise<PropertyManagementModeChange> {
  return apiPut<PropertyManagementModeChange>(`${ROOT}/${requestId}`, input);
}

export function uploadPropertyManagementModeChangeMaterial(
  requestId: number,
  materialType: PropertyManagementModeChangeMaterialType,
  file: File,
): Promise<PropertyManagementModeChangeMaterial> {
  const formData = new FormData();
  formData.append("materialType", materialType);
  formData.append("file", file);
  return apiUpload<PropertyManagementModeChangeMaterial>(`${ROOT}/${requestId}/materials`, formData);
}

export function deletePropertyManagementModeChangeMaterial(
  requestId: number,
  materialId: number,
): Promise<void> {
  return apiDelete<void>(`${ROOT}/${requestId}/materials/${materialId}`);
}

export function previewPropertyManagementModeChangeMaterial(
  requestId: number,
  materialId: number,
): Promise<PropertyManagementModeChangeMaterialPreview> {
  return apiGet<PropertyManagementModeChangeMaterialPreview>(
    `${ROOT}/${requestId}/materials/${materialId}/preview-url`,
  );
}

export function submitPropertyManagementModeChange(
  requestId: number,
  expectedVersion: number,
): Promise<PropertyManagementModeChange> {
  return apiPost<PropertyManagementModeChange>(`${ROOT}/${requestId}/submit`, { expectedVersion });
}

export function reviewPropertyManagementModeChange(
  requestId: number,
  input: {
    decision: PropertyManagementModeChangeDecision;
    reviewComment?: string;
    expectedVersion: number;
  },
): Promise<PropertyManagementModeChange> {
  return apiPost<PropertyManagementModeChange>(`${ROOT}/${requestId}/reviews`, input);
}
