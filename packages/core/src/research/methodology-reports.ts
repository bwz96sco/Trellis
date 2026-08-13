import { createHash } from "node:crypto";

import type { MethodologyValidationReport } from "./methodology-validators.js";
import {
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
} from "./procedure-support-pack.js";

export interface MethodologyDeterministicReport {
  readonly schemaVersion: 1;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion: string;
  readonly capabilityId?: string;
  readonly dispatchId?: string;
  readonly activationId?: string;
  readonly terminalState?: string;
  readonly validation: MethodologyValidationReport;
  readonly artifactDigests: readonly { path: string; sha256: string }[];
  readonly zeroWrite: boolean;
  readonly reportDigest: string;
}

/**
 * Additive report-v2 domain for evaluation-contract-v1.3.0.
 * Does not change report-v1 bytes or digest semantics.
 *
 * CS5-4 canonical framing:
 * - recursive lexicographic object-key ordering (UTF-8 byte order);
 * - preserved array order;
 * - UTF-8, no insignificant whitespace;
 * - digest body has NO trailing LF and EXCLUDES the digest field;
 * - domain separator `trellis-evaluation-report-v2\0` precedes the body.
 * Non-deterministically representable values are rejected at build time.
 */
export const METHODOLOGY_REPORT_V2_DIGEST_DOMAIN = new TextEncoder().encode(
  "trellis-evaluation-report-v2\0",
);

export interface MethodologyDeterministicReportV2 {
  readonly schemaVersion: 2;
  readonly reportV1: MethodologyDeterministicReport;
  readonly methodologyContractDigest?: string;
  readonly acceptedMemberAggregateSha256?: string;
  readonly supportInventoryDigest?: string;
  readonly policyDigest?: string;
  readonly requestDigest?: string;
  readonly scopeDigest?: string;
  readonly runId?: string;
  readonly proposalIds?: readonly string[];
  readonly resultIds?: readonly string[];
  readonly approvalIds?: readonly string[];
  readonly closureSource?: Readonly<Record<string, unknown>>;
  readonly closureArtifactRef?: Readonly<{
    readonly artifactId: string;
    readonly exactPath: string;
    readonly sha256: string;
    readonly mediaType: string;
  }>;
  readonly applicability?: readonly string[];
  readonly blockedByContract?: readonly string[];
  readonly operationContainment?: Readonly<Record<string, unknown>>;
  readonly artifactRefCount?: number;
  readonly lifecycleFindingCount?: number;
  readonly bindingApplicableCount?: number;
  readonly bindingInvocationCount?: number;
  readonly bindingInvocationLedgerDigest?: string;
  readonly resultId?: string;
  readonly proposalId?: string;
  readonly approvalId?: string;
  readonly idempotencyKey?: string;
  readonly batchHeadSeq?: number;
  readonly batchCommitted?: boolean;
  readonly zeroWriteDisposition: "full-tree-and-canonical-zero-write" | "success-sidecar-allowed";
  readonly reportDigest: string;
}

function canonicalString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Strict canonical JSON: recursive lexicographic keys (UTF-8 byte order),
 * preserved array order, no insignificant whitespace, no trailing LF.
 * Rejects non-deterministically representable values (undefined, NaN,
 * Infinity, BigInt, functions, symbols, cyclic structures).
 */
export function canonicalResearchJson(value: unknown): string {
  const seen = new Set<unknown>();
  const canonical = (current: unknown): string => {
    if (current === null) return "null";
    const type = typeof current;
    if (type === "string") return canonicalString(current as string);
    if (type === "boolean") return current ? "true" : "false";
    if (type === "number") {
      if (!Number.isFinite(current as number)) {
        throw new Error("Non-deterministic report number value");
      }
      return JSON.stringify(current);
    }
    if (type === "bigint") {
      throw new Error("Non-deterministic report BigInt value");
    }
    if (type === "undefined" || type === "function" || type === "symbol") {
      throw new Error("Non-deterministic report value");
    }
    if (seen.has(current)) {
      throw new Error("Cyclic report value");
    }
    seen.add(current);
    let out: string;
    if (Array.isArray(current)) {
      for (const element of current as unknown[]) {
        if (element === undefined) {
          throw new Error("Non-deterministic report array element");
        }
      }
      out = `[${(current as unknown[]).map(canonical).join(",")}]`;
    } else {
      const record = current as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort((a, b) =>
          Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8")),
        );
      out = `{${keys
        .map((key) => `${canonicalString(key)}:${canonical(record[key])}`)
        .join(",")}}`;
    }
    seen.delete(current);
    return out;
  };
  return canonical(value);
}

