/**
 * Worker-visible methodology projection for Context schema v2.
 * Excludes root-only provenance, validator implementations, host launch
 * metadata, composition authority, and absolute filesystem paths.
 */

import { createHash } from "node:crypto";

import {
  LOSSLESS_METHODOLOGY_PROCEDURE_VERSION,
  loadResearchMethodologyContractFromProcedure,
  type ResearchMethodologyFieldRequirement,
} from "./methodology-contract.js";
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

export interface LegacyWorkerArtifactRequirement {
  readonly id: string;
  readonly pathPattern: string;
  readonly mediaType: string;
  readonly requiredness: string;
  readonly cardinality: string;
}

export interface WorkerCheckpointRequirement {
  readonly id: string;
  readonly kind: "ordered_stage" | "artifact_lifecycle_checkpoint";
  readonly artifact?: string;
  readonly producer: string;
  readonly consumer:
    | "downstream_or_root"
    | "next_stage_or_downstream_handoff";
  readonly fields: readonly ResearchMethodologyFieldRequirement[];
  readonly terminalApplicability: readonly string[];
  readonly transitionConditions: Readonly<Record<string, string>>;
}

export type WorkerMethodologyRequirement =
  | LegacyWorkerArtifactRequirement
  | WorkerCheckpointRequirement;

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
   * Exact declarative requirements from the support pack.
   * Never synthesized from checkpoint name heuristics.
   */
  readonly artifactRequirements: readonly WorkerMethodologyRequirement[];
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
): LegacyWorkerArtifactRequirement[] {
  if (!isRecord(raw)) return [];
  const contracts = raw.contracts;
  if (!Array.isArray(contracts)) return [];
  const out: LegacyWorkerArtifactRequirement[] = [];
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

function buildLosslessWorkerRequirements(
  procedure: ParsedResearchProcedure,
): Readonly<{
  terminalStates: readonly string[];
  requirements: readonly WorkerCheckpointRequirement[];
}> {
  const contract = loadResearchMethodologyContractFromProcedure(procedure);
  const requirements = contract.checkpoints.map((checkpoint) =>
    Object.freeze({
      id: checkpoint.id,
      kind: checkpoint.kind,
      ...(checkpoint.kind === "artifact_lifecycle_checkpoint"
        ? { artifact: checkpoint.artifact }
        : {}),
      producer: checkpoint.producer,
      consumer: checkpoint.consumer,
      fields: checkpoint.fields,
      terminalApplicability: checkpoint.terminal_applicability,
      transitionConditions: Object.freeze({
        ...checkpoint.transition_conditions,
      }),
    }),
  );
  return Object.freeze({
    terminalStates: Object.freeze([
      ...contract.terminal_states.asserted,
      ...contract.terminal_states.unasserted_not_claimed,
    ]),
    requirements: Object.freeze(requirements),
  });
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

  const artifactRequirements: WorkerMethodologyRequirement[] = [];
  let terminalStates: readonly string[] | undefined;
  // 2.0.3 freeze-family packs expose root-only family contracts (worker sees
  // safe projected requirements via buildLosslessWorkerRequirements).
  // Compatibility-routing packs such as literature-scan-v1@2.0.3 keep
  // worker-visible lifecycle contracts[] and must not invoke the family loader.
  // Worker-visible freeze-family contracts remain forbidden (full authority
  // leakage); only root-only family contracts use the lossless projector.
  const familyArtifact = procedure.supportPack.inventoryItems.find(
    (item) =>
      item.path === "artifacts/artifact-contract.json" &&
      item.role === "artifacts" &&
      item.mediaType === "application/json",
  );

  function parseArtifactJson(bytes: Uint8Array, pathLabel: string): unknown {
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch (error) {
      throw new Error(
        `Worker-visible artifact contract is not valid UTF-8 JSON: ${pathLabel}`,
        { cause: error },
      );
    }
  }

  function isFreezeFamilyContract(raw: unknown): boolean {
    return (
      isRecord(raw) &&
      isRecord(raw.intended_target) &&
      Array.isArray(raw.checkpoints) &&
      typeof raw.package === "string"
    );
  }

  if (familyArtifact !== undefined) {
    const parsedFamilyProbe = parseArtifactJson(
      familyArtifact.bytes,
      familyArtifact.path,
    );
    if (isFreezeFamilyContract(parsedFamilyProbe)) {
      // Freeze-family contracts must never be worker-visible (authority leakage).
      if (familyArtifact.workerVisibility !== "root-only") {
        throw new Error(
          "Procedure methodology family contract must be root-only; Context exposes only its safe declarative projection",
        );
      }
      // Accepted lossless authority only for 2.0.4 after OA3.
      if (procedure.manifest.version === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION) {
        const lossless = buildLosslessWorkerRequirements(procedure);
        artifactRequirements.push(...lossless.requirements);
        terminalStates = lossless.terminalStates;
      }
      // Historical 2.0.3 root-only family: do not project as accepted lossless.
    } else {
      // Lifecycle contracts[] path (e.g. literature-scan compatibility routing).
      for (const item of procedure.supportPack.workerVisibleInventory) {
        if (item.role !== "artifacts" || item.mediaType !== "application/json") {
          continue;
        }
        const parsed = parseArtifactJson(item.bytes, item.path);
        if (isFreezeFamilyContract(parsed)) {
          throw new Error(
            "Procedure methodology family contract must be root-only; Context exposes only its safe declarative projection",
          );
        }
        artifactRequirements.push(...parseExactArtifactRequirements(parsed));
        terminalStates ??= parseAllowedTerminalStates(parsed);
      }
    }
  } else {
    for (const item of procedure.supportPack.workerVisibleInventory) {
      if (item.role !== "artifacts" || item.mediaType !== "application/json") {
        continue;
      }
      const parsed = parseArtifactJson(item.bytes, item.path);
      if (isFreezeFamilyContract(parsed)) {
        throw new Error(
          "Procedure methodology family contract must be root-only; Context exposes only its safe declarative projection",
        );
      }
      artifactRequirements.push(...parseExactArtifactRequirements(parsed));
      terminalStates ??= parseAllowedTerminalStates(parsed);
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
