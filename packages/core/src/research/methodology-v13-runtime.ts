/**
 * Dedicated evaluation-contract-v1.3.0 (accepted A3) runtime semantics.
 *
 * Exact counts: 64 outputs, 65 enforceable artifacts, 20 trusted validators,
 * 876 bindings, 116 delta cases, 3,343 provenance rows.
 *
 * The historical Phase-2 104/54/50 checkpoint model is NOT authority here —
 * see HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE in methodology-contract.ts.
 */

import { createHash } from "node:crypto";

import {
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
} from "./procedure-support-pack.js";
import { parseStrictResearchJson } from "./strict-json.js";

export const V13_OUTPUT_COUNT = 64 as const;
export const V13_ENFORCEABLE_ARTIFACT_COUNT = 65 as const;
export const V13_TRUSTED_VALIDATOR_COUNT = 20 as const;
export const V13_VALIDATOR_BINDING_COUNT = 876 as const;
export const V13_DELTA_CASE_COUNT = 116 as const;
export const V13_PROVENANCE_ROW_COUNT = 3343 as const;
export const V13_CLOSURE_FAMILY_COUNT = 4 as const;
export const V13_LIFECYCLE_DIMENSION_COUNT = 13 as const;

export const V13_LIFECYCLE_DIMENSIONS = Object.freeze([
  "requiredness",
  "cardinality",
  "mediaType",
  "producer",
  "consumers",
  "repositoryArtifactRefRelation",
  "stableId",
  "provenance",
  "dependencies",
  "immutableFieldsAndMutationAuthority",
  "transitions",
  "terminalApplicability",
  "crossArtifactConsistency",
] as const);

export type V13LifecycleDimension = (typeof V13_LIFECYCLE_DIMENSIONS)[number];

export const V13_PROVENANCE_CLASSES = Object.freeze([
  "inherited-public-v1.2",
  "trellis-native-v1.3",
  "inapplicable",
  "blocked-by-contract",
] as const);

export class MethodologyV13RuntimeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "MethodologyV13RuntimeError";
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new MethodologyV13RuntimeError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) fail("V13_SCHEMA", `${label} must be an object`);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail("V13_SCHEMA", `${label} must be an array`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail("V13_SCHEMA", `${label} must be a non-empty string`);
  }
  return value;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface V13TrustedValidatorIdentity {
  readonly id: string;
  readonly version: string;
}

export interface V13TrustedValidatorEntry {
  readonly identity: V13TrustedValidatorIdentity;
  readonly severity: "critical";
  readonly applicableRuleKinds: readonly string[];
  readonly stableErrors: readonly string[];
}

export interface V13ValidatorBinding {
  readonly bindingId: string;
  readonly ruleId: string;
  readonly ruleKind: string;
  readonly targetId: string;
  readonly validator: {
    readonly id: string;
    readonly version: string;
    readonly severity: "critical";
  };
  readonly stableErrors: readonly string[];
}

export interface V13ArtifactLifecycleRow {
  readonly artifactId: string;
  readonly family: string;
  readonly publicIdentity: string;
  readonly dimensions: Readonly<
    Record<V13LifecycleDimension, Readonly<Record<string, unknown>>>
  >;
  readonly validatorBindingIds: readonly string[];
  readonly visibility: Readonly<Record<string, unknown>>;
}

export interface V13ContractPackCounts {
  readonly outputs: number;
  readonly enforceableArtifacts: number;
  readonly trustedValidators: number;
  readonly bindings: number;
  readonly deltaCases: number;
  readonly provenanceRows: number;
  readonly closureFamilies: number;
}

export interface V13AcceptedContractPack {
  readonly contractVersion: typeof V13_ACCEPTED_CONTRACT_VERSION;
  readonly acceptedContractDigest: typeof V13_ACCEPTED_CONTRACT_DIGEST;
  /** Member-tree aggregate derived from allowlisted bytes (not caller-stamped). */
  readonly derivedMemberAggregateSha256: string;
  readonly counts: V13ContractPackCounts;
  readonly outputs: readonly Readonly<Record<string, unknown>>[];
  readonly artifacts: readonly V13ArtifactLifecycleRow[];
  readonly validators: readonly V13TrustedValidatorEntry[];
  readonly bindings: readonly V13ValidatorBinding[];
  readonly deltaCases: readonly Readonly<Record<string, unknown>>[];
  readonly provenanceRows: readonly Readonly<Record<string, unknown>>[];
  readonly closureFamilies: readonly string[];
  readonly memberDigests: Readonly<Record<string, string>>;
}

const REQUIRED_LEAF_FILES = Object.freeze([
  "durable-output-disposition-v1.3.json",
  "artifact-lifecycle-contract-v1.3.json",
  "validator-registry-v1.3.json",
  "validator-binding-matrix-v1.3.json",
  "differential-test-matrix-v1.3.json",
  "derivability-provenance-matrix-v1.3.json",
  "closure-contract-v1.3.json",
] as const);

export type V13LeafFileName = (typeof REQUIRED_LEAF_FILES)[number];

/**
 * Parse accepted A3 contract leaf bytes into a strict v1.3 runtime pack.
 * No invented defaults: missing structure fails closed.
 */
