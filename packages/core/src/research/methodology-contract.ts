import { createHash } from "node:crypto";

import type { ParsedResearchProcedure } from "./procedure-policy.js";
import {
  FROZEN_METHODOLOGY_CONTRACT_DIGEST,
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
} from "./procedure-support-pack.js";
import { parseStrictResearchJson } from "./strict-json.js";

/** Future accepted lossless package version after OA3; not 2.0.3 (unaccepted). */
export const LOSSLESS_METHODOLOGY_PROCEDURE_VERSION = "2.0.4" as const;
/** Historical unaccepted development package version (bytes preserved, no authority). */
export const HISTORICAL_UNACCEPTED_PROCEDURE_VERSION = "2.0.3" as const;
/**
 * Repair version recorded in the historical Phase-2 R0/derivability fixture.
 * Not accepted methodology authority; retained for immutable matrix identity.
 */
export const HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION = "2.0.3" as const;
export const FROZEN_METHODOLOGY_FAMILY_COUNT = 16 as const;
/**
 * Historical Phase-2 packaging freeze counts (104/54/50).
 * These are NOT exact frozen evaluation-contract-v1.2.0 lifecycle authority.
 * Retained only as a labeled historical-invalid regression fixture input.
 */
export const FROZEN_METHODOLOGY_CHECKPOINT_COUNT = 104 as const;
export const FROZEN_ORDERED_STAGE_COUNT = 54 as const;
export const FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT = 50 as const;
export const HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE = Object.freeze({
  label:
    "historical-invalid-phase2-104-54-50-not-exact-frozen-v1.2-authority" as const,
  familyCount: FROZEN_METHODOLOGY_FAMILY_COUNT,
  checkpointCount: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
  orderedStageCount: FROZEN_ORDERED_STAGE_COUNT,
  artifactLifecycleCheckpointCount: FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
  isExactFrozenV12Authority: false,
  mayBecomeV13Authority: false,
});
export const FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST =
  "sha256:7a8c147bacf04801edff443a337ab1738ffa0d51b32d79bc08f16eef3bc9f945" as const;

const FROZEN_METHODOLOGY_FREEZE_PATH =
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/methodology-contract-freeze.json" as const;
const FROZEN_METHODOLOGY_COVERAGE_MAP_PATH =
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/package-coverage-map.json" as const;
const FROZEN_METHODOLOGY_CANDIDATE_MANIFEST_PATH =
  ".trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/candidate-cutover-manifest.json" as const;
const FROZEN_METHODOLOGY_ASSURANCE_PATH =
  ".trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/coverage-audit.json" as const;
const FROZEN_METHODOLOGY_CHECKPOINT_EVIDENCE_PREFIX =
  ".trellis/tasks/07-29-implement-frozen-phase2-differential-harness/research/remediation-2.0.3/checkpoints/" as const;

const FAMILY_ID = /^research-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMPOSITION_CHILD_ID = /^(?:research-[a-z0-9]+(?:-[a-z0-9]+)*|personal-slides)$/;
const PROCEDURE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CAPABILITY_ID = /^research\.[a-z]+(?:\.[a-z]+)*$/;
const CHECKPOINT_ID = /^(?:[A-Za-z0-9._-]|<[a-z][a-z0-9_-]*>)+$/;
const SAFE_RELATIVE_PATH = /^(?:(?:[A-Za-z0-9._-]|<[a-z][a-z0-9_-]*>)+\/)*(?:[A-Za-z0-9._-]|<[a-z][a-z0-9_-]*>)+$/;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
const GIT_COMMIT = /^[a-f0-9]{40}$/;

const FAMILY_IDENTITIES = Object.freeze({
  "research-review-case": Object.freeze({
    capability: "research.audit.case",
    procedure: "review-case-v1",
  }),
  "research-review-campaign": Object.freeze({
    capability: "research.audit.campaign",
    procedure: "review-campaign-v1",
  }),
  "research-literature": Object.freeze({
    capability: "research.literature.review",
    procedure: "literature-review-v1",
  }),
  "research-ideation": Object.freeze({
    capability: "research.ideation.generate",
    procedure: "idea-generation-v1",
  }),
  "research-idea-evaluation": Object.freeze({
    capability: "research.ideation.evaluate",
    procedure: "idea-evaluation-v1",
  }),
  "research-project-setup": Object.freeze({
    capability: "research.setup.project",
    procedure: "project-setup-v1",
  }),
  "research-experiment": Object.freeze({
    capability: "research.experiment.round",
    procedure: "experiment-round-v1",
  }),
  "research-experiment-campaign": Object.freeze({
    capability: "research.experiment.campaign",
    procedure: "experiment-campaign-v1",
  }),
  "research-computation": Object.freeze({
    capability: "research.computation.case",
    procedure: "computation-case-v1",
  }),
  "research-figure": Object.freeze({
    capability: "research.writing.figure",
    procedure: "figure-v1",
  }),
  "research-slides": Object.freeze({
    capability: "research.writing.slides",
    procedure: "slides-v1",
  }),
  "research-survey": Object.freeze({
    capability: "research.literature.survey",
    procedure: "survey-v1",
  }),
  "research-writing": Object.freeze({
    capability: "research.writing.case",
    procedure: "writing-case-v1",
  }),
  "research-theory": Object.freeze({
    capability: "research.theory.case",
    procedure: "theory-case-v1",
  }),
  "research-quest": Object.freeze({
    capability: "research.framing.quest",
    procedure: "quest-framing-v1",
  }),
  "research-quest-admin": Object.freeze({
    capability: "research.framing.admin",
    procedure: "quest-admin-v1",
  }),
} as const);

const FROZEN_FAMILY_SEMANTIC_DIGESTS = Object.freeze({
  "research-review-case":
    "5d773bfeaa71013dd13707631ed6cea7fc0aaa71144edd8abb7ba3419d47cbbd",
  "research-review-campaign":
    "3b8565ba5aacecd918e8ac316ad642249f93f1923682cdd928f9b466ecb85a7a",
  "research-literature":
    "9b0889e3adbe5d6d5bb42330277995ff79c2c426cf7c934e93605209cd4daf9a",
  "research-ideation":
    "a311a1047be1f28f638ffcb2e8ad8916536db40279dc448ca8b42223411810b7",
  "research-idea-evaluation":
    "f9c6cc62b3ca923ce1e970d9c2dee54881bc9f84d31c521ca57f7123fbab357f",
  "research-project-setup":
    "140390af94b20869de5bfb7414cb6905a27c938b3c33d4da5deb4447269db456",
  "research-experiment":
    "cdb40aa61182e66c84b77cf6b8c87231df6dce164faf86a2c7cff7b673feed9e",
  "research-experiment-campaign":
    "4894b6535cdec2080e08fb8f63aaf150e18f65b2955cd3a1b0548ca402e54385",
  "research-computation":
    "7adaae9fecf0200c27c04e4433d6695d59e1b6a5c3a159132dd2f9d944547102",
  "research-figure":
    "e097e1e1c64c188bf5bdc1a07a3db55211c146dff586a44eec0f875939110832",
  "research-slides":
    "3bbf36f7b854f780a3722b8e67bacbea34e655ade5b047931053658982781e83",
  "research-survey":
    "daf524ac9048e3a394e49d52d9ca5c223f86a2d167987a5037f5a1cde5090745",
  "research-writing":
    "20543574fef145fd72b1ba945037e9abe87fe96e6d4977280605e5095dc641f6",
  "research-theory":
    "9e0b68836d9fc2a1285750ab17829000c08a3f404b257a4ade0483e6be1024ad",
  "research-quest":
    "80cfdf2f5c9f9afc578c0b38cbe3c16f85b33dafb70d23ae934433be8e7abb7e",
  "research-quest-admin":
    "e2f54ad0708f65b11a0177dd76c5ba9f2aa849016397c98a21158513bc48c325",
} as const satisfies Readonly<
  Record<keyof typeof FAMILY_IDENTITIES, string>
>);

const FAMILY_RUNTIME_PATHS = Object.freeze({
  "research-review-case":
    "packages/core/src/research/methodology/review-validators.ts",
  "research-review-campaign":
    "packages/core/src/research/methodology/review-validators.ts",
  "research-literature":
    "packages/core/src/research/methodology/literature-survey-validators.ts",
  "research-ideation":
    "packages/core/src/research/methodology/ideation-validators.ts",
  "research-idea-evaluation":
    "packages/core/src/research/methodology/ideation-validators.ts",
  "research-project-setup":
    "packages/core/src/research/methodology/setup-quest-validators.ts",
  "research-experiment":
    "packages/core/src/research/methodology/experiment-validators.ts",
  "research-experiment-campaign":
    "packages/core/src/research/methodology/experiment-validators.ts",
  "research-computation":
    "packages/core/src/research/methodology/computation-theory-validators.ts",
  "research-figure":
    "packages/core/src/research/methodology/writing-visual-validators.ts",
  "research-slides":
    "packages/core/src/research/methodology/writing-visual-validators.ts",
  "research-survey":
    "packages/core/src/research/methodology/literature-survey-validators.ts",
  "research-writing":
    "packages/core/src/research/methodology/writing-visual-validators.ts",
  "research-theory":
    "packages/core/src/research/methodology/computation-theory-validators.ts",
  "research-quest":
    "packages/core/src/research/methodology/setup-quest-validators.ts",
  "research-quest-admin":
    "packages/core/src/research/methodology/setup-quest-validators.ts",
} as const satisfies Readonly<
  Record<keyof typeof FAMILY_IDENTITIES, string>
>);

const FIELD_DESCRIPTORS = Object.freeze({
  allowed_mutation: ["enum", true, "1", true],
  artifact_path: ["string", true, "1", true],
  blocked_state: ["terminal-or-stage", true, "1", true],
  failure_state: ["terminal-or-stage", true, "1", true],
  inputs: ["string[]|ref", true, "1..*", false],
  media_type: ["string", true, "1", false],
  next_stage: ["string|null", false, "0..1", false],
  outputs: ["artifact-ref[]", true, "0..*", false],
  owner_package: ["string", true, "1", true],
  preconditions: ["string[]", true, "0..*", false],
  provenance: ["object", true, "1", false],
  required_evidence: ["string[]", true, "0..*", false],
  requiredness: ["enum(required|optional)", true, "1", true],
  stable_error_codes: ["string[]", true, "1..*", true],
  stable_id: ["string|null", false, "0..1", true],
  stage_id: ["string", true, "1", true],
  success_state: ["terminal-or-stage", true, "1", true],
  terminal_applicability: ["string[]", true, "1..*", true],
  validator_rules: ["validator-id[]", true, "0..*", false],
} as const);

const CHECKPOINT_ERROR_CODES = Object.freeze([
  "METHODOLOGY_CONTRACT_VIOLATION",
  "MISSING_CRITICAL_EVIDENCE",
  "PROVENANCE_OR_ID_DRIFT",
  "FORBIDDEN_MUTATION",
] as const);

export type ResearchMethodologyCheckpointKind =
  | "ordered_stage"
  | "artifact_lifecycle_checkpoint";
