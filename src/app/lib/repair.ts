// 关联业务：对接维修工单登记、勘验、表决、报审、盖章、合同和验收接口。
import { apiDelete, apiGet, apiPost, apiUpload } from "./api";

export type RepairSpaceScope = "PRIVATE" | "PUBLIC";
export type RepairPublicAreaScope = "BUILDING" | "COMMUNITY";
export type RepairStatus =
  | "SUBMITTED"
  | "PENDING_VERIFY"
  | "NEED_MANUAL_LOCATION"
  | "VERIFIED"
  | "ASSIGNED"
  | "SURVEYING"
  | "SURVEY_COMPLETED"
  | "PROJECT_LINKED"
  | "QUOTE_COLLECTING"
  | "QUOTE_SUBMITTED"
  | "SUPPLIER_RECOMMENDED"
  | "PLAN_SUBMITTED"
  | "LOCAL_DECISION_PENDING"
  | "LOCAL_DECISION_PASSED"
  | "ASSEMBLY_DECISION_PENDING"
  | "APPROVAL_DOCUMENT_PREPARING"
  | "PRICE_REVIEW_PENDING"
  | "GOVERNANCE_PENDING"
  | "GOVERNANCE_CONFIRMED"
  | "SEALED"
  | "CONTRACT_SIGNING"
  | "CONTRACT_EFFECTIVE"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PENDING_ACCEPTANCE"
  | "ACCEPTANCE_EXCEPTION"
  | "RECTIFICATION_REQUIRED"
  | "COMPLETED"
  | "EVALUATED"
  | "ARCHIVED"
  | "REJECTED"
  | "CANCELLED"
  | "SUSPENDED"
  | "ESCALATED"
  | "REASSIGN_REQUIRED"
  | "PLAN_REVISION_REQUIRED"
  | "CHANGE_REVIEW_PENDING"
  | "PAYMENT_EXCEPTION"
  | "HANDOVER_LOCK"
  | "EMERGENCY_REPORTED"
  | "EMERGENCY_MITIGATION"
  | "EMERGENCY_PLAN_PENDING"
  | "EMERGENCY_REPAIRING";