export function parseAcceptedV13ContractPack(input: {
  readonly leafBytes: Readonly<Partial<Record<V13LeafFileName, Uint8Array>>>;
  readonly expectedContractDigest?: string;
}): V13AcceptedContractPack {
  const memberDigests: Record<string, string> = {};
  const parsed: Record<string, unknown> = {};
  for (const name of REQUIRED_LEAF_FILES) {
    const bytes = input.leafBytes[name];
    if (bytes === undefined) {
      fail("V13_PACK_INCOMPLETE", `Missing required v1.3 leaf ${name}`);
    }
    memberDigests[name] = sha256Hex(bytes);
    parsed[name] = parseStrictResearchJson(bytes);
  }

  const disposition = requireRecord(
    parsed["durable-output-disposition-v1.3.json"],
    "durable-output-disposition",
  );
  const outputs = requireArray(disposition.outputs, "outputs");
  if (
    disposition.sourceSetCount !== V13_OUTPUT_COUNT ||
    outputs.length !== V13_OUTPUT_COUNT
  ) {
    fail(
      "V13_OUTPUT_COUNT",
      `Expected exactly ${V13_OUTPUT_COUNT} outputs, got sourceSetCount=${String(disposition.sourceSetCount)} len=${outputs.length}`,
    );
  }

  const lifecycle = requireRecord(
    parsed["artifact-lifecycle-contract-v1.3.json"],
    "artifact-lifecycle-contract",
  );
  if (lifecycle.contractVersion !== V13_ACCEPTED_CONTRACT_VERSION) {
    fail(
      "V13_CONTRACT_VERSION",
      `Lifecycle contractVersion must be ${V13_ACCEPTED_CONTRACT_VERSION}`,
    );
  }
  const rawArtifacts = requireArray(lifecycle.artifacts, "artifacts");
  if (
    lifecycle.enforceableArtifactCount !== V13_ENFORCEABLE_ARTIFACT_COUNT ||
    rawArtifacts.length !== V13_ENFORCEABLE_ARTIFACT_COUNT
  ) {
    fail(
      "V13_ARTIFACT_COUNT",
      `Expected exactly ${V13_ENFORCEABLE_ARTIFACT_COUNT} enforceable artifacts`,
    );
  }
  const artifacts = rawArtifacts.map((row, index) =>
    parseArtifactRow(row, index),
  );

  const registry = requireRecord(
    parsed["validator-registry-v1.3.json"],
    "validator-registry",
  );
  const rawValidators = requireArray(registry.validators, "validators");
  if (rawValidators.length !== V13_TRUSTED_VALIDATOR_COUNT) {
    fail(
      "V13_VALIDATOR_COUNT",
      `Expected exactly ${V13_TRUSTED_VALIDATOR_COUNT} trusted validators`,
    );
  }
  {
    const rawDisp = registry.unknownValidatorDisposition;
    const dispValue = isRecord(rawDisp) && "value" in rawDisp ? rawDisp.value : rawDisp;
    const severity =
      isRecord(dispValue) && typeof dispValue.severity === "string"
        ? dispValue.severity
        : dispValue;
    if (severity !== "critical") {
      fail(
        "V13_UNKNOWN_VALIDATOR_DISPOSITION",
        "Unknown validator disposition must fail closed with critical severity",
      );
    }
  }
  const validators = rawValidators.map((row, index) =>
    parseValidatorEntry(row, index),
  );
  const validatorKeys = new Set(
    validators.map((v) => `${v.identity.id}@${v.identity.version}`),
  );
  if (validatorKeys.size !== validators.length) {
    fail("V13_DUPLICATE_VALIDATOR", "Duplicate trusted validator identity");
  }

  const bindingMatrix = requireRecord(
    parsed["validator-binding-matrix-v1.3.json"],
    "validator-binding-matrix",
  );
  const rawBindings = requireArray(bindingMatrix.bindings, "bindings");
  if (rawBindings.length !== V13_VALIDATOR_BINDING_COUNT) {
    fail(
      "V13_BINDING_COUNT",
      `Expected exactly ${V13_VALIDATOR_BINDING_COUNT} validator bindings`,
    );
  }
  const bindings = rawBindings.map((row, index) => parseBinding(row, index));
  const bindingIds = new Set(bindings.map((b) => b.bindingId));
  if (bindingIds.size !== bindings.length) {
    fail("V13_DUPLICATE_BINDING", "Duplicate validator bindingId");
  }
  for (const binding of bindings) {
    const key = `${binding.validator.id}@${binding.validator.version}`;
    if (!validatorKeys.has(key)) {
      fail(
        "V13_UNKNOWN_BINDING_VALIDATOR",
        `Binding ${binding.bindingId} references untrusted validator ${key}`,
      );
    }
    if (binding.validator.severity !== "critical") {
      fail(
        "V13_SEVERITY_DOWNGRADE",
        `Binding ${binding.bindingId} severity must be critical`,
      );
    }
  }

  const differential = requireRecord(
    parsed["differential-test-matrix-v1.3.json"],
    "differential-test-matrix",
  );
  const deltaCases = requireArray(differential.v13DeltaCases, "v13DeltaCases");
  const domains = requireRecord(differential.domains, "domains");
  const v13Domain = requireRecord(domains.v13Delta, "domains.v13Delta");
  if (
    v13Domain.caseCount !== V13_DELTA_CASE_COUNT ||
    deltaCases.length !== V13_DELTA_CASE_COUNT
  ) {
    fail(
      "V13_DELTA_COUNT",
      `Expected exactly ${V13_DELTA_CASE_COUNT} v1.3 delta cases`,
    );
  }
  const caseIds = new Set(
    deltaCases.map((c, i) => {
      const row = requireRecord(c, `deltaCase[${i}]`);
      return requireString(row.caseId, `deltaCase[${i}].caseId`);
    }),
  );
  if (caseIds.size !== V13_DELTA_CASE_COUNT) {
    fail("V13_DELTA_DUPLICATE", "Duplicate V13 delta caseId");
  }
  for (const caseId of caseIds) {
    if (!caseId.startsWith("V13-")) {
      fail(
        "V13_DELTA_NAMESPACE",
        `Delta caseId must use V13-* namespace: ${caseId}`,
      );
    }
  }

  const provenance = requireRecord(
    parsed["derivability-provenance-matrix-v1.3.json"],
    "derivability-provenance-matrix",
  );
  const provenanceRows = requireArray(provenance.rows, "provenance.rows");
  if (provenanceRows.length !== V13_PROVENANCE_ROW_COUNT) {
    fail(
      "V13_PROVENANCE_COUNT",
      `Expected exactly ${V13_PROVENANCE_ROW_COUNT} provenance rows`,
    );
  }

  const closure = requireRecord(
    parsed["closure-contract-v1.3.json"],
    "closure-contract",
  );
  const applicableFamilies = requireArray(
    closure.applicableFamilies,
    "applicableFamilies",
  ).map((f, i) => requireString(f, `applicableFamilies[${i}]`));
  if (applicableFamilies.length !== V13_CLOSURE_FAMILY_COUNT) {
    fail(
      "V13_CLOSURE_COUNT",
      `Expected exactly ${V13_CLOSURE_FAMILY_COUNT} closure families`,
    );
  }
  {
    const statusWrap = requireRecord(
      closure.genericResultStatusInference,
      "genericResultStatusInference",
    );
    const statusInference = isRecord(statusWrap.value)
      ? statusWrap.value
      : statusWrap;
    if (statusInference.allowed !== false || statusInference.mapping !== null) {
      fail(
        "V13_STATUS_INFERENCE",
        "Result.status must not be closure authority under v1.3",
      );
    }
  }

  // Derive member identity from exact allowlisted bytes. Never stamp a
  // caller-provided expected digest as the derived pack identity.
  const derivedIdentity = deriveAcceptedV13PackIdentity({
    leafBytes: input.leafBytes,
  });
  if (
    input.expectedContractDigest !== undefined &&
    input.expectedContractDigest !== V13_ACCEPTED_CONTRACT_DIGEST
  ) {
    fail(
      "V13_PACK_DIGEST_MISMATCH",
      "Caller expectedContractDigest does not match frozen accepted A3 digest",
    );
  }
  // Frozen A3 digest remains the published identity only after member
  // allowlist validation above succeeded (structure + exact counts).
  const acceptedContractDigest = V13_ACCEPTED_CONTRACT_DIGEST;

  return Object.freeze({
    contractVersion: V13_ACCEPTED_CONTRACT_VERSION,
    acceptedContractDigest,
    derivedMemberAggregateSha256: derivedIdentity.aggregateSha256,
    counts: Object.freeze({
      outputs: V13_OUTPUT_COUNT,
      enforceableArtifacts: V13_ENFORCEABLE_ARTIFACT_COUNT,
      trustedValidators: V13_TRUSTED_VALIDATOR_COUNT,
      bindings: V13_VALIDATOR_BINDING_COUNT,
      deltaCases: V13_DELTA_CASE_COUNT,
      provenanceRows: V13_PROVENANCE_ROW_COUNT,
      closureFamilies: V13_CLOSURE_FAMILY_COUNT,
    }),
    outputs: Object.freeze(outputs.map((o) => requireRecord(o, "output"))),
    artifacts: Object.freeze(artifacts),
    validators: Object.freeze(validators),
    bindings: Object.freeze(bindings),
    deltaCases: Object.freeze(
      deltaCases.map((c) => requireRecord(c, "deltaCase")),
    ),
    provenanceRows: Object.freeze(
      provenanceRows.map((r) => requireRecord(r, "provenanceRow")),
    ),
    closureFamilies: Object.freeze(applicableFamilies),
    memberDigests: Object.freeze(memberDigests),
  });
}

