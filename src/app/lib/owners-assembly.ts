import { apiPost } from "./api";
import type { SubjectType, VoteChoice, VotingScope } from "./voting";

export type OwnersAssemblyPreparationMode = "OFFLINE_MEETING" | "WRITTEN_DECISION" | "ONLINE_AND_OFFLINE";
export type OwnersAssemblyVotingChannelPolicy = "PAPER_ONLY" | "ONLINE_ONLY" | "PAPER_AND_ONLINE";

export interface OwnersAssemblySession {
  sessionId: number;
  tenantId: number;
  title: string;
  preparationMode: OwnersAssemblyPreparationMode;
  status: string;
  createdByUserId: number;
  createTime: string;
}

export interface OwnersAssemblyPackage {
  packageId: number;
  sessionId: number;
  tenantId: number;
  packageVersion: number;
  status: string;
  votingChannelPolicy: OwnersAssemblyVotingChannelPolicy;
  publicNoticeDays: number;
  announcementHash: string;
  attachmentManifestHash: string;
  ballotTemplateHash: string;
  electronicSealHash?: string | null;
  packageHash?: string | null;
  publicNoticeStartAt?: string | null;
  publicNoticeEndAt?: string | null;
  voteStartAt: string;
  voteEndAt: string;
  lockedByUserId?: number | null;
  lockedAt?: string | null;
}

export interface OwnersAssemblySubject {
  subjectId: number;
  title: string;
  subjectType: SubjectType;
  status: string;
  scope: VotingScope;
  scopeReferenceId: number | null;
}

export interface OwnersAssemblyDelivery {
  deliveryId: number;
  packageId: number;
  opid: number;
  uid: number;
  deliveryChannel: string;
  deliveryMethod: string;
  evidenceHash: string;
  deliveredAt: string;
}

export interface OwnersAssemblyVote {
  assemblyVoteId: number;
  packageId: number;
  subjectId: number;
  voteId: number;
  voteChannel: string;
  valid: boolean;
}

export function createOwnersAssemblySession(input: {
  title: string;
  preparationMode: OwnersAssemblyPreparationMode;
}): Promise<OwnersAssemblySession> {
  return apiPost<OwnersAssemblySession>("/owners-assemblies", input);
}

export function createOwnersAssemblyPackage(sessionId: number, input: {
  votingChannelPolicy: OwnersAssemblyVotingChannelPolicy;
  publicNoticeDays: number;
  announcementHash: string;
  attachmentManifestHash: string;
  ballotTemplateHash: string;
  electronicSealHash?: string | null;
  voteStartAt: string;
  voteEndAt: string;
}): Promise<OwnersAssemblyPackage> {
  return apiPost<OwnersAssemblyPackage>(`/owners-assemblies/${sessionId}/packages`, input);
}

export function addOwnersAssemblySubject(packageId: number, input: {
  subjectType: SubjectType;
  scope: VotingScope;
  scopeReferenceId?: number | null;
  title: string;
  content?: string | null;
  partyRatioFloor?: number | null;
}): Promise<OwnersAssemblySubject> {
  return apiPost<OwnersAssemblySubject>(`/owners-assembly-packages/${packageId}/subjects`, input);
}

export function lockOwnersAssemblyPackage(packageId: number): Promise<OwnersAssemblyPackage> {
  return apiPost<OwnersAssemblyPackage>(`/owners-assembly-packages/${packageId}/lock`);
}

export function openOwnersAssemblyVoting(packageId: number): Promise<OwnersAssemblyPackage> {
  return apiPost<OwnersAssemblyPackage>(`/owners-assembly-packages/${packageId}/open-voting`);
}

export function settleOwnersAssemblyPackage(packageId: number): Promise<OwnersAssemblyPackage> {
  return apiPost<OwnersAssemblyPackage>(`/owners-assembly-packages/${packageId}/settle`);
}

export function recordOwnersAssemblyDelivery(packageId: number, input: {
  opid: number;
  deliveryChannel: string;
  deliveryMethod: string;
  evidenceHash: string;
}): Promise<OwnersAssemblyDelivery> {
  return apiPost<OwnersAssemblyDelivery>(`/owners-assembly-packages/${packageId}/deliveries`, input);
}

export function castOwnersAssemblyPaperVote(packageId: number, input: {
  subjectId: number;
  opid: number;
  choice: VoteChoice;
  ballotFileHash: string;
}): Promise<OwnersAssemblyVote> {
  return apiPost<OwnersAssemblyVote>(`/owners-assembly-packages/${packageId}/paper-votes`, input);
}