function digestBodyV1(body: unknown): string {
  // report-v1 bytes/digest semantics preserved exactly (no domain prefix).
  const canonical = `${JSON.stringify(body)}\n`;
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

/** Canonical digest body: no trailing LF, digest field excluded. */
function digestBodyV2(body: Record<string, unknown>): string {
  const hash = createHash("sha256");
  hash.update(METHODOLOGY_REPORT_V2_DIGEST_DOMAIN);
  hash.update(canonicalResearchJson(body));
  return `sha256:${hash.digest("hex")}`;
}

export function buildMethodologyReport(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion: string;
  readonly capabilityId?: string;
  readonly dispatchId?: string;
  readonly activationId?: string;
  readonly terminalState?: string;
  readonly validation: MethodologyValidationReport;
  readonly artifactDigests?: readonly { path: string; sha256: string }[];
  readonly zeroWrite?: boolean;
}): MethodologyDeterministicReport {
  const body = presentRecord({
    schemaVersion: 1 as const,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    methodologyContractVersion: input.methodologyContractVersion,
    capabilityId: input.capabilityId,
    dispatchId: input.dispatchId,
    activationId: input.activationId,
    terminalState: input.terminalState,
    validation: input.validation,
    artifactDigests: input.artifactDigests ?? [],
    zeroWrite: input.zeroWrite ?? input.validation.criticalFailure,
  });
  const reportDigest = digestBodyV1(body);
  return Object.freeze({ ...body, reportDigest }) as MethodologyDeterministicReport;
}

