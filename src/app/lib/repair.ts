import { apiGet, apiPost } from "./api";

export type RepairSpaceScope = "PRIVATE" | "PUBLIC";
export type RepairStatus =
  | "SUBMITTED"
  | "PENDING_VERIFY"
  | "NEED_MANUAL_LOCATION"
  | "VERIFIED"
  | "ASSIGNED"
  | "SURVEYING"
  | "PLAN_SUBMITTED"
  | "GOVERNANCE_PENDING"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PENDING_ACCEPTANCE"
  | "RECTIFICATION_REQUIRED"
  | "COMPLETED"
  | "EVALUATED"
  | "ARCHIVED"
  | "REJECTED"
  | "CANCELLED"
  | "SUSPENDED"
  | "ESCALATED"
  | "REASSIGN_REQUIRED"
  | "PLAN_REVISION_REQUIRED"
  | "CHANGE_REVIEW_PENDING"
  | "PAYMENT_EXCEPTION"
  | "HANDOVER_LOCK";

export interface RepairWorkOrder {
  workOrderId: number;
  orderNo: string;
  tenantId: number;
  title: string;
  description?: string | null;
  source: string;
  spaceScope: RepairSpaceScope;
  status: RepairStatus;
  reporterAccountId: number;
  reporterUid?: number | null;
  reporterUserId?: number | null;
  roomId?: number | null;
  buildingId?: number | null;
  locationText?: string | null;
  needManualLocation: boolean;
  locationLocked: boolean;
  assignedUserId?: number | null;
  assigneeRoleKey?: string | null;
  assigneeDeptId?: number | null;
  category?: string | null;
  riskLevel?: string | null;
  surveySummary?: string | null;
  planBudget?: number | null;
  fundSource?: string | null;
  fundGateBlocked: boolean;
  satisfactionScore?: number | null;
  satisfactionComment?: string | null;
  version: number;
  createTime: string;
  updateTime: string;
}

export interface RepairEvent {
  eventId: number;
  workOrderId: number;
  action: string;
  fromStatus?: RepairStatus | null;
  toStatus?: RepairStatus | null;
  actorAccountId?: number | null;
  actorIdentityType?: string | null;
  actorIdentityId?: number | null;
  remark?: string | null;
  createTime: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface CreateRepairInput {
  buildingId?: number | null;
  locationText?: string;
  title: string;
  description?: string;
  category?: string;
  evidenceText?: string;
}

export function pageRepairWorkOrders(params: {
  status?: string;
  scope?: string;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<RepairWorkOrder>> {
  const query = new URLSearchParams();
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.scope && params.scope !== "ALL") query.set("scope", params.scope);
  if (params.keyword) query.set("keyword", params.keyword);
  query.set("page", String(params.page ?? 1));
  query.set("size", String(params.size ?? 20));
  return apiGet<PageResponse<RepairWorkOrder>>(`/admin/repair-work-orders?${query.toString()}`);
}

export function createRepairWorkOrder(input: CreateRepairInput): Promise<RepairWorkOrder> {
  return apiPost<RepairWorkOrder>("/admin/repair-work-orders", input);
}

export function listRepairEvents(workOrderId: number): Promise<RepairEvent[]> {
  return apiGet<RepairEvent[]>(`/admin/repair-work-orders/${workOrderId}/events`);
}

export function repairAction(workOrderId: number, action: string, body: unknown = {}): Promise<RepairWorkOrder> {
  return apiPost<RepairWorkOrder>(`/admin/repair-work-orders/${workOrderId}/${action}`, body);
}
