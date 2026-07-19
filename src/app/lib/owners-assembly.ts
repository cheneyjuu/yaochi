// 关联业务：为业主大会办理页提供规则驱动的筹备、公示、线上/纸质收票、双人复核与计票接口。
import { apiGet, apiPost, apiUpload } from "./api";
import type { SubjectType } from "./voting";

export type OwnersAssemblyPreparationMode =
  | "WRITTEN_DECISION"
  | "INTERNET_DECISION"
  | "ONLINE_AND_OFFLINE";
export type OwnersAssemblyDeliveryMethod =
  | "DOOR_TO_DOOR"
  | "POSTAL"
  | "ELECTRONIC"
  | "PUBLIC_NOTICE_BOARD";
export type OwnersAssemblyMaterialType =
  | "PUBLIC_NOTICE"
  | "PLAN_ATTACHMENT"
  | "PAPER_BALLOT_TEMPLATE"
  | "DELIVERY_EVIDENCE"
  | "PAPER_BALLOT";
export type PaperVoteChoice = "SUPPORT" | "AGAINST" | "ABSTAIN";
export type PaperInvalidReason = "BLANK" | "MULTIPLE_MARKS" | "UNREADABLE" | "WRONG_TEMPLATE" | "OTHER";

export interface OwnersAssemblyPreparationOptions {
  ruleName: string;
  ruleVersion: string;
  effectiveDate: string;
  allowedPreparationModes: OwnersAssemblyPreparationMode[];
  earliestVoteStartAt: string;
  planPublicityDays: number;
  meetingNoticeDays: number;
  resultAnnouncementDays: number;
  validDeliveryMethods: OwnersAssemblyDeliveryMethod[];
  paperBallotSealRequired: boolean;
}

export interface OwnersAssemblySession {
  sessionId: number;
  tenantId: number;
  title: string;
  preparationMode: OwnersAssemblyPreparationMode;
  status: string;
  createdByUserId: number;
  createTime: string;
}

export interface OwnersAssemblyArrangement {
  status: "PACKAGE_DRAFT" | "PUBLIC_NOTICE" | "VOTING" | "SETTLED";
  votingChannelPolicy: "PAPER_ONLY" | "ONLINE_ONLY" | "PAPER_AND_ONLINE";
  publicNoticeDays: number;
  publicNoticeStartAt: string | null;
  publicNoticeEndAt: string | null;
  voteStartAt: string;
  voteEndAt: string;
  lockedAt: string | null;
}

export interface OwnersAssemblySubjectDraft {
  draftId: number;
  subjectType: Extract<SubjectType, "GENERAL" | "MAJOR">;
  title: string;
  content: string | null;
  createTime: string;
}

export interface OwnersAssemblyFormalSubject {
  subjectId: number;
  subjectType: Extract<SubjectType, "GENERAL" | "MAJOR">;
  title: string;
  content?: string | null;
  status: string;
  result: {
    quorumSatisfied: boolean;
    passed: boolean;
    totalArea: number;
    totalOwnerCount: number;
    participatingArea: number;
    participatingOwnerCount: number;
    supportArea?: number | null;
    supportOwnerCount?: number | null;
    againstArea?: number | null;
    againstOwnerCount?: number | null;
    abstainArea?: number | null;
    abstainOwnerCount?: number | null;
  } | null;
}

export interface OwnersAssemblyMaterial {
  materialId: number;
  materialType: OwnersAssemblyMaterialType;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  createTime: string;
}

export interface OwnersAssemblyRuleSnapshot {
  ruleName: string;
  ruleVersion: string;
  effectiveDate: string;
  sourceFileName: string;
  planPublicityDays: number;
  meetingNoticeDays: number;
  resultAnnouncementDays: number;
  validDeliveryMethods: OwnersAssemblyDeliveryMethod[];
  nonResponsePolicy: "NOT_PARTICIPATED" | "FOLLOW_MAJORITY" | "ABSTAIN";
  proxyVotingPolicy: "NOT_ALLOWED" | "WRITTEN_AUTHORIZATION_REQUIRED";
  votingChannelPolicy: "PAPER_ONLY" | "ONLINE_ONLY" | "PAPER_AND_ONLINE";
  paperBallotSealRequired: boolean;
}

export interface OwnersAssemblyWorkspace {
  assembly: OwnersAssemblySession;
  arrangement: OwnersAssemblyArrangement | null;
  ruleSnapshot: OwnersAssemblyRuleSnapshot | null;
  draftSubjects: OwnersAssemblySubjectDraft[];
  formalSubjects: OwnersAssemblyFormalSubject[];
  materials: OwnersAssemblyMaterial[];
}

