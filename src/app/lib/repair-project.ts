// 关联业务：对接维修工程项目台账、合同、施工取证、材料、结算、差异化验收、付款和归档接口。
import { apiGet, apiPost, apiUpload } from "./api";

export type RepairProjectWorkflow = "BUILDING_REPAIR" | "COMMUNITY_PUBLIC_REPAIR";
export type RepairProjectStatus =
  | "DRAFT"
  | "PLAN_LOCKED"
  | "GOVERNANCE_IN_PROGRESS"
  | "AUTHORIZED"
  | "CONTRACT_EFFECTIVE"
  | "IN_PROGRESS"
  | "PENDING_ACCEPTANCE"
  | "COMPLETED"
  | "WARRANTY"
  | "ARCHIVED"
  | "CANCELLED";
export type RepairProjectStage =
  | "BEFORE_CONSTRUCTION"
  | "MATERIAL_ENTRY"
  | "DURING_CONSTRUCTION"
  | "CONCEALED_WORK"
  | "COMPLETION"
  | "ACCEPTANCE";
export type RepairVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type RepairAcceptanceConclusion = "PASSED" | "RECTIFICATION_REQUIRED";
export type RepairPaymentMilestone = "ADVANCE" | "PROGRESS" | "COMPLETION" | "WARRANTY_RELEASE";
export type RepairProjectSupplierSelectionMethod =
  | "COMPETITIVE_QUOTATION"
  | "FRAMEWORK_SUPPLIER"
  | "DIRECT_AWARD"
  | "EMERGENCY_APPOINTMENT";

export type RepairProjectQuoteLineType =
  | "MATERIAL_EQUIPMENT"
  | "LABOR_SERVICE"
  | "CONSTRUCTION_MEASURE"
  | "TRANSPORT_CLEANUP"
  | "OTHER";

export interface RepairProject {
  projectId: number;
  projectNo: string;
  tenantId: number;
  projectName: string;
  workflowType: RepairProjectWorkflow;
  scopeType: "BUILDING" | "BUILDING_UNIT" | "COMMUNITY";
  buildingId?: number | null;
  unitName?: string | null;
  fundSource: "BUILDING_MAINTENANCE_FUND" | "COMMUNITY_MAINTENANCE_FUND";
  governancePath: "BUILDING_REPAIR_DECISION" | "COMMUNITY_ASSEMBLY_DECISION";
  status: RepairProjectStatus;
  activePlanId?: number | null;
  version: number;
  createTime: string;
  updateTime: string;
}

export interface RepairProjectPaymentMilestone {
  type: RepairPaymentMilestone;
  maximumContractRatio: number;
  requiredEvidenceCodes: string[];
}

export interface RepairProjectPlan {
  planId: number;
  versionNo: number;
  planDescription: string;
  budgetTotal: number;
  allocationRuleDescription: string;
  supplierSelectionMethod: RepairProjectSupplierSelectionMethod;
  supplierSelectionReason?: string | null;
  constructionManagementRequirements: string;
  safetyRequirements: string;
  acceptanceMethod: string;
  affectedOwnerScopeDescription?: string | null;
  minimumAffectedOwnerAcceptors?: number | null;
  affectedOwnerPassRule?: "ALL" | "AT_LEAST_RATIO" | null;
  affectedOwnerApprovalRatio?: number | null;
  settlementMethod: "ACTUAL_QUANTITY" | "FIXED_TOTAL";
  plannedStartDate: string;
  plannedCompletionDate: string;
  warrantyDays: number;
  priceReviewRequired: boolean;
  paymentMilestones: RepairProjectPaymentMilestone[];
  status: "DRAFT" | "LOCKED" | "SUPERSEDED";
  snapshotHash?: string | null;
}

export interface RepairProjectItem {
  itemId: number;
  itemNo: string;
  buildingId?: number | null;
  unitName?: string | null;
  roomId?: number | null;
  locationText: string;
  workContent: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedAmount: number;
  linkedWorkOrderIds: number[];
}

export interface RepairProjectAttachment {
  attachmentId: number;
  projectId: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  createTime: string;
}

