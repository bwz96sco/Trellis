import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  buildSupportPackInventory,
  commitResearchBatch,
  digestDispatchRequest,
  hashDispatchScope,
  parseAcceptedV131ContractPack,
  parseAcceptedV131ResearchProcedure,
  parseResearchLedger,
  parseResearchProjectPolicy,
  parseSupportPackManifest,
  resolveV131ProcedureArtifactFamilyMapping,
  stableResearchJson,
  type Dispatch,
  type ResearchActivation,
  type ResearchApprovalGrant,
  type ResearchEvent,
  type ResearchMutation,
  type V13ArtifactLifecycleRow,
  type V131AcceptedContractPack,
  type V131LeafFileName,
} from "@mindfoldhq/trellis-core/research";

import { deriveResearchOutputIds } from "../../src/commands/research/dispatch-output-ids.js";
import {
  createResearchCampaign,
  createResearchQuest,
  createResearchRun,
  initializeResearch,
  setResearchQuestStage,
} from "../../src/commands/research/command.js";
import { addResearchRepository } from "../../src/commands/research/repository.js";
import { loadAcceptedV131ContractPackFromLeaves } from "../../src/commands/research/dispatch-methodology-validation.js";

export const A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3";
export const A133_TREE = "47633d69ffb68b7e225e01e502fe133616a1078b";
export const A133_CANDIDATE_MANIFEST_SHA256 =
  "e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a";
export const A133_COMPLETE_OUTPUT_SET_SHA256 =
  "sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642";
export const B133_COMMIT = "56277b874217a3b8a01b63a4905cf6b22708cb05";
export const B133_TREE = "3873721fe9208644e856f857a2c34e9651c96edc";
export const O133_COMMIT = "2253df9fb67f8ee84d470da23205e9610f8a4e3e";
export const O133_TREE = "7e5430197841776a6d8d7f31e8b82517473f082f";
export const T3_CORRECTION_COMMIT =
  "04194faeaea5801e21110594858dd1499e0ea11b";
export const T3_CORRECTION_TREE = "608fedb8ee3afc2d53daaf7041032a0c7d70c1f8";
export const T3_COMMIT = "320dfaf779219441adfa4f7c6d1df9596489fc1f";
export const T3_TREE = "92f14ec11ac7f9c346770d2131b975330744db77";
export const PROCEDURE_VERSION = "2.0.7";
export const LIVE_PROCEDURE_VERSION = "1.0.0";

export const PROCEDURE_IDS = Object.freeze([
  "computation-case-v1",
  "experiment-campaign-v1",
  "experiment-round-v1",
  "figure-v1",
  "idea-evaluation-v1",
  "idea-generation-v1",
  "literature-review-v1",
  "literature-scan-v1",
  "project-setup-v1",
  "quest-admin-v1",
  "quest-framing-v1",
  "review-campaign-v1",
  "review-case-v1",
  "slides-v1",
  "survey-v1",
  "theory-case-v1",
  "writing-case-v1",
] as const);

const CAPABILITY_BY_PROCEDURE: Readonly<Record<string, string>> = Object.freeze({
  "computation-case-v1": "research.computation.case",
  "experiment-campaign-v1": "research.experiment.campaign",
  "experiment-round-v1": "research.experiment.round",
  "figure-v1": "research.writing.figure",
  "idea-evaluation-v1": "research.ideation.evaluate",
  "idea-generation-v1": "research.ideation.generate",
  "literature-review-v1": "research.literature.review",
  "literature-scan-v1": "research.literature.scan",
  "project-setup-v1": "research.setup.project",
  "quest-admin-v1": "research.framing.admin",
  "quest-framing-v1": "research.framing.quest",
  "review-campaign-v1": "research.audit.campaign",
  "review-case-v1": "research.audit.case",
  "slides-v1": "research.writing.slides",
  "survey-v1": "research.literature.survey",
  "theory-case-v1": "research.theory.case",
  "writing-case-v1": "research.writing.case",
});

