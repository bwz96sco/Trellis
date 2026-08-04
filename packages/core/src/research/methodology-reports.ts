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
 */
export interface MethodologyDeterministicReportV2 {
  readonly schemaVersion: 2;
  readonly reportV1: MethodologyDeterministicReport;
  readonly methodologyContractDigest?: string;
  readonly supportInventoryDigest?: string;
  readonly policyDigest?: string;
  readonly requestDigest?: string;
  readonly scopeDigest?: string;
  readonly runId?: string;
  readonly proposalIds?: readonly string[];
  readonly resultIds?: readonly string[];
  readonly approvalIds?: readonly string[];
  readonly closureSource?: Readonly<Record<string, unknown>>;
  readonly applicability?: readonly string[];
  readonly blockedByContract?: readonly string[];
  readonly operationContainment?: Readonly<Record<string, unknown>>;
  readonly zeroWriteDisposition: "full-tree-and-canonical-zero-write" | "success-sidecar-allowed";
  readonly reportDigest: string;
}

function digestBody(body: unknown): string {
  const canonical = `${JSON.stringify(body)}\n`;
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
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
  const body = {
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
  };
  const reportDigest = digestBody(body);
  return Object.freeze({ ...body, reportDigest });
}

export function buildMethodologyReportV2(input: {
  readonly reportV1: MethodologyDeterministicReport;
  readonly methodologyContractDigest?: string;
  readonly supportInventoryDigest?: string;
  readonly policyDigest?: string;
  readonly requestDigest?: string;
  readonly scopeDigest?: string;
  readonly runId?: string;
  readonly proposalIds?: readonly string[];
  readonly resultIds?: readonly string[];
  readonly approvalIds?: readonly string[];
  readonly closureSource?: Readonly<Record<string, unknown>>;
  readonly applicability?: readonly string[];
  readonly blockedByContract?: readonly string[];
  readonly operationContainment?: Readonly<Record<string, unknown>>;
}): MethodologyDeterministicReportV2 {
  const zeroWriteDisposition = input.reportV1.validation.criticalFailure
    ? ("full-tree-and-canonical-zero-write" as const)
    : ("success-sidecar-allowed" as const);
  const body = {
    schemaVersion: 2 as const,
    reportV1: input.reportV1,
    methodologyContractDigest: input.methodologyContractDigest,
    supportInventoryDigest: input.supportInventoryDigest,
    policyDigest: input.policyDigest,
    requestDigest: input.requestDigest,
    scopeDigest: input.scopeDigest,
    runId: input.runId,
    proposalIds: input.proposalIds ?? [],
    resultIds: input.resultIds ?? [],
    approvalIds: input.approvalIds ?? [],
    closureSource: input.closureSource,
    applicability: input.applicability ?? [],
    blockedByContract: input.blockedByContract ?? [],
    operationContainment: input.operationContainment,
    zeroWriteDisposition,
  };
  const reportDigest = digestBody(body);
  return Object.freeze({ ...body, reportDigest });
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
