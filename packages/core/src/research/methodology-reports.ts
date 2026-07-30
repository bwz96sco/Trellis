import { createHash } from "node:crypto";

import type { MethodologyValidationReport } from "./methodology-validators.js";

export interface MethodologyDeterministicReport {
  readonly schemaVersion: 1;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion: string;
  readonly dispatchId?: string;
  readonly activationId?: string;
  readonly terminalState?: string;
  readonly validation: MethodologyValidationReport;
  readonly artifactDigests: readonly { path: string; sha256: string }[];
  readonly reportDigest: string;
}

export function buildMethodologyReport(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion: string;
  readonly dispatchId?: string;
  readonly activationId?: string;
  readonly terminalState?: string;
  readonly validation: MethodologyValidationReport;
  readonly artifactDigests?: readonly { path: string; sha256: string }[];
}): MethodologyDeterministicReport {
  const body = {
    schemaVersion: 1 as const,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    methodologyContractVersion: input.methodologyContractVersion,
    dispatchId: input.dispatchId,
    activationId: input.activationId,
    terminalState: input.terminalState,
    validation: input.validation,
    artifactDigests: input.artifactDigests ?? [],
  };
  const canonical = `${JSON.stringify(body)}\n`;
  const reportDigest = `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
  return Object.freeze({ ...body, reportDigest });
}
