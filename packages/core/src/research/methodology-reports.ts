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
  const canonical = `${JSON.stringify(body)}\n`;
  const reportDigest = `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
  return Object.freeze({ ...body, reportDigest });
}
