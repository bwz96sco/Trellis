import { createHash } from "node:crypto";

import type { MethodologyValidationReport } from "./methodology-validators.js";

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
