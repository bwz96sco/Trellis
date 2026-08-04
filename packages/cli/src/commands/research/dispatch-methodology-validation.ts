import {
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  LOSSLESS_METHODOLOGY_PROCEDURE_VERSION,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  buildMethodologyReport,
  buildMethodologyReportV2,
  deriveMethodologyValidatorFacts,
  loadResearchMethodologyContractFromProcedure,
  runMethodologyValidators,
  shouldMaterializeMethodologyReportSidecar,
  validateMethodologyArtifacts,
  type MethodologyArtifactContract,
  type MethodologyArtifactInstance,
  type MethodologyDeterministicReport,
  type MethodologyDeterministicReportV2,
  type MethodologyValidatorDescriptor,
  type ParsedResearchProcedure,
} from "@mindfoldhq/trellis-core/research";

const DEFAULT_SCHEMA_V1_VALIDATORS: readonly MethodologyValidatorDescriptor[] =
  Object.freeze([
    { id: "missing-critical-evidence", version: "1", severity: "critical" },
    { id: "provenance-stable-id-drift", version: "1", severity: "critical" },
    { id: "forbidden-mutation", version: "1", severity: "critical" },
    { id: "closure-exclusivity", version: "1", severity: "critical" },
  ]);

/**
 * Load exact validator descriptors from a resolved schema-v2 support pack.
 */
export function loadDeclaredValidatorsFromProcedure(
  procedure: ParsedResearchProcedure,
): readonly MethodologyValidatorDescriptor[] {
  if (
    procedure.packageSchemaVersion !== 2 ||
    procedure.supportPack === undefined
  ) {
    return DEFAULT_SCHEMA_V1_VALIDATORS;
  }
  const validators: MethodologyValidatorDescriptor[] = [];
  for (const item of procedure.supportPack.inventoryItems) {
    if (item.role !== "validators" || item.mediaType !== "application/json") {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(item.bytes),
      );
    } catch (error) {
      throw new Error(
        `Support-pack validators entry is not valid UTF-8 JSON: ${item.path}`,
        { cause: error },
      );
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Array.isArray((parsed as { validators?: unknown }).validators)
    ) {
      throw new Error(
        `Support-pack validators entry must be an object with validators[]: ${item.path}`,
      );
    }
    for (const raw of (parsed as { validators: unknown[] }).validators) {
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(
          `Support-pack validator descriptor must be an object: ${item.path}`,
        );
      }
      const row = raw as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        row.id.length === 0 ||
        typeof row.version !== "string" ||
        row.version.length === 0 ||
        (row.severity !== "critical" && row.severity !== "warning")
      ) {
        throw new Error(
          `Support-pack validator descriptor requires id, version, severity: ${item.path}`,
        );
      }
      validators.push(
        Object.freeze({
          id: row.id,
          version: row.version,
          severity: row.severity,
        }),
      );
    }
  }
  if (validators.length === 0) {
    throw new Error(
      "Schema-v2 Procedure support pack declares no validators; fail closed",
    );
  }
  return Object.freeze(validators);
}

/**
 * Load exact artifact contracts from the resolved support pack (contracts[] only).
 */
export function loadArtifactContractsFromProcedure(
  procedure: ParsedResearchProcedure,
): readonly MethodologyArtifactContract[] {
  if (
    procedure.packageSchemaVersion !== 2 ||
    procedure.supportPack === undefined
  ) {
    return Object.freeze([]);
  }
  if (procedure.manifest.version === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION) {
    // Parse and validate the complete frozen family contract without coercing its
    // checkpoint union into the older path/media lifecycle primitive.
    loadResearchMethodologyContractFromProcedure(procedure);
    return Object.freeze([]);
  }
  const contracts: MethodologyArtifactContract[] = [];
  for (const item of procedure.supportPack.inventoryItems) {
    if (item.role !== "artifacts" || item.mediaType !== "application/json") {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(item.bytes),
      );
    } catch {
      continue;
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Array.isArray((parsed as { contracts?: unknown }).contracts)
    ) {
      continue;
    }
    for (const raw of (parsed as { contracts: unknown[] }).contracts) {
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(
          `Support-pack artifact contract entry must be an object: ${item.path}`,
        );
      }
      const row = raw as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        typeof row.pathPattern !== "string" ||
        typeof row.mediaType !== "string" ||
        typeof row.requiredness !== "string" ||
        typeof row.cardinality !== "string"
      ) {
        throw new Error(
          `Support-pack artifact contract requires id/pathPattern/mediaType/requiredness/cardinality: ${item.path}`,
        );
      }
      contracts.push(
        Object.freeze({
          id: row.id,
          version: typeof row.version === "string" ? row.version : "1",
          requiredness:
            row.requiredness as MethodologyArtifactContract["requiredness"],
          cardinality:
            row.cardinality as MethodologyArtifactContract["cardinality"],
          pathPattern: row.pathPattern,
          mediaType: row.mediaType,
          producer: typeof row.producer === "string" ? row.producer : "worker",
          consumers: Array.isArray(row.consumers)
            ? row.consumers.map(String)
            : Object.freeze(["root"]),
          terminalApplicability: Array.isArray(row.terminalApplicability)
            ? row.terminalApplicability.map(String)
            : Object.freeze(["success", "completed", "partial"]),
          validatorIds: Array.isArray(row.validatorIds)
            ? row.validatorIds.map(String)
            : Object.freeze([]),
        }),
      );
    }
  }
  return Object.freeze(contracts);
}

