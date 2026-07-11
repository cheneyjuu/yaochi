import { apiGet, apiPatch, apiPost } from "./api";

export interface CommunitySettingsResponse {
  header: {
    tenantId: number;
    tenantCode: string;
    tenantShortCode: string;
    tenantName: string;
    governanceStatus: string;
    statisticsVersion: number;
    statisticsUpdatedAt: string | null;
    lastUpdatedAt: string | null;
  };
  organization: CommunityOrganization | null;
  assetLedger: CommunityAssetLedger;
  denominator: CommunityDenominator;
  rules: CommunityRules | null;
  auditLogs: CommunityAuditLog[];
  permissions: CommunitySettingsPermissions;
}

export interface CommunityOrganization {
  provinceCode: string | null;
  provinceName: string | null;
  cityCode: string | null;
  cityName: string | null;
  districtCode: string | null;
  districtName: string | null;
  streetCode: string | null;
  streetName: string | null;
  communityCode: string | null;
  communityName: string | null;
  address: string | null;
  ownersAssemblyEstablished: boolean;
  committeeEstablished: boolean;
  currentCommitteeTermName: string | null;
  transitionOrgType: string | null;
  transitionOrgStatus: string | null;
}

export interface CommunityAssetLedger {
  propertyAreaName: string | null;
  propertyAreaCode: string | null;
  developerName: string | null;
  developerAccountId: string | null;
  plannedHouseholdCount: number;
  deliveredHouseholdCount: number;
  registeredPropertyUnitCount: number;
  registeredVotingOwnerCount: number;
  totalPlannedBuildingArea: string;
  totalExclusiveArea: string;
  registeredVotingTotalArea: string;
  excludedParkingArea: string;
  publicArea: string;
  buildingCount: number;
  unitCount: number;
  parkingSpaceCount: number;
  plotRatio: string | null;
  liveLedgerStats: {
    totalArea: string;
    ownerCount: number;
    unitCount: number;
    buildingCount: number;
  };
  denominatorBreakdown: DenominatorBreakdownItem[];
}

export interface CommunityDenominator {
  legalTotalExclusiveArea: string;
  registeredVotingTotalArea: string;
  registeredVotingOwnerCount: number;
  registeredPropertyUnitCount: number;
  statisticsVersion: number;
  breakdown: DenominatorBreakdownItem[];
  pendingReviewRequests: DenominatorReviewRequest[];
}

export interface DenominatorBreakdownItem {
  assetType: string;
  registeredUnitCount: number;
  votingOwnerCount: number;
  buildingArea: string;
  baseRatio: string;
  operationStatus: string;
}

export interface DenominatorReviewRequest {
  requestId: number;
  requestedTotalArea: string;
  requestedOwnerCount: number;
  requestedUnitCount: number;
  reason: string;
  status: string;
  requestedBy: number;
  createTime: string;
}

export interface CommunityRules {
  currentPolicy: GovernancePolicy | null;
  policyOptions: GovernancePolicy[];
  sharedOwnershipStrategy: string;
  repairEstimateRequired: boolean;
  fundManagedEnabled: boolean;
  financialControlConfigId: string;
  quarterlyDisclosureDeadlineDay: number;
  daysUntilDisclosureDeadline: number;
}

export interface GovernancePolicy {
  policyId: number;
  policyCode: string;
  policyName: string;
  policyVersion: string;
  abstentionStrategy: string;
  sharedOwnershipStrategy: string;
  ownerRepresentativeStrategy: string;
  unvotedOwnerStrategy: string;
  summaryJson: string;
  effectiveAt: string;
}

export interface CommunityAuditLog {
  auditId: number;
  operationType: string;
  operatorUserId: number | null;
  createTime: string;
}

export interface CommunitySettingsPermissions {
  government: boolean;
  committeeDirector: boolean;
  propertyRole: boolean;
  canViewOrganization: boolean;
  canViewRules: boolean;
  canEditOfficialData: boolean;
  canEditAssetLedger: boolean;
  canEditLegalArea: boolean;
  canEditRules: boolean;
  canEditFinancialControl: boolean;
  canReconcileDenominator: boolean;
  canRequestDenominatorReview: boolean;
  canSubmitPageChanges: boolean;
}

export type UpdateCommunityOrganizationRequest = Partial<CommunityOrganization> & {
  tenantName?: string | null;
};

export type UpdateCommunityAssetLedgerRequest = Partial<Omit<
  CommunityAssetLedger,
  "developerAccountId" | "liveLedgerStats" | "denominatorBreakdown"
>> & {
  developerAccountId?: number | null;
};

export type UpdateCommunityRulesRequest = Partial<{
  ruleConfigId: number | null;
  sharedOwnershipStrategy: string;
  repairEstimateRequired: boolean;
  fundManagedEnabled: boolean;
  financialControlConfigId: string;
  quarterlyDisclosureDeadlineDay: number;
}>;

export interface SubmitDenominatorReviewRequest {
  requestedTotalArea?: string;
  requestedOwnerCount?: number;
  requestedUnitCount?: number;
  reason: string;
}

export function getCommunitySettings(): Promise<CommunitySettingsResponse> {
  return apiGet<CommunitySettingsResponse>("/admin/community-settings");
}

export function updateCommunityOrganization(body: UpdateCommunityOrganizationRequest) {
  return apiPatch<CommunitySettingsResponse>("/admin/community-settings/organization", body);
}

export function updateCommunityAssetLedger(body: UpdateCommunityAssetLedgerRequest) {
  return apiPatch<CommunitySettingsResponse>("/admin/community-settings/asset-ledger", body);
}

export function updateCommunityRules(body: UpdateCommunityRulesRequest) {
  return apiPatch<CommunitySettingsResponse>("/admin/community-settings/rules", body);
}

export function recalculateCommunityDenominator() {
  return apiPost<CommunitySettingsResponse>("/admin/community-settings/denominator/recalculate");
}

export function submitDenominatorReview(body: SubmitDenominatorReviewRequest) {
  return apiPost<CommunitySettingsResponse>("/admin/community-settings/denominator/review-requests", body);
}
