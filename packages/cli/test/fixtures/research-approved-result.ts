import fs from "node:fs";

import {
  researchPaths,
  stableResearchJson,
  type ApprovalId,
  type DispatchId,
  type ProposalId,
  type QuestId,
  type ResultId,
  type RunId,
} from "@mindfoldhq/trellis-core/research";

export const WRONG_DIGEST = `sha256:${"f".repeat(64)}`;

export function approvedResultPayload(input: {
  readonly approvalId: ApprovalId;
  readonly dispatchId: DispatchId;
  readonly runId: RunId;
  readonly questId: QuestId;
  readonly createdAt: string;
  readonly resultId?: ResultId;
  readonly proposalId?: ProposalId;
  readonly extra?: Readonly<Record<string, unknown>>;
}): string {
  const suffix = input.approvalId.slice(4);
  return stableResearchJson({
    result: {
      id: input.resultId ?? (`res_${suffix}` as ResultId),
      dispatchId: input.dispatchId,
      runId: input.runId,
      status: "completed",
      summary: "Bounded work complete",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: input.createdAt,
    },
    proposal: {
      id: input.proposalId ?? (`prp_${suffix}` as ProposalId),
      dispatchId: input.dispatchId,
      questId: input.questId,
      title: "No canonical changes",
      operations: [],
      status: "pending",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    },
    ...input.extra,
  });
}

export function mutateApprovedResultLedgerBindings(
  root: string,
  bindings: Partial<{
    requestDigest: string;
    procedureDigest: string;
    policyDigest: string;
    scopeHash: string;
  }>,
): void {
  const eventsFile = researchPaths(root).eventsFile;
  const events = fs
    .readFileSync(eventsFile, "utf8")
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  for (const event of events) {
    if (event.kind === "activation.planned") {
      const payload = event.payload as {
        activation: {
          requestDigest: string;
          procedure: { digest: string };
          policyDigest: string;
          scopeHash: string;
        };
      };
      if (bindings.requestDigest !== undefined) {
        payload.activation.requestDigest = bindings.requestDigest;
      }
      if (bindings.procedureDigest !== undefined) {
        payload.activation.procedure.digest = bindings.procedureDigest;
      }
      if (bindings.policyDigest !== undefined) {
        payload.activation.policyDigest = bindings.policyDigest;
      }
      if (bindings.scopeHash !== undefined) {
        payload.activation.scopeHash = bindings.scopeHash;
      }
    }
    if (event.kind === "approval.granted") {
      const payload = event.payload as {
        approval: {
          requestDigest: string;
          procedureDigest: string;
          policyDigest: string;
          scopeHash: string;
        };
      };
      Object.assign(payload.approval, bindings);
    }
  }
  fs.writeFileSync(
    eventsFile,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
}

export function disableApprovedResultAutomaticPolicy(root: string): void {
  const policyFile = `${root}/.trellis/research/policy.json`;
  const policy = JSON.parse(fs.readFileSync(policyFile, "utf8")) as {
    defaults: { automaticEnabled: boolean };
  };
  policy.defaults.automaticEnabled = false;
  fs.writeFileSync(policyFile, `${JSON.stringify(policy, null, 2)}\n`);
}
