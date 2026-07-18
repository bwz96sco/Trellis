import type {
  CampaignStatus,
  ClaimStatus,
  EvidenceStatus,
  QuestStatus,
  RunStatus,
} from "./types.js";

function assertTransition<T extends string>(
  entity: string,
  from: T,
  to: T,
  allowed: Readonly<Record<T, readonly T[]>>,
): void {
  if (!allowed[from].includes(to)) {
    throw new Error(`Invalid ${entity} status transition: ${from} -> ${to}`);
  }
}

const QUEST_TRANSITIONS: Readonly<Record<QuestStatus, readonly QuestStatus[]>> = {
  active: ["paused", "completed", "abandoned"],
  paused: ["active", "completed", "abandoned"],
  completed: [],
  abandoned: [],
};

const CAMPAIGN_TRANSITIONS: Readonly<
  Record<CampaignStatus, readonly CampaignStatus[]>
> = {
  draft: ["frozen", "abandoned"],
  frozen: ["running", "blocked", "abandoned"],
  running: ["blocked", "completed", "abandoned"],
  blocked: ["running", "abandoned"],
  completed: [],
  abandoned: [],
};

const RUN_TRANSITIONS: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
  planned: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
  invalidated: [],
};

const EVIDENCE_TRANSITIONS: Readonly<
  Record<EvidenceStatus, readonly EvidenceStatus[]>
> = {
  active: ["superseded", "retracted"],
  superseded: [],
  retracted: [],
};

const CLAIM_TRANSITIONS: Readonly<Record<ClaimStatus, readonly ClaimStatus[]>> = {
  candidate: ["supported", "contested", "refuted", "withdrawn"],
  supported: ["contested", "refuted", "withdrawn"],
  contested: ["supported", "refuted", "withdrawn"],
  refuted: [],
  withdrawn: [],
};

export function assertQuestStatusTransition(
  from: QuestStatus,
  to: QuestStatus,
): void {
  assertTransition("quest", from, to, QUEST_TRANSITIONS);
}

export function assertCampaignStatusTransition(
  from: CampaignStatus,
  to: CampaignStatus,
): void {
  assertTransition("campaign", from, to, CAMPAIGN_TRANSITIONS);
}

export function assertRunStatusTransition(from: RunStatus, to: RunStatus): void {
  assertTransition("run", from, to, RUN_TRANSITIONS);
}

export function assertRunInvalidation(status: RunStatus): void {
  if (status === "invalidated") {
    throw new Error("Invalid run invalidation: run is already invalidated");
  }
}

export function assertEvidenceStatusTransition(
  from: EvidenceStatus,
  to: EvidenceStatus,
): void {
  assertTransition("evidence", from, to, EVIDENCE_TRANSITIONS);
}

export function assertClaimStatusTransition(
  from: ClaimStatus,
  to: ClaimStatus,
): void {
  assertTransition("claim", from, to, CLAIM_TRANSITIONS);
}