export type ResearchMethodologyCardinality = "0..1" | "1" | "0..*" | "1..*";
export type ResearchMethodologyFieldType =
  | "artifact-ref[]"
  | "enum"
  | "enum(required|optional)"
  | "object"
  | "string"
  | "string[]"
  | "string[]|ref"
  | "string|null"
  | "terminal-or-stage"
  | "validator-id[]";
export type ResearchMethodologyStableErrorCode =
  (typeof CHECKPOINT_ERROR_CODES)[number];

export interface ResearchMethodologyFieldRequirement {
  readonly name: keyof typeof FIELD_DESCRIPTORS;
  readonly type: ResearchMethodologyFieldType;
  readonly required: boolean;
  readonly cardinality: ResearchMethodologyCardinality;
  readonly immutable: boolean;
}

export interface ResearchMethodologyFixtureObligations {
  readonly positive: readonly string[];
  readonly baseEmpty: readonly string[];
  readonly criticalNegative: readonly string[];
}

interface ResearchMethodologyCheckpointBase {
  readonly id: string;
  readonly kind: ResearchMethodologyCheckpointKind;
  readonly contract_status:
    | "id-and-ref-only"
    | "artifact-lifecycle-from-v1.2-inventory";
  readonly producer: string;
  readonly consumer:
    | "downstream_or_root"
    | "next_stage_or_downstream_handoff";
  readonly fields: readonly ResearchMethodologyFieldRequirement[];
  readonly fixture_obligations: ResearchMethodologyFixtureObligations;
  readonly stable_error_codes: readonly ResearchMethodologyStableErrorCode[];
  readonly terminal_applicability: readonly string[];
}

export interface ResearchOrderedStageCheckpoint
  extends ResearchMethodologyCheckpointBase {
  readonly kind: "ordered_stage";
  readonly contract_status: "id-and-ref-only";
  readonly source_ref: string;
  readonly phase2_note: string;
  readonly transition_conditions: Readonly<{
    enter: "preconditions_satisfied";
    exit_success: "stage-complete";
    exit_blocked: "blocked";
    exit_failed: "failed";
  }>;
}

export interface ResearchArtifactLifecycleCheckpoint
  extends ResearchMethodologyCheckpointBase {
  readonly kind: "artifact_lifecycle_checkpoint";
  readonly contract_status: "artifact-lifecycle-from-v1.2-inventory";
  readonly artifact: string;
  readonly transition_conditions: Readonly<{
    create: "inputs_available";
    accept: "validators_pass";
    reject: "critical_validator_fail";
  }>;
}

export type ResearchMethodologyCheckpoint =
  | ResearchOrderedStageCheckpoint
  | ResearchArtifactLifecycleCheckpoint;

export interface ResearchMethodologyFamilyContract {
  readonly package: keyof typeof FAMILY_IDENTITIES;
  readonly checkpointCount: number;
  readonly implementationOwner: Readonly<{
    child: string;
    task: string;
  }>;
  readonly intended_target: Readonly<{
    activation_mode:
      | "automatic"
      | "automatic-or-explicit"
      | "explicit"
      | "read-only-resume";
    capability: string;
    default_stage_capability: boolean;
    procedure: string;
    stage:
      | "audit"
      | "computation"
      | "experiment"
      | "framing"
      | "ideation"
      | "literature"
      | "setup"
      | "theory"
      | "writing";
  }>;
  readonly authority_boundaries: Readonly<{
    canonical_mutation: "forbidden" | "forbidden-worker" | "quest-admin-only";
    quest_mutation: "allowed-via-admin" | "forbidden" | "prepare-candidate-only";
    read_write:
      | "pack-01-04"
      | "pack-05-07"
      | "read-only"
      | "read-write"
      | "slide-bundle"
      | "stage-artifacts"
      | "survey-artifacts";
    notes?: string;
  }>;
  readonly terminal_states: Readonly<{
    asserted: readonly string[];
    unasserted_not_claimed: readonly string[];
  }>;
  readonly composition_edges: readonly Readonly<{
    child: string;
    id: "COMP-001" | "COMP-002" | "COMP-003";
    kind: "bounded-composition" | "bounded-integration";
    import_private_impl?: false;
  }>[];
  readonly handoffs: readonly Readonly<{
    kind: "delegation" | "handoff";
    from?: string;
    to?: string;
    when?: string;
    contract?: string;
  }>[];
  readonly checkpoints: readonly ResearchMethodologyCheckpoint[];
}

export interface ResearchMethodologyFreeze {
  readonly schemaVersion: 1;
  readonly evaluationContractVersion: typeof FROZEN_METHODOLOGY_CONTRACT_VERSION;
  readonly methodologyDigest: string;
  readonly infraPin: string;
  readonly frozenAt: string;
  readonly packages: readonly ResearchMethodologyFamilyContract[];
  readonly compositionEdges: readonly Readonly<{
    child: string;
    id: "COMP-001" | "COMP-002" | "COMP-003";
    parent: string;
    importPrivateImpl?: false;
  }>[];
  readonly ideationClosure: string;
  readonly literatureRoute: Readonly<{
    default: "research.literature.review";
    nonDefault: readonly string[];
  }>;
  readonly questBoundary: Readonly<{
    readOnly: "research-quest";
    writeCapable: "research-quest-admin";
  }>;
  readonly ownerCaseHash: string;
  readonly fullMetadataHash: string;
}

export interface ResearchMethodologyFreezeConformance {
  readonly familyCount: typeof FROZEN_METHODOLOGY_FAMILY_COUNT;
  readonly checkpointCount: typeof FROZEN_METHODOLOGY_CHECKPOINT_COUNT;
  readonly orderedStageCount: typeof FROZEN_ORDERED_STAGE_COUNT;
  readonly artifactLifecycleCheckpointCount: typeof FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT;
}

export interface ResearchMethodologyDerivabilitySourceFile {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
  readonly role:
    | "frozen-family-owner-procedure-capability-map"
    | "frozen-field-and-checkpoint-contract";
}

export interface ResearchMethodologyDerivabilitySourceLocation {
  readonly file: string;
  readonly pointer: string;
  readonly role:
    | "frozen-checkpoint-contract"
    | "frozen-family-contract"
    | "frozen-owner-procedure-capability-map"
    | "frozen-route-disposition"
    | "related-literature-family-owner-only";
}

export interface ResearchMethodologyDerivabilityOwner {
  readonly child: string;
  readonly task: string;
}

export interface ResearchMethodologyDerivabilityFamily {
  readonly family: keyof typeof FAMILY_IDENTITIES;
  readonly checkpointCount: number;
  readonly owner: ResearchMethodologyDerivabilityOwner;
  readonly procedureId: string;
  readonly capabilityId: string;
  readonly sourcePointer: string;
}

export interface ResearchMethodologyPlanned203Destinations {
  readonly existenceClaim: "planned-not-produced-by-r0";
  readonly owner: ResearchMethodologyDerivabilityOwner &
    Readonly<{ taskEvidencePrefix: string }>;
  readonly package: Readonly<{
    procedureId: string;
    pathPrefix: string;
  }>;
  readonly runtime: Readonly<{
    path: string;
    trustedRootOnlyValidation: true;
  }>;
  readonly harness: Readonly<{
    semanticFixture: string;
    perCheckpointEvidence: string;
    frozenIdentityKey: string;
  }>;
  readonly candidate: Readonly<{
    path: string;
    bindingSelector: Readonly<{
      capabilityId: string;
      procedureId: string;
      procedureVersion: typeof HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION;
    }>;
  }>;
  readonly assurance: Readonly<{
    path: string;
    expectedCoverageKey: string;
  }>;
}

export interface ResearchMethodologyDerivabilityRow {
  readonly matrixId: string;
  readonly family: keyof typeof FAMILY_IDENTITIES;
  readonly checkpointId: string;
  readonly checkpointKind: ResearchMethodologyCheckpointKind;
  readonly artifactIdentity: string | null;
  readonly contractStatus:
    | "artifact-lifecycle-from-v1.2-inventory"
    | "id-and-ref-only";
  readonly sourceCheckpointSha256: string;
  readonly sourceLocations: readonly ResearchMethodologyDerivabilitySourceLocation[];
  readonly planned203Destinations: ResearchMethodologyPlanned203Destinations;
}

export interface ResearchMethodologyCompatibilityRoutingExtension {
  readonly extensionId: "literature-scan-v1-compatibility-routing";
  readonly includedInFrozenFamilyCount: false;
  readonly includedInFrozenCheckpointCount: false;
  readonly procedureId: "literature-scan-v1";
  readonly capabilityId: "research.literature.scan";
  readonly routeDisposition: "frozen-non-default";
  readonly owner: ResearchMethodologyDerivabilityOwner;
  readonly sourceLocations: readonly ResearchMethodologyDerivabilitySourceLocation[];
  readonly planned203Destinations: Readonly<{
    existenceClaim: "planned-not-produced-by-r0";
    packagePrefix: string;
    runtime: string;
    harnessFixture: string;
    candidateManifest: string;
    assuranceAudit: string;
  }>;
}

export interface ResearchMethodologyDerivabilityMatrix {
  readonly schemaVersion: 1;
  readonly kind: "phase2-r0-methodology-derivability-matrix";
  readonly methodologyContract: typeof FROZEN_METHODOLOGY_CONTRACT_VERSION;
  readonly methodologyDigest: string;
  readonly infrastructureBase: string;
  readonly repairVersion: typeof HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION;
  readonly sourceFiles: readonly ResearchMethodologyDerivabilitySourceFile[];
  readonly completeness: Readonly<{
    expectedFamilies: typeof FROZEN_METHODOLOGY_FAMILY_COUNT;
    actualFamilies: typeof FROZEN_METHODOLOGY_FAMILY_COUNT;
    uniqueFamilies: typeof FROZEN_METHODOLOGY_FAMILY_COUNT;
    expectedCheckpoints: typeof FROZEN_METHODOLOGY_CHECKPOINT_COUNT;
    actualCheckpoints: typeof FROZEN_METHODOLOGY_CHECKPOINT_COUNT;
    uniqueFamilyCheckpointPairs: typeof FROZEN_METHODOLOGY_CHECKPOINT_COUNT;
    checkpointKinds: Readonly<{
      artifact_lifecycle_checkpoint: typeof FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT;
      ordered_stage: typeof FROZEN_ORDERED_STAGE_COUNT;
    }>;
    packageCoverageBijection: true;
    allSourceLocationsResolved: true;
    resolvedSourceLocationCount: 314;
    compatibilityExtensionsExcludedFromTotals: 1;
  }>;
  readonly families: readonly ResearchMethodologyDerivabilityFamily[];
  readonly rows: readonly ResearchMethodologyDerivabilityRow[];
  readonly compatibilityRoutingExtensions: readonly ResearchMethodologyCompatibilityRoutingExtension[];
  readonly matrixDigest: typeof FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST;
}

export interface ResearchMethodologyDerivabilityMatrixInput {
  readonly matrixBytes: Uint8Array;
  readonly freezeBytes: Uint8Array;
  readonly coverageMapBytes: Uint8Array;
}

export interface ResearchMethodologyDerivabilityMatrixConformance
  extends ResearchMethodologyFreezeConformance {
  readonly compatibilityRoutingExtensionCount: 1;
  readonly resolvedSourceLocationCount: 314;
}

export class ResearchMethodologyContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResearchMethodologyContractError";
  }
}

