import fs from "node:fs";
import path from "node:path";

import {
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  LOSSLESS_METHODOLOGY_PROCEDURE_VERSION,
  V13_ATTEMPT2_REJECTED_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  bindMethodologyArtifactPath,
  buildMethodologyReport,
  buildMethodologyReportV2,
  deriveMethodologyValidatorFacts,
  isAuthoritativeMethodologyProcedureVersion,
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
  if (procedure.manifest.version === "2.0.3") {
    // Contained: 2.0.3 is historical-unaccepted; no family authority load.
    // Lifecycle contracts[] may still be inspected for non-authority paths.
  } else if (
    procedure.manifest.version === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION
  ) {
    // Accepted 2.0.4 lossless family contracts (post-OA3 only).
    if (procedure.manifest.id !== "literature-scan-v1") {
      loadResearchMethodologyContractFromProcedure(procedure);
      return Object.freeze([]);
    }
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

  // Containment: A2 digests and Procedure 2.0.3 are never accepted authority.
  // Report-v2 only after OA3 for accepted 2.0.4 (not live 1.0.0 / 2.0.2 / 2.0.3).
  const procedureAuthoritative = isAuthoritativeMethodologyProcedureVersion(
    input.procedureVersion,
  );
  const usesRejectedA2Digest =
    methodologyContractDigest === V13_ATTEMPT2_REJECTED_CONTRACT_DIGEST ||
    methodologyContractDigest === V13_METHODOLOGY_CONTRACT_DIGEST;

  // Explicit closure for accepted 2.0.4 only (OA3 A3 binding). Never derive
  // selected/blocked from Result.status on that path.
  const requireExplicitClosure =
    procedureAuthoritative &&
    input.procedureVersion === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION;

  const facts = deriveMethodologyValidatorFacts({
    resultStatus: input.resultStatus ?? input.terminalState,
    proposalStatus: input.proposalStatus,
    proposalOperationCount: input.proposalOperationCount,
    artifactPaths: input.artifactPaths,
    selected: input.selected,
    blocked: input.blocked,
    methodologyContractVersion,
    requireExplicitClosure,
  });

  let mergedValidation = runMethodologyValidators({
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureDigest: input.procedureDigest,
    terminalState: input.terminalState,
    artifactPaths: input.artifactPaths ?? [],
    declaredValidators,
    facts,
  });

  if (input.procedureVersion === "2.0.3" || usesRejectedA2Digest) {
    const containmentFinding = {
      validatorId: "methodology-authority-containment",
      severity: "critical" as const,
      code: "METHODOLOGY_AUTHORITY_NOT_ACCEPTED",
      message:
        "Procedure/contract identity is historical-unaccepted (A2/2.0.3) and is not available as methodology authority",
    };
    mergedValidation = {
      ok: false,
      criticalFailure: true,
      findings: Object.freeze([
        ...mergedValidation.findings,
        containmentFinding,
      ]),
    };
  }

  // Report-v2 only for accepted 2.0.4 after OA3; never for live 1.0.0 or 2.0.2/2.0.3.
  const reportV2Authorized =
    procedureAuthoritative &&
    input.procedureVersion === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION;

  // When exact contracts exist on the pack, enforce artifact path/cardinality.
  // Skip for unaccepted 2.0.3 authority paths (already critical-failed above).
  if (
    input.procedure !== undefined &&
    input.procedureVersion !== "2.0.3" &&
    !usesRejectedA2Digest
  ) {
    const contracts = loadArtifactContractsFromProcedure(input.procedure);
    if (contracts.length > 0) {
      // Strict binding: pathPattern only (no path.includes substring authority).
      // Unmatched paths use a single stable unexpected contract id (never
      // unexpected-${index}). mediaType comes from the matched contract or is
      // omitted — never invent a default text/markdown.
      const instances: MethodologyArtifactInstance[] = (
        input.artifactPaths ?? []
      ).map((artifactPath) => {
        const contract = bindMethodologyArtifactPath(artifactPath, contracts);
        const digest = input.artifactDigests?.find(
          (d) => d.path === artifactPath,
        );
        if (contract === undefined) {
          return Object.freeze({
            contractId: "unexpected",
            path: artifactPath,
            present: true,
            sha256: digest?.sha256,
          });
        }
        return Object.freeze({
          contractId: contract.id,
          path: artifactPath,
          present: true,
          sha256: digest?.sha256,
          mediaType: contract.mediaType,
        });
      });
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
          findings: Object.freeze([...mergedValidation.findings, ...findings]),
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

  // Always construct report-v2 object for API stability, but never authorize
  // sidecar materialization unless reportV2Authorized (accepted 2.0.4 only).
  const reportV2 = buildMethodologyReportV2({
    reportV1: report,
    methodologyContractDigest: reportV2Authorized
      ? methodologyContractDigest
      : undefined,
    closureSource: {
      selected: facts.selected,
      blocked: facts.blocked,
      requireExplicitClosure,
      resultStatusNotAuthority: true,
      reportV2Authorized,
    },
  });

  const materializeSidecar =
    reportV2Authorized &&
    shouldMaterializeMethodologyReportSidecar({
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

/**
 * Materialize report-v2 sidecar only after a successful atomic batch.
 * Path: .trellis/research/dispatches/<dispatchId>/methodology-report-v2.json
 */
export function materializeMethodologyReportV2Sidecar(input: {
  readonly root: string;
  readonly dispatchId: string;
  readonly reportV2: MethodologyDeterministicReportV2;
}): string {
  const dir = path.join(
    input.root,
    ".trellis",
    "research",
    "dispatches",
    input.dispatchId,
  );
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "methodology-report-v2.json");
  const body = `${JSON.stringify(input.reportV2, null, 2)}\n`;
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, filePath);
  return filePath;
}
