// 工作身份与授权管理端封装 —— 对齐后端 WorkIdentityAdminController。
// 账号是自然人 t_account；工作身份是 sys_user；每个工作身份绑定一个 RBAC 角色，楼栋责任田承载 OWNER_GROUP ABAC。

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";

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
  gridNodes: WorkIdentityDeptOption[];
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

export interface CreateWorkIdentityAccountInput extends CreateWorkIdentityInput {
  phone: string;
  realName: string;
}

export function listWorkIdentityAccounts(roleKey?: string): Promise<WorkIdentityAccount[]> {
  const q = new URLSearchParams();
  if (roleKey) q.set("roleKey", roleKey);
  const suffix = q.toString();
  return apiGet<WorkIdentityAccount[]>(
    `/admin/work-identities/accounts${suffix ? `?${suffix}` : ""}`,
  );
}

export function searchWorkIdentityAccounts(
  keyword: string,
  roleKey?: string,
): Promise<WorkIdentityAccount[]> {
  const q = new URLSearchParams({ keyword });
  if (roleKey) q.set("roleKey", roleKey);
  return apiGet<WorkIdentityAccount[]>(
    `/admin/work-identities/accounts/search?${q.toString()}`,
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

export function createGridNode(deptName: string): Promise<WorkIdentityDeptOption> {
  return apiPost<WorkIdentityDeptOption>(
    "/admin/work-identities/grid-nodes",
    { deptName },
  );
}

export function updateGridNode(deptId: number, deptName: string): Promise<WorkIdentityDeptOption> {
  return apiPatch<WorkIdentityDeptOption>(
    `/admin/work-identities/depts/${deptId}/grid-node`,
    { deptName },
  );
}

export function deleteGridNode(deptId: number): Promise<void> {
  return apiDelete<void>(`/admin/work-identities/depts/${deptId}/grid-node`);
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

export function listAssignedGridNodes(userId: number): Promise<WorkIdentityDeptOption[]> {
  return apiGet<WorkIdentityDeptOption[]>(`/admin/work-identities/users/${userId}/grid-nodes`);
}

export function updateAssignedGridNodes(
  userId: number,
  gridDeptIds: number[],
): Promise<WorkIdentityDeptOption[]> {
  return apiPut<WorkIdentityDeptOption[]>(
    `/admin/work-identities/users/${userId}/grid-nodes`,
    { gridDeptIds },
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

export function createWorkIdentityAccount(
  input: CreateWorkIdentityAccountInput,
): Promise<WorkIdentityAccount> {
  return apiPost<WorkIdentityAccount>("/admin/work-identities/accounts", input);
}