function fail(message: string, cause?: unknown): never {
  throw new ResearchMethodologyContractError(
    message,
    cause === undefined ? undefined : { cause },
  );
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} must be a plain JSON object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${label} has unknown key '${key}'`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`${label} is missing required key '${key}'`);
    }
  }
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    fail(`${label} must be a non-empty string without NUL`);
  }
  return value;
}

function matchingString(
  value: unknown,
  pattern: RegExp,
  label: string,
): string {
  const parsed = nonEmptyString(value, label);
  if (!pattern.test(parsed)) fail(`${label} has an invalid format`);
  return parsed;
}

function exactString<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${label} has an unknown value`);
  }
  return value as T;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    fail(`${label} must be a positive integer`);
  }
  return value;
}

function uniqueStrings(
  value: unknown,
  label: string,
  options: Readonly<{ allowEmpty?: boolean; pattern?: RegExp }> = {},
): readonly string[] {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0)) {
    fail(`${label} must be ${options.allowEmpty ? "an" : "a non-empty"} array`);
  }
  const seen = new Set<string>();
  const output: string[] = [];
  for (const [index, item] of value.entries()) {
    const parsed = nonEmptyString(item, `${label}[${index}]`);
    if (options.pattern !== undefined && !options.pattern.test(parsed)) {
      fail(`${label}[${index}] has an invalid format`);
    }
    if (seen.has(parsed)) fail(`${label} contains duplicate '${parsed}'`);
    seen.add(parsed);
    output.push(parsed);
  }
  return Object.freeze(output);
}

function parseFieldRequirement(
  raw: unknown,
  label: string,
): ResearchMethodologyFieldRequirement {
  const value = record(raw, label);
  exactKeys(
    value,
    ["name", "type", "required", "cardinality", "immutable"],
    ["name", "type", "required", "cardinality", "immutable"],
    label,
  );
  const name = exactString(
    value.name,
    Object.keys(FIELD_DESCRIPTORS) as (keyof typeof FIELD_DESCRIPTORS)[],
    `${label}.name`,
  );
  const expected = FIELD_DESCRIPTORS[name];
  if (
    value.type !== expected[0] ||
    value.required !== expected[1] ||
    value.cardinality !== expected[2] ||
    value.immutable !== expected[3]
  ) {
    fail(`${label} does not match the frozen descriptor for '${name}'`);
  }
  return Object.freeze({
    name,
    type: expected[0],
    required: expected[1],
    cardinality: expected[2],
    immutable: expected[3],
  });
}

function parseFixtureObligations(
  raw: unknown,
  label: string,
): ResearchMethodologyFixtureObligations {
  const value = record(raw, label);
  exactKeys(
    value,
    ["positive", "baseEmpty", "criticalNegative"],
    ["positive", "baseEmpty", "criticalNegative"],
    label,
  );
  return Object.freeze({
    positive: uniqueStrings(value.positive, `${label}.positive`, {
      pattern: STABLE_ID,
    }),
    baseEmpty: uniqueStrings(value.baseEmpty, `${label}.baseEmpty`, {
      pattern: STABLE_ID,
    }),
    criticalNegative: uniqueStrings(
      value.criticalNegative,
      `${label}.criticalNegative`,
      { pattern: STABLE_ID },
    ),
  });
}

function parseCheckpointBase(
  value: Record<string, unknown>,
  label: string,
  family: string,
): Omit<ResearchMethodologyCheckpointBase, "kind" | "contract_status"> {
  const id = matchingString(value.id, CHECKPOINT_ID, `${label}.id`);
  if (value.producer !== family) {
    fail(`${label}.producer must equal family package '${family}'`);
  }
  const fieldsRaw = value.fields;
  if (!Array.isArray(fieldsRaw) || fieldsRaw.length === 0) {
    fail(`${label}.fields must be a non-empty array`);
  }
  const fields = fieldsRaw.map((field, index) =>
    parseFieldRequirement(field, `${label}.fields[${index}]`),
  );
  const fieldNames = new Set<string>();
  for (const field of fields) {
    if (fieldNames.has(field.name)) {
      fail(`${label}.fields contains duplicate field '${field.name}'`);
    }
    fieldNames.add(field.name);
  }
  const errorCodesRaw = value.stable_error_codes;
  if (!Array.isArray(errorCodesRaw) || errorCodesRaw.length === 0) {
    fail(`${label}.stable_error_codes must be a non-empty array`);
  }
  const stableErrorCodes = errorCodesRaw.map((code, index) =>
    exactString(
      code,
      CHECKPOINT_ERROR_CODES,
      `${label}.stable_error_codes[${index}]`,
    ),
  );
  if (new Set(stableErrorCodes).size !== stableErrorCodes.length) {
    fail(`${label}.stable_error_codes contains duplicates`);
  }
  return {
    id,
    producer: family,
    consumer: exactString(
      value.consumer,
      ["downstream_or_root", "next_stage_or_downstream_handoff"] as const,
      `${label}.consumer`,
    ),
    fields: Object.freeze(fields),
    fixture_obligations: parseFixtureObligations(
      value.fixture_obligations,
      `${label}.fixture_obligations`,
    ),
    stable_error_codes: Object.freeze(stableErrorCodes),
    terminal_applicability: uniqueStrings(
      value.terminal_applicability,
      `${label}.terminal_applicability`,
      { pattern: STABLE_ID },
    ),
  };
}

function parseCheckpoint(
  raw: unknown,
  label: string,
  family: string,
): ResearchMethodologyCheckpoint {
  const value = record(raw, label);
  const kind = exactString(
    value.kind,
    ["ordered_stage", "artifact_lifecycle_checkpoint"] as const,
    `${label}.kind`,
  );
  const commonKeys = [
    "id",
    "kind",
    "contract_status",
    "producer",
    "consumer",
    "fields",
    "fixture_obligations",
    "stable_error_codes",
    "terminal_applicability",
    "transition_conditions",
  ];
  if (kind === "ordered_stage") {
    exactKeys(
      value,
      [...commonKeys, "source_ref", "phase2_note"],
      [...commonKeys, "source_ref", "phase2_note"],
      label,
    );
    if (value.contract_status !== "id-and-ref-only") {
      fail(`${label}.contract_status is inconsistent with ordered_stage`);
    }
    if (value.consumer !== "next_stage_or_downstream_handoff") {
      fail(`${label}.consumer is inconsistent with ordered_stage`);
    }
    const transitions = record(
      value.transition_conditions,
      `${label}.transition_conditions`,
    );
    exactKeys(
      transitions,
      ["enter", "exit_success", "exit_blocked", "exit_failed"],
      ["enter", "exit_success", "exit_blocked", "exit_failed"],
      `${label}.transition_conditions`,
    );
    if (
      transitions.enter !== "preconditions_satisfied" ||
      transitions.exit_success !== "stage-complete" ||
      transitions.exit_blocked !== "blocked" ||
      transitions.exit_failed !== "failed"
    ) {
      fail(`${label}.transition_conditions has an unknown transition value`);
    }
    const base = parseCheckpointBase(value, label, family);
    return Object.freeze({
      ...base,
      kind,
      contract_status: "id-and-ref-only" as const,
      source_ref: safeRelativePath(value.source_ref, `${label}.source_ref`),
      phase2_note: nonEmptyString(value.phase2_note, `${label}.phase2_note`),
      transition_conditions: Object.freeze({
        enter: "preconditions_satisfied" as const,
        exit_success: "stage-complete" as const,
        exit_blocked: "blocked" as const,
        exit_failed: "failed" as const,
      }),
    });
  }

  exactKeys(
    value,
    [...commonKeys, "artifact"],
    [...commonKeys, "artifact"],
    label,
  );
  if (value.contract_status !== "artifact-lifecycle-from-v1.2-inventory") {
    fail(`${label}.contract_status is inconsistent with artifact lifecycle`);
  }
  if (value.consumer !== "downstream_or_root") {
    fail(`${label}.consumer is inconsistent with artifact lifecycle`);
  }
  const transitions = record(
    value.transition_conditions,
    `${label}.transition_conditions`,
  );
  exactKeys(
    transitions,
    ["create", "accept", "reject"],
    ["create", "accept", "reject"],
    `${label}.transition_conditions`,
  );
  if (
    transitions.create !== "inputs_available" ||
    transitions.accept !== "validators_pass" ||
    transitions.reject !== "critical_validator_fail"
  ) {
    fail(`${label}.transition_conditions has an unknown transition value`);
  }
  const base = parseCheckpointBase(value, label, family);
  return Object.freeze({
    ...base,
    kind,
    contract_status: "artifact-lifecycle-from-v1.2-inventory" as const,
    artifact: safeRelativePath(value.artifact, `${label}.artifact`),
    transition_conditions: Object.freeze({
      create: "inputs_available" as const,
      accept: "validators_pass" as const,
      reject: "critical_validator_fail" as const,
    }),
  });
}

function safeRelativePath(value: unknown, label: string): string {
  const parsed = matchingString(value, SAFE_RELATIVE_PATH, label);
  if (
    parsed.startsWith("/") ||
    parsed.includes("\\") ||
    parsed.split("/").some((part) => part === "." || part === "..")
  ) {
    fail(`${label} must be a safe relative path`);
  }
  return parsed;
}

function parseOwner(raw: unknown, label: string): ResearchMethodologyFamilyContract["implementationOwner"] {
  const value = record(raw, label);
  exactKeys(value, ["child", "task"], ["child", "task"], label);
  return Object.freeze({
    child: matchingString(value.child, STABLE_ID, `${label}.child`),
    task: matchingString(value.task, STABLE_ID, `${label}.task`),
  });
}

function parseIntendedTarget(
  raw: unknown,
  label: string,
  family: keyof typeof FAMILY_IDENTITIES,
): ResearchMethodologyFamilyContract["intended_target"] {
  const value = record(raw, label);
  exactKeys(
    value,
    ["activation_mode", "capability", "default_stage_capability", "procedure", "stage"],
    ["activation_mode", "capability", "default_stage_capability", "procedure", "stage"],
    label,
  );
  const identity = FAMILY_IDENTITIES[family];
  const capability = matchingString(value.capability, CAPABILITY_ID, `${label}.capability`);
  const procedure = matchingString(value.procedure, PROCEDURE_ID, `${label}.procedure`);
  if (capability !== identity.capability || procedure !== identity.procedure) {
    fail(`${label} does not match the frozen package/capability/Procedure identity`);
  }
  return Object.freeze({
    activation_mode: exactString(
      value.activation_mode,
      ["automatic", "automatic-or-explicit", "explicit", "read-only-resume"] as const,
      `${label}.activation_mode`,
    ),
    capability,
    default_stage_capability: booleanValue(
      value.default_stage_capability,
      `${label}.default_stage_capability`,
    ),
    procedure,
    stage: exactString(
      value.stage,
      [
        "audit",
        "computation",
        "experiment",
        "framing",
        "ideation",
        "literature",
        "setup",
        "theory",
        "writing",
      ] as const,
      `${label}.stage`,
    ),
  });
}

