import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  LOSSLESS_METHODOLOGY_PROCEDURE_VERSION,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V13_ATTEMPT2_REJECTED_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  authenticateAcceptedV13MemberLedger,
  bindMethodologyArtifactPath,
  buildMethodologyReport,
  buildMethodologyReportV2,
  deriveMethodologyValidatorFacts,
  isAuthoritativeMethodologyProcedureVersion,
  parseAcceptedV13ContractPack,
  runMethodologyValidators,
  selectApplicableV13ValidatorsFromBindings,
  selectTrustedV13ValidatorDescriptors,
  serializeSupportPackInventoryForDigest,
  shouldMaterializeMethodologyReportSidecar,
  validateMethodologyArtifacts,
  type MethodologyArtifactContract,
  type MethodologyArtifactInstance,
  type MethodologyDeterministicReport,
  type MethodologyDeterministicReportV2,
  type MethodologyValidatorDescriptor,
  type ParsedResearchProcedure,
  type V13AcceptedContractPack,
  type V13LeafFileName,
} from "@mindfoldhq/trellis-core/research";

import { parseStrictJsonInput } from "./strict-json-input.js";

const DEFAULT_SCHEMA_V1_VALIDATORS: readonly MethodologyValidatorDescriptor[] =
  Object.freeze([
    { id: "missing-critical-evidence", version: "1", severity: "critical" },
    { id: "provenance-stable-id-drift", version: "1", severity: "critical" },
    { id: "forbidden-mutation", version: "1", severity: "critical" },
    { id: "closure-exclusivity", version: "1", severity: "critical" },
  ]);

/**
 * Resolve the package-owned accepted A3 bundle directory (installed assets
 * under dist/templates or source templates). Production authority is the
 * package itself — never an environment directory, never .trellis/tasks, and
 * never a working-tree overlay. Tests may inject explicit bytes or a
 * test-only leafDir dependency through loadAcceptedV13ContractPackFromLeaves.
 */
export function resolveAcceptedV13ContractLeafDir(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../templates/research/evaluation-contracts/1.3.0",
  );
}

const V13_LEAF_FILES: readonly V13LeafFileName[] = [
  "durable-output-disposition-v1.3.json",
  "artifact-lifecycle-contract-v1.3.json",
  "validator-registry-v1.3.json",
  "validator-binding-matrix-v1.3.json",
  "differential-test-matrix-v1.3.json",
  "derivability-provenance-matrix-v1.3.json",
  "closure-contract-v1.3.json",
];

function readAcceptedV13LeafBytes(
  dir: string,
): Partial<Record<V13LeafFileName, Uint8Array>> {
  const leafBytes: Partial<Record<V13LeafFileName, Uint8Array>> = {};
  for (const name of V13_LEAF_FILES) {
    const bytes = fs.readFileSync(path.join(dir, name));
    leafBytes[name] = new Uint8Array(bytes);
  }
  return leafBytes;
}

/**
 * Load and authenticate the accepted A3 pack.
 * - leafDir omitted (production): resolve the package-owned installed bundle
 *   and require member-ledger authentication (count/order/paths/roles/media
 *   types/byte lengths/hashes/aggregate) before semantic parsing.
 * - leafDir supplied (test-only injection): read the exact allowlisted leaves;
 *   authenticate when a member-ledger.json is present beside them.
 */