export interface RepairProjectQuoteInvitation {
  invitationId: number;
  projectId: number;
  planId: number;
  supplierDeptId: number;
  supplierName: string;
  invitedByUserId: number;
  deadline?: string | null;
  status: "PENDING" | "SUBMITTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  invitationRound: number;
  invitationType: "INITIAL" | "REVISION";
  revisionReason?: string | null;
  sentAt: string;
  respondedAt?: string | null;
}

export interface RepairProjectQuoteLine {
  quoteLineId: number;
  quoteId: number;
  projectItemId: number;
  projectItemNo: string;
  lineNo: number;
  itemName: string;
  lineType: RepairProjectQuoteLineType;
  workDescription?: string | null;
  specificationModel?: string | null;
  brand?: string | null;
  procurementMethod?: string | null;
  quantity: number;
  unit: string;
  unitPriceExcludingTax: number;
  amountExcludingTax: number;
  remark?: string | null;
}

export interface RepairProjectQuoteLineInput {
  projectItemId: number;
  itemName: string;
  lineType: RepairProjectQuoteLineType;
  workDescription?: string;
  specificationModel?: string;
  brand?: string;
  procurementMethod?: string;
  quantity: number;
  unit: string;
  unitPriceExcludingTax: number;
  remark?: string;
}

export interface RepairProjectSupplierQuote {
  quoteId: number;
  projectId: number;
  planId: number;
  supplierDeptId: number;
  supplierName: string;
  amountExcludingTax: number;
  taxRate: number;
  taxAmount: number;
  quoteAmount: number;
  quoteSummary?: string | null;
  attachmentId: number;
  submittedByUserId: number;
  submittedByRoleKey: string;
  submissionSource: "SUPPLIER_ONLINE" | "PROPERTY_ENTRY";
  confirmationStatus:
    | "PENDING_SUPPLIER_CONFIRMATION"
    | "ONLINE_CONFIRMED"
    | "OFFLINE_EVIDENCE_VERIFIED"
    | "CONTRACT_CONFIRMED";
  originalSource?: string | null;
  constructionPeriodDays?: number | null;
  warrantyDays?: number | null;
  originalAmountConfirmed: boolean;
  quoteStatus: "ACTIVE" | "REVISION_REQUESTED" | "SUPERSEDED";
  revisionNo: number;
  supersededByQuoteId?: number | null;
  createTime: string;
  quoteLines: RepairProjectQuoteLine[];
}

export interface RepairProjectSupplierSelection {
  selectionId: number;
  projectId: number;
  planId: number;
  quoteId: number;
  supplierDeptId: number;
  supplierName: string;
  quoteAmount: number;
  selectionMethod: RepairProjectSupplierSelectionMethod;
  recommendationReason?: string | null;
  insufficientQuoteReason?: string | null;
  frameworkRelationId?: number | null;
  recommendedByUserId: number;
  createTime: string;
}

export interface RepairProjectSourcingDetails {
  projectId: number;
  planId: number;
  selectionMethod: RepairProjectSupplierSelectionMethod;
  invitations: RepairProjectQuoteInvitation[];
  quotes: RepairProjectSupplierQuote[];
  selection?: RepairProjectSupplierSelection | null;
}

export interface RepairSupplierQuoteOpportunity {
  projectId: number;
  projectNo: string;
  projectName: string;
  planId: number;
  planDescription: string;
  constructionManagementRequirements: string;
  safetyRequirements: string;
  plannedStartDate: string;
  plannedCompletionDate: string;
  warrantyDays: number;
  items: Array<{
    itemId: number;
    itemNo: string;
    locationText: string;
    workContent: string;
    quantity: number;
    unit: string;
  }>;
  invitation: RepairProjectQuoteInvitation;
  latestQuote?: RepairProjectSupplierQuote | null;
}

export interface RepairNarrativeImage {
  imageId: number;
  source: string;
  previewUrl: string;
  expiresAt: string;
  originalFileName?: string;
  contentType?: string;
  fileSize?: number;
}