const STAGE_BY_PROCEDURE: Readonly<Record<string, string>> = Object.freeze({
  "computation-case-v1": "computation",
  "experiment-campaign-v1": "experiment",
  "experiment-round-v1": "experiment",
  "figure-v1": "writing",
  "idea-evaluation-v1": "ideation",
  "idea-generation-v1": "ideation",
  "literature-review-v1": "literature",
  "literature-scan-v1": "literature",
  "project-setup-v1": "setup",
  "quest-admin-v1": "framing",
  "quest-framing-v1": "framing",
  "review-campaign-v1": "audit",
  "review-case-v1": "audit",
  "slides-v1": "writing",
  "survey-v1": "literature",
  "theory-case-v1": "theory",
  "writing-case-v1": "writing",
});

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../../..");
export const T4_TASK_ROOT = path.join(
  REPO_ROOT,
  ".trellis/tasks/08-12-build-v1-3-1-production-harness",
);
export const T4_RESEARCH_ROOT = path.join(T4_TASK_ROOT, "research");
const A133_RESEARCH_ROOT =
  ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research";
const PROCEDURE_ROOT = path.join(
  REPO_ROOT,
  "packages/cli/src/templates/research/procedures",
);

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitBytes(commit: string, relativePath: string): Uint8Array {
  return new Uint8Array(
    execFileSync("git", ["-C", REPO_ROOT, "show", `${commit}:${relativePath}`], {
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
}

export function loadImmutableA133LeafBytes(): Record<
  V131LeafFileName,
  Uint8Array
> {
  const out = {} as Record<V131LeafFileName, Uint8Array>;
  for (const name of V131_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    out[name] = gitBytes(A133_COMMIT, `${A133_RESEARCH_ROOT}/${name}`);
  }
  return out;
}

export function loadImmutableA133Pack(): V131AcceptedContractPack {
  return parseAcceptedV131ContractPack({
    leafBytes: loadImmutableA133LeafBytes(),
  });
}

export function loadInstalledV131Pack(): V131AcceptedContractPack {
  return loadAcceptedV131ContractPackFromLeaves();
}

export interface V207ProcedureIdentity {
  readonly procedureId: string;
  readonly capabilityId: string;
  readonly stage: string;
  readonly procedureVersion: typeof PROCEDURE_VERSION;
  readonly procedureDigest: string;
  readonly lifecycleFamily: string | null;
}

export function parseV207Procedure(procedureId: string): V207ProcedureIdentity {
  const capabilityId = CAPABILITY_BY_PROCEDURE[procedureId];
  const stage = STAGE_BY_PROCEDURE[procedureId];
  if (capabilityId === undefined || stage === undefined) {
    throw new Error(`Unknown Procedure 2.0.7 family '${procedureId}'`);
  }
  const directory = path.join(PROCEDURE_ROOT, procedureId, PROCEDURE_VERSION);
  const manifestBytes = new Uint8Array(
    fs.readFileSync(path.join(directory, "procedure.json")),
  );
  const instructionBytes = new Uint8Array(
    fs.readFileSync(path.join(directory, "PROCEDURE.md")),
  );
  const methodologyDir = path.join(directory, "methodology");
  const packJsonBytes = new Uint8Array(
    fs.readFileSync(path.join(methodologyDir, "pack.json")),
  );
  const manifest = parseSupportPackManifest({
    packJsonBytes,
    procedureId,
    procedureVersion: PROCEDURE_VERSION,
  });
  const files: Record<string, Uint8Array> = {};
  for (const entry of manifest.entries) {
    files[entry.path] = new Uint8Array(
      fs.readFileSync(path.join(methodologyDir, entry.path)),
    );
  }
  const inventoryItems = buildSupportPackInventory({ manifest, files });
  const parsed = parseAcceptedV131ResearchProcedure({
    capabilityId,
    source: "bundled",
    manifestBytes,
    instructionBytes,
    identityMode: "recorded-version",
    recordedProcedureId: procedureId,
    recordedVersion: PROCEDURE_VERSION,
    packageSchemaVersion: 2,
    supportPack: { manifest, packJsonBytes, inventoryItems },
  });
  const mapping = resolveV131ProcedureArtifactFamilyMapping({
    pack: loadInstalledV131Pack(),
    procedureId,
    procedureVersion: PROCEDURE_VERSION,
    capabilityId,
  });
  return {
    procedureId,
    capabilityId,
    stage,
    procedureVersion: PROCEDURE_VERSION,
    procedureDigest: parsed.digest,
    lifecycleFamily: mapping.artifactFamily,
  };
}

function stableUuid(namespace: string, value: string): string {
  const hex = sha256(`${namespace}\0${value}`).slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex
    .slice(12, 16)
    .join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

export function stableResearchId(prefix: string, value: string): string {
  return `${prefix}_${stableUuid(prefix, value)}`;
}

function sleepShort(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1));
}

export interface V207Fixture {
  readonly root: string;
  readonly repository: string;
  readonly repositoryId: string;
  readonly questId: string;
  readonly campaignId: string;
  readonly runId: string;
  readonly dispatchId: string;
  readonly activationId: string;
  readonly approvalId: string;
  readonly procedure: V207ProcedureIdentity;
  readonly familyRows: readonly V13ArtifactLifecycleRow[];
  readonly artifactFiles: Readonly<Record<string, string>>;
  readonly closureExactPath?: string;
  readonly closureContractId?: string;
  readonly closureBytes?: string;
  readonly closureSha256?: string;
  readonly closureEvidencePath?: string;
  readonly closureEvidenceBytes?: string;
  readonly createdAt: string;
}

export async function buildV207Fixture(
  sandbox: string,
  procedureId: string,
  fixtureKey: string,
): Promise<V207Fixture> {
  const procedure = parseV207Procedure(procedureId);
  const pack = loadInstalledV131Pack();
  const familyRows =
    procedure.lifecycleFamily === null
      ? []
      : pack.artifacts.filter(
          (artifact) => artifact.family === procedure.lifecycleFamily,
        );
  const root = path.join(sandbox, "control");
  const repository = path.join(sandbox, "target");
  fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
  fs.mkdirSync(repository, { recursive: true });

  await initializeResearch({
    root,
    name: "T4 v1.3.1 production fixture",
    idempotencyKey: `t4:init:${fixtureKey}`,
  });
  const policyPath = path.join(root, ".trellis", "research", "policy.json");
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8")) as {
    defaults: { automaticEnabled: boolean };
  };
  policy.defaults.automaticEnabled = true;
  fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
  const policyDigest = parseResearchProjectPolicy(
    new Uint8Array(fs.readFileSync(policyPath)),
  ).digest;

  const repositoryId = stableResearchId("rep", fixtureKey);
  const registered = await addResearchRepository({
    root,
    id: repositoryId as never,
    name: "target",
    kind: "code",
    locator: "../target",
    hasTrellis: false,
    idempotencyKey: `t4:repository:${fixtureKey}`,
  });
  const questId = stableResearchId("qst", fixtureKey);
  const campaignId = stableResearchId("cmp", fixtureKey);
  const runId = stableResearchId("run", fixtureKey);
  const dispatchId = stableResearchId("dsp", fixtureKey);
  const activationId = stableResearchId("act", fixtureKey);
  const approvalId = stableResearchId("apr", fixtureKey);

  await createResearchQuest({
    root,
    id: questId as never,
    title: "T4 bounded production dispatch",
    repositoryIds: [registered.repository.id],
    idempotencyKey: `t4:quest:${fixtureKey}`,
  });
  await setResearchQuestStage({
    root,
    questId: questId as never,
    stage: procedure.stage as never,
    idempotencyKey: `t4:stage:${fixtureKey}`,
  });
  await createResearchCampaign({
    root,
    id: campaignId as never,
    questId: questId as never,
    title: "T4 production campaign",
    protocolDigest: "t4-v131-production-harness",
    idempotencyKey: `t4:campaign:${fixtureKey}`,
  });
  await createResearchRun({
    root,
    id: runId as never,
    campaignId: campaignId as never,
    title: "T4 production run",
    idempotencyKey: `t4:run:${fixtureKey}`,
  });

  const packageContract = JSON.parse(
    fs.readFileSync(
      path.join(
        PROCEDURE_ROOT,
        procedureId,
        PROCEDURE_VERSION,
        "methodology/package-contract.json",
      ),
      "utf8",
    ),
  ) as {
    closureDisposition: {
      kind: "required" | "notApplicable";
      exactPath?: string;
      closureContractId?: string;
    };
  };
  const closureDisposition = packageContract.closureDisposition;
  let closureExactPath: string | undefined;
  let closureContractId: string | undefined;
  let closureBytes: string | undefined;
  let closureEvidencePath: string | undefined;
  let closureEvidenceBytes: string | undefined;
  if (closureDisposition.kind === "required") {
    closureExactPath = closureDisposition.exactPath;
    closureContractId = closureDisposition.closureContractId;
    if (closureExactPath === undefined || closureContractId === undefined) {
      throw new Error(`Required closure identity missing for ${procedureId}`);
    }
    closureBytes = fs.readFileSync(
      path.join(
        PROCEDURE_ROOT,
        procedureId,
        PROCEDURE_VERSION,
        closureExactPath,
      ),
      "utf8",
    );
    const closureAbsolute = path.join(repository, closureExactPath);
    fs.mkdirSync(path.dirname(closureAbsolute), { recursive: true });
    fs.writeFileSync(closureAbsolute, closureBytes);
    closureEvidencePath = "closure-evidence.json";
    closureEvidenceBytes = '{"evidence":true}\n';
    fs.writeFileSync(
      path.join(repository, closureEvidencePath),
      closureEvidenceBytes,
    );
  }

  const artifactFiles: Record<string, string> = {};
  for (const row of familyRows) {
    const identity = row.publicIdentity;
    const body =
      identity === closureExactPath
        ? (closureBytes ?? "")
        : `T4 v1.3.1 artifact ${identity}\n`;
    const absolute = path.join(repository, identity);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, body);
    artifactFiles[identity] = body;
  }

  const createdAt = "2026-08-12T12:00:00.000Z";
  const resolvedRepository = fs.realpathSync(repository);
  const scopeArtifacts = familyRows.map((row) => ({
    id: stableResearchId("art", `${fixtureKey}:${row.publicIdentity}`),
    repositoryId: registered.repository.id,
    path: row.publicIdentity,
    resolvedPath: path.join(resolvedRepository, row.publicIdentity),
    sha256: sha256(artifactFiles[row.publicIdentity] ?? ""),
  }));
  if (
    closureExactPath !== undefined &&
    closureBytes !== undefined &&
    !scopeArtifacts.some((artifact) => artifact.path === closureExactPath)
  ) {
    scopeArtifacts.push({
      id: stableResearchId("art", `${fixtureKey}:${closureExactPath}`),
      repositoryId: registered.repository.id,
      path: closureExactPath,
      resolvedPath: path.join(resolvedRepository, closureExactPath),
      sha256: sha256(closureBytes),
    });
  }
  if (closureEvidencePath !== undefined && closureEvidenceBytes !== undefined) {
    scopeArtifacts.push({
      id: "art_00000000-0000-4000-8000-000000000000",
      repositoryId: registered.repository.id,
      path: closureEvidencePath,
      resolvedPath: path.join(resolvedRepository, closureEvidencePath),
      sha256: sha256(closureEvidenceBytes),
    });
  }
  const normalizedScope = {
    schemaVersion: 1 as const,
    dispatchId,
    repository: {
      id: registered.repository.id,
      resolvedRoot: resolvedRepository,
      locator: "../target",
    },
    artifacts: scopeArtifacts,
    allowedWritePaths: [],
  };
  const scopeHash = hashDispatchScope(normalizedScope as never);
  const dispatch: Dispatch = {
    id: dispatchId as never,
    questId: questId as never,
    campaignId: campaignId as never,
    runId: runId as never,
    repositoryId: registered.repository.id,
    ownerSkill: "research-methodology-v131-production-harness",
    provider: "codex",
    objective: "Execute the dormant Procedure 2.0.7 production methodology path",
    acceptanceCriteria: ["Production outcome matches the authenticated case"],
    context: scopeArtifacts.map((artifact) => ({
      artifact: {
        id: artifact.id as never,
        repositoryId: artifact.repositoryId,
        path: artifact.path,
        sha256: artifact.sha256,
      },
    })),
    allowedWritePaths: [],
    expectedOutputs: [],
    checks: [],
    createdAt,
  };
  const requestDigest = digestDispatchRequest(dispatch);
  const activation: ResearchActivation = {
    id: activationId as never,
    dispatchId: dispatchId as never,
    questId: questId as never,
    capabilityId: procedure.capabilityId,
    mode: "automatic",
    procedure: {
      id: procedure.procedureId,
      version: procedure.procedureVersion,
      digest: procedure.procedureDigest,
    },
    requestDigest,
    policyDigest,
    scopeHash,
    maxDurationMinutes: 15,
    maxDispatches: 1,
    createdAt,
  };
  const approval: ResearchApprovalGrant = {
    id: approvalId as never,
    activationId: activationId as never,
    dispatchId: dispatchId as never,
    host: "codex",
    mode: "automatic",
    approverLabel: "trellis-policy-v1",
    rationale: "Eligible under immutable registry and project policy.",
    requestDigest,
    procedureDigest: procedure.procedureDigest,
    policyDigest,
    scopeHash,
    grantedAt: createdAt,
    expiresAt: new Date(
      Date.parse(createdAt) + activation.maxDurationMinutes * 60_000,
    ).toISOString(),
  };
  const mutations: readonly ResearchMutation[] = [
    { kind: "dispatch.record", dispatch },
    { kind: "activation.plan", activation },
    { kind: "approval.grant", approval },
  ];
  await commitResearchBatch({
    root,
    actor: { type: "agent", id: "t4-production-harness" },
    provenance: { source: "t4-production-harness" },
    idempotencyKey: `t4:dispatch:${fixtureKey}`,
    timestamp: createdAt,
    mutations,
  });
  const requestPath = path.join(
    root,
    ".trellis",
    "research",
    "dispatches",
    dispatchId,
    "request.json",
  );
  fs.mkdirSync(path.dirname(requestPath), { recursive: true });
  fs.writeFileSync(requestPath, stableResearchJson(dispatch));
  await sleepShort();

  return {
    root,
    repository,
    repositoryId: registered.repository.id,
    questId,
    campaignId,
    runId,
    dispatchId,
    activationId,
    approvalId,
    procedure,
    familyRows,
    artifactFiles,
    closureExactPath,
    closureContractId,
    closureBytes,
    closureSha256: closureBytes === undefined ? undefined : sha256(closureBytes),
    closureEvidencePath,
    closureEvidenceBytes,
    createdAt,
  };
}

