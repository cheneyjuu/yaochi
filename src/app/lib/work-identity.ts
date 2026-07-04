// 工作身份与授权管理端封装 —— 对齐后端 WorkIdentityAdminController。
// 账号是自然人 t_account；工作身份是 sys_user；每个工作身份绑定一个 RBAC 角色，楼栋责任田承载 OWNER_GROUP ABAC。

import { apiGet, apiPost, apiPut } from "./api";

export interface WorkIdentityShadow {
  userId: number;
  accountId: number;
  deptId: number;
  tenantId: number | null;
  userName: string;
  nickName: string | null;
  deptType: number | null;
  deptCategory: string | null;
  deptName: string | null;
  roleId: number | null;
  roleKey: string | null;
  roleName: string | null;
  effectiveDataScope: string | null;
  buildingIds: number[];
}

export interface WorkIdentityAccount {
  accountId: number;
  phone: string;
  realName: string;
  realNameVerified: number;
  status: number;
  shadows: WorkIdentityShadow[];
}

export interface WorkIdentityDeptOption {
  deptId: number;
  parentId: number | null;
  ancestors: string;
  deptName: string;
  deptType: number;
  deptCategory: string;
  tenantId: number | null;
}

export interface WorkIdentityBuilding {
  tenantId: number | null;
  buildingId: number;
}

export interface CreateWorkIdentityInput {
  deptId: number;
  roleKey: string;
  nickName?: string;
  buildingIds?: number[];
  forceBuildingTransfer?: boolean;
}

export function searchWorkIdentityAccounts(keyword: string): Promise<WorkIdentityAccount[]> {
  return apiGet<WorkIdentityAccount[]>(
    `/admin/work-identities/accounts/search?keyword=${encodeURIComponent(keyword)}`,
  );
}

export function getWorkIdentityAccount(accountId: number): Promise<WorkIdentityAccount> {
  return apiGet<WorkIdentityAccount>(`/admin/work-identities/accounts/${accountId}`);
}

export function listWorkIdentityDeptOptions(roleKey: string): Promise<WorkIdentityDeptOption[]> {
  return apiGet<WorkIdentityDeptOption[]>(
    `/admin/work-identities/dept-options?roleKey=${encodeURIComponent(roleKey)}`,
  );
}

export function listWorkIdentityBuildings(deptId: number): Promise<WorkIdentityBuilding[]> {
  return apiGet<WorkIdentityBuilding[]>(`/admin/work-identities/building-options?deptId=${deptId}`);
}

export function ensureGridNodes(communityDeptId: number): Promise<WorkIdentityDeptOption[]> {
  return apiPost<WorkIdentityDeptOption[]>(
    `/admin/work-identities/depts/${communityDeptId}/grid-nodes`,
  );
}

export function listGridBuildingScope(deptId: number): Promise<WorkIdentityBuilding[]> {
  return apiGet<WorkIdentityBuilding[]>(`/admin/work-identities/depts/${deptId}/building-scope`);
}

export function updateGridBuildingScope(
  deptId: number,
  buildingScopes: Array<{ tenantId: number; buildingId: number }>,
): Promise<WorkIdentityBuilding[]> {
  return apiPut<WorkIdentityBuilding[]>(
    `/admin/work-identities/depts/${deptId}/building-scope`,
    { buildingScopes },
  );
}

export function createWorkIdentityShadow(
  accountId: number,
  input: CreateWorkIdentityInput,
): Promise<WorkIdentityShadow> {
  return apiPost<WorkIdentityShadow>(
    `/admin/work-identities/accounts/${accountId}/shadows`,
    input,
  );
}