export interface RepairProjectDetails {
  project: RepairProject;
  plans: RepairProjectPlan[];
  currentPlanItems: RepairProjectItem[];
  currentPlanAllocationRooms: Array<{
    roomId: number;
    buildingId: number;
    unitName?: string | null;
    ownerUid?: number | null;
    buildArea: number;
  }>;
  currentPlanAllocationBasis?: {
    scopeLabel: string;
    roomCount: number;
    ownerCount: number;
    totalBuildArea: number;
  } | null;
  currentPlanAffectedOwners: Array<{
    roomId: number;
    buildingId: number;
    buildingName: string;
    unitName?: string | null;
    roomName: string;
    affectedReason: string;
    sourceType: "SYSTEM_RECOMMENDED" | "PROPERTY_ADJUSTED";
  }>;
  attachments: RepairProjectAttachment[];
  currentPlanAttachments: Array<{ attachmentId: number; purpose: string; sortOrder: number }>;
}

export interface RepairAllocationPreview {
  scopeType: RepairProject["scopeType"];
  fundSource: RepairProject["fundSource"];
  scopeLabel: string;
  roomCount: number;
  ownerCount: number;
  totalBuildArea: number;
  allocationRuleType: "BY_BUILDING_AREA" | "EQUAL_BY_ROOM";
  allocationRuleDescription: string;
  legalBasis: string;
}

export interface RepairAffectedOwnerPreview {
  scopeLabel: string;
  recommendedOwnerCount: number;
  candidates: Array<{
    roomId: number;
    buildingId: number;
    buildingName: string;
    unitName?: string | null;
    roomName: string;
    affectedReason: string;
  }>;
}

export interface RepairSupplierProjectSummary {
  project: RepairProject;
  contract: RepairProjectContract;
}

export interface RepairSupplierProjectDetails {
  project: RepairProject;
  activePlan: RepairProjectPlan;
  items: RepairProjectItem[];
  attachments: RepairProjectAttachment[];
  contract: RepairProjectContract;
  execution: RepairProjectExecutionDetails;
}

export interface RepairProjectContract {
  contractId: number;
  supplierDeptId: number;
  supplierName: string;
  contractAmount: number;
  fundSource: RepairProject["fundSource"];
  signingMethod: "ONLINE" | "OFFLINE" | "MIXED";
  contractAttachmentId: number;
  status: "EFFECTIVE" | "VOIDED";
  effectiveAt: string;
}

export interface RepairProjectExecutionRecord {
  recordId: number;
  itemId: number;
  stage: RepairProjectStage;
  description: string;
  occurredAt: string;
  verificationStatus: RepairVerificationStatus;
  verificationOpinion?: string | null;
  attachmentIds: number[];
}

export interface RepairProjectMaterialInspection {
  inspectionId: number;
  itemId: number;
  materialName: string;
  brand: string;
  model: string;
  specification: string;
  quantity: number;
  unit: string;
  manufacturer: string;
  qualificationAttachmentId: number;
  photoAttachmentIds: number[];
  status: RepairVerificationStatus;
  verificationOpinion?: string | null;
}

export interface RepairProjectSettlementItem {
  projectItemId: number;
  actualQuantity: number;
  unit: string;
  actualUnitPrice: number;
  amountExcludingTax: number;
  taxRate: number;
  taxAmount: number;
  amountIncludingTax: number;
  varianceReason?: string | null;
}

export interface RepairProjectSettlement {
  settlementId: number;
  versionNo: number;
  status: "SUBMITTED" | "VERIFIED" | "REJECTED";
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  settlementAttachmentId: number;
  verificationOpinion?: string | null;
  items: RepairProjectSettlementItem[];
}

export interface RepairProjectAcceptancePolicy {
  workflowType: RepairProjectWorkflow;
  affectedOwnerCount: number;
  minimumAffectedOwnerParticipants: number;
  affectedOwnerPassRule?: "ALL" | "AT_LEAST_RATIO" | null;
  affectedOwnerApprovalRatio?: number | null;
}

export interface RepairProjectAcceptanceRound {
  acceptanceId: number;
  roundNo: number;
  status: "COLLECTING" | "RECTIFICATION_REQUIRED" | "PASSED";
  resultAttachmentId?: number | null;
  submittedAt: string;
  completedAt?: string | null;
}