export interface RegisterSupplierOrganizationInput {
  legalName: string;
  unifiedSocialCreditCode?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface RepairSupplierOrganization {
  supplierDeptId: number;
  unifiedSocialCreditCode?: string;
  legalName: string;
  contactName?: string;
  contactPhone?: string;
  verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "DISABLED";
  verificationId?: number;
  verificationMethod?: "PROPERTY_MANUAL" | "PLATFORM_API";
  verificationProviderCode?: string;
  verificationSourceCode?: string;
  verificationSimulated: boolean;
  verifiedByAccountId?: number;
  verifiedByUserId?: number;
  verifiedAt?: string;
  accountStatus: "CONTACT_MISSING" | "NOT_INVITED" | "PENDING_ACTIVATION" | "ACTIVATED";
  activeAccountCount: number;
  loginPhone?: string;
  activationInvitationId?: number;
  activationInvitationExpiresAt?: string;
}

export interface EnterpriseVerificationProviderDescriptor {
  providerCode: string;
  displayName: string;
  simulated: boolean;
}

export interface SupplierEnterpriseVerificationRecord {
  verificationId: number;
  supplierDeptId: number;
  legalNameSnapshot: string;
  unifiedSocialCreditCodeSnapshot: string;
  verificationMethod: "PROPERTY_MANUAL" | "PLATFORM_API";
  providerCode?: string;
  sourceCode?: string;
  providerRequestId?: string;
  providerResultCode?: string;
  verificationResult: "PASSED" | "REJECTED" | "ERROR";
  businessStatus?: string;
  resultMessage?: string;
  inconsistentFields: string[];
  evidenceReference?: string;
  remark?: string;
  operatorAccountId: number;
  operatorUserId: number;
  operatorRoleKey: string;
  simulated: boolean;
  verifiedAt: string;
}

export interface RepairContractSupplierCandidate {
  quoteId: number;
  supplierDeptId?: number | null;
  supplierName: string;
  quoteAmount: number;
  verificationStatus?: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "DISABLED" | "NOT_REGISTERED" | null;
  contractEligible: boolean;
  contractEligibilityMessage?: string | null;
}

export interface SupplierActivationInvitation {
  invitationId: number;
  supplierDeptId: number;
  supplierLegalName: string;
  contactName: string;
  contactPhone: string;
  status: string;
  expiresAt: string;
}

export interface RepairSupplierQuote {
  quoteId: number;
  supplierDeptId: number;
  supplierName: string;
  quoteAmount: number;
  quoteSummary?: string | null;
  attachmentId: number;
  submissionSource: string;
  confirmationStatus: string;
  quoteStatus: "ACTIVE" | "REVISION_REQUESTED" | "SUPERSEDED";
  revisionNo: number;
  supersededByQuoteId?: number | null;
  createTime: string;
}

export interface RepairQuoteInvitation {
  quoteInvitationId: number;
  supplierDeptId: number;
  supplierName: string;
  status: string;
  invitationRound: number;
  invitationType: "INITIAL" | "REVISION";
  revisionReason?: string | null;
  deadline?: string | null;
  sentAt: string;
}

export interface RepairAttachment {
  attachmentId: number;
  originalFileName: string;
  contentType: string;
  actualSize: number;
  etag: string;
}

export interface RepairAttachmentDownloadTicket {
  attachmentId: number;
  downloadUrl: string;
  expiresAt: string;
}

export interface RepairAttachmentPreviewTicket {
  attachmentId: number;
  originalFileName: string;
  contentType: string;
  actualSize: number;
  previewUrl: string;
  converted: boolean;
  expiresAt: string;
}

export interface RepairFrameworkRelation {
  relationId: number;
  supplierDeptId: number;
  supplierLegalName: string;
  serviceCategory?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface RepairWorkOrder {
  workOrderId: number;
  orderNo: string;
  tenantId: number;
  title: string;
  description?: string | null;
  source: string;
  spaceScope: RepairSpaceScope;
  publicAreaScope?: RepairPublicAreaScope | null;
  status: RepairStatus;
  reporterAccountId: number;
  reporterUid?: number | null;
  reporterUserId?: number | null;
  roomId?: number | null;
  buildingId?: number | null;
  locationText?: string | null;
  needManualLocation: boolean;
  locationLocked: boolean;
  assignedUserId?: number | null;
  assigneeRoleKey?: string | null;
  assigneeDeptId?: number | null;
  category?: string | null;
  riskLevel?: string | null;
  surveySummary?: string | null;
  planBudget?: number | null;
  publicCeilingPrice?: number | null;
  fundSource?: string | null;
  fundGateBlocked: boolean;
  satisfactionScore?: number | null;
  satisfactionComment?: string | null;
  version: number;
  createTime: string;
  updateTime: string;
}

export interface RepairPlanningPolicy {
  internalEstimateRequired: boolean;
  buildingRepairDefaultDecisionChannel: "ONLINE" | "WECHAT";
}

export interface RepairSupplierWorkOrder {
  workOrderId: number;
  orderNo: string;
  title: string;
  description?: string | null;
  spaceScope: RepairSpaceScope;
  status: RepairStatus;
  buildingId?: number | null;
  locationText?: string | null;
  category?: string | null;
  surveySummary?: string | null;
  publicCeilingPrice?: number | null;
  createTime: string;
  updateTime: string;
}

export interface RepairEvent {
  eventId: number;
  workOrderId: number;
  action: string;
  fromStatus?: RepairStatus | null;
  toStatus?: RepairStatus | null;
  actorAccountId?: number | null;
  actorIdentityType?: string | null;
  actorIdentityId?: number | null;
  remark?: string | null;
  payloadJson?: string | null;
  createTime: string;
}

export interface RepairLocationOptions {
  communities: RepairLocationCommunityOption[];
}

export interface RepairDecisionRoom {
  roomId: number;
  roomLabel: string;
  buildArea: number;
}

export interface RepairLocalDecision {
  decisionId: number;
  decisionChannel: "ONLINE" | "WECHAT";
  scopeType: "BUILDING" | "BUILDING_UNIT";
  unitName?: string | null;
  scopeLabel?: string | null;
  totalOwnerCount: number;
  totalArea: number;
  participatedOwnerCount?: number | null;
  participatedArea?: number | null;
  agreeOwnerCount?: number | null;
  agreeArea?: number | null;
  disagreeOwnerCount?: number | null;
  disagreeArea?: number | null;
  abstainOwnerCount?: number | null;
  abstainArea?: number | null;
  invalidOwnerCount?: number | null;
  invalidArea?: number | null;
  evidenceAttachmentHash?: string | null;
  currentThresholdPassed: boolean;
  result: string;
}

export interface RepairLocationCommunityOption {
  tenantId: number;
  communityName: string;
  buildings: RepairLocationBuildingOption[];
}

export interface RepairLocationBuildingOption {
  buildingId: number;
  buildingName: string;
  units: RepairLocationUnitOption[];
}

export interface RepairLocationUnitOption {
  unitName: string;
  rooms: RepairLocationRoomOption[];
}

export interface RepairLocationRoomOption {
  roomId: number;
  roomName: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface CreateRepairInput {
  publicAreaScope?: RepairPublicAreaScope | null;
  buildingId?: number | null;
  locationText?: string;
  title: string;
  description?: string;
  category?: string;
}

export function pageRepairWorkOrders(params: {
  status?: string;
  scope?: string;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<RepairWorkOrder>> {
  const query = new URLSearchParams();
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.scope && params.scope !== "ALL") query.set("scope", params.scope);
  if (params.keyword) query.set("keyword", params.keyword);
  query.set("page", String(params.page ?? 1));
  query.set("size", String(params.size ?? 20));
  return apiGet<PageResponse<RepairWorkOrder>>(`/admin/repair-work-orders?${query.toString()}`);
}

export function createRepairWorkOrder(input: CreateRepairInput): Promise<RepairWorkOrder> {
  return apiPost<RepairWorkOrder>("/admin/repair-work-orders", input);
}

export function uploadRepairIntakeAttachment(workOrderId: number, file: File): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("contentType", file.type || "application/octet-stream");
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/admin/repair-work-orders/${workOrderId}/intake-attachments`, form);
}

export function listRepairEvents(workOrderId: number): Promise<RepairEvent[]> {
  return apiGet<RepairEvent[]>(`/admin/repair-work-orders/${workOrderId}/events`);
}

export function listRepairLocationOptions(): Promise<RepairLocationOptions> {
  return apiGet<RepairLocationOptions>("/admin/repair-work-orders/location-options");
}

export function repairAction(workOrderId: number, action: string, body: unknown = {}): Promise<RepairWorkOrder> {
  return apiPost<RepairWorkOrder>(`/admin/repair-work-orders/${workOrderId}/${action}`, body);
}

export function listRepairDecisionRooms(workOrderId: number): Promise<RepairDecisionRoom[]> {
  return apiGet<RepairDecisionRoom[]>(`/admin/repair-work-orders/${workOrderId}/local-decision-rooms`);
}

export function getRepairLocalDecision(workOrderId: number): Promise<RepairLocalDecision> {
  return apiGet<RepairLocalDecision>(`/admin/repair-work-orders/${workOrderId}/local-decision`);
}

export function getRepairPlanningPolicy(): Promise<RepairPlanningPolicy> {
  return apiGet<RepairPlanningPolicy>("/admin/repair-work-orders/planning-policy");
}

export function registerSupplierOrganization(input: RegisterSupplierOrganizationInput): Promise<number> {
  return apiPost<number>("/admin/supplier-organizations", input);
}

export function createSupplierActivationInvitation(
  supplierDeptId: number,
  input: { contactName?: string; contactPhone?: string; validHours?: number } = {},
): Promise<SupplierActivationInvitation> {
  return apiPost<SupplierActivationInvitation>(
    `/admin/supplier-organizations/${supplierDeptId}/activation-invitations`,
    input,
  );
}

export function listRepairSupplierOrganizations(): Promise<RepairSupplierOrganization[]> {
  return apiGet<RepairSupplierOrganization[]>("/admin/supplier-organizations");
}

export function getEnterpriseVerificationProvider(): Promise<EnterpriseVerificationProviderDescriptor> {
  return apiGet<EnterpriseVerificationProviderDescriptor>(
    "/admin/supplier-organizations/verification-provider",
  );
}

export function verifySupplierEnterpriseManually(
  supplierDeptId: number,
  input: {
    unifiedSocialCreditCode: string;
    sourceCode: "GSXT_WEB" | "OTHER_GOVERNMENT_SOURCE";
    verificationResult: "PASSED" | "REJECTED";
    evidenceReference?: string;
    remark?: string;
  },
): Promise<SupplierEnterpriseVerificationRecord> {
  return apiPost<SupplierEnterpriseVerificationRecord>(
    `/admin/supplier-organizations/${supplierDeptId}/manual-verifications`,
    input,
  );
}

export function verifySupplierEnterpriseWithPlatform(
  supplierDeptId: number,
  input: { unifiedSocialCreditCode: string; supplierAuthorizationConfirmed: boolean },
): Promise<SupplierEnterpriseVerificationRecord> {
  return apiPost<SupplierEnterpriseVerificationRecord>(
    `/admin/supplier-organizations/${supplierDeptId}/platform-verifications`,
    input,
  );
}

export function listSupplierEnterpriseVerifications(
  supplierDeptId: number,
): Promise<SupplierEnterpriseVerificationRecord[]> {
  return apiGet<SupplierEnterpriseVerificationRecord[]>(
    `/admin/supplier-organizations/${supplierDeptId}/verifications`,
  );
}

export function listRepairSupplierQuotes(workOrderId: number): Promise<RepairSupplierQuote[]> {
  return apiGet<RepairSupplierQuote[]>(`/admin/repair-work-orders/${workOrderId}/supplier-quotes`);
}

export function getRepairContractSupplierCandidate(
  workOrderId: number,
): Promise<RepairContractSupplierCandidate> {
  return apiGet<RepairContractSupplierCandidate>(
    `/admin/repair-work-orders/${workOrderId}/contract-supplier-candidate`,
  );
}

export function listRepairSupplierQuoteHistory(
  workOrderId: number,
  supplierDeptId: number,
): Promise<RepairSupplierQuote[]> {
  return apiGet<RepairSupplierQuote[]>(
    `/admin/repair-work-orders/${workOrderId}/supplier-quotes/${supplierDeptId}/history`,
  );
}

export function listRepairQuoteInvitations(workOrderId: number): Promise<RepairQuoteInvitation[]> {
  return apiGet<RepairQuoteInvitation[]>(`/admin/repair-work-orders/${workOrderId}/quote-invitations`);
}

export function uploadPropertyQuoteAttachment(workOrderId: number, file: File): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("attachmentKind", "QUOTE_DOCUMENT");
  form.append("contentType", file.type || "application/octet-stream");
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/admin/repair-work-orders/${workOrderId}/attachments`, form);
}

export function uploadSolitaireScreenshot(workOrderId: number, file: File): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("attachmentKind", "SOLITAIRE_SCREENSHOT");
  form.append("contentType", file.type || "image/jpeg");
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/admin/repair-work-orders/${workOrderId}/attachments`, form);
}

export function uploadRepairApprovalDocument(workOrderId: number, file: File): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("attachmentKind", "APPROVAL_DOCUMENT");
  form.append("contentType", file.type || "application/octet-stream");
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/admin/repair-work-orders/${workOrderId}/attachments`, form);
}