function presentRecord(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

export function buildMethodologyReportV2(input: {
  readonly reportV1: MethodologyDeterministicReport;
  readonly methodologyContractDigest?: string;
  readonly acceptedMemberAggregateSha256?: string;
  readonly supportInventoryDigest?: string;
  readonly policyDigest?: string;
  readonly requestDigest?: string;
  readonly scopeDigest?: string;
  readonly runId?: string;
  readonly proposalIds?: readonly string[];
  readonly resultIds?: readonly string[];
  readonly approvalIds?: readonly string[];
  readonly closureSource?: Readonly<Record<string, unknown>>;
  readonly closureArtifactRef?: Readonly<{
    readonly artifactId: string;
    readonly exactPath: string;
    readonly sha256: string;
    readonly mediaType: string;
  }>;
  readonly applicability?: readonly string[];
  readonly blockedByContract?: readonly string[];
  readonly operationContainment?: Readonly<Record<string, unknown>>;
  readonly artifactRefCount?: number;
  readonly lifecycleFindingCount?: number;
  readonly bindingApplicableCount?: number;
  readonly bindingInvocationCount?: number;
  readonly bindingInvocationLedgerDigest?: string;
  readonly resultId?: string;
  readonly proposalId?: string;
  readonly approvalId?: string;
  readonly idempotencyKey?: string;
  readonly batchHeadSeq?: number;
  readonly batchCommitted?: boolean;
}): MethodologyDeterministicReportV2 {
  const zeroWriteDisposition = input.reportV1.validation.criticalFailure
    ? ("full-tree-and-canonical-zero-write" as const)
    : ("success-sidecar-allowed" as const);
  const body = presentRecord({
    schemaVersion: 2 as const,
    reportV1: input.reportV1,
    methodologyContractDigest: input.methodologyContractDigest,
    acceptedMemberAggregateSha256: input.acceptedMemberAggregateSha256,
    supportInventoryDigest: input.supportInventoryDigest,
    policyDigest: input.policyDigest,
    requestDigest: input.requestDigest,
    scopeDigest: input.scopeDigest,
    runId: input.runId,
    proposalIds: input.proposalIds ?? [],
    resultIds: input.resultIds ?? [],
    approvalIds: input.approvalIds ?? [],
    closureSource: input.closureSource,
    closureArtifactRef: input.closureArtifactRef,
    applicability: input.applicability ?? [],
    blockedByContract: input.blockedByContract ?? [],
    operationContainment: input.operationContainment,
    artifactRefCount: input.artifactRefCount,
    lifecycleFindingCount: input.lifecycleFindingCount,
    bindingApplicableCount: input.bindingApplicableCount,
    bindingInvocationCount: input.bindingInvocationCount,
    bindingInvocationLedgerDigest: input.bindingInvocationLedgerDigest,
    resultId: input.resultId,
    proposalId: input.proposalId,
    approvalId: input.approvalId,
    idempotencyKey: input.idempotencyKey,
    batchHeadSeq: input.batchHeadSeq,
    batchCommitted: input.batchCommitted,
    zeroWriteDisposition,
  });
  const reportDigest = digestBodyV2(body);
  return Object.freeze({ ...body, reportDigest }) as MethodologyDeterministicReportV2;
}

/**
 * Sidecar materialization is only allowed after a successful atomic
 * Result/Proposal/approval-consumption batch (R2B boundary).
 */
export interface MethodologyReportV131ValidatorTriple {
  readonly id: string;
  readonly version: string;
  readonly severity: "critical" | "error" | "warning";
}

export interface MethodologyReportV131Finding {
  readonly validator: MethodologyReportV131ValidatorTriple;
  readonly targetId: string;
  readonly stableError: string;
  readonly factPointer: string;
}

export interface MethodologyDeterministicReportV131 {
  readonly $schema: "https://json-schema.org/draft/2020-12/schema";
  readonly activationId: string;
  readonly applicability: readonly Readonly<Record<string, unknown>>[];
  readonly approvalId: string;
  readonly artifactBindings: readonly Readonly<Record<string, unknown>>[];
  readonly blockedFacts: readonly Readonly<Record<string, unknown>>[];
  readonly closureSources: readonly Readonly<Record<string, unknown>>[];
  readonly dispatchId: string;
  readonly methodologyDigest: string;
  readonly methodologyIdentity: string;
  readonly orderedFindings: readonly MethodologyReportV131Finding[];
  readonly orderedValidatorTriples: readonly MethodologyReportV131ValidatorTriple[];
  readonly procedureDigest: string;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly questId: string;
  readonly schemaVersion: 2;
  readonly supportInventoryDigest: string;
  readonly zeroWriteDisposition:
    | "validation-complete-before-write"
    | "rejected-before-write"
    | "validator-not-run-no-write";
}

const V131_REPORT_KEYS = Object.freeze([
  "$schema",
  "activationId",
  "applicability",
  "approvalId",
  "artifactBindings",
  "blockedFacts",
  "closureSources",
  "dispatchId",
  "methodologyDigest",
  "methodologyIdentity",
  "orderedFindings",
  "orderedValidatorTriples",
  "procedureDigest",
  "procedureId",
  "procedureVersion",
  "questId",
  "schemaVersion",
  "supportInventoryDigest",
  "zeroWriteDisposition",
] as const);

const V131_ARTIFACT_FAMILIES = Object.freeze([
  "research-review-case",
  "research-review-campaign",
  "research-project-setup",
  "research-experiment-campaign",
  "research-computation",
  "research-quest",
  "research-quest-admin",
  "research-literature",
  "research-ideation",
  "research-idea-evaluation",
  "research-experiment",
] as const);

const V131_CLOSURE_FAMILIES = Object.freeze([
  "research-literature",
  "research-ideation",
  "research-idea-evaluation",
  "research-experiment",
] as const);

const V131_ACCEPTED_VALIDATOR_TRIPLES = Object.freeze(
  [
    "trellis.artifact.requiredness",
    "trellis.artifact.cardinality",
    "trellis.artifact.media-type",
    "trellis.artifact.authority",
    "trellis.artifact.ref-binding",
    "trellis.artifact.stable-id",
    "trellis.artifact.provenance",
    "trellis.artifact.dependencies",
    "trellis.artifact.immutability",
    "trellis.artifact.transitions",
    "trellis.artifact.terminal-applicability",
    "trellis.artifact.cross-consistency",
    "trellis.closure.schema",
    "trellis.closure.evidence",
    "trellis.closure.xor",
    "trellis.closure.status-inference",
    "trellis.authority.worker-boundary",
    "trellis.validator.binding-integrity",
    "trellis.report.v2-binding",
    "trellis.contract.integrity",
  ].map((id) => Object.freeze({ id, version: "1.0.0", severity: "critical" as const })),
);

function assertPattern(value: unknown, pattern: RegExp, label: string): asserts value is string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`v1.3.1 report ${label} is invalid`);
  }
}

function assertClosedKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    throw new Error(`v1.3.1 report ${label} has unknown or missing keys`);
  }
}

function assertV131UniqueItems(values: readonly unknown[], label: string): void {
  const keys = values.map((value) => canonicalResearchJson(value));
  if (new Set(keys).size !== keys.length) {
    throw new Error(`v1.3.1 report ${label} items must be unique`);
  }
}

function assertV131NestedSchema(input: {
  readonly applicability: readonly Readonly<Record<string, unknown>>[];
  readonly artifactBindings: readonly Readonly<Record<string, unknown>>[];
  readonly blockedFacts: readonly Readonly<Record<string, unknown>>[];
  readonly closureSources: readonly Readonly<Record<string, unknown>>[];
  readonly orderedFindings: readonly MethodologyReportV131Finding[];
}): void {
  if (input.applicability.length > 876) {
    throw new Error("v1.3.1 report applicability exceeds 876 items");
  }
  for (const row of input.applicability) {
    assertClosedKeys(row, ["applies", "bindingId", "reason"], "applicability row");
    if (
      typeof row.applies !== "boolean" ||
      typeof row.bindingId !== "string" ||
      !/^binding-/.test(row.bindingId) ||
      !["family-match", "mapping-not-applicable", "family-mismatch", "global", "closure"].includes(
        row.reason as string,
      )
    ) {
      throw new Error("v1.3.1 report applicability row is invalid");
    }
  }
  assertV131UniqueItems(input.applicability, "applicability");

  if (input.artifactBindings.length > 876) {
    throw new Error("v1.3.1 report artifactBindings exceeds 876 items");
  }
  for (const row of input.artifactBindings) {
    assertClosedKeys(
      row,
      ["applicable", "artifactId", "bindingId", "mapping", "targetArtifactFamily", "targetId"],
      "artifactBindings row",
    );
    const mapping = row.mapping;
    if (typeof mapping !== "object" || mapping === null || Array.isArray(mapping)) {
      throw new Error("v1.3.1 report artifactBindings mapping is invalid");
    }
    const mappingRecord = mapping as Readonly<Record<string, unknown>>;
    assertClosedKeys(mappingRecord, ["artifactFamily", "disposition"], "artifactBindings mapping");
    const mappingApplicable =
      mappingRecord.disposition === "applicable" &&
      typeof mappingRecord.artifactFamily === "string" &&
      (V131_ARTIFACT_FAMILIES as readonly string[]).includes(mappingRecord.artifactFamily);
    const mappingNotApplicable =
      mappingRecord.disposition === "notApplicable" && mappingRecord.artifactFamily === null;
    if (
      typeof row.applicable !== "boolean" ||
      typeof row.artifactId !== "string" ||
      row.artifactId.length === 0 ||
      typeof row.bindingId !== "string" ||
      !/^binding-/.test(row.bindingId) ||
      typeof row.targetArtifactFamily !== "string" ||
      !(V131_ARTIFACT_FAMILIES as readonly string[]).includes(row.targetArtifactFamily) ||
      typeof row.targetId !== "string" ||
      row.targetId.length === 0 ||
      (!mappingApplicable && !mappingNotApplicable)
    ) {
      throw new Error("v1.3.1 report artifactBindings row is invalid");
    }
  }
  assertV131UniqueItems(input.artifactBindings, "artifactBindings");

  if (input.blockedFacts.length > 876) {
    throw new Error("v1.3.1 report blockedFacts exceeds 876 items");
  }
  for (const row of input.blockedFacts) {
    assertClosedKeys(row, ["factPointer", "reason"], "blockedFacts row");
    if (
      typeof row.factPointer !== "string" ||
      !/^\//.test(row.factPointer) ||
      !["missing", "unknown", "contradictory", "aliased", "ambiguous", "unauthenticated"].includes(
        row.reason as string,
      )
    ) {
      throw new Error("v1.3.1 report blockedFacts row is invalid");
    }
  }
  assertV131UniqueItems(input.blockedFacts, "blockedFacts");

  if (input.closureSources.length > 4) {
    throw new Error("v1.3.1 report closureSources exceeds 4 items");
  }
  for (const row of input.closureSources) {
    assertClosedKeys(row, ["digest", "family", "sourceId"], "closureSources row");
    if (
      typeof row.digest !== "string" ||
      !/^sha256:[0-9a-f]{64}$/.test(row.digest) ||
      typeof row.family !== "string" ||
      !(V131_CLOSURE_FAMILIES as readonly string[]).includes(row.family) ||
      typeof row.sourceId !== "string" ||
      row.sourceId.length === 0
    ) {
      throw new Error("v1.3.1 report closureSources row is invalid");
    }
  }
  assertV131UniqueItems(input.closureSources, "closureSources");

  if (input.orderedFindings.length > 876) {
    throw new Error("v1.3.1 report orderedFindings exceeds 876 items");
  }
  for (const finding of input.orderedFindings) {
    assertClosedKeys(
      finding as unknown as Readonly<Record<string, unknown>>,
      ["factPointer", "stableError", "targetId", "validator"],
      "orderedFindings row",
    );
    assertClosedKeys(
      finding.validator as unknown as Readonly<Record<string, unknown>>,
      ["id", "severity", "version"],
      "orderedFindings validator",
    );
    if (
      !/^\//.test(finding.factPointer) ||
      !/^V13_/.test(finding.stableError) ||
      finding.targetId.length === 0 ||
      finding.validator.id.length === 0 ||
      finding.validator.version.length === 0 ||
      !["critical", "error", "warning"].includes(finding.validator.severity)
    ) {
      throw new Error("v1.3.1 report orderedFindings row is invalid");
    }
  }
  assertV131UniqueItems(input.orderedFindings, "orderedFindings");
}

