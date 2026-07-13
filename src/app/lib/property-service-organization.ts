// 关联业务：连接小区物业服务组织登记、材料核验、项目部启用与物业角色授权前置接口。
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "./api";

export type PropertyServiceOrganizationStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "REJECTED";

export type PropertyServiceContractBasis =
  | "PRELIMINARY_PROPERTY_SERVICE"
  | "OWNERS_ASSEMBLY_SELECTED";

export type PropertyServiceOrganizationMaterialType =
  | "BUSINESS_LICENSE"
  | "PROPERTY_SERVICE_CONTRACT"
  | "OWNERS_ASSEMBLY_DECISION"
  | "OTHER";

export interface PropertyServiceOrganizationMaterial {
  materialId: number;
  materialType: PropertyServiceOrganizationMaterialType;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
}

export interface PropertyServiceOrganizationVerification {
  verificationId: number;
  verificationMethod: "PROPERTY_MANUAL" | "PLATFORM_API";
  providerCode?: string | null;
  sourceCode?: string | null;
  providerRequestId?: string | null;
  providerResultCode?: string | null;
  verificationResult: "PASSED" | "REJECTED" | "ERROR";
  businessStatus?: string | null;
  resultMessage?: string | null;
  inconsistentFields: string[];
  evidenceReference?: string | null;
  remark?: string | null;
  operatorAccountId: number;
  operatorUserId: number;
  operatorRoleKey: string;
  simulated: boolean;
  verifiedAt: string;
}

export interface PropertyServiceOrganization {
  organizationId: number;
  tenantId: number;
  enterpriseId: number;
  legalName: string;
  unifiedSocialCreditCode: string;
  projectDeptId?: number | null;
  projectDeptName: string;
  serviceContactName: string;
  serviceContactPhone: string;
  serviceBasis: PropertyServiceContractBasis;
  serviceStartDate: string;
  serviceEndDate?: string | null;
  status: PropertyServiceOrganizationStatus;
  rejectionReason?: string | null;
  version: number;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  materials: PropertyServiceOrganizationMaterial[];
  verifications: PropertyServiceOrganizationVerification[];
}

export interface PropertyServiceOrganizationInput {
  legalName: string;
  unifiedSocialCreditCode: string;
  projectDeptName?: string;
  serviceContactName: string;
  serviceContactPhone: string;
  serviceBasis: PropertyServiceContractBasis;
  serviceStartDate: string;
  serviceEndDate?: string;
  expectedVersion?: number;
}

export interface PropertyServiceOrganizationMaterialPreview {
  materialId: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  previewUrl: string;
  expiresAt: string;
}

export interface PropertyServiceEnterpriseVerificationProvider {
  providerCode: string;
  displayName: string;
  simulated: boolean;
}

export interface ManualPropertyServiceOrganizationVerificationInput {
  sourceCode: "GSXT_WEB" | "OTHER_GOVERNMENT_SOURCE";
  verificationResult: "PASSED" | "REJECTED";
  evidenceReference?: string;
  remark?: string;
}

export function listPropertyServiceOrganizations(): Promise<PropertyServiceOrganization[]> {
  return apiGet<PropertyServiceOrganization[]>("/admin/property-service-organizations");
}

export function createPropertyServiceOrganization(
  input: PropertyServiceOrganizationInput,
): Promise<PropertyServiceOrganization> {
  return apiPost<PropertyServiceOrganization>("/admin/property-service-organizations", input);
}

export function revisePropertyServiceOrganization(
  organizationId: number,
  input: PropertyServiceOrganizationInput,
): Promise<PropertyServiceOrganization> {
  return apiPut<PropertyServiceOrganization>(`/admin/property-service-organizations/${organizationId}`, input);
}

export function uploadPropertyServiceOrganizationMaterial(
  organizationId: number,
  materialType: PropertyServiceOrganizationMaterialType,
  file: File,
): Promise<PropertyServiceOrganizationMaterial> {
  const formData = new FormData();
  formData.append("materialType", materialType);
  formData.append("file", file);
  return apiUpload<PropertyServiceOrganizationMaterial>(
    `/admin/property-service-organizations/${organizationId}/materials`,
    formData,
  );
}

export function deletePropertyServiceOrganizationMaterial(
  organizationId: number,
  materialId: number,
): Promise<void> {
  return apiDelete<void>(`/admin/property-service-organizations/${organizationId}/materials/${materialId}`);
}

export function previewPropertyServiceOrganizationMaterial(
  organizationId: number,
  materialId: number,
): Promise<PropertyServiceOrganizationMaterialPreview> {
  return apiGet<PropertyServiceOrganizationMaterialPreview>(
    `/admin/property-service-organizations/${organizationId}/materials/${materialId}/preview-url`,
  );
}

export function submitPropertyServiceOrganization(
  organizationId: number,
  expectedVersion: number,
): Promise<PropertyServiceOrganization> {
  return apiPost<PropertyServiceOrganization>(
    `/admin/property-service-organizations/${organizationId}/submit`,
    { expectedVersion },
  );
}

export function getPropertyServiceEnterpriseVerificationProvider(): Promise<PropertyServiceEnterpriseVerificationProvider> {
  return apiGet<PropertyServiceEnterpriseVerificationProvider>(
    "/admin/property-service-organizations/verification-provider",
  );
}

export function verifyPropertyServiceOrganizationManually(
  organizationId: number,
  input: ManualPropertyServiceOrganizationVerificationInput,
): Promise<PropertyServiceOrganization> {
  return apiPost<PropertyServiceOrganization>(
    `/admin/property-service-organizations/${organizationId}/verifications/manual`,
    input,
  );
}

export function verifyPropertyServiceOrganizationWithPlatform(
  organizationId: number,
): Promise<PropertyServiceOrganization> {
  return apiPost<PropertyServiceOrganization>(
    `/admin/property-service-organizations/${organizationId}/verifications/platform`,
    { enterpriseAuthorizationConfirmed: true },
  );
}