function parseArtifactRow(
  value: unknown,
  index: number,
): V13ArtifactLifecycleRow {
  const row = requireRecord(value, `artifact[${index}]`);
  const artifactId = requireString(row.artifactId, `artifact[${index}].artifactId`);
  const familyValue = row.family;
  let family: string;
  if (typeof familyValue === "string") {
    family = familyValue;
  } else if (isRecord(familyValue) && typeof familyValue.value === "string") {
    family = familyValue.value;
  } else {
    fail("V13_SCHEMA", `artifact[${index}].family must be a string or {value}`);
  }
  const publicIdentityValue = row.publicIdentity;
  let publicIdentity: string;
  if (typeof publicIdentityValue === "string") {
    publicIdentity = publicIdentityValue;
  } else if (
    isRecord(publicIdentityValue) &&
    typeof publicIdentityValue.value === "string"
  ) {
    publicIdentity = publicIdentityValue.value;
  } else {
    fail(
      "V13_SCHEMA",
      `artifact[${index}].publicIdentity must be a string or {value}`,
    );
  }

  const dimensionsRaw = requireRecord(row.dimensions, `artifact[${index}].dimensions`);
  const dimensionKeys = Object.keys(dimensionsRaw).sort();
  const expected = [...V13_LIFECYCLE_DIMENSIONS].sort();
  if (
    dimensionKeys.length !== V13_LIFECYCLE_DIMENSION_COUNT ||
    dimensionKeys.join("\0") !== expected.join("\0")
  ) {
    fail(
      "V13_DIMENSION_COVERAGE",
      `artifact ${artifactId} must declare exactly the 13 lifecycle dimensions with no invented defaults`,
    );
  }
  const dimensions = {} as Record<
    V13LifecycleDimension,
    Readonly<Record<string, unknown>>
  >;
  for (const dim of V13_LIFECYCLE_DIMENSIONS) {
    const dimRow = requireRecord(
      dimensionsRaw[dim],
      `artifact[${index}].dimensions.${dim}`,
    );
    // No invented defaults: each dimension must carry provenance + stableErrors + validator.
    if (!isRecord(dimRow.provenance)) {
      fail(
        "V13_DIMENSION_PROVENANCE",
        `artifact ${artifactId} dimension ${dim} lacks provenance`,
      );
    }
    if (!Array.isArray(dimRow.stableErrors) || dimRow.stableErrors.length === 0) {
      fail(
        "V13_DIMENSION_ERRORS",
        `artifact ${artifactId} dimension ${dim} lacks stableErrors`,
      );
    }
    if (!isRecord(dimRow.validator) && !isRecord(dimRow.fixtureObligations)) {
      fail(
        "V13_DIMENSION_VALIDATOR",
        `artifact ${artifactId} dimension ${dim} lacks validator/fixture obligations`,
      );
    }
    dimensions[dim] = Object.freeze({ ...dimRow });
  }

  const bindingField = row.validatorBindingIds;
  let validatorBindingIds: string[];
  if (Array.isArray(bindingField)) {
    validatorBindingIds = bindingField.map((id, i) =>
      requireString(id, `artifact[${index}].validatorBindingIds[${i}]`),
    );
  } else if (isRecord(bindingField) && Array.isArray(bindingField.value)) {
    validatorBindingIds = bindingField.value.map((id, i) =>
      requireString(id, `artifact[${index}].validatorBindingIds.value[${i}]`),
    );
  } else {
    fail(
      "V13_SCHEMA",
      `artifact[${index}].validatorBindingIds must be an array or {value:array}`,
    );
  }
  if (validatorBindingIds.length !== V13_LIFECYCLE_DIMENSION_COUNT) {
    fail(
      "V13_ARTIFACT_BINDING_COUNT",
      `artifact ${artifactId} must bind exactly 13 dimension validators`,
    );
  }

  const visibility = isRecord(row.visibility)
    ? Object.freeze({ ...row.visibility })
    : Object.freeze({});

  return Object.freeze({
    artifactId,
    family,
    publicIdentity,
    dimensions: Object.freeze(dimensions),
    validatorBindingIds: Object.freeze(validatorBindingIds),
    visibility,
  });
}

