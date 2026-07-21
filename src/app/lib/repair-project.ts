// 关联业务：对接维修工程项目台账、合同、施工取证、材料、结算、差异化验收、付款和归档接口。
import { apiGet, apiPost, apiUpload } from "./api";
import type { VotingNonResponseSummary } from "./voting";

export type RepairProjectWorkflow = "BUILDING_REPAIR" | "COMMUNITY_PUBLIC_REPAIR";
export type RepairProjectStatus =
  | "DRAFT"
  | "AUTHORIZATION_IN_PROGRESS"
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
export type RepairProjectEvidenceStage = Exclude<RepairProjectStage, "ACCEPTANCE">;
export type RepairAcceptancePartyRole =
  | "AFFECTED_OWNER"
  | "BUILDING_LEADER"
  | "COMMITTEE_EXECUTIVE_APPROVER"
  | "COMMITTEE_SEAL_OPERATOR"
  | "PROPERTY_TECHNICAL_COSIGNER"
  | "THIRD_PARTY_TECHNICAL_COSIGNER";
export type RepairVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type RepairAcceptanceConclusion = "PASSED" | "RECTIFICATION_REQUIRED";
export type RepairPaymentMilestone = "ADVANCE" | "PROGRESS" | "COMPLETION" | "WARRANTY_RELEASE";
export type RepairProjectSupplierSelectionMethod =
  | "COMPETITIVE_QUOTATION"
  | "FRAMEWORK_SUPPLIER"
  | "DIRECT_AWARD"
  | "EMERGENCY_APPOINTMENT";
export type RepairProjectSupplierEvaluationRule =
  | "LOWEST_COMPLIANT_QUOTE"
  | "COMPREHENSIVE_EVALUATION"
  | "AUTHORIZED_DIRECT_SELECTION";
export type RepairProjectSupplierSelectionAuthorizationStatus =
  | "PENDING_AUTHORIZATION"
  | "AUTHORIZED"
  | "UNSUPPORTED_WORKFLOW";

export type RepairProjectQuoteLineType =
  | "MATERIAL_EQUIPMENT"
  | "LABOR_SERVICE"
  | "CONSTRUCTION_MEASURE"
  | "TRANSPORT_CLEANUP"
  | "OTHER";
export type RepairProjectFundSource = "BUILDING_MAINTENANCE_FUND" | "COMMUNITY_MAINTENANCE_FUND";

/**
 * 关联业务：工程范围不是资金来源。责任初判确认后，服务端才按此路径核验账簿或责任方；共有维修另行取得相关业主决定。
 */
export type RepairFundingSourceType =
  | "SPECIAL_MAINTENANCE_LEDGER"
  | "PUBLIC_REVENUE_LEDGER"
  | "PROPERTY_SERVICE_CONTRACT"
  | "LIABLE_PARTY"
  | "DEVELOPER_WARRANTY"
  | "OWNER_SELF_FUNDING";

/** 关联业务：物业提出责任判断，治理主体确认；设备名称和楼栋范围都不能替代该判断。 */
export type RepairResponsibilityPath =
  | "PROPERTY_SERVICE_CONTRACT"
  | "DEVELOPER_WARRANTY"
  | "LIABLE_PARTY"
  | "SHARED_COMMON_REPAIR";

/** 关联业务：执行状态由服务端按已确认责任路径派生；共有维修表示尚需取得相关业主决定。 */
export type RepairExecutionAuthorityType =
  | "CONTRACTUAL_EXECUTION"
  | "WARRANTY_EXECUTION"
  | "LIABILITY_EXECUTION"
  | "OWNER_DECISION";

export type RepairResponsibilityDeterminationStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "SUPERSEDED"
  | "REJECTED";