function parseAuthorityBoundaries(
  raw: unknown,
  label: string,
): ResearchMethodologyFamilyContract["authority_boundaries"] {
  const value = record(raw, label);
  exactKeys(
    value,
    ["canonical_mutation", "quest_mutation", "read_write", "notes"],
    ["canonical_mutation", "quest_mutation", "read_write"],
    label,
  );
  const notes =
    value.notes === undefined
      ? undefined
      : nonEmptyString(value.notes, `${label}.notes`);
  return Object.freeze({
    canonical_mutation: exactString(
      value.canonical_mutation,
      ["forbidden", "forbidden-worker", "quest-admin-only"] as const,
      `${label}.canonical_mutation`,
    ),
    quest_mutation: exactString(
      value.quest_mutation,
      ["allowed-via-admin", "forbidden", "prepare-candidate-only"] as const,
      `${label}.quest_mutation`,
    ),
    read_write: exactString(
      value.read_write,
      [
        "pack-01-04",
        "pack-05-07",
        "read-only",
        "read-write",
        "slide-bundle",
        "stage-artifacts",
        "survey-artifacts",
      ] as const,
      `${label}.read_write`,
    ),
    ...(notes === undefined ? {} : { notes }),
  });
}

function parseTerminalStates(
  raw: unknown,
  label: string,
): ResearchMethodologyFamilyContract["terminal_states"] {
  const value = record(raw, label);
  exactKeys(
    value,
    ["asserted", "unasserted_not_claimed"],
    ["asserted", "unasserted_not_claimed"],
    label,
  );
  const asserted = uniqueStrings(value.asserted, `${label}.asserted`, {
    pattern: STABLE_ID,
  });
  const unasserted = uniqueStrings(
    value.unasserted_not_claimed,
    `${label}.unasserted_not_claimed`,
    { pattern: STABLE_ID },
  );
  for (const state of asserted) {
    if (unasserted.includes(state)) {
      fail(`${label} classifies terminal state '${state}' twice`);
    }
  }
  return Object.freeze({
    asserted,
    unasserted_not_claimed: unasserted,
  });
}

function parseCompositionEdges(
  raw: unknown,
  label: string,
): ResearchMethodologyFamilyContract["composition_edges"] {
  if (!Array.isArray(raw)) fail(`${label} must be an array`);
  const ids = new Set<string>();
  return Object.freeze(
    raw.map((item, index) => {
      const itemLabel = `${label}[${index}]`;
      const value = record(item, itemLabel);
      exactKeys(
        value,
        ["child", "id", "kind", "import_private_impl"],
        ["child", "id", "kind"],
        itemLabel,
      );
      const id = exactString(
        value.id,
        ["COMP-001", "COMP-002", "COMP-003"] as const,
        `${itemLabel}.id`,
      );
      if (ids.has(id)) fail(`${label} contains duplicate edge '${id}'`);
      ids.add(id);
      if (
        value.import_private_impl !== undefined &&
        value.import_private_impl !== false
      ) {
        fail(`${itemLabel}.import_private_impl must be false when present`);
      }
      const importPrivateImpl = value.import_private_impl as false | undefined;
      return Object.freeze({
        child: matchingString(
          value.child,
          COMPOSITION_CHILD_ID,
          `${itemLabel}.child`,
        ),
        id,
        kind: exactString(
          value.kind,
          ["bounded-composition", "bounded-integration"] as const,
          `${itemLabel}.kind`,
        ),
        ...(importPrivateImpl === undefined
          ? {}
          : { import_private_impl: importPrivateImpl }),
      });
    }),
  );
}

function parseHandoffs(
  raw: unknown,
  label: string,
): ResearchMethodologyFamilyContract["handoffs"] {
  if (!Array.isArray(raw)) fail(`${label} must be an array`);
  return Object.freeze(
    raw.map((item, index) => {
      const itemLabel = `${label}[${index}]`;
      const value = record(item, itemLabel);
      exactKeys(
        value,
        ["kind", "from", "to", "when", "contract"],
        ["kind"],
        itemLabel,
      );
      const from =
        value.from === undefined
          ? undefined
          : matchingString(value.from, FAMILY_ID, `${itemLabel}.from`);
      const to =
        value.to === undefined
          ? undefined
          : matchingString(value.to, FAMILY_ID, `${itemLabel}.to`);
      if (from === undefined && to === undefined) {
        fail(`${itemLabel} must declare from or to`);
      }
      const when =
        value.when === undefined
          ? undefined
          : matchingString(value.when, STABLE_ID, `${itemLabel}.when`);
      const contract =
        value.contract === undefined
          ? undefined
          : safeRelativePath(value.contract, `${itemLabel}.contract`);
      return Object.freeze({
        kind: exactString(
          value.kind,
          ["delegation", "handoff"] as const,
          `${itemLabel}.kind`,
        ),
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
        ...(when === undefined ? {} : { when }),
        ...(contract === undefined ? {} : { contract }),
      });
    }),
  );
}

function canonicalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const canonical: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      canonical[key] = canonicalizeJsonValue(source[key]);
    }
    return canonical;
  }
  return value;
}

function semanticJsonDigest(value: unknown): string {
  const canonical = JSON.stringify(canonicalizeJsonValue(value));
  if (canonical === undefined) fail("Unable to canonicalize methodology JSON");
  return createHash("sha256").update(canonical).digest("hex");
}

function parseFamilyValue(
  raw: unknown,
  label: string,
): ResearchMethodologyFamilyContract {
  const value = record(raw, label);
  exactKeys(
    value,
    [
      "package",
      "checkpointCount",
      "implementationOwner",
      "intended_target",
      "authority_boundaries",
      "terminal_states",
      "composition_edges",
      "handoffs",
      "checkpoints",
    ],
    [
      "package",
      "checkpointCount",
      "implementationOwner",
      "intended_target",
      "authority_boundaries",
      "terminal_states",
      "composition_edges",
      "handoffs",
      "checkpoints",
    ],
    label,
  );
  const family = exactString(
    value.package,
    Object.keys(FAMILY_IDENTITIES) as (keyof typeof FAMILY_IDENTITIES)[],
    `${label}.package`,
  );
  if (!Array.isArray(value.checkpoints) || value.checkpoints.length === 0) {
    fail(`${label}.checkpoints must be a non-empty array`);
  }
  const checkpoints = value.checkpoints.map((checkpoint, index) =>
    parseCheckpoint(checkpoint, `${label}.checkpoints[${index}]`, family),
  );
  const checkpointIds = new Set<string>();
  const artifactIds = new Set<string>();
  const sourceRefs = new Set<string>();
  for (const checkpoint of checkpoints) {
    if (checkpointIds.has(checkpoint.id)) {
      fail(`${label}.checkpoints contains duplicate id '${checkpoint.id}'`);
    }
    checkpointIds.add(checkpoint.id);
    if (checkpoint.kind === "artifact_lifecycle_checkpoint") {
      if (artifactIds.has(checkpoint.artifact)) {
        fail(`${label}.checkpoints contains duplicate artifact '${checkpoint.artifact}'`);
      }
      artifactIds.add(checkpoint.artifact);
    } else {
      if (sourceRefs.has(checkpoint.source_ref)) {
        fail(`${label}.checkpoints contains duplicate source_ref '${checkpoint.source_ref}'`);
      }
      sourceRefs.add(checkpoint.source_ref);
    }
  }
  const checkpointCount = positiveInteger(
    value.checkpointCount,
    `${label}.checkpointCount`,
  );
  if (checkpointCount !== checkpoints.length) {
    fail(`${label}.checkpointCount does not equal checkpoints.length`);
  }
  const contract = Object.freeze({
    package: family,
    checkpointCount,
    implementationOwner: parseOwner(
      value.implementationOwner,
      `${label}.implementationOwner`,
    ),
    intended_target: parseIntendedTarget(
      value.intended_target,
      `${label}.intended_target`,
      family,
    ),
    authority_boundaries: parseAuthorityBoundaries(
      value.authority_boundaries,
      `${label}.authority_boundaries`,
    ),
    terminal_states: parseTerminalStates(
      value.terminal_states,
      `${label}.terminal_states`,
    ),
    composition_edges: parseCompositionEdges(
      value.composition_edges,
      `${label}.composition_edges`,
    ),
    handoffs: parseHandoffs(value.handoffs, `${label}.handoffs`),
    checkpoints: Object.freeze(checkpoints),
  });
  if (
    semanticJsonDigest(value) !== FROZEN_FAMILY_SEMANTIC_DIGESTS[family]
  ) {
    fail(
      `${label} does not match the historical Phase-2 packaging family contract (not exact frozen-v1.2 lifecycle authority)`,
    );
  }
  return contract;
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return parseStrictResearchJson(bytes);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    fail(`${label} is not strict UTF-8 JSON${detail}`, error);
  }
}

export function parseResearchMethodologyFamilyContract(
  bytes: Uint8Array,
): ResearchMethodologyFamilyContract {
  return parseFamilyValue(parseJson(bytes, "Research methodology family contract"), "Research methodology family contract");
}

function parseGlobalCompositionEdges(
  raw: unknown,
  label: string,
): ResearchMethodologyFreeze["compositionEdges"] {
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
  const ids = new Set<string>();
  return Object.freeze(
    raw.map((item, index) => {
      const itemLabel = `${label}[${index}]`;
      const value = record(item, itemLabel);
      exactKeys(
        value,
        ["child", "id", "parent", "importPrivateImpl"],
        ["child", "id", "parent"],
        itemLabel,
      );
      const id = exactString(
        value.id,
        ["COMP-001", "COMP-002", "COMP-003"] as const,
        `${itemLabel}.id`,
      );
      if (ids.has(id)) fail(`${label} contains duplicate edge '${id}'`);
      ids.add(id);
      if (
        value.importPrivateImpl !== undefined &&
        value.importPrivateImpl !== false
      ) {
        fail(`${itemLabel}.importPrivateImpl must be false when present`);
      }
      const importPrivateImpl = value.importPrivateImpl as false | undefined;
      return Object.freeze({
        child: matchingString(
          value.child,
          COMPOSITION_CHILD_ID,
          `${itemLabel}.child`,
        ),
        id,
        parent: matchingString(value.parent, FAMILY_ID, `${itemLabel}.parent`),
        ...(importPrivateImpl === undefined ? {} : { importPrivateImpl }),
      });
    }),
  );
}