export interface CasePayloadOptions {
  readonly caseId: string;
  readonly familyRows: readonly V13ArtifactLifecycleRow[];
  readonly artifactFiles: Readonly<Record<string, string>>;
  readonly repositoryId: string;
  readonly dispatchId: string;
  readonly runId: string;
  readonly questId: string;
  readonly approvalId: string;
  readonly createdAt: string;
  readonly closureExactPath?: string;
  readonly closureBytes?: string;
  readonly closureEvidencePath?: string;
  readonly closureEvidenceBytes?: string;
  readonly status?: string;
}

export function buildCasePayload(options: CasePayloadOptions): {
  readonly result: Record<string, unknown>;
  readonly proposal: Record<string, unknown>;
  readonly artifactRefs: {
    id: string;
    repositoryId: string;
    path: string;
    sha256: string;
    mediaType: string;
  }[];
} {
  const artifactRefs = options.familyRows.map((row) => ({
    id: stableResearchId("art", `${options.caseId}:${row.publicIdentity}`),
    repositoryId: options.repositoryId,
    path: row.publicIdentity,
    sha256: sha256(options.artifactFiles[row.publicIdentity] ?? ""),
    mediaType:
      typeof row.dimensions.mediaType.value === "string"
        ? row.dimensions.mediaType.value
        : "application/json",
  }));
  if (
    options.closureExactPath !== undefined &&
    options.closureBytes !== undefined &&
    !artifactRefs.some((ref) => ref.path === options.closureExactPath)
  ) {
    artifactRefs.push({
      id: stableResearchId(
        "art",
        `${options.caseId}:${options.closureExactPath}`,
      ),
      repositoryId: options.repositoryId,
      path: options.closureExactPath,
      sha256: sha256(options.closureBytes),
      mediaType: "application/json",
    });
  }
  if (
    options.closureEvidencePath !== undefined &&
    options.closureEvidenceBytes !== undefined
  ) {
    artifactRefs.push({
      id: "art_00000000-0000-4000-8000-000000000000",
      repositoryId: options.repositoryId,
      path: options.closureEvidencePath,
      sha256: sha256(options.closureEvidenceBytes),
      mediaType: "application/json",
    });
  }
  const ids = deriveResearchOutputIds(options.approvalId as never);
  return {
    artifactRefs,
    result: {
      id: ids.resultId,
      dispatchId: options.dispatchId,
      runId: options.runId,
      status: options.status ?? "completed",
      summary: "Bounded T4 v1.3.1 production-harness work",
      commands: [],
      checks: [],
      artifactRefs,
      blockers: [],
      createdAt: options.createdAt,
    },
    proposal: {
      id: ids.proposalId,
      dispatchId: options.dispatchId,
      questId: options.questId,
      title: "No canonical changes",
      operations: [],
      status: "pending",
      createdAt: options.createdAt,
      updatedAt: options.createdAt,
    },
  };
}

