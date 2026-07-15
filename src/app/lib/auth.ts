// 关联业务：管理端会话、角色映射与街镇辖区小区上下文切换。
// 登录、token/会话持久化（localStorage）以及后端 tenant 上下文的唯一前端映射入口。

import type { BackendPropertyManagementMode, DataScope, RoleId } from "./types";
import { apiGet, apiPost } from "./api";
import type { NavModule } from "./nav";

const SESSION_KEY = "pangu.session";

/** 后端 login 返回的 user_info（snake_case，对齐 AuthService.login）。 */
export interface UserInfo {
  account_id: number;
  identity_type: string;
  active_identity_id: number;
  tenant_id: number | null;
  /** 当前 JWT 生效租户的权威名称，由后端会话资料下发。 */
  tenant_name?: string | null;
  /** 当前 JWT 生效租户的物业管理模式；空值只能表示尚未配置。 */
  property_mode?: BackendPropertyManagementMode | null;
  dept_type: number | null;
  auth_level: number;
  role_key: string;
  permissions: string[];
  menu_permissions?: string[];
}

export interface Session {
  token: string;
  expiresIn: number;
  /** 刷新凭证仅用于换取新的访问 JWT；服务端仅保存其不可逆摘要。 */
  refreshToken?: string;
  /** 访问 JWT 的本地到期时间，用于在请求前主动续期。 */
  accessTokenExpiresAt?: number;
  /** 刷新凭证的本地到期时间，到期后必须重新登录。 */
  refreshTokenExpiresAt?: number;
  user: UserInfo;
  menus?: NavModule[];
  /** 仅 G 端根组织持有，来自后端当前有效辖区授权，不能由前端静态补造。 */
  managedCommunities?: ManagedCommunity[];
  /** 派生：前端角色 / 小区 / 数据范围。 */
  roleId: RoleId;
  communityId: string;
}

/** G 端当前工作身份可切换监管的小区摘要。 */
export interface ManagedCommunity {
  tenant_id: number;
  tenant_name: string;
  planned_household_count: number | null;
  total_exclusive_area: number | null;
  governance_status: string | null;
  property_mode: BackendPropertyManagementMode | null;
}

export interface SysUserShadow {
  user_id: number;
  dept_id: number;
  tenant_id: number | null;
  user_name: string;
  nick_name: string | null;
  dept_type: number | null;
  dept_category: "G" | "B" | "S" | null;
  dept_name: string | null;
  role_id: number | null;
  role_key: string | null;
  role_name: string | null;
  effective_data_scope: DataScope | string | null;
  active: boolean;
}

// ---- 后端 role_key(13) → 前端 RoleId(9) 映射 ----
const ROLE_KEY_TO_ROLE_ID: Record<string, RoleId> = {
  GOV_SUPER_ADMIN: "street_admin",
  PLATFORM_OPERATOR: "street_admin",
  COMMUNITY_ADMIN: "community_admin",
  PARTY_SECRETARY: "party_secretary",
  GOV_OPERATOR: "gov_operator",
  COMMITTEE_DIRECTOR: "committee_director",
  COMMITTEE_MEMBER: "committee_member",
  GRID_MEMBER: "building_rep",
  OWNER_REPRESENTATIVE: "building_rep",
  PROPERTY_MANAGER: "property_manager",
  PROPERTY_STAFF: "property_service",
  SERVICE_PROVIDER_MANAGER: "supplier_service",
  SERVICE_PROVIDER_STAFF: "supplier_service",
  // 未覆盖：COMMITTEE_SECRETARY / VOLUNTEER → 回退
};

export function mapRoleId(roleKey: string | null | undefined): RoleId {
  if (roleKey && ROLE_KEY_TO_ROLE_ID[roleKey]) return ROLE_KEY_TO_ROLE_ID[roleKey];
  console.warn(`[auth] 未映射的后端角色 role_key=${roleKey}，回退 committee_member`);
  return "committee_member";
}

/**
 * 当前小区选择器直接使用受后端 JWT 约束的 tenant_id，杜绝 c1/c2 等静态映射导致的新小区丢失。
 */
export function mapCommunityId(tenantId: number | null): string {
  return tenantId == null ? "" : String(tenantId);
}

// 各角色默认数据范围（与 store 内 DEFAULT_SCOPE 对齐）。
export const DEFAULT_SCOPE: Record<RoleId, DataScope> = {
  street_admin: "ALL_DISTRICT",
  community_admin: "ALL_COMMUNITY",
  party_secretary: "ALL_COMMUNITY",
  gov_operator: "ALL_COMMUNITY",
  committee_director: "ALL_COMMUNITY",
  committee_member: "ALL_COMMUNITY",
  building_rep: "CUSTOM_BUILDING",
  property_manager: "ORG_ONLY",
  property_service: "ORG_ONLY",
  supplier_service: "ORG_ONLY",
  auditor: "ALL_COMMUNITY",
};

