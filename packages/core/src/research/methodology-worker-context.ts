/**
 * Worker-visible methodology projection for Context schema v2.
 * Excludes root-only provenance, validator implementations, host launch
 * metadata, composition authority, and absolute filesystem paths.
 */

import type { ParsedResearchProcedure } from "./procedure-policy.js";
import type { SupportPackInventoryItem } from "./procedure-support-pack.js";

export interface WorkerVisibleSupportEntry {
  readonly path: string;
  readonly role: string;
  readonly mediaType: string;
  readonly contractVersion: string;
  readonly sha256: string;
  readonly byteLength: number;
  /** UTF-8 text for text/* and application/json when worker-visible; omitted for binaries. */
  readonly text?: string;
}

export interface WorkerMethodologyProjectionV2 {
  readonly schemaVersion: 2;
  readonly packageSchemaVersion: 2;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly workerAuthority: "proposal-only";
  readonly allowedTerminalStates: readonly string[];
  readonly workerVisibleEntries: readonly WorkerVisibleSupportEntry[];
  readonly artifactRequirements: readonly {
    readonly id: string;
    readonly pathPattern: string;
    readonly mediaType: string;
    readonly requiredness: string;
    readonly cardinality: string;
  }[];
}

function decodeTextIfSafe(
  item: SupportPackInventoryItem,
): string | undefined {
  if (
    !(
      item.mediaType.startsWith("text/") ||
      item.mediaType === "application/json"
    )
  ) {
    return undefined;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(item.bytes);
  } catch {
    return undefined;
  }
}

/**
 * Build the worker-visible methodology slice from a parsed schema-v2 Procedure.
 */
export function buildWorkerMethodologyProjectionV2(
  procedure: ParsedResearchProcedure,
): WorkerMethodologyProjectionV2 {
  if (procedure.packageSchemaVersion !== 2 || procedure.supportPack === undefined) {
    throw new Error(
      "Worker methodology projection v2 requires schema-v2 Procedure with support pack",
    );
  }
  const entries: WorkerVisibleSupportEntry[] = [];
  for (const item of procedure.supportPack.workerVisibleInventory) {
    // Re-check digest/size at injection boundary.
    if (item.byteLength !== item.bytes.byteLength) {
      throw new Error(`Support entry size drift: ${item.path}`);
    }
    const entry: WorkerVisibleSupportEntry = {
      path: item.path,
      role: item.role,
      mediaType: item.mediaType,
      contractVersion: item.contractVersion,
      sha256: item.sha256,
      byteLength: item.byteLength,
    };
    const text = decodeTextIfSafe(item);
    entries.push(
      Object.freeze(
        text === undefined ? entry : { ...entry, text },
      ),
    );
  }

  // Artifact contracts from support pack (declarative only).
  const artifactRequirements: {
    id: string;
    pathPattern: string;
    mediaType: string;
    requiredness: string;
    cardinality: string;
  }[] = [];
  for (const item of procedure.supportPack.workerVisibleInventory) {
    if (item.role !== "artifacts" || item.mediaType !== "application/json") {
      continue;
    }
    try {
      const parsed = JSON.parse(
        new TextDecoder().decode(item.bytes),
      ) as {
        checkpoints?: string[];
        terminalStates?: string[];
      };
      if (Array.isArray(parsed.checkpoints)) {
        for (const cp of parsed.checkpoints) {
          artifactRequirements.push({
            id: String(cp),
            pathPattern: `evidence/**/${cp}*`,
            mediaType: "text/markdown",
            requiredness: "required",
            cardinality: "1",
          });
        }
      }
    } catch {
      // Non-contract JSON remains a worker-visible entry only.
    }
  }

  const terminalStates = (() => {
    for (const item of procedure.supportPack.workerVisibleInventory) {
      if (item.role !== "artifacts" || item.mediaType !== "application/json") {
        continue;
      }
      try {
        const parsed = JSON.parse(
          new TextDecoder().decode(item.bytes),
        ) as { terminalStates?: string[] };
        if (Array.isArray(parsed.terminalStates)) {
          return Object.freeze(parsed.terminalStates.map(String));
        }
      } catch {
        // ignore
      }
    }
    return Object.freeze(["success", "blocked", "failed", "partial"]);
  })();

  return Object.freeze({
    schemaVersion: 2 as const,
    packageSchemaVersion: 2 as const,
    procedureId: procedure.manifest.id,
    procedureVersion: procedure.manifest.version,
    procedureDigest: procedure.digest,
    workerAuthority: "proposal-only" as const,
    allowedTerminalStates: terminalStates,
    workerVisibleEntries: Object.freeze(entries),
    artifactRequirements: Object.freeze(artifactRequirements),
  });
}