export function extractProductionErrorCodes(error: unknown): string[] {
  const codes: string[] = [];
  const message = error instanceof Error ? error.message : String(error);
  for (const code of
    message.match(
      /\b(?:V13[01]?_[A-Z0-9_]+|METHODOLOGY_VALIDATION_FAILED|APPROVAL_[A-Z_]+|ARTIFACT_[A-Z_]+|DISPATCH_[A-Z_]+|REQUEST_[A-Z_]+|OUTPUT_ID_[A-Z_]+|PROCEDURE_[A-Z_]+|POLICY_[A-Z_]+|ACTIVATION_[A-Z_]+)\b/g,
    ) ?? []) {
    if (!codes.includes(code)) codes.push(code);
  }
  if (message.includes("sha256 does not match")) {
    codes.push("ARTIFACT_DIGEST_MISMATCH");
  }
  if (message.includes("must be a art_ prefixed UUID")) {
    codes.push("ARTIFACT_ID_INVALID");
  }
  if (message.includes("Proposal operations not allowed")) {
    codes.push("PROPOSAL_OPERATION_NOT_ALLOWED");
  }
  if (message.includes("blocked Result requires an empty pending Proposal")) {
    codes.push("BLOCKED_RESULT_REQUIRES_EMPTY_PROPOSAL");
  }
  if (message.includes("New research proposals must start pending")) {
    codes.push("PROPOSAL_STATUS_INVALID");
  }
  return [...new Set(codes)];
}