// ---- 会话读写 ----
export function getToken(): string | null {
  return loadSession()?.token ?? null;
}

/** 当前浏览器保存的刷新凭证；从不拼入 URL 或 Authorization 请求头。 */
export function getRefreshToken(): string | null {
  return loadSession()?.refreshToken ?? null;
}

/** 留出网络往返余量，避免已过期 JWT 先发出业务请求。 */
export function isAccessTokenExpiringSoon(bufferMs = 30_000): boolean {
  const expiresAt = loadSession()?.accessTokenExpiresAt;
  return typeof expiresAt === "number" && expiresAt <= Date.now() + bufferMs;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function buildSession(
  token: string,
  expiresIn: number,
  user: UserInfo,
  refreshToken?: string,
  refreshExpiresIn?: number,
): Session {
  const roleId = mapRoleId(user.role_key);
  const now = Date.now();
  return {
    token,
    expiresIn,
    refreshToken,
    accessTokenExpiresAt: toExpiresAt(now, expiresIn),
    refreshTokenExpiresAt: toExpiresAt(now, refreshExpiresIn),
    user,
    roleId,
    communityId: mapCommunityId(user.tenant_id),
  };
}

function toExpiresAt(now: number, expiresIn?: number): number | undefined {
  return typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0
    ? now + expiresIn * 1_000
    : undefined;
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export interface SessionTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  user_info: UserInfo;
}

/** 用刷新接口的权威会话资料替换当前浏览器会话，同时保留前端缓存的导航与辖区列表。 */
export function renewStoredSession(data: SessionTokenResponse): Session | null {
  const current = loadSession();
  if (!current || !data.access_token || !data.refresh_token) return null;
  const next: Session = {
    ...buildSession(
      data.access_token,
      data.expires_in,
      data.user_info,
      data.refresh_token,
      data.refresh_expires_in,
    ),
    menus: current.menus,
    managedCommunities: current.managedCommunities,
  };
  saveSession(next);
  return next;
}

/** 手机号 + 短信验证码登录，成功后落地 session 并返回。 */
export async function loginByPhone(phone: string, smsCode: string): Promise<Session> {
  const data = await apiPost<SessionTokenResponse>(
    "/auth/login",
    { username: phone, smsCode, loginType: 1, clientPortal: "B" },
    { auth: false },
  );
  const session = buildSession(
    data.access_token,
    data.expires_in,
    data.user_info,
    data.refresh_token,
    data.refresh_expires_in,
  );
  saveSession(session);
  return session;
}

export interface SupplierActivationResult {
  invitationId: number;
  supplierDeptId: number;
  supplierLegalName: string;
  accountId: number;
  userId: number;
  phone: string;
  roleKey: string;
}

export function activateSupplierAccount(input: {
  invitationId: number;
  phone: string;
  smsCode: string;
  operatorName: string;
}): Promise<SupplierActivationResult> {
  return apiPost<SupplierActivationResult>("/supplier-activation/activate", input, { auth: false });
}

interface ShadowsResponse {
  shadows: SysUserShadow[];
}

interface SwitchShadowResponse extends Omit<SessionTokenResponse, "access_token"> {
  new_access_token: string;
  active_shadow: SysUserShadow;
}

interface ManagedCommunitiesResponse {
  active_tenant_id: number | null;
  communities: ManagedCommunity[];
}

interface SwitchManagedCommunityResponse extends Omit<SessionTokenResponse, "access_token"> {
  new_access_token: string;
  active_tenant_id: number;
}

export async function listSysUserShadows(): Promise<SysUserShadow[]> {
  const data = await apiGet<ShadowsResponse>("/auth/shadows");
  return data.shadows ?? [];
}

export async function switchSysUserShadow(targetUserId: number): Promise<Session> {
  const data = await apiPost<SwitchShadowResponse>("/auth/switch-shadow", { targetUserId });
  const session = buildSession(
    data.new_access_token,
    data.expires_in,
    data.user_info,
    data.refresh_token,
    data.refresh_expires_in,
  );
  saveSession(session);
  return session;
}

/** 读取当前 G 端根组织已获授权的小区，列表由后端组织树和辖区范围决定。 */
export function listManagedCommunities(): Promise<ManagedCommunitiesResponse> {
  return apiGet<ManagedCommunitiesResponse>("/auth/managed-communities");
}

/**
 * 以目标小区重新签发 G 端 JWT。后续页面请求均携带新 tenant 上下文，不能只改前端显示状态。
 */
export async function switchManagedCommunity(targetTenantId: number): Promise<Session> {
  const data = await apiPost<SwitchManagedCommunityResponse>("/auth/switch-managed-community", {
    targetTenantId,
  });
  const session = buildSession(
    data.new_access_token,
    data.expires_in,
    data.user_info,
    data.refresh_token,
    data.refresh_expires_in,
  );
  saveSession(session);
  return session;
}
