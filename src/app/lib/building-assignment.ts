// 楼栋责任田分配端封装 —— 对齐后端 BuildingAssignmentController（M4 重构版）。
// 三步流程：search 候选 → 合规检查（complianceIssues 驱动）→ 占用感知分配（同角色冲突走 force）。

import { apiGet, apiPost, apiDelete } from "./api";

/** 可分配的执行角色（后端 ASSIGNABLE_ROLES 白名单）。 */
export type AssignableRoleKey = "GRID_OPERATOR" | "VOLUNTEER" | "OWNER_REPRESENTATIVE";

/** 对齐后端 AssignableUserResponse。 */
export interface AssignableUser {
  userId: number;
  nickName: string;
  roleKey: AssignableRoleKey;
  phone: string;
  realNameVerified: number; // 0/1
  buildingCount: number;
  /** 后端合规标签数组；空表示合规。元素值：NOT_VERIFIED / BUILDING_LIMIT_REACHED。 */
  complianceIssues: string[];
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

/** 单个楼栋占用者。 */
export interface BuildingOccupant {
  userId: number;
  nickName: string;
  roleKey: AssignableRoleKey;
}

/** 楼栋占用快照（含不同角色占用者）。 */
export interface BuildingOccupancy {
  buildingId: number;
  occupants: BuildingOccupant[];
}

// ---- 读侧 ----

/** 模糊搜索：姓名 / 手机号 / 手机尾号 OR；只命中可分配三角色。 */
export function searchAssignableUsers(keyword: string): Promise<AssignableUser[]> {
  return apiGet<AssignableUser[]>(
    `/admin/building-assignments/search?keyword=${encodeURIComponent(keyword)}`,
  );
}

/** 按角色列出可分配用户（保留兼容；新页用 search）。 */
export function listAssignableUsers(roleKey: AssignableRoleKey): Promise<AssignableUser[]> {
  return apiGet<AssignableUser[]>(`/admin/building-assignments/users?roleKey=${roleKey}`);
}

export function listBuildings(): Promise<Building[]> {
  return apiGet<Building[]>(`/admin/building-assignments/buildings`);
}

export function getUserBuildings(userId: number): Promise<BuildingAssignment[]> {
  return apiGet<BuildingAssignment[]>(`/admin/building-assignments/users/${userId}/buildings`);
}

/** 楼栋占用快照（status=1 的所有占用者，含不同角色）。 */
export function getBuildingOccupants(buildingId: number): Promise<BuildingOccupancy> {
  return apiGet<BuildingOccupancy>(`/admin/building-assignments/buildings/${buildingId}/occupants`);
}

// ---- 写侧 ----

/**
 * 分配楼栋。force=true 时表示「转移」——若楼栋已被同角色其他用户占用，
 * 后端先 revoke 占用者再分配给当前 userId。
 */
export function assignBuilding(
  userId: number,
  buildingId: number,
  targetRoleKey: AssignableRoleKey,
  force?: boolean,
): Promise<void> {
  return apiPost<void>(`/admin/building-assignments/users/${userId}/buildings`, {
    buildingId,
    targetRoleKey,
    force: force ?? false,
  });
}

export function revokeBuilding(userId: number, buildingId: number): Promise<void> {
  return apiDelete<void>(`/admin/building-assignments/users/${userId}/buildings/${buildingId}`);
}