export const PRODUCTION_CODE_EQUIVALENCE: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  V13_ARTIFACT_REF_BINDING_INVALID: [
    "V13_ARTIFACT_REF_BINDING_INVALID",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_ARTIFACT_PROVENANCE_INVALID: [
    "V13_ARTIFACT_PROVENANCE_INVALID",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_ARTIFACT_IMMUTABLE_FIELD_CHANGED: [
    "V13_ARTIFACT_IMMUTABLE_FIELD_CHANGED",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_ARTIFACT_STABLE_ID_INVALID: [
    "V13_ARTIFACT_STABLE_ID_INVALID",
    "ARTIFACT_ID_INVALID",
  ],
  V13_ARTIFACT_TRANSITION_INVALID: [
    "V13_ARTIFACT_TRANSITION_INVALID",
    "PROPOSAL_STATUS_INVALID",
  ],
  V13_WORKER_AUTHORITY_WIDENING: [
    "V13_WORKER_AUTHORITY_WIDENING",
    "PROPOSAL_OPERATION_NOT_ALLOWED",
    "ARTIFACT_ID_INVALID",
  ],
  V13_CLOSURE_SCHEMA_INVALID: [
    "V13_CLOSURE_SCHEMA_INVALID",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_CLOSURE_EVIDENCE_INVALID: [
    "V13_CLOSURE_EVIDENCE_INVALID",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_CLOSURE_EXCLUSIVITY_INVALID: [
    "V13_CLOSURE_EXCLUSIVITY_INVALID",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN: [
    "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN",
    "ARTIFACT_DIGEST_MISMATCH",
  ],
  V13_ARTIFACT_TERMINAL_APPLICABILITY_INVALID: [
    "V13_ARTIFACT_TERMINAL_APPLICABILITY_INVALID",
    "V13_ARTIFACT_REQUIRED_MISSING",
  ],
});

interface SnapshotEntry {
  readonly kind: "directory" | "file" | "symlink";
  readonly path: string;
  readonly mode: number;
  readonly byteLength?: number;
  readonly sha256?: string;
  readonly target?: string;
}

export interface FilesystemObservation {
  readonly digest: string;
  readonly entryCount: number;
  readonly directoryCount: number;
  readonly fileCount: number;
  readonly symlinkCount: number;
  readonly entries: readonly SnapshotEntry[];
  readonly rawDigest: string;
}

function normalizeSnapshotBytes(bytes: Uint8Array, root: string): Uint8Array {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return bytes;
  }
  const replacements = new Map<string, string>();
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
  text = text.replaceAll(fs.realpathSync(root), "<sandbox>");
  text = text.replace(
    uuidPattern,
    (value) => {
      const key = value.toLowerCase();
      const existing = replacements.get(key);
      if (existing !== undefined) return existing;
      const replacement = `00000000-0000-4000-8000-${String(
        replacements.size + 1,
      ).padStart(12, "0")}`;
      replacements.set(key, replacement);
      return replacement;
    },
  );
  text = text.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g,
    "2000-01-01T00:00:00.000Z",
  );
  text = text.replace(
    /("scopeHash"\s*:\s*)"sha256:[0-9a-f]{64}"/g,
    '$1"sha256:<sandbox-scope>"',
  );
  return new TextEncoder().encode(text);
}

export function snapshotFilesystem(root: string): FilesystemObservation {
  const normalizedEntries: SnapshotEntry[] = [];
  const rawEntries: string[] = [];
  const walk = (directory: string, relative: string): void => {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const childRelative = relative.length === 0 ? name : `${relative}/${name}`;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(absolute);
        normalizedEntries.push({
          kind: "symlink",
          path: childRelative,
          mode: stat.mode,
          target,
        });
        rawEntries.push(`L:${childRelative}:${stat.mode}:${target}`);
      } else if (stat.isDirectory()) {
        normalizedEntries.push({
          kind: "directory",
          path: childRelative,
          mode: stat.mode,
        });
        rawEntries.push(`D:${childRelative}:${stat.mode}`);
        walk(absolute, childRelative);
      } else if (stat.isFile()) {
        const bytes = new Uint8Array(fs.readFileSync(absolute));
        const normalized = normalizeSnapshotBytes(bytes, root);
        normalizedEntries.push({
          kind: "file",
          path: childRelative,
          mode: stat.mode,
          byteLength: normalized.byteLength,
          sha256: sha256(normalized),
        });
        rawEntries.push(
          `F:${childRelative}:${stat.mode}:${bytes.byteLength}:${sha256(bytes)}`,
        );
      }
    }
  };
  walk(root, "");
  const serialized = JSON.stringify(normalizedEntries);
  return {
    digest: sha256(serialized),
    entryCount: normalizedEntries.length,
    directoryCount: normalizedEntries.filter(
      (entry) => entry.kind === "directory",
    ).length,
    fileCount: normalizedEntries.filter((entry) => entry.kind === "file").length,
    symlinkCount: normalizedEntries.filter((entry) => entry.kind === "symlink")
      .length,
    entries: normalizedEntries,
    rawDigest: sha256(rawEntries.join("\n")),
  };
}