export interface RepairProject {
  projectId: number;
  projectNo: string;
  tenantId: number;
  projectName: string;
  workflowType: RepairProjectWorkflow;
  scopeType: "BUILDING" | "BUILDING_UNIT" | "COMMUNITY";
  buildingId?: number | null;
  unitName?: string | null;
  /** 仅在后端完成可信资金核验后返回；项目范围本身不能推导该事实。 */
  fundSource?: RepairProjectFundSource | null;
  /** 仅在后端完成可信治理/授权核验后返回。 */
  governancePath?: "BUILDING_REPAIR_DECISION" | "COMMUNITY_ASSEMBLY_DECISION" | null;
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
  /** 以下冻结字段在筹备草稿阶段尚无可信来源，响应可为空。 */
  allocationRuleDescription?: string | null;
  supplierSelectionMethod?: RepairProjectSupplierSelectionMethod | null;
  supplierSelectionEvaluationRule?: RepairProjectSupplierEvaluationRule | null;
  minimumInvitedSupplierCount?: number | null;
  minimumValidQuoteCount?: number | null;
  nonCompetitiveSelectionBasis?: string | null;
  supplierSelectionReason?: string | null;
  constructionManagementRequirements?: string | null;
  evidenceRequirements?: RepairProjectEvidenceRequirement[] | null;
  safetyRequirements?: string | null;
  acceptanceMethod?: string | null;
  acceptanceRequirements?: RepairProjectAcceptanceRequirement[] | null;
  acceptanceFinalizerRoles?: RepairAcceptancePartyRole[] | null;
  acceptanceBasisAttachmentIds?: number[] | null;
  acceptanceBasisSummary?: string | null;
  affectedOwnerScopeDescription?: string | null;
  minimumAffectedOwnerAcceptors?: number | null;
  affectedOwnerPassRule?: "ALL" | "AT_LEAST_RATIO" | null;
  affectedOwnerApprovalRatio?: number | null;
  settlementMethod?: "ACTUAL_QUANTITY" | "FIXED_TOTAL" | null;
  plannedStartDate?: string | null;
  plannedCompletionDate?: string | null;
  warrantyDays?: number | null;
  priceReviewRequired?: boolean | null;
  paymentMilestones?: RepairProjectPaymentMilestone[] | null;
  status: "DRAFT" | "AUTHORIZATION_FROZEN" | "LOCKED" | "SUPERSEDED";
  /** 仅用于确认授权提案未被随后修改；它不代表可施工的实施方案。 */
  authorizationSnapshotHash?: string | null;
  authorizationFrozenByUserId?: number | null;
  authorizationFrozenAt?: string | null;
  snapshotHash?: string | null;
}

export interface RepairProjectEvidenceRequirement {
  stage: RepairProjectEvidenceStage;
  description: string;
  required: boolean;
}

export interface RepairProjectAcceptanceRequirement {
  requirementCode: string;
  businessName: string;
  eligibleRoles: RepairAcceptancePartyRole[];
  minimumPassingCount: number;
  evidenceRequired: boolean;
}

/** 关联业务：维修点位独立于报价、合同和结算明细，承载可勘验的维修对象。 */
export type RepairWorkPointLocationType = "REFERENCE_ROOM" | "COMMON_AREA";
export type RepairWorkPointCauseStatus = "PENDING_INVESTIGATION" | "CONFIRMED" | "UNCONFIRMED";

export interface RepairWorkPoint {
  workPointId: number;
  projectId: number;
  planId: number;
  tenantId: number;
  sortOrder: number;
  businessName: string;
  buildingId?: number | null;
  unitName?: string | null;
  locationType: RepairWorkPointLocationType;
  referenceRoomId?: number | null;
  commonAreaName?: string | null;
  spaceName: string;
  orientation?: string | null;
  component: string;
  specificPart: string;
  symptom: string;
  causeStatus: RepairWorkPointCauseStatus;
  causeBasis?: string | null;
  proposedMeasure: string;
  technicalRequirements?: string | null;
  quantity?: number | null;
  unit?: string | null;
  preliminaryEstimatedAmount?: number | null;
  estimateSource?: string | null;
  legacyReadOnly: boolean;
  linkedWorkOrderIds: number[];
  createTime: string;
}

