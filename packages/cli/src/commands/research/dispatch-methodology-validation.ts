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
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  authenticateAcceptedV13MemberLedger,
  bindMethodologyArtifactPath,
  buildMethodologyReport,
  buildMethodologyReportV131,
  buildMethodologyReportV2,
  canonicalResearchJson,
  computeMethodologyReportV2DigestFromCanonicalBody,
  deriveAcceptedV131PackIdentity,
  deriveMethodologyValidatorFacts,
  enforceV13LifecycleDimensionsFromArtifactRefs,
  executeV13ProcedureBindings,
  executeV131BindingInvocations,
  isAuthoritativeMethodologyProcedureVersion,
  parseAcceptedV13ContractPack,
  parseAcceptedV131ContractPack,
  runMethodologyValidators,
  selectApplicableV13BindingsForProcedure,
  selectApplicableV131BindingsForProcedure,
  selectTrustedV13ValidatorDescriptors,
  serializeSupportPackInventoryForDigest,
  shouldMaterializeMethodologyReportSidecar,
  validateMethodologyArtifacts,
  type MethodologyArtifactContract,
  type MethodologyArtifactInstance,
  type MethodologyDeterministicReport,
  type MethodologyDeterministicReportV131,
  type MethodologyDeterministicReportV2,
  type MethodologyReportV131Finding,
  type MethodologyValidatorDescriptor,
  type ParsedResearchProcedure,
  type V13AcceptedContractPack,
  type V13ArtifactRefFact,
  type V13LeafFileName,
  type V13ProcedureClosureDisposition,
  type V131AcceptedContractPack,
  type V131ApplicableBinding,
  type V131LeafFileName,
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

const V131_LEDGER_ROLES = Object.freeze([
  "durable-output-disposition",
  "artifact-lifecycle-contract",
  "validator-registry",
  "validator-binding-matrix",
  "differential-test-matrix",
  "derivability-provenance-matrix",
  "closure-contract",
] as const);

export function resolveAcceptedV131ContractLeafDir(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../templates/research/evaluation-contracts/1.3.1",
  );
}

type V131AuthorityLeaves = Readonly<
  Record<V131LeafFileName, Readonly<Record<string, unknown>>>
>;

function readAcceptedV131LeafBytes(
  dir: string,
): Partial<Record<V131LeafFileName, Uint8Array>> {
  const leafBytes: Partial<Record<V131LeafFileName, Uint8Array>> = {};
  for (const name of V131_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    leafBytes[name] = new Uint8Array(fs.readFileSync(path.join(dir, name)));
  }
  return leafBytes;
}

function requireLedgerRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Accepted v1.3.1 member ledger ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function authenticateAcceptedV131MemberLedger(input: {
  readonly ledger: unknown;
  readonly leafBytes: Readonly<Partial<Record<V131LeafFileName, Uint8Array>>>;
}): void {
  const ledger = requireLedgerRecord(input.ledger, "root");
  const exactKeys = [
    "schemaVersion",
    "kind",
    "contractVersion",
    "memberCount",
    "aggregateDomain",
    "aggregateSha256",
    "acceptedContractDigest",
    "acceptedContractDigestRole",
    "members",
  ];
  if (
    Object.keys(ledger).length !== exactKeys.length ||
    Object.keys(ledger).some((key) => !exactKeys.includes(key)) ||
    ledger.schemaVersion !== 1 ||
    ledger.kind !== "trellis-installation-authentication-ledger" ||
    ledger.contractVersion !== V131_ACCEPTED_CONTRACT_VERSION ||
    ledger.memberCount !== V131_ACCEPTED_PACK_MEMBER_ALLOWLIST.length ||
    ledger.aggregateDomain !==
      "sha256(domain trellis-accepted-v13-pack-members\\0 + ordered path\\0bytes\\0)" ||
    ledger.aggregateSha256 !== V131_ACCEPTED_MEMBER_AGGREGATE_SHA256 ||
    ledger.acceptedContractDigest !== V131_ACCEPTED_CONTRACT_DIGEST ||
    ledger.acceptedContractDigestRole !==
      "semantic frozen-target digest, separate field, not derived from member bytes" ||
    !Array.isArray(ledger.members) ||
    ledger.members.length !== V131_ACCEPTED_PACK_MEMBER_ALLOWLIST.length
  ) {
    throw new Error("Accepted v1.3.1 member ledger identity is invalid");
  }

  const identity = deriveAcceptedV131PackIdentity({
    leafBytes: input.leafBytes,
  });
  if (identity.aggregateSha256 !== V131_ACCEPTED_MEMBER_AGGREGATE_SHA256) {
    throw new Error("Accepted v1.3.1 member aggregate is invalid");
  }
  ledger.members.forEach((raw, index) => {
    const row = requireLedgerRecord(raw, `members[${index}]`);
    const member = identity.members[index];
    const exactRowKeys = ["path", "role", "mediaType", "byteLength", "sha256"];
    if (
      member === undefined ||
      Object.keys(row).length !== exactRowKeys.length ||
      Object.keys(row).some((key) => !exactRowKeys.includes(key)) ||
      row.path !== V131_ACCEPTED_PACK_MEMBER_ALLOWLIST[index] ||
      row.role !== V131_LEDGER_ROLES[index] ||
      row.mediaType !== "application/json" ||
      row.byteLength !== member.byteLength ||
      row.sha256 !== member.sha256
    ) {
      throw new Error(
        `Accepted v1.3.1 member ledger row ${index} does not authenticate installed bytes`,
      );
    }
  });
}

