// 楼栋责任田分配端封装 —— 对齐后端 BuildingAssignmentController（M4）。
// 读侧（任何已登录用户可访问，前端按 roleKey 门控菜单）：
//   GET /admin/building-assignments/users?roleKey=...    可分配用户列表
//   GET /admin/building-assignments/buildings            可分配楼栋列表
//   GET /admin/building-assignments/users/{id}/buildings 某用户已分配楼栋
// 写侧（service 层 requireAssigner 校验白名单：GOV_SUPER_ADMIN/COMMUNITY_ADMIN/
// PARTY_SECRETARY/COMMITTEE_DIRECTOR）：
//   POST   /admin/building-assignments/users/{id}/buildings 分配（幂等）
//   DELETE /admin/building-assignments/users/{id}/buildings/{buildingId} 撤销

import { apiGet, apiPost, apiDelete } from "./api";

/** 可分配的执行角色（后端 ASSIGNABLE_ROLES 白名单）。 */
export type AssignableRoleKey = "GRID_OPERATOR" | "VOLUNTEER" | "OWNER_REPRESENTATIVE";

/** 对齐后端 AssignableUserResponse。 */
export interface AssignableUser {
  userId: number;
  nickName: string;
  roleKey: AssignableRoleKey;
  buildingCount: number;
}

/** 对齐后端 BuildingResponse。无独立楼栋表，buildingId 是 c_owner_property.building_id 的 distinct 值。 */
export interface Building {
  buildingId: number;
}

/** 对齐后端 BuildingAssignmentResponse。 */
export interface BuildingAssignment {
  assignmentId: number;
  userId: number;
  buildingId: number;
  tenantId: number;
  assignedBy: number;
  assignedAt: string;
  status: number; // 1=生效
}

export function listAssignableUsers(roleKey: AssignableRoleKey): Promise<AssignableUser[]> {
  return apiGet<AssignableUser[]>(`/admin/building-assignments/users?roleKey=${roleKey}`);
}

export function listBuildings(): Promise<Building[]> {
  return apiGet<Building[]>(`/admin/building-assignments/buildings`);
}

export function getUserBuildings(userId: number): Promise<BuildingAssignment[]> {
  return apiGet<BuildingAssignment[]>(`/admin/building-assignments/users/${userId}/buildings`);
}

export function assignBuilding(
  userId: number,
  buildingId: number,
  targetRoleKey: AssignableRoleKey,
): Promise<void> {
  return apiPost<void>(`/admin/building-assignments/users/${userId}/buildings`, {
    buildingId,
    targetRoleKey,
  });
}

export function revokeBuilding(userId: number, buildingId: number): Promise<void> {
  return apiDelete<void>(`/admin/building-assignments/users/${userId}/buildings/${buildingId}`);
}