function assertV131FindingOrder(
  findings: readonly MethodologyReportV131Finding[],
): void {
  const key = (finding: MethodologyReportV131Finding): string =>
    [
      finding.validator.id,
      finding.validator.version,
      finding.targetId,
      finding.stableError,
      finding.factPointer,
    ].join("\0");
  for (let index = 1; index < findings.length; index += 1) {
    const previous = findings[index - 1];
    const current = findings[index];
    if (previous !== undefined && current !== undefined && key(previous) > key(current)) {
      throw new Error("v1.3.1 report orderedFindings are not in canonical order");
    }
  }
}

/** Build the accepted v1.3.1 closed report-v2 body; digest remains outside it. */
export function buildMethodologyReportV131(input: {
  readonly $schema: "https://json-schema.org/draft/2020-12/schema";
  readonly activationId: string;
  readonly applicability: readonly Readonly<Record<string, unknown>>[];
  readonly approvalId: string;
  readonly artifactBindings: readonly Readonly<Record<string, unknown>>[];
  readonly blockedFacts: readonly Readonly<Record<string, unknown>>[];
  readonly closureSources: readonly Readonly<Record<string, unknown>>[];
  readonly dispatchId: string;
  readonly methodologyDigest: string;
  readonly methodologyIdentity: string;
  readonly orderedFindings: readonly MethodologyReportV131Finding[];
  readonly orderedValidatorTriples: readonly MethodologyReportV131ValidatorTriple[];
  readonly procedureDigest: string;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly questId: string;
  readonly schemaVersion: 2;
  readonly supportInventoryDigest: string;
  readonly zeroWriteDisposition:
    | "validation-complete-before-write"
    | "rejected-before-write"
    | "validator-not-run-no-write";
}): MethodologyDeterministicReportV131 {
  for (const key of Object.keys(input)) {
    if (!(V131_REPORT_KEYS as readonly string[]).includes(key)) {
      throw new Error(`v1.3.1 report has unknown key '${key}'`);
    }
  }
  if (input.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error("v1.3.1 report $schema is invalid");
  }
  if (input.schemaVersion !== 2 || input.procedureVersion !== "2.0.7") {
    throw new Error("v1.3.1 report requires schemaVersion 2 and Procedure 2.0.7");
  }
  assertPattern(input.activationId, /^act_/, "activationId");
  assertPattern(input.approvalId, /^apr_/, "approvalId");
  assertPattern(input.dispatchId, /^dsp_/, "dispatchId");
  assertPattern(input.questId, /^qst_/, "questId");
  const acceptedMethodologyDigest = V131_ACCEPTED_CONTRACT_DIGEST.slice(
    "sha256:".length,
  );
  if (input.methodologyIdentity !== V131_ACCEPTED_CONTRACT_VERSION) {
    throw new Error("v1.3.1 report methodologyIdentity is not the accepted identity");
  }
  if (input.methodologyDigest !== acceptedMethodologyDigest) {
    throw new Error("v1.3.1 report methodologyDigest is not the accepted digest");
  }
  assertPattern(input.procedureDigest, /^sha256:[0-9a-f]{64}$/, "procedureDigest");
  assertPattern(
    input.supportInventoryDigest,
    /^sha256:[0-9a-f]{64}$/,
    "supportInventoryDigest",
  );
  if (input.orderedValidatorTriples.length !== 20) {
    throw new Error("v1.3.1 report requires exactly 20 ordered validator triples");
  }
  for (const [index, triple] of input.orderedValidatorTriples.entries()) {
    assertClosedKeys(
      triple as unknown as Readonly<Record<string, unknown>>,
      ["id", "severity", "version"],
      "validator triple",
    );
    const accepted = V131_ACCEPTED_VALIDATOR_TRIPLES[index];
    if (
      triple.id !== accepted?.id ||
      triple.version !== accepted?.version ||
      triple.severity !== accepted?.severity
    ) {
      throw new Error(
        "v1.3.1 report requires the exact ordered trusted validator triples",
      );
    }
  }
  assertV131NestedSchema(input);
  assertV131FindingOrder(input.orderedFindings);
  return Object.freeze({ ...input });
}

