// 角色 / 权限管理端封装 —— 对齐后端 RoleAdminController + PermissionAdminController。
// 读侧（admin:role:read）：GET /admin/roles 分页、GET /admin/roles/{id}/permissions 已授、
//   GET /admin/permissions 全量权限清单。
// 写侧（admin:role:manage）：POST /admin/roles 新建、POST /admin/roles/{id}/permissions 授予、
//   DELETE /admin/roles/{id}/permissions/{key} 撤销、DELETE /admin/roles/{id} 删除。
// 后端无 updateRole：defaultDataScope/fixedDataScope 仅在新建时合法，已有角色只读展示。

import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type { PageResponse } from "./voting";

/** 对齐后端 RoleListItemResponse。Instant → ISO 字符串。 */
export interface Role {
  roleId: number;
  roleKey: string;
  roleName: string;
  allowedDeptCategory: string; // G/B/S
  fixedDataScope: string | null;
  defaultDataScope: string; // ALL_COMMUNITY/OWNER_GROUP/ORG_ONLY
  isSystem: number; // 0/1
  status: string; // '0' 正常 / '1' 停用
  permissionCount: number;
  createTime: string;
}

/** 对齐后端 RolePermissionResponse（某角色已授权限明细）。 */
export interface RolePermission {
  permissionKey: string;
  description: string;
  permissionGroup: string;
  allowedDeptCategories: string;
  isLegalRedline: number;
  grantedBy: number | null;
  grantedAt: string | null;
}

/** 对齐后端 PermissionCatalogResponse（全量权限清单，勾选用）。 */
export interface PermissionCatalog {
  permissionKey: string;
  description: string;
  permissionGroup: string;
  allowedDeptCategories: string;
  isLegalRedline: number;
}

export interface ListRolesParams {
  page?: number;
  size?: number;
  roleKey?: string;
  roleName?: string;
  isSystem?: number;
  status?: string;
}

/** 角色分页列表（读侧）。 */
export function listRoles(params: ListRolesParams = {}): Promise<PageResponse<Role>> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("size", String(params.size ?? 20));
  if (params.roleKey) q.set("roleKey", params.roleKey);
  if (params.roleName) q.set("roleName", params.roleName);
  if (params.isSystem !== undefined) q.set("isSystem", String(params.isSystem));
  if (params.status) q.set("status", params.status);
  return apiGet<PageResponse<Role>>(`/admin/roles?${q.toString()}`);
}

/** 某角色已授权限明细（读侧）。 */
export function getRolePermissions(roleId: number): Promise<RolePermission[]> {
  return apiGet<RolePermission[]>(`/admin/roles/${roleId}/permissions`);
}

/** 平台全量权限清单（读侧，授权页勾选用）。 */
export function listPermissions(): Promise<PermissionCatalog[]> {
  return apiGet<PermissionCatalog[]>(`/admin/permissions`);
}

// ---- 写侧 ----

export interface CreateRoleInput {
  roleKey: string;
  roleName: string;
  allowedDeptCategory: string; // G/B/S
  fixedDataScope?: string | null;
  defaultDataScope: string;
}

/** 新建非系统角色（写侧）。返回含 roleId。 */
export function createRole(input: CreateRoleInput): Promise<{ roleId: number }> {
  return apiPost<{ roleId: number }>("/admin/roles", input);
}

/** 授予角色一项 permission（写侧）。 */
export function assignPermission(roleId: number, permissionKey: string): Promise<void> {
  return apiPost<void>(`/admin/roles/${roleId}/permissions`, { permissionKey });
}

/** 撤销角色一项 permission（写侧）。permissionKey 含冒号，作 path 段直接传。 */
export function revokePermission(roleId: number, permissionKey: string): Promise<void> {
  return apiDelete<void>(
    `/admin/roles/${roleId}/permissions/${encodeURIComponent(permissionKey)}`,
  );
}

/** 删除非系统角色（写侧，is_system=1 由后端 trigger 7 拒绝）。 */
export function deleteRole(roleId: number): Promise<void> {
  return apiDelete<void>(`/admin/roles/${roleId}`);
}

/**
 * 写回角色数据范围（写侧）。
 *
 * 仅 defaultDataScope 可改；fixedDataScope 非空的角色后端返回 403/42302
 * （红线锁死），调用处需据 fixedDataScope 提前禁用编辑。
 */
export function updateRoleDataScope(
  roleId: number,
  defaultDataScope: string,
): Promise<void> {
  return apiPatch<void>(`/admin/roles/${roleId}/data-scope`, { defaultDataScope });
}
