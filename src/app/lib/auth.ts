// 盘古会话管理 + 后端身份→前端角色映射。
// 登录、token/会话持久化（localStorage）、role_key→RoleId、tenant_id→communityId。

import type { DataScope, RoleId } from "./types";
import { apiGet, apiPost } from "./api";
import type { NavModule } from "./nav";

const SESSION_KEY = "pangu.session";

/** 后端 login 返回的 user_info（snake_case，对齐 AuthService.login）。 */
export interface UserInfo {
  account_id: number;
  identity_type: string;
  active_identity_id: number;
  tenant_id: number | null;
  dept_type: number | null;
  auth_level: number;
  role_key: string;
  permissions: string[];
  menu_permissions?: string[];
}

export interface Session {
  token: string;
  expiresIn: number;
  user: UserInfo;
  menus?: NavModule[];
  /** 派生：前端角色 / 小区 / 数据范围。 */
  roleId: RoleId;
  communityId: string;
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

// ---- tenant_id → 前端 communityId（当前单租户，临时硬映射）----
const TENANT_TO_COMMUNITY: Record<number, string> = {
  10001: "c1",
  10002: "c2",
  10003: "c3",
};

export function mapCommunityId(roleId: RoleId, tenantId: number | null): string {
  if (roleId === "street_admin" && tenantId == null) return "ALL";
  if (tenantId == null) return "c1";
  return TENANT_TO_COMMUNITY[tenantId] ?? "c1";
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

function buildSession(token: string, expiresIn: number, user: UserInfo): Session {
  const roleId = mapRoleId(user.role_key);
  return {
    token,
    expiresIn,
    user,
    roleId,
    communityId: mapCommunityId(roleId, user.tenant_id),
  };
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

interface LoginResponse {
  access_token: string;
  expires_in: number;
  user_info: UserInfo;
}

/** 手机号 + 短信验证码登录，成功后落地 session 并返回。 */
export async function loginByPhone(phone: string, smsCode: string): Promise<Session> {
  const data = await apiPost<LoginResponse>(
    "/auth/login",
    { username: phone, smsCode, loginType: 1, clientPortal: "B" },
    { auth: false },
  );
  const session = buildSession(data.access_token, data.expires_in, data.user_info);
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

interface SwitchShadowResponse {
  new_access_token: string;
  expires_in: number;
  user_info: UserInfo;
  active_shadow: SysUserShadow;
}

export async function listSysUserShadows(): Promise<SysUserShadow[]> {
  const data = await apiGet<ShadowsResponse>("/auth/shadows");
  return data.shadows ?? [];
}

export async function switchSysUserShadow(targetUserId: number): Promise<Session> {
  const data = await apiPost<SwitchShadowResponse>("/auth/switch-shadow", { targetUserId });
  const session = buildSession(data.new_access_token, data.expires_in, data.user_info);
  saveSession(session);
  return session;
}