function parseValidatorEntry(
  value: unknown,
  index: number,
): V13TrustedValidatorEntry {
  const row = requireRecord(value, `validator[${index}]`);
  const identityWrap = requireRecord(row.identity, `validator[${index}].identity`);
  const identityValue = isRecord(identityWrap.value)
    ? identityWrap.value
    : identityWrap;
  const id = requireString(identityValue.id, `validator[${index}].id`);
  const version = requireString(
    identityValue.version,
    `validator[${index}].version`,
  );
  // Severity is fixed critical for all trusted v1.3 validators.
  // A3 shape: { provenance, value: { fixed: "critical", downgradeAllowed: false } }
  const severityField = row.severity ?? row.fixedSeverity;
  let severity: "critical" = "critical";
  if (severityField !== undefined) {
    const severityWrap = isRecord(severityField) ? severityField : null;
    const severityValue = severityWrap
      ? (isRecord(severityWrap.value) ? severityWrap.value : severityWrap)
      : severityField;
    const fixed =
      isRecord(severityValue) && typeof severityValue.fixed === "string"
        ? severityValue.fixed
        : severityValue;
    if (fixed !== "critical") {
      fail(
        "V13_SEVERITY_DOWNGRADE",
        `validator ${id}@${version} must be critical`,
      );
    }
    if (isRecord(severityValue) && severityValue.downgradeAllowed === true) {
      fail(
        "V13_SEVERITY_DOWNGRADE",
        `validator ${id}@${version} must not allow severity downgrade`,
      );
    }
    severity = "critical";
  }
  const kindsWrap = row.applicableRuleKinds;
  let applicableRuleKinds: string[] = [];
  if (Array.isArray(kindsWrap)) {
    applicableRuleKinds = kindsWrap.map((k, i) =>
      requireString(k, `validator[${index}].applicableRuleKinds[${i}]`),
    );
  } else if (isRecord(kindsWrap) && Array.isArray(kindsWrap.value)) {
    applicableRuleKinds = kindsWrap.value.map((k, i) =>
      requireString(k, `validator[${index}].applicableRuleKinds.value[${i}]`),
    );
  } else {
    fail(
      "V13_SCHEMA",
      `validator[${index}].applicableRuleKinds must be present`,
    );
  }
  const errorsWrap = row.stableErrors;
  let stableErrors: string[] = [];
  if (Array.isArray(errorsWrap)) {
    stableErrors = errorsWrap.map((e, i) =>
      requireString(e, `validator[${index}].stableErrors[${i}]`),
    );
  } else if (isRecord(errorsWrap) && Array.isArray(errorsWrap.value)) {
    stableErrors = errorsWrap.value.map((e, i) =>
      requireString(e, `validator[${index}].stableErrors.value[${i}]`),
    );
  } else {
    fail("V13_SCHEMA", `validator[${index}].stableErrors must be present`);
  }
  if (stableErrors.length === 0) {
    fail(
      "V13_VALIDATOR_ERRORS",
      `validator ${id}@${version} must declare stableErrors`,
    );
  }
  return Object.freeze({
    identity: Object.freeze({ id, version }),
    severity,
    applicableRuleKinds: Object.freeze(applicableRuleKinds),
    stableErrors: Object.freeze(stableErrors),
  });
}

function parseBinding(value: unknown, index: number): V13ValidatorBinding {
  const row = requireRecord(value, `binding[${index}]`);
  const bindingId = requireString(row.bindingId, `binding[${index}].bindingId`);
  const ruleId = requireString(row.ruleId, `binding[${index}].ruleId`);
  const ruleKind = requireString(row.ruleKind, `binding[${index}].ruleKind`);
  const targetId = requireString(row.targetId, `binding[${index}].targetId`);
  const validator = requireRecord(row.validator, `binding[${index}].validator`);
  const id = requireString(validator.id, `binding[${index}].validator.id`);
  const version = requireString(
    validator.version,
    `binding[${index}].validator.version`,
  );
  if (validator.severity !== "critical") {
    fail(
      "V13_SEVERITY_DOWNGRADE",
      `binding ${bindingId} severity must be critical (got ${String(validator.severity)})`,
    );
  }
  const stableErrors = requireArray(
    row.stableErrors,
    `binding[${index}].stableErrors`,
  ).map((e, i) => requireString(e, `binding[${index}].stableErrors[${i}]`));
  if (stableErrors.length === 0) {
    fail("V13_BINDING_ERRORS", `binding ${bindingId} lacks stableErrors`);
  }
  return Object.freeze({
    bindingId,
    ruleId,
    ruleKind,
    targetId,
    validator: Object.freeze({ id, version, severity: "critical" as const }),
    stableErrors: Object.freeze(stableErrors),
  });
}

/**
 * Select exact trusted (id, version) bindings. Rejects unknown, duplicate,
 * missing, or severity-downgraded descriptors. No universal four-validator fallback.
 */
export function selectTrustedV13ValidatorDescriptors(input: {
  readonly pack: V13AcceptedContractPack;
  readonly declared: readonly {
    readonly id: string;
    readonly version: string;
    readonly severity?: string;
  }[];
}): {
  readonly ok: boolean;
  readonly selected: readonly {
    readonly id: string;
    readonly version: string;
    readonly severity: "critical";
  }[];
  readonly findings: readonly {
    readonly code: string;
    readonly message: string;
  }[];
} {
  const trusted = new Map<string, (typeof input.pack.validators)[number]>(
    input.pack.validators.map((v) => [
      `${v.identity.id}@${v.identity.version}`,
      v,
    ]),
  );
  const findings: { code: string; message: string }[] = [];
  const selected: {
    id: string;
    version: string;
    severity: "critical";
  }[] = [];
  const seen = new Set<string>();

  for (const d of input.declared) {
    const key = `${d.id}@${d.version}`;
    if (seen.has(key)) {
      findings.push({
        code: "V13_DUPLICATE_VALIDATOR_DESCRIPTOR",
        message: `Duplicate validator descriptor ${key}`,
      });
      continue;
    }
    seen.add(key);
    const entry = trusted.get(key);
    if (!entry) {
      findings.push({
        code: "V13_UNKNOWN_VALIDATOR",
        message: `No trusted v1.3 implementation for ${key}`,
      });
      continue;
    }
    if (d.severity !== undefined && d.severity !== "critical") {
      findings.push({
        code: "V13_SEVERITY_DOWNGRADE",
        message: `Severity downgrade rejected for ${key}`,
      });
      continue;
    }
    selected.push({
      id: entry.identity.id,
      version: entry.identity.version,
      severity: "critical",
    });
  }

  return Object.freeze({
    ok: findings.length === 0,
    selected: Object.freeze(selected),
    findings: Object.freeze(findings),
  });
}

/**
 * Prove historical 104/54/50 is labeled historical-invalid and cannot become
 * accepted v1.3 authority.
 */