/** 关联业务：供应商邀价只获得报价所需的锁定点位范围，不获得管理端审计字段。 */
export interface RepairSupplierQuoteWorkPoint {
  workPointId: number;
  businessName: string;
  buildingId?: number | null;
  unitName?: string | null;
  locationType: RepairWorkPointLocationType;
  referenceRoomId?: number | null;
  commonAreaName?: string | null;
  spaceName: string;
  orientation?: string | null;
  component: string;
  specificPart: string;
  symptom: string;
  proposedMeasure: string;
  technicalRequirements?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

/** 关联业务：项目唯一决定范围由后端核验、快照和阻断跨范围来源。 */
export interface RepairDecisionScope {
  decisionScopeId: number;
  scopeType: RepairProject["scopeType"];
  buildingId?: number | null;
  unitName?: string | null;
  verificationStatus: "CONFIRMED" | "PENDING_VERIFICATION" | "LEGACY_READ_ONLY";
  verificationBasis?: string | null;
  legacyReadOnly: boolean;
  createTime: string;
}

/** 关联业务：资金承担切片只由可信账簿、责任认定或有效决定写入，建项草稿不生成该事实。 */
export interface RepairFundingSlice {
  fundingSliceId: number;
  decisionScopeId: number;
  projectId: number;
  tenantId: number;
  sourceType: RepairFundingSourceType;
  sourceRecordType: string;
  sourceRecordId: string;
  ledgerReference?: string | null;
  allocationSnapshotHash?: string | null;
  approvedAmount?: number | null;
  verificationStatus: "CONFIRMED" | "PENDING_VERIFICATION" | "LEGACY_READ_ONLY";
  legacyReadOnly: boolean;
  verifiedAt?: string | null;
  createTime: string;
}

/** 关联业务：责任、资金承担和服务端派生执行状态的版本化事实；决定提案预算由冻结的方案快照形成。 */
export interface RepairResponsibilityDetermination {
  determinationId: number;
  versionNo: number;
  status: RepairResponsibilityDeterminationStatus;
  responsibilityPath: RepairResponsibilityPath;
  fundingSourceType: RepairFundingSourceType;
  executionAuthorityType: RepairExecutionAuthorityType;
  basisAttachmentId: number;
  basisReference: string;
  responsiblePartyName?: string | null;
  responsiblePartyReference?: string | null;
  proposedAt: string;
  confirmedAt?: string | null;
  confirmationNote?: string | null;
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
  /** 运输、清运等项目通用明细可以不关联维修点位。 */
  workPointId?: number | null;
  /** 服务端按锁定方案返回的维修点位业务名称。 */
  workPointName?: string | null;
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
  /** 运输、清运等项目通用明细可以不关联维修点位。 */
  workPointId?: number;
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
  selectionEvaluationRule?: RepairProjectSupplierEvaluationRule | null;
  /** 由最终定商人基于已通过授权快照填写，不替代授权文件中的选择方式。 */
  selectionRationale?: string | null;
  selectionEvidenceAttachmentId?: number | null;
  governanceBasisId?: number | null;
  governanceBasisHash?: string | null;
  frameworkRelationId?: number | null;
  confirmedByUserId: number;
  createTime: string;
}

/**
 * 关联业务：楼栋项目完成已用印的决定/授权链后，服务端返回不可由管理端改写的定商依据。
 * 社区项目及未完成授权的项目只返回阻断状态，前端不得从范围、资金或角色名称推导授权。
 */
export interface RepairProjectSupplierSelectionAuthorization {
  status: RepairProjectSupplierSelectionAuthorizationStatus;
  blockingReason?: string | null;
  approvedSelectionMethod?: RepairProjectSupplierSelectionMethod | null;
  approvedEvaluationRule?: RepairProjectSupplierEvaluationRule | null;
  /** 授权文件明确写明时才有值；空值不代表平台默认数量。 */
  minimumInvitedSupplierCount?: number | null;
  /** 授权文件明确写明时才有值；空值不代表平台默认数量。 */
  minimumValidQuoteCount?: number | null;
  nonCompetitiveSelectionBasis?: string | null;
  approvedBudgetAmount?: number | null;
  governanceBasisId?: number | null;
  governanceBasisHash?: string | null;
  buildingProcessId?: number | null;
  decisionId?: number | null;
  /** 仅服务端确认当前在任主任/副主任时为 true；仍须由定商接口二次校验。 */
  currentActorMayConfirm: boolean;
}

/**
 * 关联业务：框架供应商定商时仅暴露当前项目、当前授权快照和当前确认人可使用的关系。
 * 不以项目名称、维修点位或前端分类推断服务类别。
 */
export interface RepairProjectEligibleFrameworkRelation {
  relationId: number;
  supplierDeptId: number;
  supplierLegalName: string;
  serviceCategory?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

/** 已盖章楼栋授权文件中明确的施工单位选择和评审规则。 */
export interface RepairProjectSupplierSelectionAuthorizationInput {
  selectionMethod: RepairProjectSupplierSelectionMethod;
  evaluationRule: RepairProjectSupplierEvaluationRule;
  minimumInvitedSupplierCount?: number;
  minimumValidQuoteCount?: number;
  nonCompetitiveSelectionBasis?: string;
}

export interface RepairProjectSourcingDetails {
  projectId: number;
  planId: number;
  /** 已授权时由服务端从治理快照映射，管理端不得提交或自行选择。 */
  selectionMethod?: RepairProjectSupplierSelectionMethod | null;
  selectionAuthorization?: RepairProjectSupplierSelectionAuthorization | null;
  /** 仅框架供应商、当前可确认身份且当前项目适用时由服务端返回。 */
  eligibleFrameworkRelations?: RepairProjectEligibleFrameworkRelation[];
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
  workPoints: RepairSupplierQuoteWorkPoint[];
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
  decisionScope?: RepairDecisionScope | null;
  responsibilityDetermination?: RepairResponsibilityDetermination | null;
  responsibilityDeterminationHistory: RepairResponsibilityDetermination[];
  currentPlanWorkPoints: RepairWorkPoint[];
  fundingSlices: RepairFundingSlice[];
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

/** 管理端可见的项目办理节点；不含个人业主表决或原始审计载荷。 */
export interface RepairProjectProcessHistoryEntry {
  eventId: number;
  title: string;
  summary: string;
  occurredAt: string;
}

export interface RepairSupplierProjectSummary {
  project: RepairProject;
  contract: RepairProjectContract;
}

export interface RepairSupplierProjectDetails {
  project: RepairProject;
  activePlan: RepairProjectPlan;
  workPoints: RepairWorkPoint[];
  attachments: RepairProjectAttachment[];
  contract: RepairProjectContract;
  execution: RepairProjectExecutionDetails;
}

export interface RepairProjectContract {
  contractId: number;
  supplierDeptId: number;
  supplierName: string;
  contractAmount: number;
  fundSource?: RepairProjectFundSource | null;
  signingMethod: "ONLINE" | "OFFLINE" | "MIXED";
  contractAttachmentId: number;
  status: "EFFECTIVE" | "VOIDED";
  effectiveAt: string;
}

export interface RepairProjectExecutionRecord {
  recordId: number;
  /** 项目通用过程事项可以不关联维修点位。 */
  workPointId?: number | null;
  stage: RepairProjectStage;
  description: string;
  occurredAt: string;
  verificationStatus: RepairVerificationStatus;
  verificationOpinion?: string | null;
  attachmentIds: number[];
}

export interface RepairProjectMaterialInspection {
  inspectionId: number;
  /** 项目通用材料事项可以不关联维修点位。 */
  workPointId?: number | null;
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
  settlementItemId: number;
  settlementId: number;
  /** 项目通用专业结算明细可以不关联维修点位。 */
  workPointId?: number | null;
  actualQuantity: number;
  unit: string;
  actualUnitPrice: number;
  amountExcludingTax: number;
  varianceReason?: string | null;
}

export interface RepairProjectSettlement {
  settlementId: number;
  versionNo: number;
  status: "SUBMITTED" | "VERIFIED" | "REJECTED";
  subtotalAmount: number;
  /** 税率是结算单据头事实，不在每条专业明细重复声明。 */
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  settlementAttachmentId: number;
  verificationOpinion?: string | null;
  items: RepairProjectSettlementItem[];
}

export interface RepairProjectAcceptancePolicy {
  policyHash: string;
  workflowType: RepairProjectWorkflow;
  acceptanceMethod: string;
  requirements: RepairProjectAcceptanceRequirement[];
  finalizerRoles: RepairAcceptancePartyRole[];
  basisAttachmentIds: number[];
  basisSummary: string;
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

/** 创建草稿时提交的维修点位，不携带由服务端生成的稳定标识与审计字段。 */
export interface RepairWorkPointCreateInput {
  businessName: string;
  buildingId?: number;
  unitName?: string;
  locationType: RepairWorkPointLocationType;
  referenceRoomId?: number;
  commonAreaName?: string;
  spaceName?: string;
  orientation?: string;
  component?: string;
  specificPart?: string;
  symptom: string;
  causeStatus: RepairWorkPointCauseStatus;
  causeBasis?: string;
  proposedMeasure: string;
  technicalRequirements?: string;
  quantity?: number;
  unit?: string;
  preliminaryEstimatedAmount?: number;
  estimateSource?: string;
  linkedWorkOrderIds: number[];
}

export interface RepairPlanDraftInput {
  planDescription: string;
  budgetTotal: number;
  workPoints: RepairWorkPointCreateInput[];
  attachments?: Array<{ attachmentId: number; purpose: string }>;
}

export interface RepairProjectCreateInput {
  projectName: string;
  scopeType: RepairProject["scopeType"];
  buildingId?: number;
  unitName?: string;
  plan: RepairPlanDraftInput;
}

export interface RepairBuildingGovernanceDetails {
  process: {
    processId: number;
    status: string;
    officialDocumentAttachmentId?: number | null;
    reviewMode?: string | null;
    reviewedAmount?: number | null;
    priceReviewReportAttachmentId?: number | null;
    priceReviewConclusion?: string | null;
    priceReviewOpinion?: string | null;
    priceReviewedAt?: string | null;
    approvalOpinion?: string | null;
    approverPosition?: string | null;
    approvedAt?: string | null;
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
    evidenceAttachmentHash?: string | null;
    result: string;
    updateTime?: string | null;
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

/** 关联业务：一次维修方案只能关联一个冻结规则、精确房屋名册和统一收票窗口。 */
export type RepairVotingCollectionMode = "PAPER" | "ONLINE_WITH_PAPER_ASSISTANCE" | "PAPER_AND_ONLINE";
export type RepairVotingDeliveryMethod = "DOOR_TO_DOOR" | "POSTAL" | "ELECTRONIC" | "PUBLIC_NOTICE_BOARD";

export interface RepairVotingPreparationOptions {
  ruleName: string;
  ruleVersion: string;
  ready: boolean;
  blockingItems: Array<{ code: string; message: string }>;
  allowedModes: RepairVotingCollectionMode[];
  earliestVoteStartAt: string;
  validDeliveryMethods: RepairVotingDeliveryMethod[];
  paperBallotSealRequired: boolean;
  proxyVotingPolicy: "NOT_ALLOWED" | "WRITTEN_AUTHORIZATION_REQUIRED" | null;
}

export interface VotingProxyAuthorization {
  authorizationId: number;
  packageId: number;
  electorateItemId: number;
  principalOpid: number;
  agentName: string;
  agentIdentityDocumentType: "CHINESE_RESIDENT_ID" | "PASSPORT" | "OTHER";
  agentIdentityNumberMasked: string;
  validFrom: string;
  validUntil: string;
  originalFileName: string;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED" | "REVOKED";
  registeredByUserId: number;
  registeredAt: string;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  revokedByUserId?: number | null;
  revokedAt?: string | null;
  revokeReason?: string | null;
}

export interface RepairProjectVotingDetails {
  project: RepairProject;
  plan: RepairProjectPlan;
  voting: {
    linkId: number;
    projectId: number;
    planId: number;
    paperBallotTemplateAttachmentId: number;
    paperBallotTemplateHash: string;
    status: "PREPARED" | "VOTING" | "SETTLED" | "VOIDED";
    result?: "PASSED" | "FAILED" | null;
    collectionMode: RepairVotingCollectionMode;
    preparedAt: string;
    openedAt?: string | null;
    settledAt?: string | null;
    version: number;
  };
  subject: {
    subjectId: number;
    title: string;
    content: string;
    status: string;
  };
  executionPackage: {
    packageId: number;
    collectionMode: RepairVotingCollectionMode;
    status: "DRAFT" | "FROZEN" | "VOTING" | "CLOSED" | "SETTLED" | "VOIDED";
    voteStartAt: string;
    voteEndAt: string;
    packageHash: string;
  };
  ruleName: string;
  ruleVersion: string;
  proxyVotingPolicy: "NOT_ALLOWED" | "WRITTEN_AUTHORIZATION_REQUIRED";
  result?: {
    passed: boolean;
    quorumSatisfied: boolean;
    totalOwnerCount: number;
    totalArea: number;
    participatingOwnerCount: number;
    participatingArea: number;
    supportOwnerCount?: number | null;
    supportArea?: number | null;
    againstOwnerCount?: number | null;
    againstArea?: number | null;
    abstainOwnerCount?: number | null;
    abstainArea?: number | null;
    nonResponse?: VotingNonResponseSummary | null;
  } | null;
}

export interface RepairVotingWorkbench {
  electorate: Array<{
    snapshotItemId: number;
    roomId: number;
    buildingId: number;
    certifiedArea: number;
    representativeOpid: number;
    buildingName: string;
    unitName?: string | null;
    roomName: string;
  }>;
  paper: {
    deliveries: Array<{
      paperDeliveryId: number;
      electorateItemId: number;
      opid: number;
      proxyAuthorizationId?: number | null;
      recipientName: string;
      deliveryMethod: string;
      deliveredByUserId: number;
      deliveredAt: string;
      status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
    }>;
    ballots: Array<{
      ballot: {
        paperBallotId: number;
        opid: number;
        proxyAuthorizationId?: number | null;
        ballotNumber: string;
        receivedByUserId: number;
        receivedAt: string;
        status: "RECEIVED" | "IN_ENTRY" | "COMPLETED" | "VOIDED";
      };
      latestEntry?: {
        entryId: number;
        status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
        enteredByUserId: number;
      } | null;
      /** 只暴露纸票是否计入、无效或重复，不向经办页返回另一渠道的票面选择。 */
      outcomes: Array<{
        outcomeId: number;
        subjectId: number;
        status: "COUNTED" | "INVALID" | "DUPLICATE";
        finalizedAt: string;
      }>;
    }>;
  };
  online: { completedPropertyCount: number; conflictCount: number };
  paperAssistanceRequests: Array<{
    requestId: number;
    opid: number;
    status: "REQUESTED" | "FULFILLED" | "WITHDRAWN";
  }>;
  validDeliveryMethods: RepairVotingDeliveryMethod[];
  paperBallotSealRequired: boolean;
  paperBallotTemplate: {
    attachmentId: number;
    originalFileName: string;
    contentType: string;
    fileSize: number;
    sha256: string;
  };
  currentActorUserId: number;
}

/** 维修表决的汇总办理进度，不包含逐户身份、票面选择或纸票原件。 */
export interface RepairVotingProgress {
  eligiblePropertyCount: number;
  onlineSubmittedPropertyCount: number;
  completedPaperBallotCount: number;
  activePaperAssistanceRequestCount: number;
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

export function getRepairProject(projectId: number): Promise<RepairProjectDetails> {
  return apiGet<RepairProjectDetails>(`/admin/repair-projects/${projectId}`);
}

export function getRepairProjectProcessHistory(projectId: number): Promise<RepairProjectProcessHistoryEntry[]> {
  return apiGet<RepairProjectProcessHistoryEntry[]>(`/admin/repair-projects/${projectId}/process-history`);
}

export function getRepairProjectExecution(projectId: number): Promise<RepairProjectExecutionDetails> {
  return apiGet<RepairProjectExecutionDetails>(`/admin/repair-projects/${projectId}/execution`);
}

export function getRepairProjectSourcing(projectId: number): Promise<RepairProjectSourcingDetails> {
  return apiGet<RepairProjectSourcingDetails>(`/admin/repair-projects/${projectId}/sourcing`);
}

export function getRepairProjectVoting(projectId: number): Promise<RepairProjectVotingDetails> {
  return apiGet(`/admin/repair-projects/${projectId}/voting`);
}

export function getRepairVotingPreparationOptions(projectId: number): Promise<RepairVotingPreparationOptions> {
  return apiGet(`/admin/repair-projects/${projectId}/voting/preparation-options`);
}

export function prepareRepairProjectVoting(
  projectId: number,
  input: {
    expectedProjectVersion: number;
    collectionMode: RepairVotingCollectionMode;
    paperBallotTemplateAttachmentId: number;
    voteStartAt: string;
    voteEndAt: string;
  },
): Promise<RepairProjectVotingDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/prepare`, input);
}

export function openRepairProjectVoting(
  projectId: number,
  expectedLinkVersion: number,
): Promise<RepairProjectVotingDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/open`, { expectedLinkVersion });
}

export function settleRepairProjectVoting(
  projectId: number,
  expectedLinkVersion: number,
): Promise<RepairProjectVotingDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/settle`, { expectedLinkVersion });
}

export function getRepairVotingWorkbench(projectId: number): Promise<RepairVotingWorkbench> {
  return apiGet(`/admin/repair-projects/${projectId}/voting/workbench`);
}

export function getRepairVotingProgress(projectId: number): Promise<RepairVotingProgress> {
  return apiGet(`/admin/repair-projects/${projectId}/voting/progress`);
}

export function recordRepairVotingDelivery(
  projectId: number,
  input: {
    opid: number;
    proxyAuthorizationId?: number;
    recipientName: string;
    deliveryMethod: RepairVotingDeliveryMethod;
    evidenceAttachmentId: number;
    deliveredAt: string;
  },
): Promise<unknown> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/paper-deliveries`, input);
}

export function reviewRepairVotingDelivery(
  projectId: number,
  deliveryId: number,
  decision: "CONFIRM" | "REJECT",
  reviewNote?: string,
): Promise<unknown> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/paper-deliveries/${deliveryId}/review`, {
    decision,
    reviewNote,
  });
}

export function registerRepairVotingPaperBallot(
  projectId: number,
  input: {
    opid: number;
    proxyAuthorizationId?: number;
    ballotNumber: string;
    attachmentId: number;
    receivedAt: string;
  },
): Promise<unknown> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/paper-ballots`, input);
}

export function listVotingProxyAuthorizations(packageId: number): Promise<VotingProxyAuthorization[]> {
  return apiGet(`/admin/voting-packages/${packageId}/proxy-authorizations`);
}

export function registerVotingProxyAuthorization(
  packageId: number,
  input: {
    principalOpid: number;
    agentName: string;
    agentIdentityDocumentType: VotingProxyAuthorization["agentIdentityDocumentType"];
    agentIdentityNumber: string;
    validFrom: string;
    validUntil: string;
    file: File;
  },
): Promise<VotingProxyAuthorization> {
  const form = new FormData();
  form.append("principalOpid", String(input.principalOpid));
  form.append("agentName", input.agentName);
  form.append("agentIdentityDocumentType", input.agentIdentityDocumentType);
  form.append("agentIdentityNumber", input.agentIdentityNumber);
  form.append("validFrom", input.validFrom);
  form.append("validUntil", input.validUntil);
  form.append("file", input.file);
  return apiUpload(`/admin/voting-packages/${packageId}/proxy-authorizations`, form);
}

export function reviewVotingProxyAuthorization(
  packageId: number,
  authorizationId: number,
  decision: "CONFIRM" | "REJECT",
  reviewNote: string,
): Promise<VotingProxyAuthorization> {
  return apiPost(`/admin/voting-packages/${packageId}/proxy-authorizations/${authorizationId}/review`, {
    decision,
    reviewNote,
  });
}

export function revokeVotingProxyAuthorization(
  packageId: number,
  authorizationId: number,
  reason: string,
): Promise<VotingProxyAuthorization> {
  return apiPost(`/admin/voting-packages/${packageId}/proxy-authorizations/${authorizationId}/revoke`, { reason });
}

export function getVotingProxyAuthorizationPreviewTicket(
  packageId: number,
  authorizationId: number,
): Promise<{ previewUrl: string; expiresAt: string }> {
  return apiGet(`/admin/voting-packages/${packageId}/proxy-authorizations/${authorizationId}/preview-ticket`);
}

export function submitRepairVotingPaperBallotEntry(
  projectId: number,
  ballotId: number,
  subjectId: number,
  entry:
    | { determination: "VALID"; choice: "SUPPORT" | "AGAINST" | "ABSTAIN" }
    | {
      determination: "INVALID";
      invalidReasonCode: "BLANK" | "MULTIPLE_MARKS" | "UNREADABLE" | "WRONG_TEMPLATE" | "OTHER";
      invalidReasonDescription?: string;
    },
): Promise<unknown> {
  return apiPost(`/admin/repair-projects/${projectId}/voting/paper-ballots/${ballotId}/entries`, {
    items: [{ subjectId, ...entry }],
  });
}

export function reviewRepairVotingPaperBallotEntry(
  projectId: number,
  ballotId: number,
  entryId: number,
  decision: "CONFIRM" | "REJECT",
  reviewNote?: string,
): Promise<unknown> {
  return apiPost(
    `/admin/repair-projects/${projectId}/voting/paper-ballots/${ballotId}/entries/${entryId}/review`,
    { decision, reviewNote },
  );
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
    selectionRationale: string;
    selectionEvidenceAttachmentId: number;
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

/** 冻结给相关业主决定或既有授权审查的提案；它不创建施工、定商或付款资格。 */
export function freezeRepairProjectPlanForAuthorization(
  projectId: number,
  planId: number,
  input: {
    expectedProjectVersion: number;
    supplierSelectionMethod: RepairProjectSupplierSelectionMethod;
    supplierEvaluationRule: RepairProjectSupplierEvaluationRule;
    minimumInvitedSupplierCount?: number;
    minimumValidQuoteCount?: number;
    nonCompetitiveSelectionBasis?: string;
    constructionManagementRequirements: string;
    evidenceRequirements: RepairProjectEvidenceRequirement[];
    safetyRequirements: string;
    settlementMethod: "ACTUAL_QUANTITY" | "FIXED_TOTAL";
    plannedStartDate: string;
    plannedCompletionDate: string;
    warrantyDays: number;
    acceptanceMethod: string;
    acceptanceRequirements: RepairProjectAcceptanceRequirement[];
    acceptanceFinalizerRoles: RepairAcceptancePartyRole[];
    acceptanceBasisAttachmentIds: number[];
    acceptanceBasisSummary: string;
    affectedOwnerScopeDescription?: string;
    minimumAffectedOwnerAcceptors?: number;
    affectedOwnerPassRule?: "ALL" | "AT_LEAST_RATIO";
    affectedOwnerApprovalRatio?: number;
  },
): Promise<RepairProjectDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/plans/${planId}/freeze-for-authorization`, input);
}

/** 物业只提交待确认的责任与资金初判；方案预算在后续冻结提案时固化，不能通过本请求锁定方案或写入资金切片。 */
export function proposeRepairProjectResponsibilityDetermination(
  projectId: number,
  input: {
    expectedProjectVersion: number;
    responsibilityPath: RepairResponsibilityPath;
    fundingSourceType: RepairFundingSourceType;
    basisAttachmentId: number;
    basisReference: string;
    responsiblePartyName?: string;
    responsiblePartyReference?: string;
  },
): Promise<RepairProjectDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/responsibility-determinations`, input);
}

/** 仅具备治理权限的主体可确认；服务端仍会重新核验附件、金额和允许组合。 */
export function confirmRepairProjectResponsibilityDetermination(
  projectId: number,
  determinationId: number,
  input: { expectedProjectVersion: number; confirmationNote?: string },
): Promise<RepairProjectDetails> {
  return apiPost(
    `/admin/repair-projects/${projectId}/responsibility-determinations/${determinationId}/confirm`,
    input,
  );
}

/** 仅在草稿阶段按已关联来源重新核验唯一决定范围；后端拒绝以页面选择替代范围事实。 */
export function reverifyRepairProjectDecisionScope(
  projectId: number,
  expectedProjectVersion: number,
): Promise<RepairProjectDetails> {
  return apiPost(`/admin/repair-projects/${projectId}/decision-scope/reverify`, {
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