export interface RepairProjectAcceptanceParty {
  partyId: number;
  partyRole: string;
  participantName: string;
  participantOrganization?: string | null;
  committeePosition?: string | null;
  conclusion: RepairAcceptanceConclusion;
  opinion?: string | null;
  evidenceAttachmentId?: number | null;
  submittedAt: string;
}

export interface RepairProjectPaymentRequest {
  paymentRequestId: number;
  milestoneType: RepairPaymentMilestone;
  requestedAmount: number;
  cumulativeRequestedAmount: number;
  eligibleUpperLimit: number;
  status: "PENDING_FINANCE" | "APPROVED" | "PAID" | "RETURNED" | "FAILED";
  evidence: Array<{ evidenceCode: string; attachmentId: number }>;
  createTime: string;
}

export interface RepairProjectCompletionDisclosure {
  noticeStartDate: string;
  noticeEndDate: string;
  postingScope: string;
  noticeAttachmentId: number;
  propertyReportAttachmentId: number;
  sitePhotoAttachmentIds: number[];
  warrantyStartDate: string;
  warrantyEndDate: string;
}

export interface RepairProjectExecutionDetails {
  contract?: RepairProjectContract | null;
  contractSignatures: Array<{
    partyType: "OWNERS_ASSEMBLY_OR_GROUP" | "PROPERTY" | "SUPPLIER";
    signerName: string;
    signerUserId?: number | null;
    signatureMethod: "ELECTRONIC" | "PAPER_SCAN";
    signatureAttachmentId: number;
    signedAt: string;
  }>;
  costReview?: {
    reviewMode: string;
    reviewedAmount: number;
    reportAttachmentId?: number | null;
    reviewedAt: string;
  } | null;
  executionRecords: RepairProjectExecutionRecord[];
  materialInspections: RepairProjectMaterialInspection[];
  settlement?: RepairProjectSettlement | null;
  acceptancePolicy?: RepairProjectAcceptancePolicy | null;
  acceptance?: RepairProjectAcceptanceRound | null;
  acceptanceParties: RepairProjectAcceptanceParty[];
  paymentRequests: RepairProjectPaymentRequest[];
  completionDisclosure?: RepairProjectCompletionDisclosure | null;
}

export interface RepairProjectPage {
  items: RepairProject[];
  total: number;
  page: number;
  size: number;
}

export interface RepairPlanDraftInput {
  planDescription: string;
  budgetTotal: number;
  supplierSelectionMethod: RepairProjectSupplierSelectionMethod;
  supplierSelectionReason?: string;
  constructionManagementRequirements: string;
  evidenceRequirements: Array<{ stage: RepairProjectStage; description: string; required: boolean }>;
  safetyRequirements: string;
  acceptanceMethod: string;
  affectedOwners?: Array<{ roomId: number; affectedReason: string }>;
  affectedOwnerAdjustmentReason?: string;
  minimumAffectedOwnerAcceptors?: number;
  affectedOwnerPassRule?: "ALL" | "AT_LEAST_RATIO";
  affectedOwnerApprovalRatio?: number;
  settlementMethod: "ACTUAL_QUANTITY" | "FIXED_TOTAL";
  plannedStartDate: string;
  plannedCompletionDate: string;
  warrantyDays: number;
  priceReviewRequired: boolean;
  paymentMilestones: RepairProjectPaymentMilestone[];
  items: Array<{
    itemNo: string;
    buildingId?: number;
    unitName?: string;
    roomId?: number;
    locationText: string;
    workContent: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    estimatedAmount: number;
    linkedWorkOrderIds: number[];
  }>;
  attachments: Array<{ attachmentId: number; purpose: string }>;
}

export interface RepairProjectCreateInput {
  projectName: string;
  scopeType: RepairProject["scopeType"];
  buildingId?: number;
  unitName?: string;
  fundSource: RepairProject["fundSource"];
  governancePath: RepairProject["governancePath"];
  plan: RepairPlanDraftInput;
}