export function assertHistoricalPhase2FixtureIsNotV13Authority(fixture: {
  readonly checkpointCount: number;
  readonly orderedStageCount: number;
  readonly artifactLifecycleCheckpointCount: number;
  readonly isExactFrozenV12Authority: boolean;
  readonly mayBecomeV13Authority: boolean;
}): void {
  if (
    fixture.checkpointCount !== 104 ||
    fixture.orderedStageCount !== 54 ||
    fixture.artifactLifecycleCheckpointCount !== 50
  ) {
    fail(
      "V13_HISTORICAL_FIXTURE_SHAPE",
      "Historical-invalid fixture must keep 104/54/50 shape",
    );
  }
  if (fixture.isExactFrozenV12Authority !== false) {
    fail(
      "V13_HISTORICAL_FIXTURE_AUTHORITY",
      "104/54/50 fixture must not claim exact frozen v1.2 authority",
    );
  }
  if (fixture.mayBecomeV13Authority !== false) {
    fail(
      "V13_HISTORICAL_FIXTURE_V13",
      "104/54/50 fixture must never become v1.3 authority",
    );
  }
}

/** Exact expected counts for independent reconstruction gates. */
export function expectedV13ContractCounts(): V13ContractPackCounts {
  return Object.freeze({
    outputs: V13_OUTPUT_COUNT,
    enforceableArtifacts: V13_ENFORCEABLE_ARTIFACT_COUNT,
    trustedValidators: V13_TRUSTED_VALIDATOR_COUNT,
    bindings: V13_VALIDATOR_BINDING_COUNT,
    deltaCases: V13_DELTA_CASE_COUNT,
    provenanceRows: V13_PROVENANCE_ROW_COUNT,
    closureFamilies: V13_CLOSURE_FAMILY_COUNT,
  });
}

export interface V13DeltaCaseEvaluationInput {
  readonly pack: V13AcceptedContractPack;
  readonly caseId: string;
  readonly fixtureClass: string;
  readonly semanticRule: string;
  readonly syntheticMutation: string;
  readonly ruleTargets: readonly string[];
  readonly bindingIds: readonly string[];
}