export function uploadGovernanceSealedDocument(workOrderId: number, file: File): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("attachmentKind", "GOVERNANCE_SEALED_DOCUMENT");
  form.append("contentType", file.type || "application/octet-stream");
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/admin/repair-work-orders/${workOrderId}/attachments`, form);
}

export function uploadRepairFieldAttachment(
  workOrderId: number,
  kind: "SURVEY_IMAGE" | "SURVEY_VIDEO",
  file: File,
): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("attachmentKind", kind);
  form.append("contentType", file.type || (kind === "SURVEY_VIDEO" ? "video/mp4" : "image/jpeg"));
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/admin/repair-work-orders/${workOrderId}/attachments`, form);
}

export function uploadSupplierQuoteAttachment(workOrderId: number, file: File): Promise<RepairAttachment> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<RepairAttachment>(`/supplier/repair-work-orders/${workOrderId}/quote-attachments`, form);
}

export function deletePropertyQuoteAttachment(workOrderId: number, attachmentId: number): Promise<void> {
  return apiDelete<void>(`/admin/repair-work-orders/${workOrderId}/attachments/${attachmentId}`);
}

export function deleteRepairAttachment(workOrderId: number, attachmentId: number): Promise<void> {
  return apiDelete<void>(`/admin/repair-work-orders/${workOrderId}/attachments/${attachmentId}`);
}