export interface CanonicalEventObservation {
  readonly digest: string;
  readonly eventCount: number;
  readonly headSeq: number;
  readonly kinds: readonly string[];
  readonly idempotencyKeys: readonly string[];
}

function eventEvidenceValue(event: ResearchEvent): Record<string, unknown> {
  return {
    schemaVersion: event.schemaVersion,
    seq: event.seq,
    kind: event.kind,
    aggregateType: event.aggregate.type,
    relatedTypes: event.related.map((related) => related.type),
    idempotencyKey: event.idempotencyKey,
    actor: event.actor,
    provenance: event.provenance,
  };
}

export function observeCanonicalEvents(root: string): CanonicalEventObservation {
  const eventsPath = path.join(root, ".trellis", "research", "events.jsonl");
  const text = fs.existsSync(eventsPath) ? fs.readFileSync(eventsPath, "utf8") : "";
  const events = parseResearchLedger(text, eventsPath);
  return {
    digest: sha256(JSON.stringify(events.map(eventEvidenceValue))),
    eventCount: events.length,
    headSeq: events.at(-1)?.seq ?? 0,
    kinds: events.map((event) => event.kind),
    idempotencyKeys: events.map((event) => event.idempotencyKey),
  };
}

export function eventDelta(
  before: CanonicalEventObservation,
  after: CanonicalEventObservation,
): {
  readonly appendedCount: number;
  readonly appendedKinds: readonly string[];
  readonly appendedIdempotencyKeys: readonly string[];
} {
  return {
    appendedCount: after.eventCount - before.eventCount,
    appendedKinds: after.kinds.slice(before.eventCount),
    appendedIdempotencyKeys: after.idempotencyKeys.slice(before.eventCount),
  };
}