export function shouldMaterializeMethodologyReportSidecar(input: {
  readonly validationOk: boolean;
  readonly criticalFailure: boolean;
  readonly batchCommitted: boolean;
}): boolean {
  return (
    input.validationOk &&
    !input.criticalFailure &&
    input.batchCommitted === true
  );
}

/**
 * Same-key recovery: rebuild report-v2 sidecar bytes from a committed report
 * object without new events, worker rerun, or Approval consumption.
 * Sidecar file form is canonical JSON with one final LF; the digest body
 * itself has no trailing LF.
 */
export function serializeMethodologyReportV2Sidecar(
  report: MethodologyDeterministicReportV2,
): string {
  return `${canonicalResearchJson(report)}\n`;
}

/** Serialize accepted v1.3.1 report bytes while authenticating its external digest. */
export function serializeMethodologyReportV131Sidecar(input: {
  readonly report: MethodologyDeterministicReportV131;
  readonly reportDigest: string;
}): string {
  buildMethodologyReportV131(input.report);
  const body = { ...input.report } as Record<string, unknown>;
  if (digestBodyV2(body) !== input.reportDigest) {
    throw new Error("Methodology report-v2 digest drift");
  }
  return `${canonicalResearchJson(input.report)}\n`;
}

/**
 * Known-answer digest vector helper for report-v2 domain framing tests.
 * `canonicalJsonBody` is the canonical JSON body WITHOUT a trailing LF and
 * WITHOUT the digest field.
 */
export function computeMethodologyReportV2DigestFromCanonicalBody(
  canonicalJsonBody: string,
): string {
  const hash = createHash("sha256");
  hash.update(METHODOLOGY_REPORT_V2_DIGEST_DOMAIN);
  hash.update(canonicalJsonBody);
  return `sha256:${hash.digest("hex")}`;
}
