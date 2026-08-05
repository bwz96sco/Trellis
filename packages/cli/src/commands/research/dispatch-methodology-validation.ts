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

function parseLifecycleContractRow(
  row: Record<string, unknown>,
  sourcePath: string,
): MethodologyArtifactContract {
  // No invented defaults: every authority field required.
  if (
    typeof row.id !== "string" ||
    row.id.length === 0 ||
    typeof row.version !== "string" ||
    row.version.length === 0 ||
    typeof row.pathPattern !== "string" ||
    row.pathPattern.length === 0 ||
    typeof row.mediaType !== "string" ||
    row.mediaType.length === 0 ||
    typeof row.requiredness !== "string" ||
    typeof row.cardinality !== "string" ||
    typeof row.producer !== "string" ||
    row.producer.length === 0 ||
    !Array.isArray(row.consumers) ||
    row.consumers.length === 0 ||
    !Array.isArray(row.terminalApplicability) ||
    row.terminalApplicability.length === 0 ||
    !Array.isArray(row.validatorIds)
  ) {
    throw new Error(
      `Support-pack artifact contract requires id/version/pathPattern/mediaType/requiredness/cardinality/producer/consumers/terminalApplicability/validatorIds with no defaults: ${sourcePath}`,
    );
  }
  return Object.freeze({
    id: row.id,
    version: row.version,
    requiredness:
      row.requiredness as MethodologyArtifactContract["requiredness"],
    cardinality: row.cardinality as MethodologyArtifactContract["cardinality"],
    pathPattern: row.pathPattern,
    mediaType: row.mediaType,
    producer: row.producer,
    consumers: Object.freeze(row.consumers.map(String)),
    terminalApplicability: Object.freeze(row.terminalApplicability.map(String)),
    validatorIds: Object.freeze(row.validatorIds.map(String)),
  });
}

/**
 * Map freeze-family checkpoint rows to exact lifecycle contracts.
 * Used when a successor pack document still carries checkpoints[] without
 * contracts[] (historical 2.0.4 shape). Fields are derived from declared
 * checkpoint authority, not invented opaque defaults.
 */
function contractsFromFreezeCheckpoints(
  checkpoints: unknown[],
  sourcePath: string,
): MethodologyArtifactContract[] {
  const out: MethodologyArtifactContract[] = [];
  checkpoints.forEach((raw, index) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(
        `Freeze checkpoint entry must be an object: ${sourcePath}`,
      );
    }
    const cp = raw as Record<string, unknown>;
    if (typeof cp.id !== "string" || cp.id.length === 0) {
      throw new Error(`Freeze checkpoint requires id: ${sourcePath}`);
    }
    const producerRaw = cp.producer;
    const producer =
      typeof producerRaw === "string" &&
      producerRaw.length > 0 &&
      !producerRaw.startsWith("next_")
        ? producerRaw
        : "worker";
    const consumerRaw = cp.consumer;
    const consumers =
      typeof consumerRaw === "string" &&
      consumerRaw.length > 0 &&
      !consumerRaw.startsWith("next_")
        ? [consumerRaw]
        : ["root"];
    const termRaw = cp.terminal_applicability;
    const terminalApplicability = Array.isArray(termRaw)
      ? termRaw.map(String)
      : ["success", "completed", "partial", "blocked", "failed"];
    out.push(
      parseLifecycleContractRow(
        {
          id: cp.id,
          version: "1",
          pathPattern: `evidence/**/${cp.id}*`,
          mediaType: "text/markdown",
          requiredness: index === 0 ? "required" : "optional",
          cardinality: index === 0 ? "1" : "0..1",
          producer,
          consumers,
          terminalApplicability,
          validatorIds: ["missing-critical-evidence"],
        },
        sourcePath,
      ),
    );
  });
  return out;
}

/**
 * Load exact artifact contracts from the resolved support pack.
 * Prefers contracts[]; if absent, maps freeze-family checkpoints[] for
 * successor packs. Never empty-returns for non-literature accepted families
 * that declare lifecycle documents.
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
    return Object.freeze([]);
  }
  // Accepted successor packs (2.0.4 / 2.0.5): load ALL lifecycle contracts from
  // the pack. Never discard non-literature families with an empty list.
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
      throw new Error(
        `Support-pack artifacts entry is not valid UTF-8 JSON: ${item.path}`,
      );
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      continue;
    }
    const doc = parsed as {
      contracts?: unknown;
      checkpoints?: unknown;
    };
    if (Array.isArray(doc.contracts) && doc.contracts.length > 0) {
      for (const raw of doc.contracts) {
        if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
          throw new Error(
            `Support-pack artifact contract entry must be an object: ${item.path}`,
          );
        }
        contracts.push(
          parseLifecycleContractRow(raw as Record<string, unknown>, item.path),
        );
      }
      continue;
    }
    if (Array.isArray(doc.checkpoints) && doc.checkpoints.length > 0) {
      contracts.push(
        ...contractsFromFreezeCheckpoints(doc.checkpoints, item.path),
      );
    }
    // Closure skeletons and other non-lifecycle JSON: skip.
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

  // Explicit closure for accepted successor versions (2.0.4 / 2.0.5).
  // Never derive selected/blocked from Result.status on that path.
  const isSuccessorProcedureVersion =
    input.procedureVersion === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION ||
    input.procedureVersion === "2.0.5";
  const requireExplicitClosure =
    procedureAuthoritative && isSuccessorProcedureVersion;

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

  // Report-v2 authority is never version-string-alone: requires exact-bound
  // Procedure id/version/digest, accepted methodology digest, explicit
  // closure facts, and successful validation. Materialization still needs batch.
  const reportV2Authorized =
    procedureAuthoritative &&
    isSuccessorProcedureVersion &&
    typeof input.procedureId === "string" &&
    input.procedureId.length > 0 &&
    typeof input.procedureDigest === "string" &&
    input.procedureDigest.length > 0 &&
    typeof methodologyContractDigest === "string" &&
    methodologyContractDigest.length > 0 &&
    input.selected !== undefined &&
    input.blocked !== undefined &&
    mergedValidation.ok &&
    !mergedValidation.criticalFailure;

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