export interface RepairBuildingGovernanceDetails {
  process: {
    processId: number;
    status: string;
    officialDocumentAttachmentId?: number | null;
    reviewMode?: string | null;
    reviewedAmount?: number | null;
    priceReviewConclusion?: string | null;
    approvalOpinion?: string | null;
    approverPosition?: string | null;
    sealUsageId?: number | null;
    processVersion: number;
  };
  policySnapshot: {
    ruleId?: number | null;
    ruleName?: string | null;
    ruleVersion: string;
    ruleEffectiveAt?: string | null;
    decisionChannel: "ONLINE" | "WECHAT";
    deliveryRule: string;
    nonResponseRule: string;
  };
  decision: {
    decisionId: number;
    scopeLabel: string;
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
    result: string;
  };
  entries: Array<{
    roomId: number;
    buildArea: number;
    participated: boolean;
    choice?: "AGREE" | "DISAGREE" | "ABSTAIN" | "INVALID" | null;
  }>;
}

export interface RepairCommunityAssemblyLink {
  linkId: number;
  sessionId: number;
  packageId: number;
  subjectId: number;
  status: "LINKED" | "SETTLED";
  result?: "PASSED" | "FAILED" | null;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}

export function pageRepairProjects(params: {
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
} = {}): Promise<RepairProjectPage> {
  return apiGet<RepairProjectPage>(`/admin/repair-projects?${queryString({
    status: params.status === "ALL" ? undefined : params.status,
    keyword: params.keyword,
    page: params.page ?? 1,
    size: params.size ?? 50,
  })}`);
}

export function createRepairProject(input: RepairProjectCreateInput): Promise<RepairProjectDetails> {
  return apiPost<RepairProjectDetails>("/admin/repair-projects", input);
}

export function getRepairAllocationPreview(input: {
  scopeType: RepairProject["scopeType"];
  buildingId?: number;
  unitName?: string;
}): Promise<RepairAllocationPreview> {
  return apiGet<RepairAllocationPreview>(`/admin/repair-projects/allocation-preview?${queryString(input)}`);
}

export function getRepairAffectedOwnerPreview(input: {
  scopeType: "BUILDING" | "BUILDING_UNIT";
  buildingId: number;
  unitName?: string;
}): Promise<RepairAffectedOwnerPreview> {
  return apiGet<RepairAffectedOwnerPreview>(`/admin/repair-projects/affected-owner-preview?${queryString(input)}`);
}

export function getRepairProject(projectId: number): Promise<RepairProjectDetails> {
  return apiGet<RepairProjectDetails>(`/admin/repair-projects/${projectId}`);
}

export function getRepairProjectExecution(projectId: number): Promise<RepairProjectExecutionDetails> {
  return apiGet<RepairProjectExecutionDetails>(`/admin/repair-projects/${projectId}/execution`);
}

export function getRepairProjectSourcing(projectId: number): Promise<RepairProjectSourcingDetails> {
  return apiGet<RepairProjectSourcingDetails>(`/admin/repair-projects/${projectId}/sourcing`);
}

export function inviteRepairProjectSuppliers(
  projectId: number,
  input: { supplierDeptIds: number[]; deadline?: string },
): Promise<RepairProjectSourcingDetails> {
  return apiPost<RepairProjectSourcingDetails>(`/admin/repair-projects/${projectId}/sourcing/invitations`, input);
}

export function requestRepairProjectQuoteRevisions(
  projectId: number,
  input: { supplierDeptIds: number[]; deadline?: string; revisionReason: string },
): Promise<RepairProjectSourcingDetails> {
  return apiPost<RepairProjectSourcingDetails>(`/admin/repair-projects/${projectId}/sourcing/quote-revisions`, input);
}

export function submitPropertyRepairProjectQuote(
  projectId: number,
  input: {
    supplierDeptId: number;
    invitationId?: number;
    quoteAmount: number;
    taxRate: number;
    quoteSummary?: string;
    attachmentId: number;
    confirmationStatus: "PENDING_SUPPLIER_CONFIRMATION" | "OFFLINE_EVIDENCE_VERIFIED";
    originalSource: string;
    constructionPeriodDays: number;
    warrantyDays: number;
    originalAmountConfirmed: boolean;
    quoteLines: RepairProjectQuoteLineInput[];
  },
): Promise<RepairProjectSupplierQuote> {
  return apiPost<RepairProjectSupplierQuote>(`/admin/repair-projects/${projectId}/sourcing/quotes`, input);
}