export function deleteSupplierQuoteAttachment(workOrderId: number, attachmentId: number): Promise<void> {
  return apiDelete<void>(`/supplier/repair-work-orders/${workOrderId}/quote-attachments/${attachmentId}`);
}

export function getPropertyQuoteAttachmentDownload(
  workOrderId: number,
  attachmentId: number,
): Promise<RepairAttachmentDownloadTicket> {
  return apiGet<RepairAttachmentDownloadTicket>(
    `/admin/repair-work-orders/${workOrderId}/attachments/${attachmentId}/download-url`,
  );
}

export function getPropertyQuoteAttachmentPreview(
  workOrderId: number,
  attachmentId: number,
): Promise<RepairAttachmentPreviewTicket> {
  return apiGet<RepairAttachmentPreviewTicket>(
    `/admin/repair-work-orders/${workOrderId}/attachments/${attachmentId}/preview-url`,
  );
}

export function listRepairFrameworkRelations(serviceCategory?: string | null): Promise<RepairFrameworkRelation[]> {
  const query = serviceCategory ? `?serviceCategory=${encodeURIComponent(serviceCategory)}` : "";
  return apiGet<RepairFrameworkRelation[]>(`/admin/supplier-framework-relations${query}`);
}

export function listSupplierRepairWorkOrders(): Promise<RepairSupplierWorkOrder[]> {
  return apiGet<RepairSupplierWorkOrder[]>("/supplier/repair-work-orders");
}

export function submitSupplierWorkbenchQuote(workOrderId: number, input: unknown): Promise<RepairSupplierWorkOrder> {
  return apiPost<RepairSupplierWorkOrder>(`/supplier/repair-work-orders/${workOrderId}/quote`, input);
}
