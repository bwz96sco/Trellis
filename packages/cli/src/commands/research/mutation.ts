import { randomUUID } from "node:crypto";

import {
  commitResearchBatch,
  getResearchStatus,
  validateResearchBatch,
  type RepositoryId,
  type ResearchMutation,
} from "@mindfoldhq/trellis-core/research";

import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchMutationOptions,
  type ResearchMutationResult,
} from "./common.js";

export async function executeRepositoryDispatchMutations(
  command: string,
  options: ResearchMutationOptions,
  mutations: readonly ResearchMutation[],
  artifactRepositoryRoots?: Readonly<Partial<Record<RepositoryId, string>>>,
): Promise<ResearchMutationResult> {
  const root = resolveResearchRoot(options);
  const idempotencyKey =
    options.idempotencyKey ??
    `cli:${command.replaceAll(" ", ":")}:${randomUUID()}`;
  requireResearchText(idempotencyKey, "idempotency key");
  const input = {
    root,
    mutations,
    actor: { type: "agent" as const, id: "trellis-cli" },
    provenance: { source: `trellis research ${command}` },
    idempotencyKey,
    artifactRepositoryRoots,
  };

  if (options.dryRun === true) {
    const before = await getResearchStatus(root);
    const validation = await validateResearchBatch(input);
    return {
      command: `research ${command}`,
      idempotencyKey,
      dryRun: true,
      replayed: validation.events.some((event) => event.seq <= before.headSeq),
      headSeq: validation.state.projectedThroughSeq,
      events: validation.events,
    };
  }

  const committed = await commitResearchBatch(input);
  return {
    command: `research ${command}`,
    idempotencyKey,
    dryRun: false,
    replayed: committed.replayed,
    headSeq: committed.headSeq,
    events: committed.events,
  };
}