export function evidenceFilesystemObservation(
  observation: FilesystemObservation,
): Omit<FilesystemObservation, "rawDigest"> {
  return Object.fromEntries(
    Object.entries(observation).filter(([key]) => key !== "rawDigest"),
  ) as Omit<FilesystemObservation, "rawDigest">;
}

export function writeCanonicalJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

export function writeCanonicalJsonl(
  filePath: string,
  rows: readonly unknown[],
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

export function sha256File(filePath: string): string {
  return sha256(new Uint8Array(fs.readFileSync(filePath)));
}

export function assertInstalledAndImmutablePacksMatch(): {
  readonly immutable: V131AcceptedContractPack;
  readonly installed: V131AcceptedContractPack;
} {
  const immutable = loadImmutableA133Pack();
  const installed = loadInstalledV131Pack();
  if (
    immutable.acceptedContractDigest !== V131_ACCEPTED_CONTRACT_DIGEST ||
    immutable.derivedMemberAggregateSha256 !==
      V131_ACCEPTED_MEMBER_AGGREGATE_SHA256 ||
    JSON.stringify(immutable.memberDigests) !==
      JSON.stringify(installed.memberDigests) ||
    installed.contractVersion !== V131_ACCEPTED_CONTRACT_VERSION
  ) {
    throw new Error("Installed v1.3.1 authority does not match immutable A133");
  }
  return { immutable, installed };
}