export function selectRepairProjectSupplier(
  projectId: number,
  input: {
    quoteId: number;
    recommendationReason?: string;
    insufficientQuoteReason?: string;
    frameworkRelationId?: number;
  },
): Promise<RepairProjectSourcingDetails> {
  return apiPost<RepairProjectSourcingDetails>(`/admin/repair-projects/${projectId}/sourcing/selection`, input);
}

export function listSupplierRepairProjectQuoteOpportunities(): Promise<RepairSupplierQuoteOpportunity[]> {
  return apiGet<RepairSupplierQuoteOpportunity[]>("/supplier/repair-projects/quote-opportunities");
}

export function submitSupplierRepairProjectQuote(
  projectId: number,
  input: {
    invitationId: number;
    quoteAmount: number;
    taxRate: number;
    quoteSummary?: string;
    attachmentId: number;
    constructionPeriodDays: number;
    warrantyDays: number;
    originalAmountConfirmed: boolean;
    quoteLines: RepairProjectQuoteLineInput[];
  },
): Promise<RepairProjectSupplierQuote> {
  return apiPost<RepairProjectSupplierQuote>(`/supplier/repair-projects/${projectId}/quotes`, input);
}

export function listSupplierRepairProjects(): Promise<RepairSupplierProjectSummary[]> {
  return apiGet<RepairSupplierProjectSummary[]>("/supplier/repair-projects");
}

export function getSupplierRepairProject(projectId: number): Promise<RepairSupplierProjectDetails> {
  return apiGet<RepairSupplierProjectDetails>(`/supplier/repair-projects/${projectId}`);
}

export function uploadRepairProjectAttachment(
  projectId: number,
  file: File,
): Promise<RepairProjectAttachment> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<RepairProjectAttachment>(`/admin/repair-projects/${projectId}/attachments`, form);
}

export function uploadRepairNarrativeImage(file: File): Promise<RepairNarrativeImage> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<RepairNarrativeImage>("/admin/repair-projects/narrative-images", form);
}

export function getRepairNarrativeImagePreview(imageId: number): Promise<RepairNarrativeImage> {
  return apiGet<RepairNarrativeImage>(`/admin/repair-projects/narrative-images/${imageId}/preview-ticket`);
}

export function getRepairProjectAttachmentTicket(
  projectId: number,
  attachmentId: number,
): Promise<{ attachmentId: number; downloadUrl: string; expiresAt: string }> {
  return apiGet(`/admin/repair-projects/${projectId}/attachments/${attachmentId}/download-ticket`);
}

export function postRepairProjectAction<T>(
  projectId: number,
  action: string,
  body: unknown,
): Promise<T> {
  return apiPost<T>(`/admin/repair-projects/${projectId}/${action}`, body);
}

export function linkRepairPlanAttachment(
  projectId: number,
  planId: number,
  input: { attachmentId: number; purpose: "ORIGINAL_QUOTE" | "SITE_PHOTO" | "OFFICIAL_DOCUMENT" | "OTHER" },
): Promise<RepairProjectDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/plans/${planId}/attachments`, input);
}

export function lockRepairProjectPlan(
  projectId: number,
  planId: number,
  expectedProjectVersion: number,
): Promise<RepairProjectDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/plans/${planId}/lock`, {
    expectedProjectVersion,
  });
}

export function getBuildingRepairGovernance(projectId: number): Promise<RepairBuildingGovernanceDetails> {
  return apiGet(`/admin/repair-projects/${projectId}/building-governance`);
}

export function auditBuildingRepairDecision(projectId: number): Promise<RepairBuildingGovernanceDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/building-governance/decision-audit`, {});
}

export function getCommunityRepairAssembly(projectId: number): Promise<RepairCommunityAssemblyLink> {
  return apiGet(`/admin/repair-projects/${projectId}/community-assembly`);
}