export function loadAcceptedV13ContractPackFromLeaves(
  leafDir?: string,
): V13AcceptedContractPack {
  const dir = leafDir ?? resolveAcceptedV13ContractLeafDir();
  if (!fs.existsSync(path.join(dir, V13_LEAF_FILES[0]))) {
    throw new Error(
      "Accepted evaluation-contract-v1.3.0 installed bundle missing; package assets must ship the 1.3.0 member tree",
    );
  }
  const leafBytes = readAcceptedV13LeafBytes(dir);
  const ledgerPath = path.join(dir, "member-ledger.json");
  if (fs.existsSync(ledgerPath)) {
    let ledger: unknown;
    try {
      ledger = parseStrictJsonInput(
        new Uint8Array(fs.readFileSync(ledgerPath)),
      );
    } catch (error) {
      throw new Error(
        `Accepted member ledger is not strict JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    authenticateAcceptedV13MemberLedger({ ledger, leafBytes });
    return parseAcceptedV13ContractPack({
      leafBytes,
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      expectedMemberAggregateSha256: V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    });
  }
  if (leafDir !== undefined) {
    // Test-injection mode: explicit bytes without a ledger still parse with
    // the frozen semantic digest requirement.
    return parseAcceptedV13ContractPack({
      leafBytes,
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
    });
  }
  throw new Error(
    "Accepted evaluation-contract-v1.3.0 installed bundle lacks member-ledger.json; authentication required",
  );
}

/**
 * Load exact validator descriptors.
 * - schema-v1 / non-v2: four legacy validators only.
 * - schema-v2 2.0.3: pack validators.json (contained/unaccepted path).
 * - schema-v2 2.0.4/2.0.5 accepted path: A3 20-validator registry selected
 *   via the 876-row binding matrix (selectTrustedV13ValidatorDescriptors).
 */
export function loadDeclaredValidatorsFromProcedure(
  procedure: ParsedResearchProcedure,
  options?: {
    readonly acceptedPack?: V13AcceptedContractPack;
    readonly leafDir?: string;
  },
): readonly MethodologyValidatorDescriptor[] {
  if (
    procedure.packageSchemaVersion !== 2 ||
    procedure.supportPack === undefined
  ) {
    return DEFAULT_SCHEMA_V1_VALIDATORS;
  }

  const version = procedure.manifest.version;
  const isSuccessor = version === "2.0.4" || version === "2.0.5";
  const digest = procedure.supportPack.manifest.methodologyContractDigest ?? "";
  if (isSuccessor && digest === V13_ACCEPTED_CONTRACT_DIGEST) {
    const pack =
      options?.acceptedPack ??
      loadAcceptedV13ContractPackFromLeaves(options?.leafDir);
    const declared = selectApplicableV13ValidatorsFromBindings({
      pack,
      procedureId: procedure.manifest.id,
    });
    // When family filter yields a subset, still require every selected row is
    // trusted; if empty, fall back to full registry (never pack 4-legacy).
    const candidate =
      declared.length > 0
        ? declared
        : pack.validators.map((v) => ({
            id: v.identity.id,
            version: v.identity.version,
            severity: "critical" as const,
          }));
    const selected = selectTrustedV13ValidatorDescriptors({
      pack,
      declared: candidate,
    });
    if (!selected.ok || selected.selected.length === 0) {
      throw new Error(
        `Accepted v1.3 validator selection failed: ${selected.findings.map((f) => f.code).join(",")}`,
      );
    }
    return Object.freeze(
      selected.selected.map((v) =>
        Object.freeze({
          id: v.id,
          version: v.version,
          severity: v.severity,
        }),
      ),
    );
  }

  // Historical / unaccepted schema-v2: load pack validators.json only.
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
 * Load exact artifact contracts from the resolved support pack.
 * Only contracts[] with full authority fields are accepted — never invent
 * producer/consumers/terminalApplicability/mediaType/pathPattern defaults from
 * freeze-family checkpoints[]. Historical 2.0.4 packs without contracts[]
 * yield an empty list (no invented lifecycle authority).
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
  // Accepted successor packs (2.0.4 / 2.0.5): load ONLY explicit contracts[].
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
    }
    // checkpoints[] alone are not lifecycle authority (no invented defaults).
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
  /** Activation-bound request / policy / scope digests (report-v2 multi-factor). */
  readonly requestDigest?: string;
  readonly policyDigest?: string;
  readonly scopeHash?: string;
  /** Package inventory digest (support-pack inventory JSON domain). */
  readonly supportInventoryDigest?: string;
  readonly terminalState?: string;
  readonly resultStatus?: string;
  readonly proposalStatus?: string;
  readonly proposalOperationCount?: number;
  /** Explicit v1.3 closure fields (required for evaluation-contract-v1.3.0). */
  readonly selected?: boolean;
  readonly blocked?: boolean;
  readonly declaredValidators?: readonly MethodologyValidatorDescriptor[];
  readonly procedure?: ParsedResearchProcedure;
  readonly acceptedV13Pack?: V13AcceptedContractPack;
  /** Test-only leaf injection; production never supplies this. */
  readonly acceptedV13LeafDir?: string;
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

  // Load accepted A3 pack for 2.0.4/2.0.5 accepted-digest path (20/876 authority).
  let acceptedPack: V13AcceptedContractPack | undefined = input.acceptedV13Pack;
  if (
    acceptedPack === undefined &&
    isSuccessorProcedureVersion &&
    methodologyContractDigest === V13_ACCEPTED_CONTRACT_DIGEST
  ) {
    try {
      acceptedPack = loadAcceptedV13ContractPackFromLeaves(
        input.acceptedV13LeafDir,
      );
    } catch {
      acceptedPack = undefined;
    }
  }

  let declaredValidators: readonly MethodologyValidatorDescriptor[];
  try {
    declaredValidators =
      input.declaredValidators ??
      (input.procedure !== undefined
        ? loadDeclaredValidatorsFromProcedure(input.procedure, {
            acceptedPack,
          })
        : DEFAULT_SCHEMA_V1_VALIDATORS);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "validator load failed";
    const failedValidation = {
      ok: false,
      criticalFailure: true,
      findings: Object.freeze([
        {
          validatorId: "validator-selection",
          severity: "critical" as const,
          code: "V13_VALIDATOR_SELECTION_FAILED",
          message,
        },
      ]),
    };
    const report = buildMethodologyReport({
      procedureId: input.procedureId,
      procedureVersion: input.procedureVersion,
      procedureDigest: input.procedureDigest,
      methodologyContractVersion,
      capabilityId: input.capabilityId,
      dispatchId: input.dispatchId,
      activationId: input.activationId,
      terminalState: input.terminalState,
      validation: failedValidation,
      artifactDigests: input.artifactDigests,
      zeroWrite: true,
    });
    const reportV2 = buildMethodologyReportV2({
      reportV1: report,
      closureSource: {
        selected: input.selected,
        blocked: input.blocked,
        requireExplicitClosure,
        resultStatusNotAuthority: true,
        reportV2Authorized: false,
      },
    });
    return {
      ok: false,
      criticalFailure: true,
      report,
      reportV2,
      materializeSidecar: false,
    };
  }

  // Support-pack inventory digest: exact inventory JSON domain (not procedure digest alone).
  let supportInventoryDigest = input.supportInventoryDigest;
  if (
    supportInventoryDigest === undefined &&
    input.procedure?.supportPack !== undefined
  ) {
    const invJson = serializeSupportPackInventoryForDigest(
      input.procedure.supportPack.inventoryItems,
    );
    supportInventoryDigest = `sha256:${createHash("sha256").update(invJson).digest("hex")}`;
  }

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
    acceptedV13BindingCount: acceptedPack?.bindings.length,
    acceptedV13TrustedValidatorCount: acceptedPack?.validators.length,
    acceptedV13ContractDigest: acceptedPack?.acceptedContractDigest,
    supportInventoryDigest,
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
  // Procedure id/version/digest, package inventory digest, accepted methodology
  // digest, activation/request/policy/scope bindings, explicit closure facts,
  // and successful validation. Materialization still needs batch.
  const reportV2Authorized =
    procedureAuthoritative &&
    isSuccessorProcedureVersion &&
    typeof input.procedureId === "string" &&
    input.procedureId.length > 0 &&
    typeof input.procedureDigest === "string" &&
    input.procedureDigest.length > 0 &&
    typeof methodologyContractDigest === "string" &&
    methodologyContractDigest.length > 0 &&
    methodologyContractDigest === V13_ACCEPTED_CONTRACT_DIGEST &&
    typeof supportInventoryDigest === "string" &&
    supportInventoryDigest.length > 0 &&
    typeof input.activationId === "string" &&
    input.activationId.length > 0 &&
    typeof input.dispatchId === "string" &&
    input.dispatchId.length > 0 &&
    typeof input.capabilityId === "string" &&
    input.capabilityId.length > 0 &&
    typeof input.requestDigest === "string" &&
    input.requestDigest.length > 0 &&
    typeof input.policyDigest === "string" &&
    input.policyDigest.length > 0 &&
    typeof input.scopeHash === "string" &&
    input.scopeHash.length > 0 &&
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
  // sidecar materialization unless reportV2Authorized (accepted multi-factor).
  const reportV2 = buildMethodologyReportV2({
    reportV1: report,
    methodologyContractDigest: reportV2Authorized
      ? methodologyContractDigest
      : undefined,
    supportInventoryDigest: reportV2Authorized
      ? supportInventoryDigest
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