function loadAcceptedV131Authority(input?: { readonly leafDir?: string }): {
  readonly pack: V131AcceptedContractPack;
  readonly leaves: V131AuthorityLeaves;
} {
  const dir = input?.leafDir ?? resolveAcceptedV131ContractLeafDir();
  if (!fs.existsSync(path.join(dir, V131_ACCEPTED_PACK_MEMBER_ALLOWLIST[0]))) {
    throw new Error(
      "Accepted evaluation-contract-v1.3.1 installed bundle missing; package assets must ship the 1.3.1 member tree",
    );
  }
  const leafBytes = readAcceptedV131LeafBytes(dir);
  const ledgerPath = path.join(dir, "member-ledger.json");
  if (fs.existsSync(ledgerPath)) {
    let ledger: unknown;
    try {
      ledger = parseStrictJsonInput(
        new Uint8Array(fs.readFileSync(ledgerPath)),
      );
    } catch (error) {
      throw new Error(
        `Accepted v1.3.1 member ledger is not strict JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    authenticateAcceptedV131MemberLedger({ ledger, leafBytes });
  } else if (input?.leafDir === undefined) {
    throw new Error(
      "Accepted evaluation-contract-v1.3.1 installed bundle lacks member-ledger.json; authentication required",
    );
  }
  const leaves = {} as Record<
    V131LeafFileName,
    Readonly<Record<string, unknown>>
  >;
  for (const memberPath of V131_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    const bytes = leafBytes[memberPath];
    if (bytes === undefined) {
      throw new Error(`Accepted v1.3.1 leaf '${memberPath}' is missing`);
    }
    const parsed = parseStrictJsonInput(bytes);
    leaves[memberPath] = requireLedgerRecord(parsed, memberPath);
  }
  return {
    pack: parseAcceptedV131ContractPack({ leafBytes }),
    leaves: Object.freeze(leaves),
  };
}

export function loadAcceptedV131ContractPackFromLeaves(
  leafDir?: string,
): V131AcceptedContractPack {
  return loadAcceptedV131Authority({ leafDir }).pack;
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
  const digest = procedure.supportPack.manifest.methodologyContractDigest ?? "";
  const isSuccessor =
    version === "2.0.4" || version === "2.0.5" || version === "2.0.6";
  if (isSuccessor && digest === V13_ACCEPTED_CONTRACT_DIGEST) {
    const pack =
      options?.acceptedPack ??
      loadAcceptedV13ContractPackFromLeaves(options?.leafDir);
    // CS5-2: declared validators come from the exact per-Procedure applicable
    // binding set (closure bindings excluded for notApplicable families).
    const applicable = selectApplicableV13BindingsForProcedure({
      pack,
      procedureId: procedure.manifest.id,
    });
    // Per-binding applicability is authoritative; the declared validator list
    // is the deduplicated identity set (invocation counts stay per-binding).
    const seenDeclared = new Set<string>();
    const declared = applicable
      .map((row) => row.binding.validator)
      .filter((v) => {
        const key = `${v.id}@${v.version}`;
        if (seenDeclared.has(key)) return false;
        seenDeclared.add(key);
        return true;
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

interface V131DispatchContext {
  readonly questId: string;
  readonly dispatchId: string;
  readonly activationId: string;
  readonly approvalId: string;
  readonly capabilityId: string;
}

interface V131ClosureObservation {
  readonly schemaVersion: 1;
  readonly family: string;
  readonly selected: boolean;
  readonly blocked: boolean;
  readonly selectedEvidenceArtifactIds: readonly string[];
  readonly blockedEvidenceArtifactIds: readonly string[];
}

function v131Unwrap(value: unknown): unknown {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in value
    ? (value as { readonly value: unknown }).value
    : value;
}

function v131Record(
  value: unknown,
  label: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Accepted v1.3.1 ${label} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function v131Array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Accepted v1.3.1 ${label} must be an array`);
  }
  return value;
}

function v131RuleValueFields(ruleKind: string): readonly [string, string] {
  const parts = ruleKind.split(/[^A-Za-z0-9]+/u);
  const stem = `${parts[0]?.toLowerCase() ?? ""}${parts
    .slice(1)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("")}`;
  return [`${stem}AuthorityCanonicalJson`, `${stem}ObservedCanonicalJson`];
}

function v131FindRawBinding(
  leaves: V131AuthorityLeaves,
  bindingId: string,
): Readonly<Record<string, unknown>> {
  const matrix = leaves["validator-binding-matrix-v1.3.1.json"];
  const binding = v131Array(matrix.bindings, "binding matrix bindings").find(
    (row) => v131Record(row, "binding").bindingId === bindingId,
  );
  if (binding === undefined) {
    throw new Error(`Accepted v1.3.1 binding '${bindingId}' is missing`);
  }
  return v131Record(binding, `binding ${bindingId}`);
}

function v131ClosureFamily(
  leaves: V131AuthorityLeaves,
  familyId: string,
): Readonly<Record<string, unknown>> | undefined {
  const closure = leaves["closure-contract-v1.3.1.json"];
  const row = v131Array(closure.families, "closure families").find(
    (candidate) =>
      v131Record(candidate, "closure family").familyId === familyId,
  );
  return row === undefined
    ? undefined
    : v131Record(row, `closure family ${familyId}`);
}

function v131AuthorityValue(input: {
  readonly applicable: V131ApplicableBinding;
  readonly leaves: V131AuthorityLeaves;
}): unknown {
  const { binding } = input.applicable;
  const ruleKind = binding.ruleKind;
  if (
    input.applicable.target !== undefined &&
    input.applicable.dimension !== undefined
  ) {
    return input.applicable.target.dimensions[input.applicable.dimension].value;
  }
  const closure = input.leaves["closure-contract-v1.3.1.json"];
  const family = v131ClosureFamily(input.leaves, binding.targetId);
  if (ruleKind === "closure.status-inference") {
    return v131Unwrap(closure.genericResultStatusInference);
  }
  if (family !== undefined) {
    if (ruleKind === "closure.schema") {
      return v131Record(v131Unwrap(family.closureArtifact), "closure artifact")
        .closedSchema;
    }
    if (ruleKind === "closure.evidence") {
      return {
        blocked: v131Unwrap(family.blocked),
        selected: v131Unwrap(family.selected),
      };
    }
    if (ruleKind === "closure.xor") {
      return v131Unwrap(family.crossRelation);
    }
    if (ruleKind === "closure.worker-boundary") {
      return {
        preRecordReader: v131Unwrap(family.preRecordReader),
        visibility: v131Unwrap(family.visibility),
        zeroWriteBoundary: v131Unwrap(family.zeroWriteBoundary),
      };
    }
  }
  const matrix = input.leaves["validator-binding-matrix-v1.3.1.json"];
  const durable = input.leaves["durable-output-disposition-v1.3.1.json"];
  const differential = input.leaves["differential-test-matrix-v1.3.1.json"];
  if (
    ruleKind === "validator.binding-integrity" ||
    ruleKind === "contract.candidate-authority"
  ) {
    return v131FindRawBinding(input.leaves, binding.bindingId);
  }
  if (ruleKind === "report.v2-binding") return matrix.reportV2Contract;
  if (ruleKind === "authority.worker-boundary") {
    return v131Unwrap(closure.rootDecisionBoundary);
  }
  if (ruleKind === "contract.output-disposition") {
    return {
      allowedDispositions: durable.allowedDispositions,
      outputs: durable.outputs,
    };
  }
  if (ruleKind === "contract.blocked-output-kind") {
    const output = v131Array(durable.outputs, "durable outputs").find(
      (row) => v131Record(row, "durable output").outputId === binding.targetId,
    );
    if (output === undefined)
      throw new Error("Blocked output authority is missing");
    return output;
  }
  if (ruleKind === "contract.closure-applicability") {
    return closure.applicableFamilies;
  }
  if (ruleKind === "contract.canonical-bytes") {
    const report = v131Record(matrix.reportV2Contract, "report-v2 contract");
    return {
      byteRules: report.byteRules,
      canonicalization: report.canonicalization,
      constructionProcedure: report.constructionProcedure,
      ordering: report.ordering,
    };
  }
  if (ruleKind === "contract.compatibility") {
    return Object.fromEntries(
      [...V131_ACCEPTED_PACK_MEMBER_ALLOWLIST].sort().map((memberPath) => [
        memberPath,
        {
          contractVersion: input.leaves[memberPath].contractVersion,
          schemaVersion: input.leaves[memberPath].schemaVersion,
        },
      ]),
    );
  }
  if (ruleKind === "contract.differential-domains") {
    return differential.domains;
  }
  if (ruleKind === "contract.conditional-artifacts") {
    return v131Array(closure.families, "closure families").map((row) => {
      const familyRow = v131Record(row, "closure family");
      return {
        applicability: v131Unwrap(familyRow.applicability),
        closureArtifact: v131Unwrap(familyRow.closureArtifact),
      };
    });
  }
  throw new Error(`No v1.3.1 authority selector for '${ruleKind}'`);
}

type V131FactState =
  | "present"
  | "missing"
  | "unknown"
  | "contradictory"
  | "aliased"
  | "ambiguous";

type V131BlockedFactReason = V131FactState | "unauthenticated";

interface V131ObservedFact {
  readonly authenticated: boolean;
  readonly value: unknown;
  readonly repositoryId: string;
  readonly factState: V131FactState;
  readonly aliasesAbsent: boolean;
  readonly authorityComplete: boolean;
  readonly contradictionFree: boolean;
  readonly blockedReason?: V131BlockedFactReason;
}

const V131_ARTIFACT_ID_PATTERN =
  "^art_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

function v131ClosureSchema(family: string): Readonly<Record<string, unknown>> {
  const evidenceIds = {
    items: { pattern: V131_ARTIFACT_ID_PATTERN, type: "string" },
    type: "array",
    uniqueItems: true,
  };
  const disposition = {
    additionalProperties: false,
    properties: {
      evidenceArtifactIds: evidenceIds,
      value: { type: "boolean" },
    },
    required: ["value", "evidenceArtifactIds"],
    type: "object",
  };
  return {
    additionalProperties: false,
    properties: {
      blocked: disposition,
      family: { const: family, type: "string" },
      schemaVersion: { const: 1, type: "integer" },
      selected: disposition,
    },
    required: ["schemaVersion", "family", "selected", "blocked"],
    type: "object",
  };
}

function v131ArtifactObservedValue(input: {
  readonly dimension: string;
  readonly fact: V13ArtifactRefFact;
}): unknown {
  switch (input.dimension) {
    case "requiredness":
      return "required-before-root-record";
    case "cardinality":
      return "1";
    case "mediaType":
      return input.fact.submittedMediaType ?? null;
    case "producer":
      return {
        authority: "worker-proposal-only",
        writeScope: "declared-allowed-write-path",
      };
    case "consumers":
      return ["root-pre-record-validator", "root-decision-reviewer"];
    case "repositoryArtifactRefRelation":
      return {
        artifactRefRequired: true,
        digestRequired: true,
        pathBinding: "exact",
        repositoryBinding: "dispatch-target-repository",
        trackedAbsolutePathsForbidden: true,
      };
    case "stableId":
      return { schema: "none", source: "exact-family-plus-canonical-path" };
    case "provenance":
      return {
        privateBodyFieldsForbidden: true,
        requiredFields: [
          "family",
          "capabilityId",
          "dispatchId",
          "activationId",
          "approvalId",
          "repositoryId",
          "artifactId",
          "sha256",
        ],
      };
    case "dependencies":
      return [];
    case "immutableFieldsAndMutationAuthority":
      return {
        immutableFields: [
          "artifactRef.id",
          "artifactRef.repositoryId",
          "artifactRef.path",
          "artifactRef.sha256",
          "provenance.identityFields",
          "stableId",
        ],
        postAcceptCorrection: "new-artifact-identity-and-root-review",
        postAcceptMutation: "forbidden",
        preAcceptCorrection: "new-worker-proposal",
      };
    case "transitions":
      return {
        accept: {
          from: "proposed",
          preconditions: [
            "all-bound-critical-validators-pass",
            "root-pre-record-review",
          ],
          to: "accepted",
        },
        create: {
          from: "absent",
          preconditions: [
            "declared-output",
            "allowed-write-path",
            "complete-provenance",
          ],
          to: "proposed",
        },
        reject: {
          from: "proposed",
          preconditions: ["any-bound-critical-validator-fails"],
          to: "rejected",
        },
        terminalStates: ["accepted", "rejected"],
      };
    case "terminalApplicability":
      return {
        appliesOn: "every-root-recording-attempt",
        familyTerminalInference: false,
        resultStatusIndependent: true,
      };
    case "crossArtifactConsistency":
      return {
        aliasConflict: "critical",
        equalBindings: [
          "questId",
          "dispatchId",
          "activationId",
          "approvalId",
          "capabilityId",
          "repositoryId",
        ],
        identityRule: "one-canonical-output-id-per-materialization",
        mixedBinding: "critical",
      };
    default:
      return null;
  }
}

function v131Observation(input: {
  readonly authority: unknown;
  readonly value: unknown;
  readonly repositoryId: string;
  readonly blockedReason?: V131BlockedFactReason;
}): V131ObservedFact {
  let blockedReason = input.blockedReason;
  if (
    blockedReason === undefined &&
    canonicalResearchJson(input.value) !==
      canonicalResearchJson(input.authority)
  ) {
    blockedReason = "contradictory";
  }
  const factState: V131FactState =
    blockedReason === "unauthenticated"
      ? "unknown"
      : (blockedReason ?? "present");
  return {
    authenticated: blockedReason !== "unauthenticated",
    value: input.value,
    repositoryId: input.repositoryId,
    factState,
    aliasesAbsent: blockedReason !== "aliased",
    authorityComplete: true,
    contradictionFree: blockedReason !== "contradictory",
    blockedReason,
  };
}

function v131ObservedArtifactValue(input: {
  readonly applicable: V131ApplicableBinding;
  readonly authority: unknown;
  readonly artifactRefFacts: readonly V13ArtifactRefFact[];
}): V131ObservedFact {
  const target = input.applicable.target;
  const dimension = input.applicable.dimension;
  if (target === undefined || dimension === undefined) {
    return v131Observation({
      authority: input.authority,
      value: null,
      repositoryId: "rep_unresolved",
      blockedReason: "unknown",
    });
  }
  const pathFacts = input.artifactRefFacts.filter(
    (fact) => fact.exactPath === target.publicIdentity && fact.present,
  );
  const fact = pathFacts[0];
  const repositoryId = fact?.repositoryId ?? "rep_unresolved";
  if (fact === undefined) {
    return v131Observation({
      authority: input.authority,
      value: null,
      repositoryId,
      blockedReason: "missing",
    });
  }
  const alias = input.artifactRefFacts.some(
    (candidate) =>
      candidate.present &&
      candidate.artifactId === fact.artifactId &&
      candidate.exactPath !== fact.exactPath,
  );
  let blockedReason: V131BlockedFactReason | undefined;
  if (pathFacts.length > 1) blockedReason = "ambiguous";
  else if (alias) blockedReason = "aliased";
  else if (
    typeof fact.repositoryId !== "string" ||
    typeof fact.resolvedRepositoryIdentity !== "string"
  ) {
    blockedReason = "unauthenticated";
  } else if (typeof fact.submittedSha256 !== "string") {
    blockedReason = "unknown";
  } else if (
    dimension === "mediaType" &&
    typeof fact.submittedMediaType !== "string"
  ) {
    blockedReason = "unknown";
  }
  return v131Observation({
    authority: input.authority,
    value:
      dimension === "cardinality" && pathFacts.length !== 1
        ? String(pathFacts.length)
        : v131ArtifactObservedValue({ dimension, fact }),
    repositoryId,
    blockedReason,
  });
}

function v131EvidenceRule(
  pointer: "selected" | "blocked",
): Readonly<Record<string, unknown>> {
  return {
    absence: "invalid",
    evidenceIdsPointer: `/${pointer}/evidenceArtifactIds`,
    falseEvidence: "empty-array",
    null: "invalid",
    producer: "worker-proposal-only",
    selfReference: "forbidden",
    trueEvidence: "one-or-more-bound-non-closure-artifact-ref-ids",
    type: "boolean",
    valuePointer: `/${pointer}/value`,
  };
}

function v131ObservedClosureValue(input: {
  readonly applicable: V131ApplicableBinding;
  readonly authority: unknown;
  readonly artifactRefFacts: readonly V13ArtifactRefFact[];
  readonly closureObservation?: V131ClosureObservation;
}): V131ObservedFact {
  const family = input.applicable.binding.targetId;
  const closurePath = `methodology/closure/${family}.json`;
  const closureFacts = input.artifactRefFacts.filter(
    (fact) => fact.present && fact.exactPath === closurePath,
  );
  const closureFact = closureFacts[0];
  const observation = input.closureObservation;
  const repositoryId = closureFact?.repositoryId ?? "rep_unresolved";
  let blockedReason: V131BlockedFactReason | undefined;
  if (closureFact === undefined || observation === undefined) {
    blockedReason = "missing";
  } else if (closureFacts.length > 1) {
    blockedReason = "ambiguous";
  } else if (
    input.artifactRefFacts.some(
      (candidate) =>
        candidate.present &&
        candidate.artifactId === closureFact.artifactId &&
        candidate.exactPath !== closureFact.exactPath,
    )
  ) {
    blockedReason = "aliased";
  } else if (
    typeof closureFact.repositoryId !== "string" ||
    typeof closureFact.resolvedRepositoryIdentity !== "string" ||
    typeof closureFact.submittedSha256 !== "string"
  ) {
    blockedReason = "unauthenticated";
  } else if (
    observation.schemaVersion !== 1 ||
    typeof observation.family !== "string" ||
    typeof observation.selected !== "boolean" ||
    typeof observation.blocked !== "boolean" ||
    !Array.isArray(observation.selectedEvidenceArtifactIds) ||
    !Array.isArray(observation.blockedEvidenceArtifactIds)
  ) {
    blockedReason = "unknown";
  } else if (
    observation.family !== family ||
    closureFact.submittedMediaType !== "application/json"
  ) {
    blockedReason = "contradictory";
  }

  const boundFacts = new Map(
    input.artifactRefFacts
      .filter((fact) => fact.present)
      .map((fact) => [fact.artifactId, fact] as const),
  );
  const evidenceIsValid = (
    value: boolean,
    artifactIds: readonly string[],
  ): boolean =>
    new Set(artifactIds).size === artifactIds.length &&
    (value ? artifactIds.length > 0 : artifactIds.length === 0) &&
    artifactIds.every((artifactId) => {
      const fact = boundFacts.get(artifactId);
      return (
        fact !== undefined &&
        fact !== closureFact &&
        !fact.exactPath.startsWith("methodology/closure/")
      );
    });

  let value: unknown;
  switch (input.applicable.binding.ruleKind) {
    case "closure.schema":
      value = v131ClosureSchema(observation?.family ?? family);
      break;
    case "closure.evidence":
      value = {
        blocked: v131EvidenceRule("blocked"),
        selected: v131EvidenceRule("selected"),
      };
      if (
        blockedReason === undefined &&
        observation !== undefined &&
        (!evidenceIsValid(
          observation.selected,
          observation.selectedEvidenceArtifactIds,
        ) ||
          !evidenceIsValid(
            observation.blocked,
            observation.blockedEvidenceArtifactIds,
          ))
      ) {
        blockedReason = "contradictory";
      }
      break;
    case "closure.xor":
      value = {
        blockedPointer: "/blocked/value",
        rule: "exactly-one-true",
        selectedPointer: "/selected/value",
      };
      if (
        blockedReason === undefined &&
        observation !== undefined &&
        observation.selected === observation.blocked
      ) {
        blockedReason = "contradictory";
      }
      break;
    case "closure.status-inference":
      value = {
        allowed: false,
        forbiddenPointers: ["/result/status", "/status"],
        mapping: null,
        stableError: "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN",
      };
      break;
    case "closure.worker-boundary":
      value = {
        preRecordReader: {
          authority: "root-methodology-validator",
          phase: "before-result-proposal-approval-consumption-append",
        },
        visibility: {
          root: "complete facts, bindings, and validator findings",
          worker:
            "closure schema and evidence obligations; no Decision or recording authority",
        },
        zeroWriteBoundary: {
          onFailure:
            "return-critical-validation-failure-before-canonical-append-or-sidecar-publication",
          workerWritesCanonicalResearch: false,
        },
      };
      break;
    default:
      value = null;
      blockedReason ??= "unknown";
  }
  return v131Observation({
    authority: input.authority,
    value,
    repositoryId,
    blockedReason,
  });
}

function v131ReconstructedBinding(
  applicable: V131ApplicableBinding,
): Readonly<Record<string, unknown>> {
  return {
    bindingId: applicable.binding.bindingId,
    provenance: {
      class: "trellis-native-v1.3.1",
      decisionId: "DEC-V13-VALIDATOR-BINDING",
    },
    ruleId: applicable.binding.ruleId,
    ruleKind: applicable.binding.ruleKind,
    stableErrors: applicable.binding.stableErrors,
    targetId: applicable.binding.targetId,
    validator: applicable.binding.validator,
  };
}

function v131ObservedPackageValue(input: {
  readonly applicable: V131ApplicableBinding;
  readonly pack: V131AcceptedContractPack;
  readonly leaves: V131AuthorityLeaves;
}): unknown {
  const ruleKind = input.applicable.binding.ruleKind;
  if (
    ruleKind === "validator.binding-integrity" ||
    ruleKind === "contract.candidate-authority"
  ) {
    return v131ReconstructedBinding(input.applicable);
  }
  if (ruleKind === "report.v2-binding") return input.pack.reportV2Contract;
  if (ruleKind === "authority.worker-boundary") {
    return {
      closureArtifactAuthority: "worker-evidence-only",
      decisionAuthority: "root-only",
      proposalAuthority: "pending-proposal-only",
      recordingAuthority: "root-only",
    };
  }
  if (ruleKind === "contract.output-disposition") {
    return {
      allowedDispositions: [
        "include",
        "alias",
        "container",
        "pattern",
        "exclude",
        "inapplicable",
        "blocked-by-contract",
      ],
      outputs: input.pack.outputs,
    };
  }
  if (ruleKind === "contract.blocked-output-kind") {
    return (
      input.pack.outputs.find(
        (row) => row.outputId === input.applicable.binding.targetId,
      ) ?? null
    );
  }
  if (ruleKind === "contract.closure-applicability") {
    return input.pack.closureFamilies;
  }
  if (ruleKind === "contract.canonical-bytes") {
    return {
      byteRules: {
        duplicateDecodedKeys: "reject",
        encoding: "strict-utf8",
        finalLfCount: 1,
        nonFiniteNumbers: "reject",
        unpairedSurrogates: "reject",
      },
      canonicalization: {
        provenance: {
          class: "trellis-native-v1.3",
          decisionId: "DEC-V13-REPORT-V2",
        },
        value: {
          findingOrder: [
            "validator.id",
            "validator.version",
            "targetId",
            "stableError",
            "factPointer",
          ],
          json: "strict-utf8-recursive-key-sort-array-order-preserved-one-final-lf",
          unknownKeys: "reject",
        },
      },
      constructionProcedure: {
        digestInput:
          "canonical report JSON without final LF; digest is stored outside the report object",
        language: "closed-json-schema-2020-12-and-canonical-json-v1",
        unknownOrMissingFieldDisposition: "reject-before-digest-and-write",
      },
      ordering: {
        arrays: "preserve-schema-defined-input-order",
        findings: [
          "validator.id",
          "validator.version",
          "targetId",
          "stableError",
          "factPointer",
        ],
        objects: "recursive-unicode-code-point-key-sort",
      },
    };
  }
  if (ruleKind === "contract.compatibility") {
    return Object.fromEntries(
      [...V131_ACCEPTED_PACK_MEMBER_ALLOWLIST].sort().map((memberPath) => [
        memberPath,
        {
          contractVersion: input.leaves[memberPath].contractVersion,
          schemaVersion: input.leaves[memberPath].schemaVersion,
        },
      ]),
    );
  }
  if (ruleKind === "contract.differential-domains") {
    const differential = input.leaves["differential-test-matrix-v1.3.1.json"];
    const domains = v131Record(differential.domains, "differential domains");
    const expansion38 = v131Record(domains.expansion38, "expansion38 domain");
    const frozenV12 = v131Record(domains.frozenV12, "frozenV12 domain");
    const v13Delta = v131Record(domains.v13Delta, "v13Delta domain");
    return {
      expansion38: {
        count: expansion38.count,
        relationship: expansion38.relationship,
        sourceDigest: expansion38.sourceDigest,
      },
      frozenV12: {
        count: frozenV12.count,
        identityMutationAllowed: frozenV12.identityMutationAllowed,
        sourceDigest: frozenV12.sourceDigest,
      },
      v13Delta: {
        caseCount: input.pack.deltaCases.length,
        idNamespace: input.pack.deltaCases.every(
          (row) =>
            typeof row.caseId === "string" && row.caseId.startsWith("V13-"),
        )
          ? "V13-*"
          : "invalid",
        relationship: v13Delta.relationship,
      },
    };
  }
  if (ruleKind === "contract.conditional-artifacts") {
    return input.pack.closureFamilies.map((familyId) => {
      const family = v131ClosureFamily(input.leaves, familyId);
      if (family === undefined) {
        throw new Error(
          `Accepted v1.3.1 closure family '${familyId}' is missing`,
        );
      }
      const applicability = v131Record(
        v131Unwrap(family.applicability),
        `closure family ${familyId} applicability`,
      );
      const acceptedArtifact = v131Record(
        v131Unwrap(family.closureArtifact),
        `closure family ${familyId} artifact`,
      );
      const identity = `methodology/closure/${familyId}.json`;
      const lifecycleArtifact = input.pack.artifacts.find(
        (artifact) => artifact.publicIdentity === identity,
      );
      return {
        applicability: {
          family: familyId,
          onlyExactFamily: true,
          publicCaseEvidenceIds: applicability.publicCaseEvidenceIds,
        },
        closureArtifact: {
          artifactId:
            lifecycleArtifact?.artifactId ?? acceptedArtifact.artifactId,
          closedSchema: v131ClosureSchema(familyId),
          identity,
          mediaType:
            lifecycleArtifact?.dimensions.mediaType.value ??
            acceptedArtifact.mediaType,
          schemaVersionPointer: "/schemaVersion",
          schemaVersionValue: 1,
        },
      };
    });
  }
  throw new Error(`No v1.3.1 observation builder for '${ruleKind}'`);
}

function buildV131Fact(input: {
  readonly applicable: V131ApplicableBinding;
  readonly pack: V131AcceptedContractPack;
  readonly leaves: V131AuthorityLeaves;
  readonly procedureDigest: string;
  readonly artifactRefFacts: readonly V13ArtifactRefFact[];
  readonly dispatchContext: V131DispatchContext;
  readonly closureObservation?: V131ClosureObservation;
}): {
  readonly source: string;
  readonly authenticated: boolean;
  readonly value: unknown;
  readonly blockedReason?: V131BlockedFactReason;
} {
  const { applicable } = input;
  const authority = v131AuthorityValue({ applicable, leaves: input.leaves });
  let observation: V131ObservedFact;
  let source: string;
  if (applicable.target !== undefined) {
    observation = v131ObservedArtifactValue({
      applicable,
      authority,
      artifactRefFacts: input.artifactRefFacts,
    });
    source = "verified-artifact-ref";
  } else if (applicable.binding.ruleKind.startsWith("closure.")) {
    observation = v131ObservedClosureValue({
      applicable,
      authority,
      artifactRefFacts: input.artifactRefFacts,
      closureObservation: input.closureObservation,
    });
    source = "strict-closure-observation";
  } else {
    observation = v131Observation({
      authority,
      value: v131ObservedPackageValue({
        applicable,
        pack: input.pack,
        leaves: input.leaves,
      }),
      repositoryId: input.artifactRefFacts[0]?.repositoryId ?? "rep_unresolved",
    });
    source = "authenticated-package-and-canonical-state";
  }
  const [authorityField, observedField] = v131RuleValueFields(
    applicable.binding.ruleKind,
  );
  const mapping = applicable.mapping;
  const facts = {
    aliasesAbsent: observation.aliasesAbsent,
    authorityComplete: observation.authorityComplete,
    bindingId: applicable.binding.bindingId,
    contradictionFree: observation.contradictionFree,
    expectedStableErrors: applicable.binding.stableErrors,
    factState: observation.factState,
    ruleKind: applicable.binding.ruleKind,
    targetId: applicable.binding.targetId,
    [authorityField]: canonicalResearchJson(authority),
    [observedField]: canonicalResearchJson(observation.value),
  };
  return {
    source,
    authenticated: observation.authenticated,
    blockedReason: observation.blockedReason,
    value: {
      ruleId: applicable.binding.ruleId,
      targetId: applicable.binding.targetId,
      facts,
      authoritySnapshot: {
        methodologyIdentity: V131_ACCEPTED_CONTRACT_VERSION,
        methodologyDigest: V131_ACCEPTED_CONTRACT_DIGEST.slice(
          "sha256:".length,
        ),
        procedureId: mapping.procedureId,
        procedureVersion: mapping.procedureVersion,
        procedureDigest: input.procedureDigest,
        capabilityId: mapping.capabilityId,
        questId: input.dispatchContext.questId,
        dispatchId: input.dispatchContext.dispatchId,
        activationId: input.dispatchContext.activationId,
        approvalId: input.dispatchContext.approvalId,
        repositoryId: observation.repositoryId,
        lifecycleApplicabilityContext: {
          applicabilityDecision: true,
          mappingDigest:
            "sha256:6f63481078b8b49b8645b2b4f3cdf7b4b6a6c0155958c6b9713a0da38bdf462f",
          mappingRow: {
            procedureId: mapping.procedureId,
            procedureVersion: mapping.procedureVersion,
            capabilityId: mapping.capabilityId,
            disposition: mapping.disposition,
            artifactFamily: mapping.artifactFamily,
          },
          targetArtifactFamily:
            applicable.targetArtifactFamily ??
            mapping.artifactFamily ??
            "research-ideation",
        },
      },
    },
  };
}

function validateMethodologyV131BeforeRecord(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly methodologyContractVersion?: string;
  readonly methodologyContractDigest?: string;
  readonly capabilityId?: string;
  readonly supportInventoryDigest?: string;
  readonly procedure?: ParsedResearchProcedure;
  readonly acceptedV131Pack?: V131AcceptedContractPack;
  readonly acceptedV131LeafDir?: string;
  readonly artifactRefFacts?: readonly V13ArtifactRefFact[];
  readonly dispatchContext?: V131DispatchContext;
  readonly closureObservation?: V131ClosureObservation;
  readonly closureArtifactRef?: Readonly<{
    readonly artifactId: string;
    readonly exactPath: string;
    readonly sha256: string;
    readonly mediaType: string;
  }>;
  readonly batchCommitted?: boolean;
}): {
  readonly reportKind: "v1.3.1";
  readonly ok: boolean;
  readonly criticalFailure: boolean;
  readonly reportV131: MethodologyDeterministicReportV131;
  readonly reportDigest: string;
  readonly materializeSidecar: boolean;
} {
  const authority = loadAcceptedV131Authority({
    leafDir: input.acceptedV131LeafDir,
  });
  if (
    input.acceptedV131Pack !== undefined &&
    canonicalResearchJson(input.acceptedV131Pack) !==
      canonicalResearchJson(authority.pack)
  ) {
    throw new Error(
      "Injected accepted v1.3.1 pack does not match the authenticated authority leaves",
    );
  }
  const pack = input.acceptedV131Pack ?? authority.pack;
  const methodologyVersion =
    input.methodologyContractVersion ??
    input.procedure?.supportPack?.manifest.methodologyContractVersion;
  const methodologyDigest =
    input.methodologyContractDigest ??
    input.procedure?.supportPack?.manifest.methodologyContractDigest;
  const supportInventoryJson =
    input.procedure?.supportPack === undefined
      ? undefined
      : serializeSupportPackInventoryForDigest(
          input.procedure.supportPack.inventoryItems,
        );
  const supportInventoryDigest =
    input.supportInventoryDigest ??
    (supportInventoryJson === undefined
      ? undefined
      : `sha256:${createHash("sha256").update(supportInventoryJson).digest("hex")}`);
  if (
    input.procedureVersion !== "2.0.7" ||
    methodologyVersion !== V131_ACCEPTED_CONTRACT_VERSION ||
    methodologyDigest !== V131_ACCEPTED_CONTRACT_DIGEST ||
    input.capabilityId === undefined ||
    input.dispatchContext === undefined ||
    input.artifactRefFacts === undefined ||
    supportInventoryDigest === undefined
  ) {
    throw new Error(
      "Accepted v1.3.1 validation requires exact Procedure, methodology, dispatch, ArtifactRef, and support-inventory bindings",
    );
  }
  const applicable = selectApplicableV131BindingsForProcedure({
    pack,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    capabilityId: input.capabilityId,
  });
  const blockedReasonByBinding = new Map<string, V131BlockedFactReason>();
  const executed = executeV131BindingInvocations({
    pack,
    applicableBindings: applicable,
    factForBinding: (binding) => {
      const fact = buildV131Fact({
        applicable: binding,
        pack,
        leaves: authority.leaves,
        procedureDigest: input.procedureDigest,
        artifactRefFacts: input.artifactRefFacts ?? [],
        dispatchContext: input.dispatchContext as NonNullable<
          typeof input.dispatchContext
        >,
        closureObservation: input.closureObservation,
      });
      if (fact.blockedReason !== undefined) {
        blockedReasonByBinding.set(
          binding.binding.bindingId,
          fact.blockedReason,
        );
      }
      return fact;
    },
  });
  const orderedFindings: MethodologyReportV131Finding[] = executed.invocations
    .filter((row) => row.outcome === "fail-closed")
    .map((row) => ({
      validator: {
        id: row.validatorId,
        version: row.validatorVersion,
        severity: row.validatorSeverity,
      },
      targetId: row.targetId,
      stableError: row.findingCode ?? "V13_VALIDATOR_BINDING_INVALID",
      factPointer: `/bindings/${row.bindingId}/facts`,
    }))
    .sort((left, right) =>
      [
        left.validator.id,
        left.validator.version,
        left.targetId,
        left.stableError,
        left.factPointer,
      ]
        .join("\0")
        .localeCompare(
          [
            right.validator.id,
            right.validator.version,
            right.targetId,
            right.stableError,
            right.factPointer,
          ].join("\0"),
        ),
    );
  const blockedFacts = orderedFindings.map((finding) => {
    const bindingId = finding.factPointer.split("/")[2];
    return {
      factPointer: finding.factPointer,
      reason:
        (bindingId === undefined
          ? undefined
          : blockedReasonByBinding.get(bindingId)) ?? "contradictory",
    };
  });
  const artifactBindings = applicable
    .filter((binding) => binding.target !== undefined)
    .map((binding) => {
      const fact = input.artifactRefFacts?.find(
        (candidate) => candidate.exactPath === binding.target?.publicIdentity,
      );
      return {
        applicable: true,
        artifactId:
          fact?.artifactId ??
          binding.target?.artifactId ??
          binding.binding.targetId,
        bindingId: binding.binding.bindingId,
        mapping: {
          disposition: binding.mapping.disposition,
          artifactFamily: binding.mapping.artifactFamily,
        },
        targetArtifactFamily:
          binding.targetArtifactFamily ??
          binding.target?.family ??
          "research-ideation",
        targetId: binding.binding.targetId,
      };
    });
  const closureSources =
    input.closureObservation === undefined ||
    input.closureArtifactRef === undefined
      ? []
      : [
          {
            digest: input.closureArtifactRef.sha256.startsWith("sha256:")
              ? input.closureArtifactRef.sha256
              : `sha256:${input.closureArtifactRef.sha256}`,
            family: input.closureObservation.family,
            sourceId: input.closureArtifactRef.artifactId,
          },
        ];
  const report = buildMethodologyReportV131({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    activationId: input.dispatchContext.activationId,
    applicability: applicable.map((binding) => ({
      applies: true,
      bindingId: binding.binding.bindingId,
      reason: binding.applicabilityReason,
    })),
    approvalId: input.dispatchContext.approvalId,
    artifactBindings,
    blockedFacts,
    closureSources,
    dispatchId: input.dispatchContext.dispatchId,
    methodologyDigest: V131_ACCEPTED_CONTRACT_DIGEST.slice("sha256:".length),
    methodologyIdentity: V131_ACCEPTED_CONTRACT_VERSION,
    orderedFindings,
    orderedValidatorTriples: pack.validators.map((validator) => ({
      id: validator.identity.id,
      version: validator.identity.version,
      severity: validator.severity,
    })),
    procedureDigest: input.procedureDigest,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    questId: input.dispatchContext.questId,
    schemaVersion: 2,
    supportInventoryDigest,
    zeroWriteDisposition: executed.ok
      ? "validation-complete-before-write"
      : "rejected-before-write",
  });
  const reportDigest = computeMethodologyReportV2DigestFromCanonicalBody(
    canonicalResearchJson(report),
  );
  return {
    reportKind: "v1.3.1",
    ok: executed.ok,
    criticalFailure: executed.criticalFailure,
    reportV131: report,
    reportDigest,
    materializeSidecar:
      executed.ok && !executed.criticalFailure && input.batchCommitted === true,
  };
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
  /** Closed 17-Procedure closure disposition (CS5-2). */
  readonly closureDisposition?: V13ProcedureClosureDisposition;
  /** Exact ArtifactRef-derived lifecycle facts (CS5-2, never parallel authority). */
  readonly artifactRefFacts?: readonly V13ArtifactRefFact[];
  /** Dispatch context for cross-artifact equal bindings (CS5-2). */
  readonly dispatchContext?: V131DispatchContext;
  readonly declaredValidators?: readonly MethodologyValidatorDescriptor[];
  readonly procedure?: ParsedResearchProcedure;
  readonly acceptedV13Pack?: V13AcceptedContractPack;
  readonly acceptedV131Pack?: V131AcceptedContractPack;
  /** Test-only leaf injection; production never supplies this. */
  readonly acceptedV13LeafDir?: string;
  readonly acceptedV131LeafDir?: string;
  readonly closureObservation?: V131ClosureObservation;
  readonly artifactPaths?: readonly string[];
  readonly artifactDigests?: readonly { path: string; sha256: string }[];
  readonly batchCommitted?: boolean;
  /** CS5-4 result identity bindings. */
  readonly resultId?: string;
  readonly proposalId?: string;
  readonly approvalId?: string;
  readonly idempotencyKey?: string;
  readonly batchHeadSeq?: number;
  readonly acceptedMemberAggregateSha256?: string;
  /** Exact closure ArtifactRef captured by the closure gate. */
  readonly closureArtifactRef?: Readonly<{
    readonly artifactId: string;
    readonly exactPath: string;
    readonly sha256: string;
    readonly mediaType: string;
  }>;
}):
  | {
      readonly reportKind: "historical";
      readonly ok: boolean;
      readonly criticalFailure: boolean;
      readonly report: MethodologyDeterministicReport;
      readonly reportV2: MethodologyDeterministicReportV2;
      readonly materializeSidecar: boolean;
    }
  | {
      readonly reportKind: "v1.3.1";
      readonly ok: boolean;
      readonly criticalFailure: boolean;
      readonly reportV131: MethodologyDeterministicReportV131;
      readonly reportDigest: string;
      readonly materializeSidecar: boolean;
    } {
  if (input.procedureVersion === "2.0.7") {
    return validateMethodologyV131BeforeRecord({
      procedureId: input.procedureId,
      procedureVersion: input.procedureVersion,
      procedureDigest: input.procedureDigest,
      methodologyContractVersion: input.methodologyContractVersion,
      methodologyContractDigest: input.methodologyContractDigest,
      capabilityId: input.capabilityId,
      supportInventoryDigest: input.supportInventoryDigest,
      procedure: input.procedure,
      acceptedV131Pack: input.acceptedV131Pack,
      acceptedV131LeafDir: input.acceptedV131LeafDir,
      artifactRefFacts: input.artifactRefFacts,
      dispatchContext: input.dispatchContext,
      closureObservation: input.closureObservation,
      closureArtifactRef: input.closureArtifactRef,
      batchCommitted: input.batchCommitted,
    });
  }
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

  // Explicit closure for accepted successor versions (2.0.4 / 2.0.5 / 2.0.6).
  // Never derive selected/blocked from Result.status on that path.
  const isSuccessorProcedureVersion =
    input.procedureVersion === LOSSLESS_METHODOLOGY_PROCEDURE_VERSION ||
    input.procedureVersion === "2.0.5" ||
    input.procedureVersion === "2.0.6";
  // CS5-2: explicit closure applies to the six closure-required Procedures.
  // notApplicable families never require (or derive) closure, so status-
  // inference/closure-exclusivity validators must not fire for them. A
  // successor call WITHOUT a disposition is ambiguous and fails closed.
  const requireExplicitClosure =
    procedureAuthoritative &&
    isSuccessorProcedureVersion &&
    input.closureDisposition?.kind !== "notApplicable";

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
      reportKind: "historical",
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
    closureInapplicable: input.closureDisposition?.kind === "notApplicable",
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
  // exact binding execution, and successful validation. Authority is computed
  // ONLY after every artifact/closure/lifecycle/package/binding check completes
  // (CS5-4); the legacy contract path below may still add failures.
  // (reportV2Authorized is finalized after the enforcement blocks.)

  // CS5-2: exact ArtifactRef-derived lifecycle enforcement for accepted
  // successor paths. This replaces parallel path/digest authority when facts
  // are supplied; the legacy contract binding below remains only for
  // non-successor (v1.2) callers that pass artifactPaths directly.
  let bindingExecution:
    | {
        readonly applicableCount: number;
        readonly invocationCount: number;
        readonly ledgerDigest: string;
      }
    | undefined;
  if (
    isSuccessorProcedureVersion &&
    acceptedPack !== undefined &&
    input.artifactRefFacts !== undefined &&
    methodologyContractDigest === V13_ACCEPTED_CONTRACT_DIGEST
  ) {
    const lifecycleResult = enforceV13LifecycleDimensionsFromArtifactRefs({
      pack: acceptedPack,
      procedureId: input.procedureId,
      artifactRefFacts: input.artifactRefFacts,
      terminalState: input.terminalState,
      dispatchContext: input.dispatchContext,
    });
    if (!lifecycleResult.ok) {
      const findings = lifecycleResult.findings.map((f) => ({
        validatorId: "artifact-contract",
        severity: "critical" as const,
        code: f.code,
        message: `${f.dimension} ${f.publicIdentity}: ${f.message}`,
      }));
      mergedValidation = {
        ok: false,
        criticalFailure: true,
        findings: Object.freeze([...mergedValidation.findings, ...findings]),
      };
    }
    // CS5-2/CS5-4: exact per-binding execution over ArtifactRef facts with a
    // deterministic invocation ledger. Fail-closed on unresolved facts.
    try {
      const executed = executeV13ProcedureBindings({
        pack: acceptedPack,
        procedureId: input.procedureId,
        artifactRefFacts: input.artifactRefFacts,
        closureSelected: input.selected,
        closureBlocked: input.blocked,
        terminalState: input.terminalState,
        dispatchContext: input.dispatchContext,
      });
      bindingExecution = {
        applicableCount: executed.applicableCount,
        invocationCount: executed.invocationCount,
        ledgerDigest: `sha256:${executed.ledgerDigest}`,
      };
      if (!executed.ok) {
        const findings = executed.invocations
          .filter((i) => i.outcome === "fail-closed")
          .map((i) => ({
            validatorId: i.validatorId,
            severity: "critical" as const,
            code: i.findingCode ?? "V13_ARTIFACT_BINDING_INVALID",
            message: `binding ${i.bindingId} ${i.ruleKind} ${i.targetId}: ${i.factSource}`,
          }));
        mergedValidation = {
          ok: false,
          criticalFailure: true,
          findings: Object.freeze([...mergedValidation.findings, ...findings]),
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      mergedValidation = {
        ok: false,
        criticalFailure: true,
        findings: Object.freeze([
          ...mergedValidation.findings,
          {
            validatorId: "binding-execution",
            severity: "critical" as const,
            code: "V13_BINDING_EXECUTION_FAILED",
            message,
          },
        ]),
      };
    }
  }

  // When exact contracts exist on the pack, enforce artifact path/cardinality.
  // Skip for unaccepted 2.0.3 authority paths (already critical-failed above).
  if (
    input.procedure !== undefined &&
    input.procedureVersion !== "2.0.3" &&
    !usesRejectedA2Digest &&
    !(isSuccessorProcedureVersion && input.artifactRefFacts !== undefined)
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

  // CS5-4: report-v2 authority is computed ONLY after every artifact, closure,
  // lifecycle, package, and binding check completes. Any failure forces
  // authority:false and prevents sidecar materialization.
  const closureFactsComplete =
    input.closureDisposition?.kind === "required"
      ? input.selected !== undefined && input.blocked !== undefined
      : input.closureDisposition?.kind === "notApplicable";
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
    closureFactsComplete &&
    input.closureDisposition !== undefined &&
    typeof input.acceptedMemberAggregateSha256 === "string" &&
    input.acceptedMemberAggregateSha256.length > 0 &&
    input.artifactRefFacts !== undefined &&
    bindingExecution !== undefined &&
    typeof input.resultId === "string" &&
    typeof input.proposalId === "string" &&
    typeof input.approvalId === "string" &&
    typeof input.idempotencyKey === "string" &&
    typeof input.batchHeadSeq === "number" &&
    mergedValidation.ok &&
    !mergedValidation.criticalFailure;

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
    acceptedMemberAggregateSha256: reportV2Authorized
      ? input.acceptedMemberAggregateSha256
      : undefined,
    supportInventoryDigest: reportV2Authorized
      ? supportInventoryDigest
      : undefined,
    requestDigest: reportV2Authorized ? input.requestDigest : undefined,
    policyDigest: reportV2Authorized ? input.policyDigest : undefined,
    scopeDigest: reportV2Authorized ? input.scopeHash : undefined,
    closureSource: {
      selected: facts.selected,
      blocked: facts.blocked,
      requireExplicitClosure,
      resultStatusNotAuthority: true,
      reportV2Authorized,
      closureDisposition: input.closureDisposition,
    },
    closureArtifactRef: reportV2Authorized
      ? input.closureArtifactRef
      : undefined,
    artifactRefCount: reportV2Authorized
      ? input.artifactRefFacts?.length
      : undefined,
    lifecycleFindingCount: reportV2Authorized ? 0 : undefined,
    bindingApplicableCount: reportV2Authorized
      ? bindingExecution?.applicableCount
      : undefined,
    bindingInvocationCount: reportV2Authorized
      ? bindingExecution?.invocationCount
      : undefined,
    bindingInvocationLedgerDigest: reportV2Authorized
      ? bindingExecution?.ledgerDigest
      : undefined,
    resultId: reportV2Authorized ? input.resultId : undefined,
    proposalId: reportV2Authorized ? input.proposalId : undefined,
    approvalId: reportV2Authorized ? input.approvalId : undefined,
    idempotencyKey: reportV2Authorized ? input.idempotencyKey : undefined,
    batchHeadSeq: reportV2Authorized ? input.batchHeadSeq : undefined,
    batchCommitted: reportV2Authorized
      ? input.batchCommitted === true
      : undefined,
  });

  const materializeSidecar =
    reportV2Authorized &&
    shouldMaterializeMethodologyReportSidecar({
      validationOk: mergedValidation.ok,
      criticalFailure: mergedValidation.criticalFailure,
      batchCommitted: input.batchCommitted === true,
    });

  return {
    reportKind: "historical",
    ok: mergedValidation.ok,
    criticalFailure: mergedValidation.criticalFailure,
    report,
    reportV2,
    materializeSidecar,
  };
}

/**
 * Report-v2 sidecar publication now uses the hardened interface in
 * dispatch-activation-materialization (CS5-4); re-exported for compatibility.
 */
export { materializeMethodologyReportV2Sidecar } from "./dispatch-activation-materialization.js";