function validateFreezeReferences(freeze: ResearchMethodologyFreeze): void {
  const families = new Map(freeze.packages.map((family) => [family.package, family]));
  for (const family of freeze.packages) {
    for (const edge of family.composition_edges) {
      if (edge.child !== "personal-slides" && !families.has(edge.child as keyof typeof FAMILY_IDENTITIES)) {
        fail(`Family '${family.package}' composition edge references unknown child '${edge.child}'`);
      }
      const global = freeze.compositionEdges.find((candidate) => candidate.id === edge.id);
      if (
        global?.parent !== family.package ||
        global?.child !== edge.child
      ) {
        fail(`Family '${family.package}' composition edge '${edge.id}' is inconsistent with global compositionEdges`);
      }
    }
    for (const handoff of family.handoffs) {
      for (const reference of [handoff.from, handoff.to]) {
        if (reference !== undefined && !families.has(reference as keyof typeof FAMILY_IDENTITIES)) {
          fail(`Family '${family.package}' handoff references unknown family '${reference}'`);
        }
      }
    }
  }
  for (const edge of freeze.compositionEdges) {
    if (!families.has(edge.parent as keyof typeof FAMILY_IDENTITIES)) {
      fail(`Global composition edge '${edge.id}' references unknown parent '${edge.parent}'`);
    }
    if (edge.child !== "personal-slides" && !families.has(edge.child as keyof typeof FAMILY_IDENTITIES)) {
      fail(`Global composition edge '${edge.id}' references unknown child '${edge.child}'`);
    }
  }
  if (!families.has(freeze.questBoundary.readOnly) || !families.has(freeze.questBoundary.writeCapable)) {
    fail("questBoundary references an unknown family");
  }
  const capabilities = new Set(
    freeze.packages.map((family) => family.intended_target.capability),
  );
  if (!capabilities.has(freeze.literatureRoute.default)) {
    fail("literatureRoute.default does not reference a frozen family capability");
  }
  for (const capability of freeze.literatureRoute.nonDefault) {
    if (
      capability !== "research.literature.scan" &&
      !capabilities.has(capability)
    ) {
      fail(`literatureRoute.nonDefault references unknown capability '${capability}'`);
    }
  }
}

export function parseResearchMethodologyFreeze(
  bytes: Uint8Array,
): ResearchMethodologyFreeze {
  const value = record(
    parseJson(bytes, "Research methodology freeze"),
    "Research methodology freeze",
  );
  exactKeys(
    value,
    [
      "schemaVersion",
      "evaluationContractVersion",
      "methodologyDigest",
      "infraPin",
      "frozenAt",
      "packages",
      "compositionEdges",
      "ideationClosure",
      "literatureRoute",
      "questBoundary",
      "ownerCaseHash",
      "fullMetadataHash",
    ],
    [
      "schemaVersion",
      "evaluationContractVersion",
      "methodologyDigest",
      "infraPin",
      "frozenAt",
      "packages",
      "compositionEdges",
      "ideationClosure",
      "literatureRoute",
      "questBoundary",
      "ownerCaseHash",
      "fullMetadataHash",
    ],
    "Research methodology freeze",
  );
  if (value.schemaVersion !== 1) {
    fail("Research methodology freeze schemaVersion must be 1");
  }
  if (value.evaluationContractVersion !== FROZEN_METHODOLOGY_CONTRACT_VERSION) {
    fail("Research methodology freeze has an unknown evaluationContractVersion");
  }
  const expectedDigest = FROZEN_METHODOLOGY_CONTRACT_DIGEST.slice("sha256:".length);
  if (value.methodologyDigest !== expectedDigest) {
    fail("Research methodology freeze methodologyDigest does not match the frozen contract");
  }
  if (!Array.isArray(value.packages) || value.packages.length === 0) {
    fail("Research methodology freeze packages must be a non-empty array");
  }
  const packages = value.packages.map((family, index) =>
    parseFamilyValue(family, `Research methodology freeze.packages[${index}]`),
  );
  const familyIds = new Set<string>();
  const checkpointIds = new Set<string>();
  for (const family of packages) {
    if (familyIds.has(family.package)) {
      fail(`Research methodology freeze contains duplicate family '${family.package}'`);
    }
    familyIds.add(family.package);
    for (const checkpoint of family.checkpoints) {
      const identity = `${family.package}::${checkpoint.id}`;
      if (checkpointIds.has(identity)) {
        fail(`Research methodology freeze contains duplicate checkpoint '${identity}'`);
      }
      checkpointIds.add(identity);
    }
  }
  const literatureRoute = record(
    value.literatureRoute,
    "Research methodology freeze.literatureRoute",
  );
  exactKeys(
    literatureRoute,
    ["default", "nonDefault"],
    ["default", "nonDefault"],
    "Research methodology freeze.literatureRoute",
  );
  if (literatureRoute.default !== "research.literature.review") {
    fail("Research methodology freeze literatureRoute.default is invalid");
  }
  const questBoundary = record(
    value.questBoundary,
    "Research methodology freeze.questBoundary",
  );
  exactKeys(
    questBoundary,
    ["readOnly", "writeCapable"],
    ["readOnly", "writeCapable"],
    "Research methodology freeze.questBoundary",
  );
  if (
    questBoundary.readOnly !== "research-quest" ||
    questBoundary.writeCapable !== "research-quest-admin"
  ) {
    fail("Research methodology freeze questBoundary is invalid");
  }
  const freeze: ResearchMethodologyFreeze = Object.freeze({
    schemaVersion: 1,
    evaluationContractVersion: FROZEN_METHODOLOGY_CONTRACT_VERSION,
    methodologyDigest: expectedDigest,
    infraPin: matchingString(
      value.infraPin,
      GIT_COMMIT,
      "Research methodology freeze.infraPin",
    ),
    frozenAt: nonEmptyString(
      value.frozenAt,
      "Research methodology freeze.frozenAt",
    ),
    packages: Object.freeze(packages),
    compositionEdges: parseGlobalCompositionEdges(
      value.compositionEdges,
      "Research methodology freeze.compositionEdges",
    ),
    ideationClosure: nonEmptyString(
      value.ideationClosure,
      "Research methodology freeze.ideationClosure",
    ),
    literatureRoute: Object.freeze({
      default: "research.literature.review" as const,
      nonDefault: uniqueStrings(
        literatureRoute.nonDefault,
        "Research methodology freeze.literatureRoute.nonDefault",
        { pattern: CAPABILITY_ID },
      ),
    }),
    questBoundary: Object.freeze({
      readOnly: "research-quest" as const,
      writeCapable: "research-quest-admin" as const,
    }),
    ownerCaseHash: matchingString(
      value.ownerCaseHash,
      SHA256_HEX,
      "Research methodology freeze.ownerCaseHash",
    ),
    fullMetadataHash: matchingString(
      value.fullMetadataHash,
      SHA256_HEX,
      "Research methodology freeze.fullMetadataHash",
    ),
  });
  validateFreezeReferences(freeze);
  return freeze;
}

function firstDifference(
  expected: unknown,
  actual: unknown,
  path: string,
): string | undefined {
  if (Object.is(expected, actual)) return undefined;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return `${path}.length expected ${expected.length}, received ${actual.length}`;
    }
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(
        expected[index],
        actual[index],
        `${path}[${index}]`,
      );
      if (difference !== undefined) return difference;
    }
    return undefined;
  }
  if (
    expected !== null &&
    actual !== null &&
    typeof expected === "object" &&
    typeof actual === "object" &&
    !Array.isArray(expected) &&
    !Array.isArray(actual)
  ) {
    const expectedRecord = expected as Record<string, unknown>;
    const actualRecord = actual as Record<string, unknown>;
    const expectedKeys = Object.keys(expectedRecord);
    const actualKeys = Object.keys(actualRecord);
    if (
      expectedKeys.length !== actualKeys.length ||
      expectedKeys.some((key, index) => actualKeys[index] !== key)
    ) {
      return `${path} keys or key order differ`;
    }
    for (const key of expectedKeys) {
      const difference = firstDifference(
        expectedRecord[key],
        actualRecord[key],
        `${path}.${key}`,
      );
      if (difference !== undefined) return difference;
    }
    return undefined;
  }
  return `${path} expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`;
}

export function verifyResearchMethodologyFreezeConformance(input: {
  readonly frozenBytes: Uint8Array;
  readonly candidateBytes: Uint8Array;
}): ResearchMethodologyFreezeConformance {
  const frozen = parseResearchMethodologyFreeze(input.frozenBytes);
  const candidate = parseResearchMethodologyFreeze(input.candidateBytes);
  const difference = firstDifference(frozen, candidate, "$freeze");
  if (difference !== undefined) {
    fail(`Research methodology freeze conformance failed: ${difference}`);
  }
  const checkpointCount = frozen.packages.reduce(
    (count, family) => count + family.checkpoints.length,
    0,
  );
  const orderedStageCount = frozen.packages.reduce(
    (count, family) =>
      count + family.checkpoints.filter((checkpoint) => checkpoint.kind === "ordered_stage").length,
    0,
  );
  const artifactLifecycleCheckpointCount = checkpointCount - orderedStageCount;
  if (
    frozen.packages.length !== FROZEN_METHODOLOGY_FAMILY_COUNT ||
    checkpointCount !== FROZEN_METHODOLOGY_CHECKPOINT_COUNT ||
    orderedStageCount !== FROZEN_ORDERED_STAGE_COUNT ||
    artifactLifecycleCheckpointCount !== FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT
  ) {
    fail(
      `Research methodology freeze totals must be ${FROZEN_METHODOLOGY_FAMILY_COUNT}/${FROZEN_METHODOLOGY_CHECKPOINT_COUNT}/${FROZEN_ORDERED_STAGE_COUNT}/${FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT}`,
    );
  }
  return Object.freeze({
    familyCount: FROZEN_METHODOLOGY_FAMILY_COUNT,
    checkpointCount: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
    orderedStageCount: FROZEN_ORDERED_STAGE_COUNT,
    artifactLifecycleCheckpointCount:
      FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
  });
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    fail(`${label} must be a non-negative integer`);
  }
  return value;
}

function exactBoolean<T extends boolean>(
  value: unknown,
  expected: T,
  label: string,
): T {
  if (value !== expected) fail(`${label} must be ${String(expected)}`);
  return expected;
}

function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeRelativePrefix(value: unknown, label: string): string {
  const parsed = nonEmptyString(value, label);
  if (!parsed.endsWith("/")) fail(`${label} must end with '/'`);
  safeRelativePath(parsed.slice(0, -1), label);
  return parsed;
}

function parseDerivabilityOwner(
  raw: unknown,
  label: string,
): ResearchMethodologyDerivabilityOwner {
  const owner = parseOwner(raw, label);
  return Object.freeze({ child: owner.child, task: owner.task });
}

function parseSourceLocation(
  raw: unknown,
  label: string,
): ResearchMethodologyDerivabilitySourceLocation {
  const value = record(raw, label);
  exactKeys(value, ["file", "pointer", "role"], ["file", "pointer", "role"], label);
  return Object.freeze({
    file: safeRelativePath(value.file, `${label}.file`),
    pointer: matchingString(
      value.pointer,
      /^\/(?:[A-Za-z0-9_-]+|0|[1-9][0-9]*)(?:\/(?:[A-Za-z0-9_-]+|0|[1-9][0-9]*))*$/,
      `${label}.pointer`,
    ),
    role: exactString(
      value.role,
      [
        "frozen-checkpoint-contract",
        "frozen-family-contract",
        "frozen-owner-procedure-capability-map",
        "frozen-route-disposition",
        "related-literature-family-owner-only",
      ] as const,
      `${label}.role`,
    ),
  });
}

function parseExpectedSourceLocations(
  raw: unknown,
  label: string,
  expected: readonly ResearchMethodologyDerivabilitySourceLocation[],
): readonly ResearchMethodologyDerivabilitySourceLocation[] {
  if (!Array.isArray(raw) || raw.length !== expected.length) {
    fail(`${label} must contain exactly ${expected.length} entries`);
  }
  const locations = raw.map((item, index) =>
    parseSourceLocation(item, `${label}[${index}]`),
  );
  const difference = firstDifference(expected, locations, label);
  if (difference !== undefined) fail(`${label} is inconsistent: ${difference}`);
  return Object.freeze(locations);
}

