import { apiGet } from "./api";

export type DisputeStatus =
  | "RAISED"
  | "UNDER_REVIEW_LEVEL_1"
  | "DECIDED_LEVEL_1_UPHELD"
  | "DECIDED_LEVEL_1_REJECTED"
  | "DECIDED_LEVEL_1_PARTIAL"
  | "UNDER_REVIEW_LEVEL_2"
  | "DECIDED_LEVEL_2_UPHELD"
  | "DECIDED_LEVEL_2_REJECTED"
  | "DECIDED_LEVEL_2_PARTIAL"
  | "UNDER_REVIEW_LEVEL_3"
  | "DECIDED_LEVEL_3_UPHELD"
  | "DECIDED_LEVEL_3_REJECTED"
  | "DECIDED_LEVEL_3_PARTIAL"
  | "UNDER_REVIEW_LEVEL_4"
  | "DECIDED_LEVEL_4_UPHELD"
  | "DECIDED_LEVEL_4_REJECTED"
  | "DECIDED_LEVEL_4_PARTIAL"
  | "LITIGATION_FILED"
  | "CLOSED_FINAL"
  | "WITHDRAWN";

export interface Dispute {
  disputeId: number;
  tenantId: number;
  raisedByOwnerId: number;
  relatedPropertyOpid: number | null;
  disputeKind: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  currentReviewLevel: number;
  status: DisputeStatus;
  businessPayloadJson: string;
  raisedAt: string;
  escalatedAt: string | null;
  closedAt: string | null;
  litigationOutcome: string | null;
  litigationJudgementUrl: string | null;
  version: number;
}

export function listGovDisputes(params: {
  level?: number;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Dispute[]> {
  const query = new URLSearchParams();
  if (params.level != null) query.set("level", String(params.level));
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  query.set("limit", String(params.limit ?? 100));
  query.set("offset", String(params.offset ?? 0));
  return apiGet<Dispute[]>(`/gov/disputes?${query.toString()}`);
}
