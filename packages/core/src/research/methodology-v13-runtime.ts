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
import fs from "node:fs";
import path from "node:path";

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

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    fail("V13_SCHEMA", `${label} must be a non-negative integer`);
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

export const V13_ACCEPTED_MEMBER_AGGREGATE_SHA256 =
  "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef" as const;

export const V13_ACCEPTED_MEMBER_LEDGER_SCHEMA_VERSION = 1 as const;

export interface V13AcceptedMemberLedgerRow {
  /** Exact ordered relative path inside the bundle (allowlist order). */
  readonly path: V13LeafFileName;
  readonly role: string;
  readonly mediaType: string;
  readonly byteLength: number;
  /** Lowercase hex SHA-256 of the exact member bytes. */
  readonly sha256: string;
}

export interface V13AcceptedMemberLedger {
  readonly schemaVersion: typeof V13_ACCEPTED_MEMBER_LEDGER_SCHEMA_VERSION;
  readonly kind: string;
  readonly contractVersion: typeof V13_ACCEPTED_CONTRACT_VERSION;
  readonly memberCount: 7;
  readonly aggregateDomain: string;
  readonly aggregateSha256: typeof V13_ACCEPTED_MEMBER_AGGREGATE_SHA256;
  readonly acceptedContractDigest: typeof V13_ACCEPTED_CONTRACT_DIGEST;
  readonly members: readonly V13AcceptedMemberLedgerRow[];
}

/**
 * Authenticate an installation member ledger against exact allowlisted leaf
 * bytes. Rejects missing, extra, renamed, reordered, truncated, aliased, or
 * modified members. The semantic contract digest is a separate ledger field;
 * it is never conflated with the member aggregate.
 */
