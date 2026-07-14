// 关联业务：对接业主自治组织电子印章台账、模拟印章启停和用印审计接口。
import { apiGet, apiPost } from "./api";

export type CommitteeSealType = "OWNERS_ASSEMBLY" | "OWNERS_COMMITTEE" | "FINANCIAL";
export type CommitteeSealStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED";

export interface CommitteeElectronicSeal {
  sealId: number;
  sealName: string;
  sealType: CommitteeSealType;
  providerCode: string;
  providerSealId: string;
  certificateSerial: string;
  validFrom: string;
  validUntil: string;
  status: CommitteeSealStatus;
  custodianUserId: number;
  custodianName: string;
  committeeTermName: string;
  simulated: boolean;
  createTime: string;
}

export interface CommitteeSealUsage {
  usageId: number;
  electronicSealId?: number | null;
  sealName: string;
  businessType: string;
  businessId: number;
  businessTitle?: string | null;
  sealingMethod: "UPLOADED_PHYSICAL" | "UPLOADED_EXTERNAL_ELECTRONIC" | "PLATFORM_ELECTRONIC";
  sourceAttachmentId?: number | null;
  sealedAttachmentId: number;
  sourceFileHash?: string | null;
  sealedFileHash: string;
  providerTransactionId?: string | null;
  certificateSerial?: string | null;
  verificationStatus: string;
  simulated: boolean;
  operatorUserId: number;
  operatorName: string;
  remark?: string | null;
  createTime: string;
}

export function listCommitteeSeals(): Promise<CommitteeElectronicSeal[]> {
  return apiGet<CommitteeElectronicSeal[]>("/admin/committee-seals");
}

export function createMockCommitteeSeal(input: {
  sealName?: string;
  sealType: CommitteeSealType;
}): Promise<CommitteeElectronicSeal> {
  return apiPost<CommitteeElectronicSeal>("/admin/committee-seals/mock", input);
}

export function deactivateCommitteeSeal(sealId: number): Promise<CommitteeElectronicSeal> {
  return apiPost<CommitteeElectronicSeal>(`/admin/committee-seals/${sealId}/deactivate`, {});
}

export function listCommitteeSealUsage(limit = 50): Promise<CommitteeSealUsage[]> {
  return apiGet<CommitteeSealUsage[]>(`/admin/committee-seals/usage-records?limit=${limit}`);
}