function parseCoveragePackages(
  bytes: Uint8Array,
  freeze: ResearchMethodologyFreeze,
): readonly Record<string, unknown>[] {
  const value = record(
    parseJson(bytes, "Research methodology package coverage map"),
    "Research methodology package coverage map",
  );
  exactKeys(
    value,
    ["methodologyDigest", "packageCount", "packages"],
    ["methodologyDigest", "packageCount", "packages"],
    "Research methodology package coverage map",
  );
  if (value.methodologyDigest !== freeze.methodologyDigest) {
    fail("Research methodology package coverage map methodologyDigest is inconsistent");
  }
  if (
    value.packageCount !== FROZEN_METHODOLOGY_FAMILY_COUNT ||
    !Array.isArray(value.packages) ||
    value.packages.length !== FROZEN_METHODOLOGY_FAMILY_COUNT
  ) {
    fail("Research methodology package coverage map must contain exactly 16 packages");
  }
  return Object.freeze(
    value.packages.map((raw, index) => {
      const label = `Research methodology package coverage map.packages[${index}]`;
      const item = record(raw, label);
      exactKeys(
        item,
        [
          "package",
          "implementationOwner",
          "disposition",
          "procedure",
          "capability",
          "stageCount",
          "defaultStageCapability",
        ],
        [
          "package",
          "implementationOwner",
          "disposition",
          "procedure",
          "capability",
          "stageCount",
          "defaultStageCapability",
        ],
        label,
      );
      exactString(item.disposition, ["preserve", "translate"] as const, `${label}.disposition`);
      nonNegativeInteger(item.stageCount, `${label}.stageCount`);
      booleanValue(item.defaultStageCapability, `${label}.defaultStageCapability`);
      const family = freeze.packages[index];
      if (
        family === undefined ||
        item.package !== family.package ||
        item.procedure !== family.intended_target.procedure ||
        item.capability !== family.intended_target.capability ||
        firstDifference(
          family.implementationOwner,
          parseDerivabilityOwner(item.implementationOwner, `${label}.implementationOwner`),
          `${label}.implementationOwner`,
        ) !== undefined
      ) {
        fail(`${label} is inconsistent with the frozen family identity`);
      }
      return item;
    }),
  );
}

function parseDerivabilitySourceFiles(
  raw: unknown,
  input: ResearchMethodologyDerivabilityMatrixInput,
): readonly ResearchMethodologyDerivabilitySourceFile[] {
  if (!Array.isArray(raw) || raw.length !== 2) {
    fail("Research methodology derivability matrix.sourceFiles must contain exactly 2 entries");
  }
  const expected = [
    {
      path: FROZEN_METHODOLOGY_FREEZE_PATH,
      bytes: input.freezeBytes,
      role: "frozen-field-and-checkpoint-contract" as const,
    },
    {
      path: FROZEN_METHODOLOGY_COVERAGE_MAP_PATH,
      bytes: input.coverageMapBytes,
      role: "frozen-family-owner-procedure-capability-map" as const,
    },
  ];
  return Object.freeze(
    raw.map((item, index) => {
      const label = `Research methodology derivability matrix.sourceFiles[${index}]`;
      const value = record(item, label);
      exactKeys(
        value,
        ["path", "size", "sha256", "role"],
        ["path", "size", "sha256", "role"],
        label,
      );
      const source = expected[index];
      if (source === undefined) fail(`${label} has no frozen source binding`);
      const size = positiveInteger(value.size, `${label}.size`);
      const digest = matchingString(value.sha256, SHA256_HEX, `${label}.sha256`);
      if (
        value.path !== source.path ||
        value.role !== source.role ||
        size !== source.bytes.byteLength ||
        digest !== sha256Hex(source.bytes)
      ) {
        fail(`${label} does not match the exact frozen source bytes`);
      }
      return Object.freeze({
        path: source.path,
        size,
        sha256: digest,
        role: source.role,
      });
    }),
  );
}

function parseDerivabilityFamilies(
  raw: unknown,
  freeze: ResearchMethodologyFreeze,
  coveragePackages: readonly Record<string, unknown>[],
): readonly ResearchMethodologyDerivabilityFamily[] {
  if (!Array.isArray(raw) || raw.length !== FROZEN_METHODOLOGY_FAMILY_COUNT) {
    fail("Research methodology derivability matrix.families must contain exactly 16 entries");
  }
  const seen = new Set<string>();
  return Object.freeze(
    raw.map((item, index) => {
      const label = `Research methodology derivability matrix.families[${index}]`;
      const value = record(item, label);
      exactKeys(
        value,
        [
          "family",
          "checkpointCount",
          "owner",
          "procedureId",
          "capabilityId",
          "sourcePointer",
        ],
        [
          "family",
          "checkpointCount",
          "owner",
          "procedureId",
          "capabilityId",
          "sourcePointer",
        ],
        label,
      );
      const family = freeze.packages[index];
      const coverage = coveragePackages[index];
      if (family === undefined || coverage === undefined) {
        fail(`${label} has no frozen family source`);
      }
      const familyId = exactString(
        value.family,
        Object.keys(FAMILY_IDENTITIES) as (keyof typeof FAMILY_IDENTITIES)[],
        `${label}.family`,
      );
      if (seen.has(familyId)) fail(`${label} duplicates family '${familyId}'`);
      seen.add(familyId);
      const owner = parseDerivabilityOwner(value.owner, `${label}.owner`);
      const checkpointCount = positiveInteger(
        value.checkpointCount,
        `${label}.checkpointCount`,
      );
      const procedureId = matchingString(
        value.procedureId,
        PROCEDURE_ID,
        `${label}.procedureId`,
      );
      const capabilityId = matchingString(
        value.capabilityId,
        CAPABILITY_ID,
        `${label}.capabilityId`,
      );
      const sourcePointer = matchingString(
        value.sourcePointer,
        /^\/packages\/(?:0|[1-9][0-9]*)$/,
        `${label}.sourcePointer`,
      );
      if (
        familyId !== family.package ||
        checkpointCount !== family.checkpoints.length ||
        procedureId !== family.intended_target.procedure ||
        capabilityId !== family.intended_target.capability ||
        sourcePointer !== `/packages/${index}` ||
        coverage.package !== familyId ||
        coverage.procedure !== procedureId ||
        coverage.capability !== capabilityId ||
        firstDifference(family.implementationOwner, owner, `${label}.owner`) !== undefined
      ) {
        fail(`${label} is inconsistent with the frozen family/package identity`);
      }
      return Object.freeze({
        family: familyId,
        checkpointCount,
        owner,
        procedureId,
        capabilityId,
        sourcePointer,
      });
    }),
  );
}

function parsePlanned203Destinations(
  raw: unknown,
  label: string,
  family: ResearchMethodologyDerivabilityFamily,
  identity: string,
  rowIndex: number,
): ResearchMethodologyPlanned203Destinations {
  const value = record(raw, label);
  exactKeys(
    value,
    ["existenceClaim", "owner", "package", "runtime", "harness", "candidate", "assurance"],
    ["existenceClaim", "owner", "package", "runtime", "harness", "candidate", "assurance"],
    label,
  );
  if (value.existenceClaim !== "planned-not-produced-by-r0") {
    fail(`${label}.existenceClaim has an unknown value`);
  }

  const ownerValue = record(value.owner, `${label}.owner`);
  exactKeys(
    ownerValue,
    ["child", "task", "taskEvidencePrefix"],
    ["child", "task", "taskEvidencePrefix"],
    `${label}.owner`,
  );
  const owner = parseDerivabilityOwner(
    { child: ownerValue.child, task: ownerValue.task },
    `${label}.owner`,
  );
  const taskEvidencePrefix = safeRelativePrefix(
    ownerValue.taskEvidencePrefix,
    `${label}.owner.taskEvidencePrefix`,
  );
  if (
    firstDifference(family.owner, owner, `${label}.owner`) !== undefined ||
    taskEvidencePrefix !==
      `.trellis/tasks/${family.owner.task}/research/remediation-2.0.3/`
  ) {
    fail(`${label}.owner is inconsistent with the frozen family owner`);
  }

  const packageValue = record(value.package, `${label}.package`);
  exactKeys(
    packageValue,
    ["procedureId", "pathPrefix"],
    ["procedureId", "pathPrefix"],
    `${label}.package`,
  );
  const packageProcedureId = matchingString(
    packageValue.procedureId,
    PROCEDURE_ID,
    `${label}.package.procedureId`,
  );
  const packagePathPrefix = safeRelativePrefix(
    packageValue.pathPrefix,
    `${label}.package.pathPrefix`,
  );
  if (
    packageProcedureId !== family.procedureId ||
    packagePathPrefix !==
      `packages/cli/src/templates/research/procedures/${family.procedureId}/2.0.3/`
  ) {
    fail(`${label}.package is inconsistent with the frozen Procedure identity`);
  }

  const runtimeValue = record(value.runtime, `${label}.runtime`);
  exactKeys(
    runtimeValue,
    ["path", "trustedRootOnlyValidation"],
    ["path", "trustedRootOnlyValidation"],
    `${label}.runtime`,
  );
  const runtimePath = safeRelativePath(runtimeValue.path, `${label}.runtime.path`);
  exactBoolean(
    runtimeValue.trustedRootOnlyValidation,
    true,
    `${label}.runtime.trustedRootOnlyValidation`,
  );
  if (runtimePath !== FAMILY_RUNTIME_PATHS[family.family]) {
    fail(`${label}.runtime.path is inconsistent with the frozen family runtime`);
  }

  const harnessValue = record(value.harness, `${label}.harness`);
  exactKeys(
    harnessValue,
    ["semanticFixture", "perCheckpointEvidence", "frozenIdentityKey"],
    ["semanticFixture", "perCheckpointEvidence", "frozenIdentityKey"],
    `${label}.harness`,
  );
  const semanticFixture = safeRelativePath(
    harnessValue.semanticFixture,
    `${label}.harness.semanticFixture`,
  );
  const perCheckpointEvidence = safeRelativePath(
    harnessValue.perCheckpointEvidence,
    `${label}.harness.perCheckpointEvidence`,
  );
  const rowNumber = String(rowIndex).padStart(3, "0");
  if (
    harnessValue.frozenIdentityKey !== identity ||
    semanticFixture !==
      `packages/cli/test/fixtures/research-methodology-2.0.3/${family.family}/${rowNumber}.json` ||
    perCheckpointEvidence !==
      `${FROZEN_METHODOLOGY_CHECKPOINT_EVIDENCE_PREFIX}${rowNumber}.json`
  ) {
    fail(`${label}.harness is inconsistent with the frozen checkpoint identity`);
  }

  const candidateValue = record(value.candidate, `${label}.candidate`);
  exactKeys(
    candidateValue,
    ["path", "bindingSelector"],
    ["path", "bindingSelector"],
    `${label}.candidate`,
  );
  const candidatePath = safeRelativePath(
    candidateValue.path,
    `${label}.candidate.path`,
  );
  const selector = record(
    candidateValue.bindingSelector,
    `${label}.candidate.bindingSelector`,
  );
  exactKeys(
    selector,
    ["capabilityId", "procedureId", "procedureVersion"],
    ["capabilityId", "procedureId", "procedureVersion"],
    `${label}.candidate.bindingSelector`,
  );
  if (
    candidatePath !== FROZEN_METHODOLOGY_CANDIDATE_MANIFEST_PATH ||
    selector.capabilityId !== family.capabilityId ||
    selector.procedureId !== family.procedureId ||
    selector.procedureVersion !== HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION
  ) {
    fail(`${label}.candidate is inconsistent with the frozen candidate binding`);
  }

  const assuranceValue = record(value.assurance, `${label}.assurance`);
  exactKeys(
    assuranceValue,
    ["path", "expectedCoverageKey"],
    ["path", "expectedCoverageKey"],
    `${label}.assurance`,
  );
  const assurancePath = safeRelativePath(
    assuranceValue.path,
    `${label}.assurance.path`,
  );
  if (
    assurancePath !== FROZEN_METHODOLOGY_ASSURANCE_PATH ||
    assuranceValue.expectedCoverageKey !== identity
  ) {
    fail(`${label}.assurance is inconsistent with the frozen checkpoint identity`);
  }

  return Object.freeze({
    existenceClaim: "planned-not-produced-by-r0" as const,
    owner: Object.freeze({ ...owner, taskEvidencePrefix }),
    package: Object.freeze({
      procedureId: packageProcedureId,
      pathPrefix: packagePathPrefix,
    }),
    runtime: Object.freeze({
      path: runtimePath,
      trustedRootOnlyValidation: true as const,
    }),
    harness: Object.freeze({
      semanticFixture,
      perCheckpointEvidence,
      frozenIdentityKey: identity,
    }),
    candidate: Object.freeze({
      path: candidatePath,
      bindingSelector: Object.freeze({
        capabilityId: family.capabilityId,
        procedureId: family.procedureId,
        procedureVersion: HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION,
      }),
    }),
    assurance: Object.freeze({
      path: assurancePath,
      expectedCoverageKey: identity,
    }),
  });
}

