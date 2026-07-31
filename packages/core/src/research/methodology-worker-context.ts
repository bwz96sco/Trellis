/**
 * Worker-visible methodology projection for Context schema v2.
 * Excludes root-only provenance, validator implementations, host launch
 * metadata, composition authority, and absolute filesystem paths.
 */

import { createHash } from "node:crypto";

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
  /**
   * Exact declarative artifact contracts from the support pack.
   * Never synthesized from checkpoint name heuristics.
   */
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

function recomputeSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Extract exact declarative artifact contracts from a worker-visible
 * artifacts JSON entry. Does not invent contracts from checkpoint names.
 */
function parseExactArtifactRequirements(
  raw: unknown,
): WorkerMethodologyProjectionV2["artifactRequirements"][number][] {
  if (!isRecord(raw)) return [];
  const contracts = raw.contracts;
  if (!Array.isArray(contracts)) return [];
  const out: WorkerMethodologyProjectionV2["artifactRequirements"][number][] =
    [];
  for (const item of contracts) {
    if (!isRecord(item)) {
      throw new Error(
        "Support-pack artifact contract entry must be a JSON object",
      );
    }
    const id = item.id;
    const pathPattern = item.pathPattern;
    const mediaType = item.mediaType;
    const requiredness = item.requiredness;
    const cardinality = item.cardinality;
    if (
      typeof id !== "string" ||
      id.length === 0 ||
      typeof pathPattern !== "string" ||
      pathPattern.length === 0 ||
      typeof mediaType !== "string" ||
      mediaType.length === 0 ||
      typeof requiredness !== "string" ||
      requiredness.length === 0 ||
      typeof cardinality !== "string" ||
      cardinality.length === 0
    ) {
      throw new Error(
        "Support-pack artifact contract requires id, pathPattern, mediaType, requiredness, cardinality",
      );
    }
    out.push(
      Object.freeze({
        id,
        pathPattern,
        mediaType,
        requiredness,
        cardinality,
      }),
    );
  }
  return out;
}

function parseAllowedTerminalStates(raw: unknown): readonly string[] | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.terminalStates)) return undefined;
  return Object.freeze(raw.terminalStates.map(String));
}

/**
 * Build the worker-visible methodology slice from a parsed schema-v2 Procedure.
 * Recomputes each worker-visible entry digest at injection and rejects drift.
 */
export function buildWorkerMethodologyProjectionV2(
  procedure: ParsedResearchProcedure,
): WorkerMethodologyProjectionV2 {
  if (procedure.packageSchemaVersion !== 2 || procedure.supportPack === undefined) {
    throw new Error(
      "Worker methodology projection v2 requires schema-v2 Procedure with support pack",
    );
  }

  // Reject undeclared inventory leakage into worker view.
  for (const item of procedure.supportPack.workerVisibleInventory) {
    if (item.workerVisibility !== "worker-visible") {
      throw new Error(
        `Worker methodology projection includes non-worker-visible entry: ${item.path}`,
      );
    }
  }

  const entries: WorkerVisibleSupportEntry[] = [];
  for (const item of procedure.supportPack.workerVisibleInventory) {
    if (item.byteLength !== item.bytes.byteLength) {
      throw new Error(`Support entry size drift: ${item.path}`);
    }
    const recomputed = recomputeSha256Hex(item.bytes);
    if (recomputed !== item.sha256) {
      throw new Error(
        `Support entry sha256 drift at injection: ${item.path} (declared ${item.sha256}, actual ${recomputed})`,
      );
    }
    const entry: WorkerVisibleSupportEntry = {
      path: item.path,
      role: item.role,
      mediaType: item.mediaType,
      contractVersion: item.contractVersion,
      sha256: recomputed,
      byteLength: item.bytes.byteLength,
    };
    const text = decodeTextIfSafe(item);
    entries.push(
      Object.freeze(text === undefined ? entry : { ...entry, text }),
    );
  }

  const artifactRequirements: WorkerMethodologyProjectionV2["artifactRequirements"][number][] =
    [];
  let terminalStates: readonly string[] | undefined;
  for (const item of procedure.supportPack.workerVisibleInventory) {
    if (item.role !== "artifacts" || item.mediaType !== "application/json") {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(item.bytes));
    } catch (error) {
      throw new Error(
        `Worker-visible artifact contract is not valid UTF-8 JSON: ${item.path}`,
        { cause: error },
      );
    }
    artifactRequirements.push(...parseExactArtifactRequirements(parsed));
    if (terminalStates === undefined) {
      terminalStates = parseAllowedTerminalStates(parsed);
    }
  }

  return Object.freeze({
    schemaVersion: 2 as const,
    packageSchemaVersion: 2 as const,
    procedureId: procedure.manifest.id,
    procedureVersion: procedure.manifest.version,
    procedureDigest: procedure.digest,
    workerAuthority: "proposal-only" as const,
    allowedTerminalStates: Object.freeze(
      terminalStates ?? ["success", "blocked", "failed", "partial"],
    ),
    workerVisibleEntries: Object.freeze(entries),
    // Empty when the pack only has thin checkpoint lists — no invented contracts.
    artifactRequirements: Object.freeze(artifactRequirements),
  });
}