/**
 * Root-side methodology validation before canonical Result/Proposal commit.
 * v1.3 requires explicit selected/blocked closure fields — Result.status is
 * never used as closure authority. Report-v1 bytes stay unchanged; report-v2
 * is returned additively. Sidecar materialization remains a separate R2B step.
 */
export function validateMethodologyBeforeRecord(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion?: string;
  readonly methodologyContractDigest?: string;
  readonly capabilityId?: string;
  readonly dispatchId?: string;
  readonly activationId?: string;
  readonly terminalState?: string;
  readonly resultStatus?: string;
  readonly proposalStatus?: string;
  readonly proposalOperationCount?: number;
  /** Explicit v1.3 closure fields (required for evaluation-contract-v1.3.0). */
  readonly selected?: boolean;
  readonly blocked?: boolean;
  readonly declaredValidators?: readonly MethodologyValidatorDescriptor[];
  readonly procedure?: ParsedResearchProcedure;
  readonly artifactPaths?: readonly string[];
  readonly artifactDigests?: readonly { path: string; sha256: string }[];
  readonly batchCommitted?: boolean;
}): {
  readonly ok: boolean;
  readonly criticalFailure: boolean;
  readonly report: MethodologyDeterministicReport;
  readonly reportV2: MethodologyDeterministicReportV2;
  readonly materializeSidecar: boolean;
} {
  const declaredValidators =
    input.declaredValidators ??
    (input.procedure !== undefined
      ? loadDeclaredValidatorsFromProcedure(input.procedure)
      : DEFAULT_SCHEMA_V1_VALIDATORS);

  const methodologyContractVersion =
    input.methodologyContractVersion ??
    input.procedure?.supportPack?.manifest.methodologyContractVersion ??
    FROZEN_METHODOLOGY_CONTRACT_VERSION;

  const methodologyContractDigest =
    input.methodologyContractDigest ??
    input.procedure?.supportPack?.manifest.methodologyContractDigest;

  const isV13 =
    methodologyContractVersion === V13_METHODOLOGY_CONTRACT_VERSION ||
    input.procedureVersion === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION;

  const facts = deriveMethodologyValidatorFacts({
    resultStatus: input.resultStatus ?? input.terminalState,
    proposalStatus: input.proposalStatus,
    proposalOperationCount: input.proposalOperationCount,
    artifactPaths: input.artifactPaths,
    selected: input.selected,
    blocked: input.blocked,
    methodologyContractVersion,
    requireExplicitClosure: isV13,
  });

  const validation = runMethodologyValidators({
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    terminalState: input.terminalState,
    artifactPaths: input.artifactPaths ?? [],
    declaredValidators,
    facts,
  });

  let mergedValidation = validation;

  // When exact contracts exist on the pack, enforce artifact path/cardinality.
  if (input.procedure !== undefined) {
    const contracts = loadArtifactContractsFromProcedure(input.procedure);
    if (contracts.length > 0) {
      const instances: MethodologyArtifactInstance[] = (
        input.artifactPaths ?? []
      ).map((path, index) =>
        Object.freeze({
          contractId:
            contracts.find(
              (c) =>
                path.includes(c.id) ||
                path.match(
                  new RegExp(
                    c.pathPattern
                      .replace(/\*\*/g, ".*")
                      .replace(/\*/g, "[^/]+"),
                  ),
                ),
            )?.id ?? `unexpected-${index}`,
          path,
          present: true,
          sha256: input.artifactDigests?.find((d) => d.path === path)?.sha256,
          mediaType: "text/markdown",
        }),
      );
      const artifactResult = validateMethodologyArtifacts({
        contracts,
        instances,
        terminalState: input.terminalState,
      });
      if (!artifactResult.ok) {
        const findings = artifactResult.errors.map((e) => ({
          validatorId: "artifact-contract",
          severity: "critical" as const,
          code: e.code,
          message: e.message,
        }));
        mergedValidation = {
          ok: false,
          criticalFailure: true,
          findings: Object.freeze([...validation.findings, ...findings]),
        };
      }
    }
  }

  const report = buildMethodologyReport({
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    methodologyContractVersion,
    capabilityId: input.capabilityId,
    dispatchId: input.dispatchId,
    activationId: input.activationId,
    terminalState: input.terminalState,
    validation: mergedValidation,
    artifactDigests: input.artifactDigests,
    zeroWrite: mergedValidation.criticalFailure,
  });

  const reportV2 = buildMethodologyReportV2({
    reportV1: report,
    methodologyContractDigest:
      methodologyContractDigest ??
      (isV13 ? V13_METHODOLOGY_CONTRACT_DIGEST : undefined),
    closureSource: {
      selected: facts.selected,
      blocked: facts.blocked,
      requireExplicitClosure: isV13,
      resultStatusNotAuthority: isV13,
    },
  });

  const materializeSidecar = shouldMaterializeMethodologyReportSidecar({
    validationOk: mergedValidation.ok,
    criticalFailure: mergedValidation.criticalFailure,
    batchCommitted: input.batchCommitted === true,
  });

  return {
    ok: mergedValidation.ok,
    criticalFailure: mergedValidation.criticalFailure,
    report,
    reportV2,
    materializeSidecar,
  };
}