function parseDerivabilityRows(
  raw: unknown,
  rawFreeze: Record<string, unknown>,
  freeze: ResearchMethodologyFreeze,
  families: readonly ResearchMethodologyDerivabilityFamily[],
): readonly ResearchMethodologyDerivabilityRow[] {
  if (!Array.isArray(raw) || raw.length !== FROZEN_METHODOLOGY_CHECKPOINT_COUNT) {
    fail("Research methodology derivability matrix.rows must contain exactly 104 entries");
  }
  const rawPackages = rawFreeze.packages;
  if (!Array.isArray(rawPackages)) {
    fail("Research methodology freeze raw packages are unavailable");
  }
  const expectedRows = freeze.packages.flatMap((family, familyIndex) =>
    family.checkpoints.map((checkpoint, checkpointIndex) => ({
      family,
      familyIndex,
      checkpoint,
      checkpointIndex,
    })),
  );
  const seen = new Set<string>();
  return Object.freeze(
    raw.map((item, rowIndex) => {
      const label = `Research methodology derivability matrix.rows[${rowIndex}]`;
      const value = record(item, label);
      exactKeys(
        value,
        [
          "matrixId",
          "family",
          "checkpointId",
          "checkpointKind",
          "artifactIdentity",
          "contractStatus",
          "sourceCheckpointSha256",
          "sourceLocations",
          "planned203Destinations",
        ],
        [
          "matrixId",
          "family",
          "checkpointId",
          "checkpointKind",
          "artifactIdentity",
          "contractStatus",
          "sourceCheckpointSha256",
          "sourceLocations",
          "planned203Destinations",
        ],
        label,
      );
      const expected = expectedRows[rowIndex];
      if (expected === undefined) fail(`${label} has no frozen checkpoint source`);
      const familySummary = families[expected.familyIndex];
      const rawFamily = rawPackages[expected.familyIndex];
      if (familySummary === undefined || rawFamily === undefined) {
        fail(`${label} has no frozen family summary`);
      }
      const rawFamilyValue = record(rawFamily, `${label} frozen family`);
      const rawCheckpoints = rawFamilyValue.checkpoints;
      if (!Array.isArray(rawCheckpoints)) {
        fail(`${label} frozen family checkpoints are unavailable`);
      }
      const rawCheckpoint = rawCheckpoints[expected.checkpointIndex];
      if (rawCheckpoint === undefined) {
        fail(`${label} frozen checkpoint source is unavailable`);
      }
      const identity = `${expected.family.package}::${expected.checkpoint.id}`;
      if (seen.has(identity)) fail(`${label} duplicates matrixId '${identity}'`);
      seen.add(identity);
      const artifactIdentity =
        expected.checkpoint.kind === "artifact_lifecycle_checkpoint"
          ? expected.checkpoint.artifact
          : null;
      const checkpointDigest = sha256Hex(JSON.stringify(rawCheckpoint));
      if (
        value.matrixId !== identity ||
        value.family !== expected.family.package ||
        value.checkpointId !== expected.checkpoint.id ||
        value.checkpointKind !== expected.checkpoint.kind ||
        value.artifactIdentity !== artifactIdentity ||
        value.contractStatus !== expected.checkpoint.contract_status ||
        value.sourceCheckpointSha256 !== checkpointDigest
      ) {
        fail(`${label} is inconsistent with the frozen checkpoint contract`);
      }
      const familyPointer = `/packages/${expected.familyIndex}`;
      const checkpointPointer = `${familyPointer}/checkpoints/${expected.checkpointIndex}`;
      const sourceLocations = parseExpectedSourceLocations(
        value.sourceLocations,
        `${label}.sourceLocations`,
        [
          Object.freeze({
            file: FROZEN_METHODOLOGY_FREEZE_PATH,
            pointer: familyPointer,
            role: "frozen-family-contract" as const,
          }),
          Object.freeze({
            file: FROZEN_METHODOLOGY_FREEZE_PATH,
            pointer: checkpointPointer,
            role: "frozen-checkpoint-contract" as const,
          }),
          Object.freeze({
            file: FROZEN_METHODOLOGY_COVERAGE_MAP_PATH,
            pointer: familyPointer,
            role: "frozen-owner-procedure-capability-map" as const,
          }),
        ],
      );
      return Object.freeze({
        matrixId: identity,
        family: expected.family.package,
        checkpointId: expected.checkpoint.id,
        checkpointKind: expected.checkpoint.kind,
        artifactIdentity,
        contractStatus: expected.checkpoint.contract_status,
        sourceCheckpointSha256: checkpointDigest,
        sourceLocations,
        planned203Destinations: parsePlanned203Destinations(
          value.planned203Destinations,
          `${label}.planned203Destinations`,
          familySummary,
          identity,
          rowIndex,
        ),
      });
    }),
  );
}

function parseDerivabilityCompleteness(
  raw: unknown,
): ResearchMethodologyDerivabilityMatrix["completeness"] {
  const label = "Research methodology derivability matrix.completeness";
  const value = record(raw, label);
  exactKeys(
    value,
    [
      "expectedFamilies",
      "actualFamilies",
      "uniqueFamilies",
      "expectedCheckpoints",
      "actualCheckpoints",
      "uniqueFamilyCheckpointPairs",
      "checkpointKinds",
      "packageCoverageBijection",
      "allSourceLocationsResolved",
      "resolvedSourceLocationCount",
      "compatibilityExtensionsExcludedFromTotals",
    ],
    [
      "expectedFamilies",
      "actualFamilies",
      "uniqueFamilies",
      "expectedCheckpoints",
      "actualCheckpoints",
      "uniqueFamilyCheckpointPairs",
      "checkpointKinds",
      "packageCoverageBijection",
      "allSourceLocationsResolved",
      "resolvedSourceLocationCount",
      "compatibilityExtensionsExcludedFromTotals",
    ],
    label,
  );
  const checkpointKinds = record(value.checkpointKinds, `${label}.checkpointKinds`);
  exactKeys(
    checkpointKinds,
    ["artifact_lifecycle_checkpoint", "ordered_stage"],
    ["artifact_lifecycle_checkpoint", "ordered_stage"],
    `${label}.checkpointKinds`,
  );
  if (
    value.expectedFamilies !== FROZEN_METHODOLOGY_FAMILY_COUNT ||
    value.actualFamilies !== FROZEN_METHODOLOGY_FAMILY_COUNT ||
    value.uniqueFamilies !== FROZEN_METHODOLOGY_FAMILY_COUNT ||
    value.expectedCheckpoints !== FROZEN_METHODOLOGY_CHECKPOINT_COUNT ||
    value.actualCheckpoints !== FROZEN_METHODOLOGY_CHECKPOINT_COUNT ||
    value.uniqueFamilyCheckpointPairs !== FROZEN_METHODOLOGY_CHECKPOINT_COUNT ||
    checkpointKinds.artifact_lifecycle_checkpoint !==
      FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT ||
    checkpointKinds.ordered_stage !== FROZEN_ORDERED_STAGE_COUNT ||
    value.packageCoverageBijection !== true ||
    value.allSourceLocationsResolved !== true ||
    value.resolvedSourceLocationCount !== 314 ||
    value.compatibilityExtensionsExcludedFromTotals !== 1
  ) {
    fail(`${label} does not match the frozen 16/104/54/50 completeness proof`);
  }
  return Object.freeze({
    expectedFamilies: FROZEN_METHODOLOGY_FAMILY_COUNT,
    actualFamilies: FROZEN_METHODOLOGY_FAMILY_COUNT,
    uniqueFamilies: FROZEN_METHODOLOGY_FAMILY_COUNT,
    expectedCheckpoints: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
    actualCheckpoints: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
    uniqueFamilyCheckpointPairs: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
    checkpointKinds: Object.freeze({
      artifact_lifecycle_checkpoint:
        FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
      ordered_stage: FROZEN_ORDERED_STAGE_COUNT,
    }),
    packageCoverageBijection: true as const,
    allSourceLocationsResolved: true as const,
    resolvedSourceLocationCount: 314 as const,
    compatibilityExtensionsExcludedFromTotals: 1 as const,
  });
}