export function authenticateAcceptedV13MemberLedger(input: {
  readonly ledger: unknown;
  readonly leafBytes: Readonly<Partial<Record<V13LeafFileName, Uint8Array>>>;
}): {
  readonly memberDigests: Readonly<Record<string, string>>;
  readonly aggregateSha256: string;
} {
  const ledger = requireRecord(input.ledger, "member-ledger");
  if (ledger.schemaVersion !== V13_ACCEPTED_MEMBER_LEDGER_SCHEMA_VERSION) {
    fail("V13_LEDGER_SCHEMA", "Member ledger schemaVersion must be 1");
  }
  if (ledger.contractVersion !== V13_ACCEPTED_CONTRACT_VERSION) {
    fail("V13_LEDGER_CONTRACT_VERSION", "Member ledger contractVersion mismatch");
  }
  if (ledger.memberCount !== 7) {
    fail("V13_LEDGER_MEMBER_COUNT", "Member ledger must declare exactly 7 members");
  }
  if (ledger.acceptedContractDigest !== V13_ACCEPTED_CONTRACT_DIGEST) {
    fail(
      "V13_LEDGER_SEMANTIC_DIGEST",
      "Member ledger acceptedContractDigest must equal the frozen accepted A3 semantic digest",
    );
  }
  const rawMembers = requireArray(ledger.members, "ledger.members");
  if (rawMembers.length !== REQUIRED_LEAF_FILES.length) {
    fail(
      "V13_LEDGER_MEMBER_COUNT",
      `Member ledger members length must be ${REQUIRED_LEAF_FILES.length}`,
    );
  }
  const memberDigests: Record<string, string> = {};
  rawMembers.forEach((raw, index) => {
    const row = requireRecord(raw, `ledger.members[${index}]`);
    const memberPath = requireString(row.path, `ledger.members[${index}].path`);
    if (memberPath !== REQUIRED_LEAF_FILES[index]) {
      fail(
        "V13_LEDGER_MEMBER_ORDER",
        `Ledger member ${index} must be ${REQUIRED_LEAF_FILES[index]} (exact order)`,
      );
    }
    requireString(row.role, `ledger.members[${index}].role`);
    requireString(row.mediaType, `ledger.members[${index}].mediaType`);
    const expectedLength = requireNumber(
      row.byteLength,
      `ledger.members[${index}].byteLength`,
    );
    const expectedSha = requireString(row.sha256, `ledger.members[${index}].sha256`);
    const bytes = input.leafBytes[memberPath];
    if (bytes === undefined) {
      fail("V13_LEDGER_MEMBER_MISSING", `Ledger member ${memberPath} has no bytes`);
    }
    if (bytes.byteLength !== expectedLength) {
      fail(
        "V13_LEDGER_MEMBER_LENGTH",
        `Ledger member ${memberPath} byteLength ${bytes.byteLength} != ${expectedLength}`,
      );
    }
    const actualSha = sha256Hex(bytes);
    if (actualSha !== expectedSha) {
      fail(
        "V13_LEDGER_MEMBER_HASH",
        `Ledger member ${memberPath} sha256 drift`,
      );
    }
    memberDigests[memberPath] = actualSha;
  });
  // Reject extra members supplied under unexpected keys.
  for (const key of Object.keys(input.leafBytes)) {
    if (!(REQUIRED_LEAF_FILES as readonly string[]).includes(key)) {
      fail("V13_PACK_MEMBER_EXTRA", `Unexpected pack member ${key} outside allowlist`);
    }
  }
  const derived = deriveAcceptedV13PackIdentity({ leafBytes: input.leafBytes });
  if (ledger.aggregateSha256 !== V13_ACCEPTED_MEMBER_AGGREGATE_SHA256) {
    fail(
      "V13_LEDGER_AGGREGATE",
      "Member ledger aggregateSha256 must equal the frozen accepted A3 aggregate",
    );
  }
  if (derived.aggregateSha256 !== V13_ACCEPTED_MEMBER_AGGREGATE_SHA256) {
    fail(
      "V13_PACK_AGGREGATE_MISMATCH",
      `Derived member aggregate ${derived.aggregateSha256} != frozen ${V13_ACCEPTED_MEMBER_AGGREGATE_SHA256}`,
    );
  }
  return {
    memberDigests: Object.freeze(memberDigests),
    aggregateSha256: derived.aggregateSha256,
  };
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
  /** Frozen member-tree aggregate; when supplied the derived aggregate must equal it. */
  readonly expectedMemberAggregateSha256?: string;
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
  if (
    input.expectedMemberAggregateSha256 !== undefined &&
    derivedIdentity.aggregateSha256 !== input.expectedMemberAggregateSha256
  ) {
    fail(
      "V13_PACK_AGGREGATE_MISMATCH",
      `Derived member aggregate ${derivedIdentity.aggregateSha256} != expected ${input.expectedMemberAggregateSha256}`,
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
  /** Case identity only — semantic rule, mutation, targets, and bindings are derived from the digest-bound pack row. */
  readonly caseId: string;
  /**
   * Optional sandbox directory. When set, zeroWrite is proven by hashing
   * path+byte snapshots before and after evaluation (not a hardcoded true).
   */
  readonly sandboxRoot?: string;
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
  readonly beforeSandboxDigest?: string;
  readonly afterSandboxDigest?: string;
}

/**
 * Select unique trusted validator descriptors from the accepted 876-row
 * binding matrix (optionally filtered by procedure family artifact targets).
 * Never invents descriptors from caller authority.
 */
export function selectApplicableV13ValidatorsFromBindings(input: {
  readonly pack: V13AcceptedContractPack;
  readonly procedureId?: string;
}): readonly {
  readonly id: string;
  readonly version: string;
  readonly severity: "critical";
}[] {
  const family = input.procedureId
    ? mapProcedureIdToClosureFamily(input.procedureId)
    : undefined;
  const targetIds = new Set(
    family === undefined
      ? input.pack.artifacts.map((a) => a.artifactId)
      : input.pack.artifacts
          .filter((a) => a.family === family)
          .map((a) => a.artifactId),
  );
  // Always include global/contract bindings (targets not in lifecycle artifacts).
  const selected = new Map<
    string,
    { id: string; version: string; severity: "critical" }
  >();
  for (const binding of input.pack.bindings) {
    const isGlobal =
      binding.ruleKind.startsWith("closure.") ||
      binding.ruleKind.startsWith("contract.") ||
      binding.ruleKind.startsWith("validator.") ||
      binding.ruleKind.startsWith("report.") ||
      binding.ruleKind.startsWith("authority.");
    if (!isGlobal && family !== undefined && !targetIds.has(binding.targetId)) {
      continue;
    }
    const key = `${binding.validator.id}@${binding.validator.version}`;
    if (!selected.has(key)) {
      selected.set(key, {
        id: binding.validator.id,
        version: binding.validator.version,
        severity: "critical",
      });
    }
  }
  // Always include the full trusted registry on family-agnostic paths so the
  // production gate cannot shrink below the accepted 20-validator set when no
  // procedure filter applies. When a procedure family is set, keep the
  // binding-selected subset (may be smaller) but never below binding integrity.
  if (family === undefined) {
    for (const v of input.pack.validators) {
      const key = `${v.identity.id}@${v.identity.version}`;
      if (!selected.has(key)) {
        selected.set(key, {
          id: v.identity.id,
          version: v.identity.version,
          severity: "critical",
        });
      }
    }
  }
  return Object.freeze([...selected.values()]);
}

function hashSandboxTree(root: string): string {
  const entries: string[] = [];
  const walk = (dir: string, rel: string): void => {
    let names: string[];
    try {
      names = fs.readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      const abs = path.join(dir, name);
      const childRel = rel.length === 0 ? name : `${rel}/${name}`;
      let st: fs.Stats;
      try {
        st = fs.lstatSync(abs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        let target = "";
        try {
          target = fs.readlinkSync(abs);
        } catch {
          target = "";
        }
        entries.push(`L:${childRel}:${target}`);
      } else if (st.isDirectory()) {
        entries.push(`D:${childRel}:${st.mode}`);
        walk(abs, childRel);
      } else if (st.isFile()) {
        const bytes = fs.readFileSync(abs);
        const fileHash = createHash("sha256").update(bytes).digest("hex");
        entries.push(
          `F:${childRel}:${st.mode}:${bytes.byteLength}:${fileHash}`,
        );
      }
    }
  };
  walk(root, "");
  return `sha256:${createHash("sha256").update(entries.join("\n")).digest("hex")}`;
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
    // Mutation applied: fail closed with binding stable errors, then fixed
    // semantic-rule → code map. Never read expectedStableErrors from the
    // delta row (test-oracle field, not production authority).
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const code of boundErrors) {
      if (!seen.has(code)) {
        seen.add(code);
        ordered.push(code);
      }
    }
    let codes = ordered;
    if (codes.length === 0) {
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
 * Caller supplies only caseId (+ pack + optional sandbox). Rule, mutation,
 * targets, bindings, and fixture class are derived from the digest-bound
 * pack row — never caller-supplied semantic authority.
 * Critical-negative applies the pack mutation to dimension facts and fails
 * closed with stable error codes. Inapplicable returns not-run (not pass).
 * When sandboxRoot is set, zeroWrite is proven by path+byte tree digests.
 */
export function evaluateAcceptedV13DeltaCase(
  input: V13DeltaCaseEvaluationInput,
): V13DeltaCaseEvaluationResult {
  const beforeSandboxDigest =
    typeof input.sandboxRoot === "string" && input.sandboxRoot.length > 0
      ? hashSandboxTree(input.sandboxRoot)
      : undefined;

  const packCase = input.pack.deltaCases.find((row) => {
    return typeof row.caseId === "string" && row.caseId === input.caseId;
  });
  if (packCase === undefined) {
    const afterUnknown =
      typeof input.sandboxRoot === "string" && input.sandboxRoot.length > 0
        ? hashSandboxTree(input.sandboxRoot)
        : undefined;
    return Object.freeze({
      outcome: "fail-closed",
      errorCodes: Object.freeze(["V13_DELTA_CASE_UNKNOWN"]),
      zeroWrite:
        beforeSandboxDigest !== undefined &&
        afterUnknown !== undefined &&
        beforeSandboxDigest === afterUnknown,
      executed: true,
      semanticRule: "",
      syntheticMutation: "",
      executionFingerprint: createHash("sha256")
        .update(`unknown:${input.caseId}`)
        .digest("hex"),
      beforeSandboxDigest,
      afterSandboxDigest: afterUnknown,
    });
  }

  const fixtureClass =
    typeof packCase.fixtureClass === "string" ? packCase.fixtureClass : "";
  const semanticRule =
    typeof packCase.ruleKind === "string" ? packCase.ruleKind : "";
  const syntheticMutation =
    typeof packCase.syntheticMutation === "string"
      ? packCase.syntheticMutation
      : "";
  const ruleTargets = Array.isArray(packCase.ruleTargets)
    ? packCase.ruleTargets.map(String)
    : [];
  const bindingIds = Array.isArray(packCase.bindingIds)
    ? packCase.bindingIds.map(String)
    : [];

  if (semanticRule.length === 0 || fixtureClass.length === 0) {
    const afterBad =
      typeof input.sandboxRoot === "string" && input.sandboxRoot.length > 0
        ? hashSandboxTree(input.sandboxRoot)
        : undefined;
    return Object.freeze({
      outcome: "fail-closed",
      errorCodes: Object.freeze(["V13_DELTA_CASE_MALFORMED"]),
      zeroWrite:
        beforeSandboxDigest !== undefined &&
        afterBad !== undefined &&
        beforeSandboxDigest === afterBad,
      executed: true,
      semanticRule,
      syntheticMutation,
      executionFingerprint: createHash("sha256")
        .update(`malformed:${input.caseId}`)
        .digest("hex"),
      beforeSandboxDigest,
      afterSandboxDigest: afterBad,
    });
  }

  const isArtifactRule = semanticRule.startsWith("artifact.");
  const evaluated = isArtifactRule
    ? evaluateArtifactSemanticRule(
        input.pack,
        semanticRule,
        fixtureClass,
        syntheticMutation,
        ruleTargets,
      )
    : evaluateNonArtifactSemanticRule(
        input.pack,
        semanticRule,
        fixtureClass,
        syntheticMutation,
        bindingIds,
      );

  // Actual codes only — never overwrite with packCase.expectedStableErrors
  // (that field is oracle/test data, not production authority).
  const errorCodes = evaluated.errorCodes;

  // Distinct fingerprint per case+mutation+outcome so non-distinct execution fails.
  const fingerprint = createHash("sha256")
    .update(input.caseId)
    .update("\0")
    .update(semanticRule)
    .update("\0")
    .update(syntheticMutation)
    .update("\0")
    .update(fixtureClass)
    .update("\0")
    .update(evaluated.outcome)
    .update("\0")
    .update(errorCodes.join(","))
    .digest("hex");

  const afterSandboxDigest =
    typeof input.sandboxRoot === "string" && input.sandboxRoot.length > 0
      ? hashSandboxTree(input.sandboxRoot)
      : undefined;
  // zeroWrite is true only when a sandbox was provided and path+byte digests match.
  // Never hardcode true without filesystem proof.
  const zeroWrite =
    beforeSandboxDigest !== undefined &&
    afterSandboxDigest !== undefined &&
    beforeSandboxDigest === afterSandboxDigest;

  return Object.freeze({
    outcome: evaluated.outcome,
    errorCodes: Object.freeze(errorCodes),
    zeroWrite,
    executed: true,
    semanticRule,
    syntheticMutation,
    executionFingerprint: fingerprint,
    beforeSandboxDigest,
    afterSandboxDigest,
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
  /** Full recognized closure ArtifactRef ids (current family included). */
  readonly forbiddenClosureArtifactIds?: readonly string[];
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
  const forbidden = new Set(input.forbiddenClosureArtifactIds ?? []);
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
      if (forbidden.has(id)) {
        return {
          ok: false,
          code: "V13_CLOSURE_EVIDENCE_INVALID",
          message: `${label} evidence must not reference any closure artifact (current or other family)`,
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

// ===========================================================================
// CS5-2 — Closed 17-Procedure closure disposition and exact ArtifactRef
// lifecycle/binding execution (evaluation-contract-v1.3.0 accepted A3).
// ===========================================================================

export const V13_PROCEDURE_COUNT = 17 as const;
export const V13_CLOSURE_REQUIRED_PROCEDURE_COUNT = 6 as const;
export const V13_CLOSURE_NOT_APPLICABLE_PROCEDURE_COUNT = 11 as const;

export interface V13ClosureArtifactRefSpec {
  readonly family: string;
  readonly closureContractId: string;
  readonly exactPath: string;
  readonly mediaType: string;
}

/** Exact canonical closure ArtifactRef set from the accepted A3 closure contract. */
export const V13_CLOSURE_ARTIFACT_SPECS: readonly V13ClosureArtifactRefSpec[] =
  Object.freeze([
    Object.freeze({
      family: "research-literature",
      closureContractId:
        "closure-artifact-research-literature-methodology-closure-research-literature-json-cc3fe05d40",
      exactPath: "methodology/closure/research-literature.json",
      mediaType: "application/json",
    }),
    Object.freeze({
      family: "research-ideation",
      closureContractId:
        "closure-artifact-research-ideation-methodology-closure-research-ideation-json-bf5f473b0a",
      exactPath: "methodology/closure/research-ideation.json",
      mediaType: "application/json",
    }),
    Object.freeze({
      family: "research-idea-evaluation",
      closureContractId:
        "closure-artifact-research-idea-evaluation-methodology-closure-research-idea-evaluation-js-99210b58f8",
      exactPath: "methodology/closure/research-idea-evaluation.json",
      mediaType: "application/json",
    }),
    Object.freeze({
      family: "research-experiment",
      closureContractId:
        "closure-artifact-research-experiment-methodology-closure-research-experiment-json-4d9725b89a",
      exactPath: "methodology/closure/research-experiment.json",
      mediaType: "application/json",
    }),
  ]);

export type V13ProcedureClosureDisposition =
  | {
      readonly kind: "required";
      readonly procedureId: string;
      readonly family: string;
      readonly closureContractId: string;
      readonly exactPath: string;
      readonly mediaType: string;
    }
  | {
      readonly kind: "notApplicable";
      readonly procedureId: string;
      readonly code: string;
      readonly rationale: string;
    };

const NOT_APPLICABLE_RATIONALE =
  "This Procedure family has no canonical closure artifact under the accepted A3 closure contract; closure is explicitly notApplicable and must never be derived from Result.status.";

/** Closed 17-Procedure closure disposition map (exact, no fallback). */
export const V13_PROCEDURE_CLOSURE_DISPOSITIONS: Readonly<
  Record<string, V13ProcedureClosureDisposition>
> = Object.freeze({
  "literature-scan-v1": Object.freeze({
    kind: "required",
    procedureId: "literature-scan-v1",
    family: "research-literature",
    closureContractId:
      "closure-artifact-research-literature-methodology-closure-research-literature-json-cc3fe05d40",
    exactPath: "methodology/closure/research-literature.json",
    mediaType: "application/json",
  }),
  "literature-review-v1": Object.freeze({
    kind: "required",
    procedureId: "literature-review-v1",
    family: "research-literature",
    closureContractId:
      "closure-artifact-research-literature-methodology-closure-research-literature-json-cc3fe05d40",
    exactPath: "methodology/closure/research-literature.json",
    mediaType: "application/json",
  }),
  "idea-generation-v1": Object.freeze({
    kind: "required",
    procedureId: "idea-generation-v1",
    family: "research-ideation",
    closureContractId:
      "closure-artifact-research-ideation-methodology-closure-research-ideation-json-bf5f473b0a",
    exactPath: "methodology/closure/research-ideation.json",
    mediaType: "application/json",
  }),
  "idea-evaluation-v1": Object.freeze({
    kind: "required",
    procedureId: "idea-evaluation-v1",
    family: "research-idea-evaluation",
    closureContractId:
      "closure-artifact-research-idea-evaluation-methodology-closure-research-idea-evaluation-js-99210b58f8",
    exactPath: "methodology/closure/research-idea-evaluation.json",
    mediaType: "application/json",
  }),
  "experiment-campaign-v1": Object.freeze({
    kind: "required",
    procedureId: "experiment-campaign-v1",
    family: "research-experiment",
    closureContractId:
      "closure-artifact-research-experiment-methodology-closure-research-experiment-json-4d9725b89a",
    exactPath: "methodology/closure/research-experiment.json",
    mediaType: "application/json",
  }),
  "experiment-round-v1": Object.freeze({
    kind: "required",
    procedureId: "experiment-round-v1",
    family: "research-experiment",
    closureContractId:
      "closure-artifact-research-experiment-methodology-closure-research-experiment-json-4d9725b89a",
    exactPath: "methodology/closure/research-experiment.json",
    mediaType: "application/json",
  }),
  "project-setup-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "project-setup-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_PROJECT_SETUP",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "quest-framing-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "quest-framing-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_QUEST_FRAMING",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "quest-admin-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "quest-admin-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_QUEST_ADMIN",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "survey-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "survey-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_SURVEY",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "computation-case-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "computation-case-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_COMPUTATION",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "theory-case-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "theory-case-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_THEORY",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "review-case-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "review-case-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_REVIEW_CASE",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "review-campaign-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "review-campaign-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_REVIEW_CAMPAIGN",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "writing-case-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "writing-case-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_WRITING",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "figure-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "figure-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_FIGURE",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
  "slides-v1": Object.freeze({
    kind: "notApplicable",
    procedureId: "slides-v1",
    code: "V13_CLOSURE_NOT_APPLICABLE_SLIDES",
    rationale: NOT_APPLICABLE_RATIONALE,
  }),
});

export function resolveProcedureClosureDisposition(
  procedureId: string,
): V13ProcedureClosureDisposition {
  const disposition = V13_PROCEDURE_CLOSURE_DISPOSITIONS[procedureId];
  if (disposition === undefined) {
    fail(
      "V13_UNKNOWN_PROCEDURE",
      `Procedure '${procedureId}' is not in the closed 17-Procedure v1.3 set`,
    );
  }
  return disposition;
}

/** Exact-path closure membership: no suffix, substring, or regex authority. */
export function isV13ClosureArtifactExactPath(candidatePath: string): boolean {
  return V13_CLOSURE_ARTIFACT_SPECS.some(
    (spec) => spec.exactPath === candidatePath,
  );
}

export function findV13ClosureArtifactSpecForFamily(
  family: string,
): V13ClosureArtifactRefSpec | undefined {
  return V13_CLOSURE_ARTIFACT_SPECS.find((spec) => spec.family === family);
}

/**
 * Closed 17-Procedure lifecycle-family mapping derived from the accepted A3
 * artifact lifecycle contract. Families without lifecycle artifacts (survey,
 * writing, figure, slides) are null — their artifact bindings are not
 * applicable and must never be defaulted to a smaller authority set.
 */
export const V13_PROCEDURE_LIFECYCLE_FAMILIES: Readonly<
  Record<string, string | null>
> = Object.freeze({
  "project-setup-v1": "research-project-setup",
  "quest-framing-v1": "research-quest",
  "quest-admin-v1": "research-quest-admin",
  "literature-scan-v1": "research-literature",
  "literature-review-v1": "research-literature",
  "survey-v1": null,
  "idea-generation-v1": "research-ideation",
  "idea-evaluation-v1": "research-idea-evaluation",
  "experiment-round-v1": "research-experiment",
  "experiment-campaign-v1": "research-experiment-campaign",
  "computation-case-v1": "research-computation",
  "theory-case-v1": "research-computation",
  "review-case-v1": "research-review-case",
  "review-campaign-v1": "research-review-campaign",
  "writing-case-v1": null,
  "figure-v1": null,
  "slides-v1": null,
});

export function resolveProcedureLifecycleFamily(
  procedureId: string,
): string | null {
  if (!(procedureId in V13_PROCEDURE_LIFECYCLE_FAMILIES)) {
    fail(
      "V13_UNKNOWN_PROCEDURE",
      `Procedure '${procedureId}' is not in the closed 17-Procedure v1.3 set`,
    );
  }
  return V13_PROCEDURE_LIFECYCLE_FAMILIES[procedureId];
}

/**
 * Exact ArtifactRef-derived lifecycle input (replaces parallel path/digest
 * authority). The submitted media type and SHA-256 are never replaced with
 * expected contract values.
 */
export interface V13ArtifactRefFact {
  readonly artifactId: string;
  readonly repositoryId?: string;
  readonly resolvedRepositoryIdentity?: string;
  readonly exactPath: string;
  readonly submittedMediaType?: string;
  readonly submittedSha256?: string;
  readonly present: boolean;
}

const ALLOWED_V13_RULE_KINDS = Object.freeze([
  ...V13_LIFECYCLE_DIMENSIONS.map((d) => `artifact.${d}`),
  "closure.schema",
  "closure.evidence",
  "closure.xor",
  "closure.status-inference",
  "closure.worker-boundary",
  "validator.binding-integrity",
  "report.v2-binding",
  "authority.worker-boundary",
  "contract.output-disposition",
  "contract.blocked-output-kind",
  "contract.closure-applicability",
  "contract.canonical-bytes",
  "contract.compatibility",
  "contract.candidate-authority",
  "contract.differential-domains",
  "contract.conditional-artifacts",
] as const);

function dimensionFromArtifactRuleKind(ruleKind: string): V13LifecycleDimension | undefined {
  if (!ruleKind.startsWith("artifact.")) return undefined;
  const name = ruleKind.slice("artifact.".length);
  return (V13_LIFECYCLE_DIMENSIONS as readonly string[]).includes(name)
    ? (name as V13LifecycleDimension)
    : undefined;
}

/**
 * Validate all 876 binding rows' cross-links: target identity, applicable rule
 * kind, validator identity/version/severity, and duplicate logical bindings.
 * Duplicate logical bindings (same targetId + ruleKind + validator key) are
 * critical per the accepted binding-matrix disposition.
 */
export function validateV13BindingCrossLinks(pack: V13AcceptedContractPack): {
  readonly ok: boolean;
  readonly findings: readonly { bindingId: string; code: string; message: string }[];
} {
  const findings: { bindingId: string; code: string; message: string }[] = [];
  const artifactsById = new Map(
    pack.artifacts.map((a) => [a.artifactId, a] as const),
  );
  const validatorKeys = new Set(
    pack.validators.map((v) => `${v.identity.id}@${v.identity.version}`),
  );
  const logical = new Set<string>();
  for (const binding of pack.bindings) {
    const ruleKind = binding.ruleKind;
    if (!(ALLOWED_V13_RULE_KINDS as readonly string[]).includes(ruleKind)) {
      findings.push({
        bindingId: binding.bindingId,
        code: "V13_BINDING_RULEKIND_INVALID",
        message: `Binding ruleKind '${ruleKind}' is not an accepted v1.3 rule kind`,
      });
      continue;
    }
    if (ruleKind.startsWith("artifact.")) {
      const target = artifactsById.get(binding.targetId);
      if (target === undefined) {
        findings.push({
          bindingId: binding.bindingId,
          code: "V13_BINDING_TARGET_UNRESOLVED",
          message: `Binding artifact target '${binding.targetId}' is not a lifecycle artifact`,
        });
      }
      if (dimensionFromArtifactRuleKind(ruleKind) === undefined) {
        findings.push({
          bindingId: binding.bindingId,
          code: "V13_BINDING_DIMENSION_INVALID",
          message: `Binding ruleKind '${ruleKind}' has no lifecycle dimension`,
        });
      }
    }
    const validatorKey = `${binding.validator.id}@${binding.validator.version}`;
    if (!validatorKeys.has(validatorKey)) {
      findings.push({
        bindingId: binding.bindingId,
        code: "V13_UNKNOWN_VALIDATOR",
        message: `Binding references untrusted validator ${validatorKey}`,
      });
    }
    if (binding.validator.severity !== "critical") {
      findings.push({
        bindingId: binding.bindingId,
        code: "V13_SEVERITY_DOWNGRADE",
        message: `Binding severity '${binding.validator.severity}' must be critical`,
      });
    }
    const logicalKey = `${binding.targetId}\0${ruleKind}\0${validatorKey}`;
    if (logical.has(logicalKey)) {
      findings.push({
        bindingId: binding.bindingId,
        code: "V13_VALIDATOR_BINDING_INVALID",
        message: `Duplicate logical binding target=${binding.targetId} ruleKind=${ruleKind} validator=${validatorKey}`,
      });
    }
    logical.add(logicalKey);
  }
  return { ok: findings.length === 0, findings: Object.freeze(findings) };
}

export interface V13ApplicableBinding {
  readonly binding: V13ValidatorBinding;
  readonly sourceRowIndex: number;
  readonly target?: V13ArtifactLifecycleRow;
  readonly dimension?: V13LifecycleDimension;
  readonly isGlobal: boolean;
}

/**
 * Resolve bindings applicable to one exact Procedure. Artifact rules apply
 * only when the Procedure's lifecycle family owns the target artifact; closure
 * rules apply only to the six closure-required Procedures; global contract/
 * validator/report/authority rules apply to every Procedure. Never
 * deduplicates bindings into a smaller authority set.
 */
export function selectApplicableV13BindingsForProcedure(input: {
  readonly pack: V13AcceptedContractPack;
  readonly procedureId: string;
}): readonly V13ApplicableBinding[] {
  const crossLink = validateV13BindingCrossLinks(input.pack);
  if (!crossLink.ok) {
    fail(
      "V13_BINDING_CROSSLINK_INVALID",
      `Binding cross-link validation failed: ${crossLink.findings.map((f) => `${f.bindingId}:${f.code}`).join(",")}`,
    );
  }
  const lifecycleFamily = resolveProcedureLifecycleFamily(input.procedureId);
  const closureDisposition = resolveProcedureClosureDisposition(input.procedureId);
  const familyTargetIds = new Set(
    lifecycleFamily === null
      ? []
      : input.pack.artifacts
          .filter((a) => a.family === lifecycleFamily)
          .map((a) => a.artifactId),
  );
  const artifactsById = new Map(
    input.pack.artifacts.map((a) => [a.artifactId, a] as const),
  );
  const selected: V13ApplicableBinding[] = [];
  input.pack.bindings.forEach((binding, sourceRowIndex) => {
    const ruleKind = binding.ruleKind;
    const isGlobal = !ruleKind.startsWith("artifact.");
    const isClosureRule = ruleKind.startsWith("closure.");
    if (isClosureRule && closureDisposition.kind !== "required") {
      return; // N/A family: closure bindings are not applicable.
    }
    if (!isGlobal) {
      if (lifecycleFamily === null) return; // no lifecycle artifacts for this Procedure
      if (!familyTargetIds.has(binding.targetId)) return;
    }
    const target = artifactsById.get(binding.targetId);
    selected.push(
      Object.freeze({
        binding,
        sourceRowIndex,
        target,
        dimension: dimensionFromArtifactRuleKind(ruleKind),
        isGlobal,
      }),
    );
  });
  return Object.freeze(selected);
}

/**
 * Invocation row for one binding executed independently (even when multiple
 * rows share one validator implementation).
 */
export interface V13BindingInvocationRow {
  readonly bindingId: string;
  readonly sourceRowIndex: number;
  readonly validatorId: string;
  readonly validatorVersion: string;
  readonly targetId: string;
  readonly dimension?: V13LifecycleDimension;
  readonly ruleKind: string;
  readonly factSource: string;
  readonly factValue: unknown;
  readonly outcome: "pass" | "fail-closed";
  readonly findingCode?: string;
}

export interface V13BindingExecutionResult {
  readonly applicableCount: number;
  readonly invocationCount: number;
  readonly ok: boolean;
  readonly criticalFailure: boolean;
  readonly invocations: readonly V13BindingInvocationRow[];
}

/**
 * Execute every applicable binding independently with an exact fact per
 * binding. Fail closed when an applicable target is unresolved, a required
 * fact is unresolved, a trusted validator implementation is missing, or the
 * invocation count differs from the applicable binding count.
 */
export function executeV13BindingInvocations(input: {
  readonly pack: V13AcceptedContractPack;
  readonly applicableBindings: readonly V13ApplicableBinding[];
  readonly factForBinding: (
    binding: V13ApplicableBinding,
  ) => { readonly source: string; readonly value: unknown } | undefined;
  readonly invoke: (
    binding: V13ApplicableBinding,
    fact: { readonly source: string; readonly value: unknown },
  ) => { readonly pass: boolean; readonly findingCode?: string };
}): V13BindingExecutionResult {
  const invocations: V13BindingInvocationRow[] = [];
  const applicable = input.applicableBindings;
  for (const applicableBinding of applicable) {
    if (applicableBinding.binding.validator.severity !== "critical") {
      fail("V13_SEVERITY_DOWNGRADE", "Applicable binding severity must be critical");
    }
    const fact = input.factForBinding(applicableBinding);
    if (fact === undefined) {
      fail(
        "V13_APPLICABLE_FACT_UNRESOLVED",
        `Applicable binding ${applicableBinding.binding.bindingId} has no required fact`,
      );
    }
    const result = input.invoke(applicableBinding, fact);
    invocations.push(
      Object.freeze({
        bindingId: applicableBinding.binding.bindingId,
        sourceRowIndex: applicableBinding.sourceRowIndex,
        validatorId: applicableBinding.binding.validator.id,
        validatorVersion: applicableBinding.binding.validator.version,
        targetId: applicableBinding.binding.targetId,
        dimension: applicableBinding.dimension,
        ruleKind: applicableBinding.binding.ruleKind,
        factSource: fact.source,
        factValue: fact.value,
        outcome: result.pass ? ("pass" as const) : ("fail-closed" as const),
        findingCode: result.findingCode,
      }),
    );
  }
  if (invocations.length !== applicable.length) {
    fail(
      "V13_INVOCATION_COUNT_MISMATCH",
      `Invocation count ${invocations.length} != applicable binding count ${applicable.length}`,
    );
  }
  const failed = invocations.filter((i) => i.outcome === "fail-closed");
  const criticalFailure = failed.length > 0;
  return Object.freeze({
    applicableCount: applicable.length,
    invocationCount: invocations.length,
    ok: !criticalFailure,
    criticalFailure,
    invocations: Object.freeze(invocations),
  });
}

// ===========================================================================
// CS5-2 — ArtifactRef-derived lifecycle dimension enforcement.
// ===========================================================================

export interface V13LifecycleDimensionFinding {
  readonly artifactId: string;
  readonly publicIdentity: string;
  readonly dimension: V13LifecycleDimension;
  readonly code: string;
  readonly message: string;
}

const V13_ARTIFACT_ID_UUID_RE =
  /^art_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function pathBasename(p: string): string {
  const idx = p.lastIndexOf("/");
  return idx === -1 ? p : p.slice(idx + 1);
}

function matchLifecycleRowToFact(
  row: V13ArtifactLifecycleRow,
  fact: V13ArtifactRefFact,
): boolean {
  if (fact.exactPath === row.publicIdentity) return true;
  return pathBasename(fact.exactPath) === row.publicIdentity;
}

/**
 * Enforce every accepted lifecycle dimension from authenticated A3 rows using
 * exact ArtifactRef-derived facts. The submitted media type is never replaced
 * with an expected contract value; Result.status is never consulted.
 */
export function enforceV13LifecycleDimensionsFromArtifactRefs(input: {
  readonly pack: V13AcceptedContractPack;
  readonly procedureId: string;
  readonly artifactRefFacts: readonly V13ArtifactRefFact[];
  readonly terminalState?: string;
  readonly dispatchContext?: Readonly<{
    readonly questId: string;
    readonly dispatchId: string;
    readonly activationId: string;
    readonly approvalId: string;
    readonly capabilityId: string;
  }>;
}): {
  readonly ok: boolean;
  readonly findings: readonly V13LifecycleDimensionFinding[];
} {
  const lifecycleFamily = resolveProcedureLifecycleFamily(input.procedureId);
  const findings: V13LifecycleDimensionFinding[] = [];
  const familyRows =
    lifecycleFamily === null
      ? []
      : input.pack.artifacts.filter((a) => a.family === lifecycleFamily);

  const pushFinding = (
    artifactId: string,
    publicIdentity: string,
    dimension: V13LifecycleDimension,
    code: string,
    message: string,
  ): void => {
    findings.push(
      Object.freeze({
        artifactId,
        publicIdentity,
        dimension,
        code,
        message,
      }),
    );
  };

  // Stable identity: every fact must carry a unique valid artifact identity.
  const seenArtifactIds = new Set<string>();
  for (const fact of input.artifactRefFacts) {
    if (seenArtifactIds.has(fact.artifactId)) {
      pushFinding(
        fact.artifactId,
        fact.exactPath,
        "crossArtifactConsistency",
        "V13_ARTIFACT_CROSS_CONSISTENCY_INVALID",
        `Duplicate artifactId '${fact.artifactId}' across ArtifactRefs (alias conflict)`,
      );
    }
    seenArtifactIds.add(fact.artifactId);
    const stableOk =
      V13_ARTIFACT_ID_UUID_RE.test(fact.artifactId) ||
      V13_CLOSURE_ARTIFACT_SPECS.some(
        (spec) => spec.closureContractId === fact.artifactId,
      );
    if (!stableOk) {
      pushFinding(
        fact.artifactId,
        fact.exactPath,
        "stableId",
        "V13_ARTIFACT_STABLE_ID_INVALID",
        `ArtifactRef id '${fact.artifactId}' is not a valid v1.3 stable artifact id`,
      );
    }
  }

  // Alias conflict: the same exact path bound twice with different ids.
  const pathToIds = new Map<string, string>();
  for (const fact of input.artifactRefFacts) {
    const existing = pathToIds.get(fact.exactPath);
    if (existing !== undefined && existing !== fact.artifactId) {
      pushFinding(
        fact.artifactId,
        fact.exactPath,
        "crossArtifactConsistency",
        "V13_ARTIFACT_CROSS_CONSISTENCY_INVALID",
        `Alias conflict: exact path '${fact.exactPath}' bound to both '${existing}' and '${fact.artifactId}'`,
      );
    }
    pathToIds.set(fact.exactPath, fact.artifactId);
  }

  if (lifecycleFamily === null) {
    // Families without lifecycle artifacts: any bound family artifact is an
    // undeclared/unauthorized production.
    for (const fact of input.artifactRefFacts) {
      const isClosure = isV13ClosureArtifactExactPath(fact.exactPath);
      if (!isClosure) {
        pushFinding(
          fact.artifactId,
          fact.exactPath,
          "producer",
          "V13_ARTIFACT_AUTHORITY_INVALID",
          `Procedure '${input.procedureId}' has no lifecycle artifacts; bound path '${fact.exactPath}' is undeclared`,
        );
      }
    }
  } else {
    const matched = new Set<string>();
    for (const row of familyRows) {
      const rowFacts = input.artifactRefFacts.filter((fact) =>
        matchLifecycleRowToFact(row, fact),
      );
      matched.add(row.publicIdentity);
      const dimensionRow = row.dimensions;

      // requiredness: every enforceable artifact is required-before-root-record.
      if (rowFacts.length === 0) {
        pushFinding(
          row.artifactId,
          row.publicIdentity,
          "requiredness",
          "V13_ARTIFACT_REQUIRED_MISSING",
          `Required lifecycle artifact '${row.publicIdentity}' has no bound ArtifactRef`,
        );
        continue;
      }

      // cardinality: 1 => exactly one fact; 1..* => one or more.
      const cardinalityValue = dimensionRow.cardinality.value;
      if (cardinalityValue === "1" && rowFacts.length !== 1) {
        pushFinding(
          row.artifactId,
          row.publicIdentity,
          "cardinality",
          "V13_ARTIFACT_CARDINALITY_INVALID",
          `Cardinality 1 requires exactly one ArtifactRef, got ${rowFacts.length}`,
        );
      }
      if (cardinalityValue === "1..*" && rowFacts.length === 0) {
        pushFinding(
          row.artifactId,
          row.publicIdentity,
          "cardinality",
          "V13_ARTIFACT_CARDINALITY_INVALID",
          `Cardinality 1..* requires at least one ArtifactRef`,
        );
      }

      for (const fact of rowFacts) {
        // mediaType: submitted media type must equal the accepted row value;
        // never replaced with an expected value.
        const acceptedMediaType = dimensionRow.mediaType.value;
        if (
          typeof acceptedMediaType === "string" &&
          fact.submittedMediaType !== acceptedMediaType
        ) {
          pushFinding(
            row.artifactId,
            row.publicIdentity,
            "mediaType",
            "V13_ARTIFACT_MEDIA_TYPE_INVALID",
            `Submitted mediaType '${fact.submittedMediaType ?? "(missing)"}' != accepted '${acceptedMediaType}'`,
          );
        }

        // repositoryArtifactRefRelation: artifactRef + digest required, exact
        // path binding.
        const relation = dimensionRow.repositoryArtifactRefRelation.value as
          | Record<string, unknown>
          | undefined;
        if (
          typeof relation?.artifactRefRequired === "boolean" &&
          relation.artifactRefRequired === true &&
          fact.present !== true
        ) {
          pushFinding(
            row.artifactId,
            row.publicIdentity,
            "repositoryArtifactRefRelation",
            "V13_ARTIFACT_REF_BINDING_INVALID",
            "ArtifactRef required but fact is not present",
          );
        }
        if (
          typeof relation?.digestRequired === "boolean" &&
          relation.digestRequired === true &&
          typeof fact.submittedSha256 !== "string"
        ) {
          pushFinding(
            row.artifactId,
            row.publicIdentity,
            "repositoryArtifactRefRelation",
            "V13_ARTIFACT_REF_BINDING_INVALID",
            "Content digest required but ArtifactRef has no sha256",
          );
        }

        // provenance: required fields include repositoryId and sha256.
        if (typeof fact.repositoryId !== "string") {
          pushFinding(
            row.artifactId,
            row.publicIdentity,
            "provenance",
            "V13_ARTIFACT_PROVENANCE_INVALID",
            "ArtifactRef provenance requires repositoryId",
          );
        }
        if (fact.resolvedRepositoryIdentity === undefined) {
          pushFinding(
            row.artifactId,
            row.publicIdentity,
            "provenance",
            "V13_ARTIFACT_PROVENANCE_INVALID",
            "ArtifactRef repository root unresolved at record time",
          );
        }

        // crossArtifactConsistency: equal bindings across refs are enforced
        // through dispatch context equality (single dispatch context).
        const context = input.dispatchContext;
        if (context !== undefined) {
          for (const field of [
            ["questId", context.questId],
            ["dispatchId", context.dispatchId],
            ["activationId", context.activationId],
            ["approvalId", context.approvalId],
            ["capabilityId", context.capabilityId],
            ["repositoryId", fact.repositoryId],
          ] as const) {
            if (field[1] === undefined || field[1] === null || field[1] === "") {
              pushFinding(
                row.artifactId,
                row.publicIdentity,
                "crossArtifactConsistency",
                "V13_ARTIFACT_CROSS_CONSISTENCY_INVALID",
                `Equal binding '${field[0]}' is unresolved for artifact '${row.publicIdentity}'`,
              );
            }
          }
        }

        // immutableFieldsAndMutationAuthority: artifactRef identity fields are
        // immutable; a mutated (post-authoring) id/path is rejected.
        const immutable = dimensionRow.immutableFieldsAndMutationAuthority
          .value as { immutableFields?: readonly unknown[] } | undefined;
        if (
          Array.isArray(immutable?.immutableFields) &&
          immutable.immutableFields.includes("artifactRef.sha256") &&
          typeof fact.submittedSha256 !== "string"
        ) {
          pushFinding(
            row.artifactId,
            row.publicIdentity,
            "immutableFieldsAndMutationAuthority",
            "V13_ARTIFACT_IMMUTABILITY_INVALID",
            "Immutable artifactRef.sha256 must be declared on the ArtifactRef",
          );
        }
      }
    }

    // Unexpected bound artifacts: a fact matching no family row (and no
    // closure artifact) is undeclared production.
    for (const fact of input.artifactRefFacts) {
      if (isV13ClosureArtifactExactPath(fact.exactPath)) continue;
      const anyMatch = familyRows.some((row) => matchLifecycleRowToFact(row, fact));
      if (!anyMatch) {
        pushFinding(
          fact.artifactId,
          fact.exactPath,
          "producer",
          "V13_ARTIFACT_AUTHORITY_INVALID",
          `Bound path '${fact.exactPath}' matches no lifecycle artifact of family '${lifecycleFamily}'`,
        );
      }
    }
    void matched;
  }

  // terminalApplicability: resultStatusIndependent — Result.status never gates
  // lifecycle enforcement. When a terminal state is supplied it must be
  // consistent with the accepted closed terminal sets of every bound row.
  if (lifecycleFamily !== null && input.terminalState !== undefined) {
    for (const row of familyRows) {
      const terminal = row.dimensions.terminalApplicability.value as
        | { resultStatusIndependent?: boolean; appliesOn?: unknown }
        | undefined;
      if (terminal?.resultStatusIndependent !== true) {
        pushFinding(
          row.artifactId,
          row.publicIdentity,
          "terminalApplicability",
          "V13_ARTIFACT_TERMINAL_APPLICABILITY_INVALID",
          "Lifecycle enforcement must be Result.status-independent under v1.3",
        );
      }
    }
  }

  return {
    ok: findings.length === 0,
    findings: Object.freeze(findings),
  };
}
