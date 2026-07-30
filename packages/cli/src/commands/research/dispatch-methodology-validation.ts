import {
  buildMethodologyReport,
  runMethodologyValidators,
  type MethodologyDeterministicReport,
  type MethodologyValidatorDescriptor,
} from "@mindfoldhq/trellis-core/research";

/**
 * Root-side methodology validation before canonical Result/Proposal commit.
 * Critical failure must be treated as zero-write by the caller.
 */
export function validateMethodologyBeforeRecord(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion?: string;
  readonly dispatchId?: string;
  readonly activationId?: string;
  readonly terminalState?: string;
  readonly declaredValidators?: readonly MethodologyValidatorDescriptor[];
  readonly facts?: Readonly<Record<string, unknown>>;
  readonly artifactPaths?: readonly string[];
}): {
  readonly ok: boolean;
  readonly criticalFailure: boolean;
  readonly report: MethodologyDeterministicReport;
} {
  const validation = runMethodologyValidators({
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    terminalState: input.terminalState,
    artifactPaths: input.artifactPaths ?? [],
    declaredValidators: input.declaredValidators ?? [
      { id: "missing-critical-evidence", version: "1", severity: "critical" },
      { id: "provenance-stable-id-drift", version: "1", severity: "critical" },
      { id: "forbidden-mutation", version: "1", severity: "critical" },
    ],
    facts: input.facts ?? {},
  });
  const report = buildMethodologyReport({
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    methodologyContractVersion:
      input.methodologyContractVersion ?? "evaluation-contract-v1.2.0",
    dispatchId: input.dispatchId,
    activationId: input.activationId,
    terminalState: input.terminalState,
    validation,
  });
  return {
    ok: validation.ok,
    criticalFailure: validation.criticalFailure,
    report,
  };
}