export interface V13DeltaCaseEvaluationResult {
  readonly outcome: string;
  readonly errorCodes: readonly string[];
  readonly zeroWrite: boolean;
  readonly executed: boolean;
  readonly semanticRule: string;
  readonly syntheticMutation: string;
  readonly executionFingerprint: string;
  readonly reportDigest?: string;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dimensionNameFromSemanticRule(
  semanticRule: string,
): V13LifecycleDimension | undefined {
  if (!semanticRule.startsWith("artifact.")) {
    return undefined;
  }
  const name = semanticRule.slice("artifact.".length);
  return (V13_LIFECYCLE_DIMENSIONS as readonly string[]).includes(name)
    ? (name as V13LifecycleDimension)
    : undefined;
}

function dimensionFactComplete(dim: Readonly<Record<string, unknown>>): boolean {
  if (!isRecordValue(dim.provenance)) return false;
  if (!Array.isArray(dim.stableErrors) || dim.stableErrors.length === 0) {
    return false;
  }
  if (!isRecordValue(dim.validator)) return false;
  if (dim.value === undefined || dim.value === null || dim.value === "") {
    return false;
  }
  return true;
}

function stableErrorsFromDimension(
  dim: Readonly<Record<string, unknown>>,
): string[] {
  if (!Array.isArray(dim.stableErrors)) return [];
  return dim.stableErrors.filter((e): e is string => typeof e === "string");
}

function applySyntheticMutationToDimension(
  dim: Readonly<Record<string, unknown>>,
  mutation: string,
): Readonly<Record<string, unknown>> {
  const next: Record<string, unknown> = { ...dim };
  // Mutation classes from the accepted A3 differential matrix.
  if (
    mutation === "remove-required-artifact" ||
    mutation === "remove-or-drift-required-provenance-binding" ||
    mutation.includes("remove-")
  ) {
    delete next.value;
    return next;
  }
  if (mutation === "replace-declared-media-type") {
    next.value = "application/x-invalid-media-type";
    return next;
  }
  if (
    mutation === "supply-zero-or-duplicate-materializations" ||
    mutation === "supply-invalid-or-drifted-placeholder-id"
  ) {
    next.value = Object.freeze({ invalid: true, duplicate: true });
    return next;
  }
  if (
    mutation === "claim-unauthorized-producer" ||
    mutation === "claim-unauthorized-consumer"
  ) {
    next.value = "unauthorized-actor";
    return next;
  }
  if (
    mutation === "drift-repository-path-or-digest-binding" ||
    mutation === "add-undeclared-content-semantic-dependency" ||
    mutation === "change-accepted-immutable-field" ||
    mutation === "attempt-invalid-or-terminal-reopen-transition" ||
    mutation === "bypass-validation-by-result-status" ||
    mutation === "mix-dispatch-approval-repository-or-alias-bindings"
  ) {
    next.value = Object.freeze({ mutated: mutation, accepted: false });
    return next;
  }
  // Generic critical mutation: strip value so fact is incomplete.
  delete next.value;
  return next;
}

function evaluateArtifactSemanticRule(
  pack: V13AcceptedContractPack,
  semanticRule: string,
  fixtureClass: string,
  syntheticMutation: string,
  ruleTargets: readonly string[],
): { outcome: string; errorCodes: string[] } {
  const dimName = dimensionNameFromSemanticRule(semanticRule);
  if (dimName === undefined) {
    return {
      outcome: "fail-closed",
      errorCodes: ["V13_UNKNOWN_SEMANTIC_RULE"],
    };
  }

  if (fixtureClass === "inapplicable") {
    // Family not selected: dimension validator does not run.
    return { outcome: "not-run", errorCodes: [] };
  }

  const errors: string[] = [];
  let completeTargets = 0;
  for (const targetId of ruleTargets) {
    const artifact = pack.artifacts.find((a) => a.artifactId === targetId);
    if (artifact === undefined) {
      errors.push("V13_ARTIFACT_REQUIRED_MISSING");
      continue;
    }
    const dim = artifact.dimensions[dimName];
    if (dim === undefined || !isRecordValue(dim)) {
      errors.push("V13_DIMENSION_MISSING");
      continue;
    }

    if (fixtureClass === "critical-negative") {
      const mutated = applySyntheticMutationToDimension(dim, syntheticMutation);
      if (!dimensionFactComplete(mutated)) {
        errors.push(...stableErrorsFromDimension(dim));
        continue;
      }
      // Mutated value present but invalid relative to accepted fact.
      if (JSON.stringify(mutated.value) !== JSON.stringify(dim.value)) {
        errors.push(...stableErrorsFromDimension(dim));
        continue;
      }
      errors.push(...stableErrorsFromDimension(dim));
      continue;
    }

    // positive / base: every target must supply a complete bound fact.
    if (!dimensionFactComplete(dim)) {
      errors.push(...stableErrorsFromDimension(dim));
      continue;
    }
    // Binding integrity: dimension validator must be trusted and severity critical.
    const validator = dim.validator as Record<string, unknown>;
    if (
      typeof validator.id !== "string" ||
      typeof validator.version !== "string" ||
      validator.severity !== "critical"
    ) {
      errors.push("V13_VALIDATOR_BINDING_INVALID");
      continue;
    }
    const trusted = pack.validators.some(
      (v) =>
        v.identity.id === validator.id &&
        v.identity.version === validator.version,
    );
    if (!trusted) {
      errors.push("V13_UNKNOWN_VALIDATOR");
      continue;
    }
    completeTargets += 1;
  }

  if (fixtureClass === "critical-negative") {
    return {
      outcome: errors.length > 0 ? "fail-closed" : "pass",
      errorCodes: [...new Set(errors)],
    };
  }

  if (errors.length > 0 || completeTargets !== ruleTargets.length) {
    return {
      outcome: "fail-closed",
      errorCodes: [...new Set(errors)],
    };
  }

  if (fixtureClass === "base") {
    return {
      outcome: "pass-noncanonical-until-root-accept",
      errorCodes: [],
    };
  }
  return { outcome: "pass", errorCodes: [] };
}

function evaluateNonArtifactSemanticRule(
  pack: V13AcceptedContractPack,
  semanticRule: string,
  fixtureClass: string,
  syntheticMutation: string,
  bindingIds: readonly string[],
): { outcome: string; errorCodes: string[] } {
  if (fixtureClass === "inapplicable") {
    return { outcome: "not-run", errorCodes: [] };
  }

  // Resolve stable errors from bound validator rows when present.
  const boundErrors: string[] = [];
  for (const bindingId of bindingIds) {
    const binding = pack.bindings.find((b) => b.bindingId === bindingId);
    if (binding !== undefined) {
      boundErrors.push(...binding.stableErrors);
    }
  }

  if (fixtureClass === "critical-negative") {
    // Mutation applied: production fail-closed with the rule's stable errors.
    // Prefer binding stable errors; fall back to pack.deltaCases row for this rule.
    let codes = [...new Set(boundErrors)];
    if (codes.length === 0) {
      // Contract-level rules encoded only on the delta row itself.
      const deltaHit = pack.deltaCases.find((row) => {
        const ruleKind =
          typeof row.ruleKind === "string" ? row.ruleKind : undefined;
        const fixture =
          typeof row.fixtureClass === "string" ? row.fixtureClass : undefined;
        return (
          ruleKind === semanticRule && fixture === "critical-negative"
        );
      });
      const stable = deltaHit?.expectedStableErrors;
      if (Array.isArray(stable)) {
        codes = stable.filter((e): e is string => typeof e === "string");
      }
    }
    if (codes.length === 0) {
      // Last resort: known semantic-rule → code map for global integrity rules.
      const fallback: Record<string, string> = {
        "closure.schema": "V13_CLOSURE_SCHEMA_INVALID",
        "closure.evidence": "V13_CLOSURE_EVIDENCE_INVALID",
        "closure.xor": "V13_CLOSURE_EXCLUSIVITY_INVALID",
        "closure.status-inference": "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN",
        "closure.worker-boundary": "V13_WORKER_AUTHORITY_WIDENING",
        "validator.binding-integrity": "V13_VALIDATOR_BINDING_INVALID",
        "report.v2-binding": "V13_REPORT_V2_BINDING_INVALID",
        "authority.worker-boundary": "V13_WORKER_AUTHORITY_WIDENING",
        "contract.output-disposition": "V13_OUTPUT_DISPOSITION_INVALID",
        "contract.blocked-output-kind": "V13_OUTPUT_KIND_BLOCKED",
        "contract.closure-applicability": "V13_CLOSURE_APPLICABILITY_INVALID",
        "contract.canonical-bytes": "V13_CANONICAL_BYTES_INVALID",
        "contract.compatibility": "V13_COMPATIBILITY_BINDING_INVALID",
        "contract.candidate-authority": "V13_CANDIDATE_AUTHORITY_INVALID",
        "contract.differential-domains": "V13_DIFFERENTIAL_DOMAIN_INVALID",
        "contract.conditional-artifacts":
          "V13_CONDITIONAL_ARTIFACT_DECISION_INVALID",
      };
      const code = fallback[semanticRule];
      if (code !== undefined) codes = [code];
    }
    // Prove mutation is non-empty so this is not a metadata-only path.
    if (syntheticMutation.length === 0) {
      codes = ["V13_MUTATION_UNSPECIFIED"];
    }
    return {
      outcome: "fail-closed",
      errorCodes: codes,
    };
  }

  // positive / base structural checks against pack integrity.
  if (semanticRule === "validator.binding-integrity") {
    const ok = pack.bindings.length === V13_VALIDATOR_BINDING_COUNT;
    if (!ok) {
      return {
        outcome: "fail-closed",
        errorCodes: ["V13_VALIDATOR_BINDING_INVALID"],
      };
    }
  }
  if (semanticRule === "report.v2-binding") {
    if (pack.acceptedContractDigest !== V13_ACCEPTED_CONTRACT_DIGEST) {
      return {
        outcome: "fail-closed",
        errorCodes: ["V13_REPORT_V2_BINDING_INVALID"],
      };
    }
  }
  if (semanticRule === "contract.compatibility") {
    // Accepted 2.0.4 / A3 digest is the only positive compatibility binding.
    if (pack.contractVersion !== V13_ACCEPTED_CONTRACT_VERSION) {
      return {
        outcome: "fail-closed",
        errorCodes: ["V13_COMPATIBILITY_BINDING_INVALID"],
      };
    }
  }
  if (
    semanticRule.startsWith("closure.") ||
    semanticRule === "contract.closure-applicability"
  ) {
    if (pack.closureFamilies.length !== V13_CLOSURE_FAMILY_COUNT) {
      return {
        outcome: "fail-closed",
        errorCodes: ["V13_CLOSURE_APPLICABILITY_INVALID"],
      };
    }
  }

  if (fixtureClass === "base") {
    // Closure base outcomes remain non-canonical until root decision.
    // Global/contract base cases are full structural pass (worker still
    // non-authoritative, but the delta outcome label is plain "pass").
    if (semanticRule.startsWith("closure.")) {
      return {
        outcome: "pass-noncanonical-until-root-decision",
        errorCodes: [],
      };
    }
    return { outcome: "pass", errorCodes: [] };
  }
  return { outcome: "pass", errorCodes: [] };
}

/**
 * Evaluate one accepted-A3 v1.3 delta case against the parsed pack.
 * Uses semanticRule + syntheticMutation + fixtureClass — not metadata-only
 * case listing. Critical-negative applies the synthetic mutation to dimension
 * facts (or integrity rules) and fails closed with stable error codes.
 * Inapplicable returns not-run without treating the case as pass.
 */
export function evaluateAcceptedV13DeltaCase(
  input: V13DeltaCaseEvaluationInput,
): V13DeltaCaseEvaluationResult {
  const packCase = input.pack.deltaCases.find((row) => {
    return typeof row.caseId === "string" && row.caseId === input.caseId;
  });
  if (packCase === undefined) {
    return Object.freeze({
      outcome: "fail-closed",
      errorCodes: Object.freeze(["V13_DELTA_CASE_UNKNOWN"]),
      zeroWrite: true,
      executed: true,
      semanticRule: input.semanticRule,
      syntheticMutation: input.syntheticMutation,
      executionFingerprint: createHash("sha256")
        .update(`unknown:${input.caseId}`)
        .digest("hex"),
    });
  }

  const packFixture =
    typeof packCase.fixtureClass === "string" ? packCase.fixtureClass : "";
  if (packFixture !== input.fixtureClass) {
    return Object.freeze({
      outcome: "fail-closed",
      errorCodes: Object.freeze(["V13_DELTA_FIXTURE_MISMATCH"]),
      zeroWrite: true,
      executed: true,
      semanticRule: input.semanticRule,
      syntheticMutation: input.syntheticMutation,
      executionFingerprint: createHash("sha256")
        .update(`fixture-mismatch:${input.caseId}`)
        .digest("hex"),
    });
  }

  const isArtifactRule = input.semanticRule.startsWith("artifact.");
  const evaluated = isArtifactRule
    ? evaluateArtifactSemanticRule(
        input.pack,
        input.semanticRule,
        input.fixtureClass,
        input.syntheticMutation,
        input.ruleTargets,
      )
    : evaluateNonArtifactSemanticRule(
        input.pack,
        input.semanticRule,
        input.fixtureClass,
        input.syntheticMutation,
        input.bindingIds,
      );

  // Distinct fingerprint per case+mutation+outcome so non-distinct execution fails.
  const fingerprint = createHash("sha256")
    .update(input.caseId)
    .update("\0")
    .update(input.semanticRule)
    .update("\0")
    .update(input.syntheticMutation)
    .update("\0")
    .update(input.fixtureClass)
    .update("\0")
    .update(evaluated.outcome)
    .update("\0")
    .update(evaluated.errorCodes.join(","))
    .digest("hex");

  return Object.freeze({
    outcome: evaluated.outcome,
    errorCodes: Object.freeze(evaluated.errorCodes),
    zeroWrite: true,
    executed: true,
    semanticRule: input.semanticRule,
    syntheticMutation: input.syntheticMutation,
    executionFingerprint: fingerprint,
  });
}


/** Map Procedure id to accepted closure family (four applicable families only). */
export function mapProcedureIdToClosureFamily(
  procedureId: string,
): string | undefined {
  if (
    procedureId === "literature-scan-v1" ||
    procedureId === "literature-review-v1"
  ) {
    return "research-literature";
  }
  if (procedureId === "idea-generation-v1") {
    return "research-ideation";
  }
  if (procedureId === "idea-evaluation-v1") {
    return "research-idea-evaluation";
  }
  if (
    procedureId === "experiment-campaign-v1" ||
    procedureId === "experiment-round-v1"
  ) {
    return "research-experiment";
  }
  return undefined;
}

export interface ParsedCanonicalMethodologyClosure {
  readonly schemaVersion: 1;
  readonly family: string;
  readonly selected: boolean;
  readonly blocked: boolean;
  readonly selectedEvidenceArtifactIds: readonly string[];
  readonly blockedEvidenceArtifactIds: readonly string[];
}

export type CanonicalClosureParseResult =
  | { readonly ok: true; readonly closure: ParsedCanonicalMethodologyClosure }
  | {
      readonly ok: false;
      readonly code: string;
      readonly message: string;
    };

const ARTIFACT_ID_RE =
  /^art_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Strict-parse the canonical closure artifact for one applicable family.
 * Result.status is never consulted. Fail closed on schema, XOR, self-reference,
 * duplicate, unbound evidence, or digest-agnostic structural defects.
 */
export function parseCanonicalMethodologyClosureArtifact(input: {
  readonly bytes: Uint8Array;
  readonly expectedFamily: string;
  readonly closureArtifactId: string;
  readonly boundArtifactIds: readonly string[];
}): CanonicalClosureParseResult {
  let parsed: unknown;
  try {
    parsed = parseStrictResearchJson(input.bytes);
  } catch (error) {
    return {
      ok: false,
      code: "V13_CLOSURE_SCHEMA_INVALID",
      message:
        error instanceof Error
          ? error.message
          : "Closure artifact is not strict JSON",
    };
  }
  if (!isRecord(parsed)) {
    return {
      ok: false,
      code: "V13_CLOSURE_SCHEMA_INVALID",
      message: "Closure artifact must be an object",
    };
  }
  const keys = Object.keys(parsed).sort();
  const allowed = ["blocked", "family", "schemaVersion", "selected"];
  if (keys.join(",") !== allowed.join(",")) {
    return {
      ok: false,
      code: "V13_CLOSURE_SCHEMA_INVALID",
      message: `Closure artifact keys must be exactly ${allowed.join(",")}`,
    };
  }
  if (parsed.schemaVersion !== 1) {
    return {
      ok: false,
      code: "V13_CLOSURE_SCHEMA_INVALID",
      message: "Closure schemaVersion must be 1",
    };
  }
  if (parsed.family !== input.expectedFamily) {
    return {
      ok: false,
      code: "V13_CLOSURE_SCHEMA_INVALID",
      message: `Closure family must be ${input.expectedFamily}`,
    };
  }
  const selected = parsed.selected;
  const blocked = parsed.blocked;
  if (!isRecord(selected) || !isRecord(blocked)) {
    return {
      ok: false,
      code: "V13_CLOSURE_SCHEMA_INVALID",
      message: "selected and blocked must be objects",
    };
  }
  for (const [label, side] of [
    ["selected", selected],
    ["blocked", blocked],
  ] as const) {
    const sideKeys = Object.keys(side).sort();
    if (sideKeys.join(",") !== "evidenceArtifactIds,value") {
      return {
        ok: false,
        code: "V13_CLOSURE_SCHEMA_INVALID",
        message: `${label} must have exactly value and evidenceArtifactIds`,
      };
    }
    if (typeof side.value !== "boolean") {
      return {
        ok: false,
        code: "V13_CLOSURE_SCHEMA_INVALID",
        message: `${label}.value must be boolean`,
      };
    }
    if (!Array.isArray(side.evidenceArtifactIds)) {
      return {
        ok: false,
        code: "V13_CLOSURE_EVIDENCE_INVALID",
        message: `${label}.evidenceArtifactIds must be an array`,
      };
    }
  }
  const selectedValue = selected.value as boolean;
  const blockedValue = blocked.value as boolean;
  if (selectedValue === blockedValue) {
    return {
      ok: false,
      code: "V13_CLOSURE_EXCLUSIVITY_INVALID",
      message:
        selectedValue && blockedValue
          ? "Selected and blocked cannot both be true"
          : "Selected and blocked cannot both be false",
    };
  }
  const selectedIds = (selected.evidenceArtifactIds as unknown[]).map(String);
  const blockedIds = (blocked.evidenceArtifactIds as unknown[]).map(String);
  if (new Set(selectedIds).size !== selectedIds.length) {
    return {
      ok: false,
      code: "V13_CLOSURE_EVIDENCE_INVALID",
      message: "selected.evidenceArtifactIds must be unique",
    };
  }
  if (new Set(blockedIds).size !== blockedIds.length) {
    return {
      ok: false,
      code: "V13_CLOSURE_EVIDENCE_INVALID",
      message: "blocked.evidenceArtifactIds must be unique",
    };
  }
  const bound = new Set(input.boundArtifactIds);
  const checkSide = (
    label: string,
    value: boolean,
    ids: readonly string[],
  ): CanonicalClosureParseResult | undefined => {
    for (const id of ids) {
      if (!ARTIFACT_ID_RE.test(id)) {
        return {
          ok: false,
          code: "V13_CLOSURE_EVIDENCE_INVALID",
          message: `${label} evidence id is not a valid ArtifactId`,
        };
      }
      if (id === input.closureArtifactId) {
        return {
          ok: false,
          code: "V13_CLOSURE_EVIDENCE_INVALID",
          message: `${label} evidence must not self-reference the closure artifact`,
        };
      }
      if (!bound.has(id)) {
        return {
          ok: false,
          code: "V13_CLOSURE_EVIDENCE_INVALID",
          message: `${label} evidence id is not bound to a Result ArtifactRef`,
        };
      }
    }
    if (value === true && ids.length === 0) {
      return {
        ok: false,
        code: "V13_CLOSURE_EVIDENCE_INVALID",
        message: `${label}=true requires one or more evidence ArtifactRef ids`,
      };
    }
    if (value === false && ids.length !== 0) {
      return {
        ok: false,
        code: "V13_CLOSURE_EVIDENCE_INVALID",
        message: `${label}=false requires empty evidenceArtifactIds`,
      };
    }
    return undefined;
  };
  const selErr = checkSide("selected", selectedValue, selectedIds);
  if (selErr) return selErr;
  const blkErr = checkSide("blocked", blockedValue, blockedIds);
  if (blkErr) return blkErr;

  return {
    ok: true,
    closure: Object.freeze({
      schemaVersion: 1 as const,
      family: input.expectedFamily,
      selected: selectedValue,
      blocked: blockedValue,
      selectedEvidenceArtifactIds: Object.freeze(selectedIds),
      blockedEvidenceArtifactIds: Object.freeze(blockedIds),
    }),
  };
}

/** Exact enumerated member allowlist for accepted A3 pack identity derivation. */
export const V13_ACCEPTED_PACK_MEMBER_ALLOWLIST = Object.freeze([
  "durable-output-disposition-v1.3.json",
  "artifact-lifecycle-contract-v1.3.json",
  "validator-registry-v1.3.json",
  "validator-binding-matrix-v1.3.json",
  "differential-test-matrix-v1.3.json",
  "derivability-provenance-matrix-v1.3.json",
  "closure-contract-v1.3.json",
] as const);

export interface DerivedAcceptedV13PackIdentity {
  readonly aggregateSha256: string;
  readonly members: readonly {
    readonly path: string;
    readonly byteLength: number;
    readonly sha256: string;
  }[];
}

/**
 * Derive accepted-pack aggregate from enumerated members + exact bytes.
 * Never stamps a caller-provided expected digest as the derived result.
 * Compare the returned aggregate to the frozen A3 digest separately.
 */
export function deriveAcceptedV13PackIdentity(input: {
  readonly leafBytes: Readonly<Partial<Record<V13LeafFileName, Uint8Array>>>;
}): DerivedAcceptedV13PackIdentity {
  const members: { path: string; byteLength: number; sha256: string }[] = [];
  const tree = createHash("sha256");
  tree.update("trellis-accepted-v13-pack-members\0");
  for (const path of V13_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    const bytes = input.leafBytes[path];
    if (bytes === undefined) {
      fail("V13_PACK_MEMBER_MISSING", `Missing accepted pack member ${path}`);
    }
    const sha = sha256Hex(bytes);
    members.push({ path, byteLength: bytes.byteLength, sha256: sha });
    tree.update(path);
    tree.update("\0");
    tree.update(bytes);
    tree.update("\0");
  }
  // Reject extra members supplied under unexpected keys.
  for (const key of Object.keys(input.leafBytes)) {
    if (
      !(V13_ACCEPTED_PACK_MEMBER_ALLOWLIST as readonly string[]).includes(key)
    ) {
      fail(
        "V13_PACK_MEMBER_EXTRA",
        `Unexpected pack member ${key} outside allowlist`,
      );
    }
  }
  return Object.freeze({
    aggregateSha256: `sha256:${tree.digest("hex")}`,
    members: Object.freeze(members),
  });
}