function parseCompatibilityRoutingExtensions(
  raw: unknown,
  freeze: ResearchMethodologyFreeze,
  families: readonly ResearchMethodologyDerivabilityFamily[],
): readonly ResearchMethodologyCompatibilityRoutingExtension[] {
  const label =
    "Research methodology derivability matrix.compatibilityRoutingExtensions";
  if (!Array.isArray(raw) || raw.length !== 1) {
    fail(`${label} must contain exactly the literature-scan-v1 extension`);
  }
  const value = record(raw[0], `${label}[0]`);
  exactKeys(
    value,
    [
      "extensionId",
      "includedInFrozenFamilyCount",
      "includedInFrozenCheckpointCount",
      "procedureId",
      "capabilityId",
      "routeDisposition",
      "owner",
      "sourceLocations",
      "planned203Destinations",
    ],
    [
      "extensionId",
      "includedInFrozenFamilyCount",
      "includedInFrozenCheckpointCount",
      "procedureId",
      "capabilityId",
      "routeDisposition",
      "owner",
      "sourceLocations",
      "planned203Destinations",
    ],
    `${label}[0]`,
  );
  const literatureFamilyIndex = freeze.packages.findIndex(
    (family) => family.package === "research-literature",
  );
  const literatureFamily = families[literatureFamilyIndex];
  if (literatureFamily === undefined || literatureFamilyIndex < 0) {
    fail(`${label}[0] has no frozen literature family owner`);
  }
  const owner = parseDerivabilityOwner(value.owner, `${label}[0].owner`);
  if (
    value.extensionId !== "literature-scan-v1-compatibility-routing" ||
    value.includedInFrozenFamilyCount !== false ||
    value.includedInFrozenCheckpointCount !== false ||
    value.procedureId !== "literature-scan-v1" ||
    value.capabilityId !== "research.literature.scan" ||
    value.routeDisposition !== "frozen-non-default" ||
    !freeze.literatureRoute.nonDefault.includes("research.literature.scan") ||
    firstDifference(literatureFamily.owner, owner, `${label}[0].owner`) !== undefined
  ) {
    fail(`${label}[0] is inconsistent with the frozen literature route`);
  }
  const sourceLocations = parseExpectedSourceLocations(
    value.sourceLocations,
    `${label}[0].sourceLocations`,
    [
      Object.freeze({
        file: FROZEN_METHODOLOGY_FREEZE_PATH,
        pointer: "/literatureRoute/nonDefault/0",
        role: "frozen-route-disposition" as const,
      }),
      Object.freeze({
        file: FROZEN_METHODOLOGY_COVERAGE_MAP_PATH,
        pointer: `/packages/${literatureFamilyIndex}`,
        role: "related-literature-family-owner-only" as const,
      }),
    ],
  );
  const planned = record(
    value.planned203Destinations,
    `${label}[0].planned203Destinations`,
  );
  exactKeys(
    planned,
    [
      "existenceClaim",
      "packagePrefix",
      "runtime",
      "harnessFixture",
      "candidateManifest",
      "assuranceAudit",
    ],
    [
      "existenceClaim",
      "packagePrefix",
      "runtime",
      "harnessFixture",
      "candidateManifest",
      "assuranceAudit",
    ],
    `${label}[0].planned203Destinations`,
  );
  const packagePrefix = safeRelativePrefix(
    planned.packagePrefix,
    `${label}[0].planned203Destinations.packagePrefix`,
  );
  const runtime = safeRelativePath(
    planned.runtime,
    `${label}[0].planned203Destinations.runtime`,
  );
  const harnessFixture = safeRelativePath(
    planned.harnessFixture,
    `${label}[0].planned203Destinations.harnessFixture`,
  );
  const candidateManifest = safeRelativePath(
    planned.candidateManifest,
    `${label}[0].planned203Destinations.candidateManifest`,
  );
  const assuranceAudit = safeRelativePath(
    planned.assuranceAudit,
    `${label}[0].planned203Destinations.assuranceAudit`,
  );
  if (
    planned.existenceClaim !== "planned-not-produced-by-r0" ||
    packagePrefix !==
      "packages/cli/src/templates/research/procedures/literature-scan-v1/2.0.3/" ||
    runtime !==
      "packages/core/src/research/methodology/literature-survey-validators.ts" ||
    harnessFixture !==
      "packages/cli/test/fixtures/research-methodology-2.0.3/compatibility/literature-scan-routing.json" ||
    candidateManifest !== FROZEN_METHODOLOGY_CANDIDATE_MANIFEST_PATH ||
    assuranceAudit !== FROZEN_METHODOLOGY_ASSURANCE_PATH
  ) {
    fail(`${label}[0].planned203Destinations is inconsistent with the frozen route`);
  }
  return Object.freeze([
    Object.freeze({
      extensionId: "literature-scan-v1-compatibility-routing" as const,
      includedInFrozenFamilyCount: false as const,
      includedInFrozenCheckpointCount: false as const,
      procedureId: "literature-scan-v1" as const,
      capabilityId: "research.literature.scan" as const,
      routeDisposition: "frozen-non-default" as const,
      owner,
      sourceLocations,
      planned203Destinations: Object.freeze({
        existenceClaim: "planned-not-produced-by-r0" as const,
        packagePrefix,
        runtime,
        harnessFixture,
        candidateManifest,
        assuranceAudit,
      }),
    }),
  ]);
}

export function parseResearchMethodologyDerivabilityMatrix(
  input: ResearchMethodologyDerivabilityMatrixInput,
): ResearchMethodologyDerivabilityMatrix {
  const freeze = parseResearchMethodologyFreeze(input.freezeBytes);
  const rawFreeze = record(
    parseJson(input.freezeBytes, "Research methodology freeze source"),
    "Research methodology freeze source",
  );
  const coveragePackages = parseCoveragePackages(input.coverageMapBytes, freeze);
  const value = record(
    parseJson(input.matrixBytes, "Research methodology derivability matrix"),
    "Research methodology derivability matrix",
  );
  exactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "methodologyContract",
      "methodologyDigest",
      "infrastructureBase",
      "repairVersion",
      "sourceFiles",
      "completeness",
      "families",
      "rows",
      "compatibilityRoutingExtensions",
      "matrixDigest",
    ],
    [
      "schemaVersion",
      "kind",
      "methodologyContract",
      "methodologyDigest",
      "infrastructureBase",
      "repairVersion",
      "sourceFiles",
      "completeness",
      "families",
      "rows",
      "compatibilityRoutingExtensions",
      "matrixDigest",
    ],
    "Research methodology derivability matrix",
  );
  if (
    value.schemaVersion !== 1 ||
    value.kind !== "phase2-r0-methodology-derivability-matrix" ||
    value.methodologyContract !== FROZEN_METHODOLOGY_CONTRACT_VERSION ||
    value.methodologyDigest !== freeze.methodologyDigest ||
    value.infrastructureBase !== freeze.infraPin ||
    value.repairVersion !== HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION ||
    value.matrixDigest !== FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST
  ) {
    fail("Research methodology derivability matrix identity is invalid");
  }
  const sourceFiles = parseDerivabilitySourceFiles(value.sourceFiles, input);
  const completeness = parseDerivabilityCompleteness(value.completeness);
  const families = parseDerivabilityFamilies(
    value.families,
    freeze,
    coveragePackages,
  );
  const rows = parseDerivabilityRows(value.rows, rawFreeze, freeze, families);
  const compatibilityRoutingExtensions = parseCompatibilityRoutingExtensions(
    value.compatibilityRoutingExtensions,
    freeze,
    families,
  );
  const resolvedSourceLocationCount =
    rows.reduce((count, row) => count + row.sourceLocations.length, 0) +
    compatibilityRoutingExtensions.reduce(
      (count, extension) => count + extension.sourceLocations.length,
      0,
    );
  if (resolvedSourceLocationCount !== completeness.resolvedSourceLocationCount) {
    fail("Research methodology derivability matrix source-location count is inconsistent");
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    kind: "phase2-r0-methodology-derivability-matrix" as const,
    methodologyContract: FROZEN_METHODOLOGY_CONTRACT_VERSION,
    methodologyDigest: freeze.methodologyDigest,
    infrastructureBase: freeze.infraPin,
    repairVersion: HISTORICAL_PHASE2_REPAIR_PROCEDURE_VERSION,
    sourceFiles,
    completeness,
    families,
    rows,
    compatibilityRoutingExtensions,
    matrixDigest: FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST,
  });
}

export function verifyResearchMethodologyDerivabilityMatrixConformance(input: {
  readonly frozenMatrixBytes: Uint8Array;
  readonly candidateMatrixBytes: Uint8Array;
  readonly freezeBytes: Uint8Array;
  readonly coverageMapBytes: Uint8Array;
}): ResearchMethodologyDerivabilityMatrixConformance {
  const shared = {
    freezeBytes: input.freezeBytes,
    coverageMapBytes: input.coverageMapBytes,
  };
  const frozen = parseResearchMethodologyDerivabilityMatrix({
    ...shared,
    matrixBytes: input.frozenMatrixBytes,
  });
  const candidate = parseResearchMethodologyDerivabilityMatrix({
    ...shared,
    matrixBytes: input.candidateMatrixBytes,
  });
  const difference = firstDifference(frozen, candidate, "$matrix");
  if (difference !== undefined) {
    fail(`Research methodology derivability matrix conformance failed: ${difference}`);
  }
  return Object.freeze({
    familyCount: FROZEN_METHODOLOGY_FAMILY_COUNT,
    checkpointCount: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
    orderedStageCount: FROZEN_ORDERED_STAGE_COUNT,
    artifactLifecycleCheckpointCount:
      FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
    compatibilityRoutingExtensionCount: 1 as const,
    resolvedSourceLocationCount: 314 as const,
  });
}

export function loadResearchMethodologyContractFromProcedure(
  procedure: ParsedResearchProcedure,
): ResearchMethodologyFamilyContract {
  if (procedure.manifest.version === HISTORICAL_UNACCEPTED_PROCEDURE_VERSION) {
    fail(
      "Procedure 2.0.3 is historical-unaccepted development evidence and is not available as methodology authority",
    );
  }
  if (
    procedure.packageSchemaVersion !== 2 ||
    procedure.manifest.version !== LOSSLESS_METHODOLOGY_PROCEDURE_VERSION ||
    procedure.supportPack === undefined
  ) {
    fail(
      `Procedure ${LOSSLESS_METHODOLOGY_PROCEDURE_VERSION} methodology contracts require package schema v2 and an accepted binding`,
    );
  }
  // Accepted 2.0.4 only after OA3 sets V13_ACCEPTED_* (currently none).
  if (
    V13_ACCEPTED_CONTRACT_VERSION === null ||
    V13_ACCEPTED_CONTRACT_DIGEST === null ||
    procedure.supportPack.manifest.methodologyContractVersion !==
      V13_ACCEPTED_CONTRACT_VERSION ||
    procedure.supportPack.manifest.methodologyContractDigest !==
      V13_ACCEPTED_CONTRACT_DIGEST
  ) {
    fail(
      "Procedure support pack methodology identity is not an accepted evaluation-contract-v1.3.0 binding",
    );
  }
  const candidates = procedure.supportPack.inventoryItems.filter(
    (item) =>
      item.path === "artifacts/artifact-contract.json" &&
      item.role === "artifacts" &&
      item.mediaType === "application/json",
  );
  if (candidates.length !== 1) {
    fail("Procedure 2.0.3 must contain exactly one artifacts/artifact-contract.json entry");
  }
  const candidate = candidates[0];
  if (candidate === undefined) {
    fail("Procedure 2.0.3 methodology contract entry is unavailable");
  }
  if (candidate.workerVisibility !== "root-only") {
    fail(
      "Procedure 2.0.3 methodology family contract must be root-only; Context exposes only its safe declarative projection",
    );
  }
  if (
    candidate.contractVersion !== FROZEN_METHODOLOGY_CONTRACT_VERSION &&
    candidate.contractVersion !== V13_ACCEPTED_CONTRACT_VERSION
  ) {
    fail("Procedure methodology family contract entry has an unauthorized contractVersion");
  }
  const contract = parseResearchMethodologyFamilyContract(candidate.bytes);
  if (
    contract.intended_target.procedure !== procedure.manifest.id ||
    contract.intended_target.capability !== procedure.capability.id
  ) {
    fail("Procedure methodology family identity does not match the resolved Procedure");
  }
  return contract;
}