export interface PaperVotingDelivery {
  paperDeliveryId: number;
  opid: number;
  recipientName: string;
  deliveryMethod: OwnersAssemblyDeliveryMethod;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
  deliveredByUserId: number;
  deliveredAt: string;
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface PaperBallotEntry {
  entryId: number;
  paperBallotId: number;
  versionNumber: number;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
  enteredByUserId: number;
  enteredAt: string;
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  items: Array<{
    subjectId: number;
    determination: "VALID" | "INVALID";
    choice: PaperVoteChoice | null;
    invalidReasonCode: PaperInvalidReason | null;
    invalidReasonDescription: string | null;
  }>;
}

export interface PaperBallot {
  paperBallotId: number;
  opid: number;
  ballotNumber: string;
  status: "RECEIVED" | "IN_ENTRY" | "COMPLETED" | "VOIDED";
  receivedByUserId: number;
  receivedAt: string;
  voidReason: string | null;
}

export interface OwnersAssemblyVotingWorkbench {
  electorate: Array<{
    snapshotItemId: number;
    roomId: number;
    buildingId: number;
    certifiedArea: number;
    representativeOpid: number;
    buildingName: string;
    unitName: string | null;
    roomName: string;
  }>;
  deliveries: PaperVotingDelivery[];
  ballots: Array<{
    ballot: PaperBallot;
    latestEntry: PaperBallotEntry | null;
    outcomes: Array<{
      outcomeId: number;
      subjectId: number;
      status: "COUNTED" | "INVALID" | "DUPLICATE";
      reason: string | null;
    }>;
  }>;
  paperAssistance: Array<{
    requestId: number;
    opid: number;
    buildingId: number;
    roomId: number;
    stage: "PENDING_PAPER_PROVISION" | "PAPER_PROCESSING" | "COMPLETED" | "WITHDRAWN";
  }>;
  online: { completedPropertyCount: number; conflictCount: number };
  duplicatePaperDecisionCount: number;
  currentActorUserId: number;
}

export type PaperEntryItem =
  | { subjectId: number; determination: "VALID"; choice: PaperVoteChoice }
  | {
    subjectId: number;
    determination: "INVALID";
    invalidReasonCode: PaperInvalidReason;
    invalidReasonDescription?: string;
  };

export function listOwnersAssemblies(): Promise<OwnersAssemblySession[]> {
  return apiGet("/owners-assemblies");
}

export function getOwnersAssemblyPreparationOptions(): Promise<OwnersAssemblyPreparationOptions> {
  return apiGet("/owners-assemblies/preparation-options");
}

export function getOwnersAssemblyWorkspace(sessionId: number): Promise<OwnersAssemblyWorkspace> {
  return apiGet(`/owners-assemblies/${sessionId}/workspace`);
}

export function createOwnersAssemblySession(input: {
  title: string;
  preparationMode: OwnersAssemblyPreparationMode;
}): Promise<OwnersAssemblySession> {
  return apiPost("/owners-assemblies", input);
}

export function createOwnersAssemblySubjectDraft(sessionId: number, input: {
  subjectType: Extract<SubjectType, "GENERAL" | "MAJOR">;
  title: string;
  content?: string | null;
}): Promise<OwnersAssemblySubjectDraft> {
  return apiPost(`/owners-assemblies/${sessionId}/subjects`, input);
}

export function uploadOwnersAssemblyMaterial(
  sessionId: number,
  materialType: OwnersAssemblyMaterialType,
  file: File,
): Promise<OwnersAssemblyMaterial> {
  const form = new FormData();
  form.set("materialType", materialType);
  form.set("file", file);
  return apiUpload(`/owners-assemblies/${sessionId}/materials`, form);
}

export function confirmOwnersAssemblyArrangement(sessionId: number, input: {
  voteStartAt: string;
  voteEndAt: string;
  publicNoticeMaterialId: number;
  planAttachmentMaterialIds: number[];
  ballotTemplateMaterialId: number;
}): Promise<OwnersAssemblyArrangement> {
  return apiPost(`/owners-assemblies/${sessionId}/arrangement`, input);
}

export function publishOwnersAssemblyArrangement(sessionId: number): Promise<OwnersAssemblyArrangement> {
  return apiPost(`/owners-assemblies/${sessionId}/publish`);
}

export function startOwnersAssemblyVoting(sessionId: number): Promise<OwnersAssemblyArrangement> {
  return apiPost(`/owners-assemblies/${sessionId}/start-voting`);
}

export function settleOwnersAssembly(sessionId: number): Promise<OwnersAssemblyArrangement> {
  return apiPost(`/owners-assemblies/${sessionId}/settle`);
}

export function getOwnersAssemblyVotingWorkbench(sessionId: number): Promise<OwnersAssemblyVotingWorkbench> {
  return apiGet(`/owners-assemblies/${sessionId}/voting-workbench`);
}

export function recordOwnersAssemblyPaperDelivery(sessionId: number, input: {
  opid: number;
  recipientName: string;
  deliveryMethod: OwnersAssemblyDeliveryMethod;
  evidenceMaterialId: number;
  deliveredAt: string;
}): Promise<PaperVotingDelivery> {
  return apiPost(`/owners-assemblies/${sessionId}/paper-deliveries`, input);
}

export function reviewOwnersAssemblyPaperDelivery(
  sessionId: number,
  deliveryId: number,
  decision: "CONFIRM" | "REJECT",
  reviewNote?: string,
): Promise<PaperVotingDelivery> {
  return apiPost(`/owners-assemblies/${sessionId}/paper-deliveries/${deliveryId}/review`, {
    decision,
    reviewNote,
  });
}

export function registerOwnersAssemblyPaperBallot(sessionId: number, input: {
  opid: number;
  ballotNumber: string;
  ballotMaterialId: number;
  receivedAt: string;
}): Promise<PaperBallot> {
  return apiPost(`/owners-assemblies/${sessionId}/paper-ballots`, input);
}

export function submitOwnersAssemblyPaperBallotEntry(
  sessionId: number,
  ballotId: number,
  items: PaperEntryItem[],
): Promise<PaperBallotEntry> {
  return apiPost(`/owners-assemblies/${sessionId}/paper-ballots/${ballotId}/entries`, { items });
}

export function reviewOwnersAssemblyPaperBallotEntry(
  sessionId: number,
  ballotId: number,
  entryId: number,
  decision: "CONFIRM" | "REJECT",
  reviewNote?: string,
): Promise<unknown> {
  return apiPost(
    `/owners-assemblies/${sessionId}/paper-ballots/${ballotId}/entries/${entryId}/review`,
    { decision, reviewNote },
  );
}
