// 关联业务：连接小区注册人短信身份、申请材料维护、属地/平台审核与租户冷启动接口。
import { apiGet, apiPost, createTokenApi } from "./api";

export type CommunityRegistrationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "RETURNED"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

export type CommunityApplicantIdentity =
  | "COMMITTEE_DIRECTOR"
  | "COMMITTEE_VICE_DIRECTOR"
  | "COMMITTEE_MEMBER"
  | "OWNER"
  | "COMMUNITY_STAFF";

export type CommunityHousingTag =
  | "SHOP"
  | "RELOCATION_HOUSING"
  | "COMMERCIAL_HOUSING"
  | "VILLA";

export type CommunityRegistrationMaterialType =
  | "COMMUNITY_EXISTENCE_PROOF"
  | "COMMITTEE_FILING"
  | "POSITION_PROOF"
  | "OWNER_IDENTITY_PROOF"
  | "COMMUNITY_STAFF_PROOF"
  | "OTHER";

export interface CommunityRegistrationMaterial {
  materialId: number;
  materialType: CommunityRegistrationMaterialType;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
}

export interface CommunityRegistrationReview {
  reviewId: number;
  decision: "RETURN" | "APPROVE" | "REJECT";
  reviewMode: "STREET" | "PLATFORM_FALLBACK";
  reviewerUserId: number;
  reviewerDeptId: number;
  reviewComment?: string | null;
  fallbackReason?: string | null;
  createdAt: string;
}

export interface CommunityOnboardingWorkspace {
  onboardingId: number;
  tenantId: number;
  status: string;
  officialAffiliationStatus: string;
  spaceLedgerStatus: string;
  propertyRosterStatus: string;
  denominatorStatus: string;
  ownerAccessQrStatus: string;
  initializationDeptId: number;
  committeeDeptId?: number | null;
  applicantWorkUserId?: number | null;
}

export interface CommunityRegistration {
  applicationId: number;
  applicationNo: string;
  applicantAccountId: number;
  applicantName: string;
  applicantPhone: string;
  claimedIdentity: CommunityApplicantIdentity;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  communityName: string;
  communityAddress: string;
  declaredHouseholdCount: number;
  housingTags: CommunityHousingTag[];
  status: CommunityRegistrationStatus;
  reviewMode?: "STREET" | "PLATFORM_FALLBACK" | null;
  reviewerUserId?: number | null;
  reviewerDeptId?: number | null;
  reviewComment?: string | null;
  fallbackReason?: string | null;
  provisionedTenantId?: number | null;
  version: number;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  materials: CommunityRegistrationMaterial[];
  reviews: CommunityRegistrationReview[];
  onboarding?: CommunityOnboardingWorkspace | null;
}

export interface CommunityRegistrationInput {
  applicantName: string;
  claimedIdentity: CommunityApplicantIdentity;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  communityName: string;
  communityAddress: string;
  declaredHouseholdCount: number;
  housingTags: CommunityHousingTag[];
  expectedVersion?: number;
}

export interface CommunityRegistrationReviewInput {
  decision: "RETURN" | "APPROVE" | "REJECT";
  reviewMode: "STREET" | "PLATFORM_FALLBACK";
  reviewComment?: string;
  fallbackReason?: string;
  expectedVersion: number;
}

interface ApplicantLoginResponse {
  access_token: string;
  expires_in: number;
  user_info: {
    account_id: number;
    identity_type: string;
  };
}

export interface CommunityApplicantSession {
  token: string;
  expiresIn: number;
  accountId: number;
}

export interface CommunityMaterialPreview {
  materialId: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  previewUrl: string;
  expiresAt: string;
}

/** 手机短信验证只建立 C 端基础账号，不授予任何小区管理角色。 */
export async function loginCommunityApplicant(
  phone: string,
  smsCode: string,
): Promise<CommunityApplicantSession> {
  const result = await apiPost<ApplicantLoginResponse>(
    "/auth/login",
    { username: phone, smsCode, loginType: 1, clientPortal: "OWNER" },
    { auth: false },
  );
  if (result.user_info.identity_type !== "C_USER") {
    throw new Error("当前手机号未进入小区注册人基础身份，请重新验证");
  }
  return {
    token: result.access_token,
    expiresIn: result.expires_in,
    accountId: result.user_info.account_id,
  };
}

/** 注册申请使用独立 C 端令牌，不写入管理端工作身份会话。 */
export function createCommunityApplicantClient(token: string) {
  const api = createTokenApi(token);
  return {
    listMine: () => api.get<CommunityRegistration[]>("/community-registrations/mine"),
    get: (applicationId: number) => api.get<CommunityRegistration>(
      `/community-registrations/${applicationId}`,
    ),
    create: (input: CommunityRegistrationInput) => api.post<CommunityRegistration>(
      "/community-registrations",
      input,
    ),
    revise: (applicationId: number, input: CommunityRegistrationInput) =>
      api.put<CommunityRegistration>(`/community-registrations/${applicationId}`, input),
    submit: (applicationId: number, expectedVersion: number) =>
      api.post<CommunityRegistration>(`/community-registrations/${applicationId}/submit`, {
        expectedVersion,
      }),
    withdraw: (applicationId: number, expectedVersion: number) =>
      api.post<CommunityRegistration>(`/community-registrations/${applicationId}/withdraw`, {
        expectedVersion,
      }),
    uploadMaterial: (
      applicationId: number,
      materialType: CommunityRegistrationMaterialType,
      file: File,
    ) => {
      const data = new FormData();
      data.append("materialType", materialType);
      data.append("file", file);
      return api.upload<CommunityRegistrationMaterial>(
        `/community-registrations/${applicationId}/materials`,
        data,
      );
    },
    deleteMaterial: (applicationId: number, materialId: number) => api.delete<void>(
      `/community-registrations/${applicationId}/materials/${materialId}`,
    ),
    previewMaterial: (applicationId: number, materialId: number) =>
      api.get<CommunityMaterialPreview>(
        `/community-registrations/${applicationId}/materials/${materialId}/preview-url`,
      ),
  };
}

export function listCommunityRegistrationsForReview(
  status: CommunityRegistrationStatus,
): Promise<CommunityRegistration[]> {
  return apiGet<CommunityRegistration[]>(
    `/admin/community-registrations?status=${encodeURIComponent(status)}&limit=100`,
  );
}

export function reviewCommunityRegistration(
  applicationId: number,
  input: CommunityRegistrationReviewInput,
): Promise<CommunityRegistration> {
  return apiPost<CommunityRegistration>(
    `/admin/community-registrations/${applicationId}/reviews`,
    input,
  );
}

export function previewCommunityRegistrationMaterial(
  applicationId: number,
  materialId: number,
): Promise<CommunityMaterialPreview> {
  return apiGet<CommunityMaterialPreview>(
    `/community-registrations/${applicationId}/materials/${materialId}/preview-url`,
  );
}
