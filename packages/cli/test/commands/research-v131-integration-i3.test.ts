import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { classifyI3WorktreeScope } from "../../scripts/research-v131-installed-package-audit-i3.mjs";

const cliRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const repoRoot = path.resolve(cliRoot, "../..");
const taskRoot = path.join(
  repoRoot,
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze",
);
const taskResearchRoot = path.join(taskRoot, "research");
const taskRelativePath =
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json";
const freezeRelativePath =
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json";
const auditScript = path.join(
  cliRoot,
  "scripts/research-v131-installed-package-audit-i3.mjs",
);
const ledgerPath = path.join(
  taskResearchRoot,
  "integration-execution-evidence-ledger.json",
);

const G_I3_COMMIT = "c01c6f9231b3c5b74fd0376411f09dfddda9321f";
const G_I3_TREE = "ff9a25df64cc42af512229ef49338e35efd85e90";
const PREPARATION_HEAD_COMMIT = "8793c5aeda09fe8ada263733733569516cb492f5";
const PREPARATION_HEAD_TREE = "2b372de46737169f4a519829f1b88a3074846049";
const FINAL_I3_COMMIT = "88626c04828afbdc137f3318bca0bb2fd69474e3";
const REPAIR_COMMIT = "5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24";
const R3_COMMIT = "0028183901b74263a70dacca98bb936dc792ced4";
const STABILIZATION_COMMIT = "753a5d9a8b1aa293a42f27201f3d9dd458edd723";
const EXECUTION_ID = "i3-c01c6f9231b3-offline-r9";
const PRIOR_EXECUTION_ID = "i3-c01c6f9231b3-aborted-r1";
const PRIOR_OFFLINE_EXECUTION_ID = "i3-c01c6f9231b3-offline-r2";
const PRIOR_R3_EXECUTION_ID = "i3-c01c6f9231b3-offline-r3";
const PRIOR_R4_EXECUTION_ID = "i3-c01c6f9231b3-offline-r4";
const PRIOR_R5_EXECUTION_ID = "i3-c01c6f9231b3-offline-r5";
const PRIOR_R6_EXECUTION_ID = "i3-c01c6f9231b3-offline-r6";
const PRIOR_R7_EXECUTION_ID = "i3-c01c6f9231b3-offline-r7";
const PRIOR_R8_EXECUTION_ID = "i3-c01c6f9231b3-offline-r8";
const EXPECTED_SHARED_DIGEST =
  "sha256:b2010d0e527a54de1bb2ea9838da7e2af42faadbf26cad4530d82a1c38522187";
const EXPECTED_CONTRACT_DIGEST =
  "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af";
const EXPECTED_MEMBER_AGGREGATE =
  "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34";
const PACKAGE_PATHSPEC = [
  "packages/core",
  "packages/cli",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
];
const PACKAGE_ADDITIONS = [
  "packages/cli/scripts/research-v131-installed-package-audit-i3.mjs",
  "packages/cli/test/commands/research-v131-integration-i3.test.ts",
];
const R3_TO_CANDIDATE_DELTA = [
  "packages/cli/scripts/research-v131-installed-package-audit-i3.mjs",
  "packages/cli/test/commands/research-dispatch-activation.integration.test.ts",
  "packages/cli/test/commands/research-dispatch-approved-result.test.ts",
  "packages/cli/test/commands/research-v131-integration-i3.test.ts",
  "packages/cli/vitest.config.ts",
];
const SCRIPT_RECORD_PATHS = [
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/external-install-evidence.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-input-attestation.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/package-tarball-inventory.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/protected-path-audit.json",
];
const EXACT_NINE = [
  ".trellis/spec/cli/unit-test/conventions.md",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/external-install-evidence.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-execution-evidence-ledger.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-input-attestation.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/package-tarball-inventory.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/protected-path-audit.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json",
  "packages/cli/scripts/research-v131-installed-package-audit-i3.mjs",
  "packages/cli/test/commands/research-v131-integration-i3.test.ts",
];
const T0A_RUNTIME_INVENTORY = [
  ".trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4/check.jsonl",
  ".trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4/design.md",
  ".trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4/implement.jsonl",
  ".trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4/implement.md",
  ".trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4/prd.md",
  ".trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4/task.json",
];
const T0A_CORRECTION_INVENTORY = [
  ".trellis/spec/cli/unit-test/conventions.md",
  "packages/cli/scripts/research-v131-installed-package-audit-i3.mjs",
  "packages/cli/test/commands/research-v131-integration-i3.test.ts",
];
const M0_CORRECTION_BOOTSTRAP_BASE = "4b1bb3cd34e574888025187247c2288f3be5195d";
const M0_CORRECTION_GOVERNANCE_INVENTORY = [
  ".trellis/tasks/08-21-govern-t6-mal1-attempt-4-m0-correction/check.jsonl",
  ".trellis/tasks/08-21-govern-t6-mal1-attempt-4-m0-correction/design.md",
  ".trellis/tasks/08-21-govern-t6-mal1-attempt-4-m0-correction/implement.jsonl",
  ".trellis/tasks/08-21-govern-t6-mal1-attempt-4-m0-correction/implement.md",
  ".trellis/tasks/08-21-govern-t6-mal1-attempt-4-m0-correction/prd.md",
  ".trellis/tasks/08-21-govern-t6-mal1-attempt-4-m0-correction/task.json",
];
const M0_CORRECTION_BOOTSTRAP_CHANGED_INVENTORY = [
  ...T0A_CORRECTION_INVENTORY,
  ...M0_CORRECTION_GOVERNANCE_INVENTORY,
].sort();
const M0_REVIEWER_DEFINITION_INVENTORY = [
  ".trellis/tasks/08-12-assure-v1-3-1-complete-system-mal1/task.json",
  ".trellis/tasks/08-12-assure-v1-3-1-complete-system-mal1/research/reviewer/reviewer-assignment.json",
  ".trellis/tasks/08-12-assure-v1-3-1-complete-system-mal1/research/reviewer/mal1-review.py",
];
const EXPECTED_PROJECTS = [
  "dist-mutating",
  "methodology-116-production",
  "normal",
  "procedure-207-packages",
];

interface EvidenceIdentity {
  path: string;
  byteLength: number;
  sha256: string;
}

interface PriorExecutionIncident {
  executionId: string;
  status: string;
  reason: string;
  diagnostic?: string;
  networkActivityCannotBeExcluded: boolean;
  evidencePublished: boolean;
  commitCreated: boolean;
  stagingPerformed: boolean;
  offlineStartupPreflightPassed?: boolean;
  corePackCount?: number;
  cliPackCount?: number;
}

interface TaskRecord {
  status: string;
  completedAt: string | null;
  meta: {
    executionState: string;
    i3EvidencePrepared: boolean;
    s3Status: string;
    i3ExecutionId: string;
    i3PriorExecutionIncident: PriorExecutionIncident;
    i3PriorExecutionHistory: PriorExecutionIncident[];
    i3PriorAttemptsExist: boolean;
  };
}

interface LocalPnpmIdentity {
  strategy: string;
  corepackInvoked: boolean;
  version: string;
  packageRoot: string;
  packageJson: { byteLength: number; sha256: string };
  entry: { path: string; byteLength: number; sha256: string };
}

interface OfflineStartupPreflight {
  executionId: string;
  completedBeforeBuildAndPack: boolean;
  networkCapabilityEnabled: boolean;
  corepackInvoked: boolean;
  localPnpm: LocalPnpmIdentity;
  localPnpmMetadataMirror: {
    availableBeforeBuildAndPack: boolean;
    formatVersion: string;
    sourceKind: string;
  };
  commands: {
    id: string;
    argv: string[];
    exitCode: number;
    stdoutDigest: string;
    stderrDigest: string;
  }[];
  observedVersions: { npm: string; pnpm: string };
  tempRootName: string;
  cleanup: Cleanup;
  verdict: string;
}

interface PackageProof {
  anchors: Record<
    string,
    {
      role: string;
      commit: string;
      tree: string;
      packagePathCount: number;
      packageTupleDigest: string;
    }
  >;
  candidate: {
    finalCommitRecorded: boolean;
    finalTreeRecorded: boolean;
    packagePathCount: number;
    packageTupleDigest: string;
    repairToCandidateDelta: string[];
    r3ToCandidateDelta: string[];
  };
  sharedR3Repair: { count: number; digest: string };
}

interface InputAttestation {
  schemaVersion: number;
  recordKind: string;
  stage: string;
  commitBoundary: string;
  executionId: string;
  priorAttemptsExist: boolean;
  priorExecutionIncident: PriorExecutionIncident;
  priorExecutionHistory: PriorExecutionIncident[];
  offlineStartupPreflight: OfflineStartupPreflight;
  acceptedContract: {
    contractVersion: string;
    semanticDigest: string;
  };
  currentExecutionObservations: {
    preparationHead: { commit: string; subject: string; tree: string };
    preparationHeadDescendsFromGovernance: boolean;
    verificationHeadPolicy: string;
    finalI3CommitRecorded: boolean;
    finalI3TreeRecorded: boolean;
    packageProof: PackageProof;
    plannedExactNineInventory: string[];
    historicalVerification: {
      argv: string[];
      exitCode: number;
      historicalSubject: string;
      mode: string;
      writesAuthorized: boolean;
    }[];
  };
  mutableWorktreeSemanticAuthority: boolean;
  networkUsed: boolean;
  providerUsed: boolean;
  verdict: string;
}

interface FileEntry {
  path: string;
  mode: string;
  byteLength: number;
  sha256: string;
}

interface PackedPackage {
  packageName: string;
  packageVersion: string;
  sourceCommit: string;
  tarballPath: string;
  byteLength: number;
  sha256: string;
  packageJsonIdentity: { byteLength: number; sha256: string };
  fileEntries: FileEntry[];
  exactCoreDependency?: string;
  bins?: Record<string, string>;
}

interface TarballInventory {
  schemaVersion: number;
  recordKind: string;
  executionId: string;
  offlineStartupPreflightPassedBeforeBuildAndPack: boolean;
  corepackInvoked: boolean;
  corepackNetworkEnabled: boolean;
  localPnpm: LocalPnpmIdentity;
  packages: PackedPackage[];
  buildAndPackCommands: { id: string; argv: string[]; exitCode: number }[];
  packLifecycleScriptsDisabled: boolean;
  sameTarballPathsSuppliedToBothConsumers: boolean;
  sameTarballSha256SuppliedToBothConsumers: boolean;
  tarballsPackedOncePerPackage: boolean;
  temporaryPackRootName: string;
  temporaryPackRootCleanup: Cleanup;
  tarballsRetainedAfterAudit: boolean;
  verdict: string;
}

interface Cleanup {
  attempted: boolean;
  succeeded: boolean;
  rootAbsentAfterCleanup: boolean;
}

interface ConsumerEvidence {
  executionId: string;
  packageManager: string;
  packageManagerVersion: string;
  corepackInvoked: boolean;
  corepackNetworkEnabled: boolean;
  environment: Record<string, string>;
  localCacheSeed: {
    destinationContainedByTempRoot: boolean;
    metadataMirrorSeeded?: boolean;
    sourceKind: string;
  };
  localPnpm?: LocalPnpmIdentity;
  tempRootName: string;
  installCommand: string[];
  lifecycleScriptsDisabled: boolean;
  offlineEnforced: boolean;
  registryFallbackAllowed: boolean;
  installedTarballs: {
    expectedPath: string;
    expectedSha256: string;
    observedPackageVersion: string;
    packageName: string;
  }[];
  commands: {
    id: string;
    argv: string[];
    exitCode: number;
    stdoutDigest: string;
    stderrDigest: string;
  }[];
  cleanup: Cleanup;
  installedBehavior: {
    aliasesExecuted: string[];
    corePublicImports: boolean;
    deepImportBlocked: boolean;
    exactCoreDependency: string;
    installedContract: {
      digest: string;
      mappingRowCount: number;
      memberAggregate: string;
      version: string;
    };
    installedVersions: { cli: string; core: string };
    packageRealpathsContainedByTempRoot: boolean;
    packageRealpathsOutsideRepository: boolean;
    procedureAuthority: {
      dormantSchema: number;
      dormantVersion: string;
      liveVersion: string;
    };
    repositoryStateAbsent: boolean;
    sourceTreeSubstitutionUsed: boolean;
    testingNamespaceEmpty: boolean;
  };
  verdict: string;
}

interface InstallEvidence {
  schemaVersion: number;
  recordKind: string;
  executionId: string;
  priorAttemptsExist: boolean;
  priorExecutionHistory: PriorExecutionIncident[];
  freshExecutionNetworkUsed: boolean;
  corepackInvoked: boolean;
  corepackNetworkEnabled: boolean;
  consumers: ConsumerEvidence[];
  lifecycleScriptsDisabledForAllConsumers: boolean;
  networkPackageResolutionAllowed: boolean;
  providerExecutionPerformed: boolean;
  publicationPerformed: boolean;
  pushPerformed: boolean;
  releasePerformed: boolean;
  runtimeActivationPerformed: boolean;
  sameAuthenticatedTarballsUsedByBothConsumers: boolean;
  verdict: string;
}

interface ProtectedAudit {
  schemaVersion: number;
  recordKind: string;
  executionId: string;
  candidateScope: {
    allowedInventory: string[];
    allowedSuccessorInventory: string[];
    allCandidatePathsPresentOrProspective: boolean;
    indexContainsOnlyCandidateOrAuthorizedSuccessorPaths: boolean;
    protectedPathsStaged: boolean;
    unexpectedDirtyPaths: string[];
    unexpectedStagedPaths: string[];
  };
  files: {
    path: string;
    expectedSha256: string;
    observedSha256: string;
    matches: boolean;
    staged: boolean;
  }[];
  gitlinks: {
    path: string;
    expectedCommit: string;
    indexCommit: string;
    matches: boolean;
    staged: boolean;
    submoduleWorktreeMutationUsedAsAuthority: boolean;
  }[];
  immutableHistoricalEvidenceMutationPerformed: boolean;
  submoduleWorktreeMutationUsedAsEvidenceAuthority: boolean;
  verdict: string;
}

interface ProjectPartition {
  configuredProjectCount: number;
  configuredProjects: string[];
  completeDiscoveryCount: number;
  pairwiseDisjoint: boolean;
  completeUnion: boolean;
  projects: Record<string, { count: number; files: string[] }>;
  unionCount: number;
}

interface Ledger {
  schemaVersion: number;
  recordKind: string;
  stage: string;
  commitBoundary: string;
  executionId: string;
  priorAttemptsExist: boolean;
  priorExecutionIncident: PriorExecutionIncident;
  priorExecutionHistory: PriorExecutionIncident[];
  freshExecutionNetworkUsed: boolean;
  corepackInvoked: boolean;
  corepackNetworkEnabled: boolean;
  localPnpm: LocalPnpmIdentity;
  governanceAnchor: { commit: string; tree: string };
  repairPredecessor: { commit: string };
  exactNineCandidateInventory: string[];
  recordLinks: EvidenceIdentity[];
  projectPartition: ProjectPartition;
  commands: { id: string; argv: string[]; exitCode: number }[];
  checks: Record<string, boolean>;
  gitNexus: {
    compareBase: string;
    expectedScopeOnly: boolean;
    highOrCriticalImpactObserved: boolean;
  };
  finalPreCommitState: {
    finalI3CommitRecorded: boolean;
    finalI3TreeRecorded: boolean;
    s3Status: string;
    closureComplete: boolean;
  };
  ledgerSelfHashClaimed: boolean;
  evidenceDependentSelfValidationClaimed: boolean;
  verdict: string;
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Label(bytes: Buffer | string): string {
  return `sha256:${sha256(bytes)}`;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonical((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(canonical(value))}\n`, "utf8");
}

function readEvidence<T>(name: string): { bytes: Buffer; record: T } {
  const file = path.join(taskResearchRoot, name);
  const bytes = fs.readFileSync(file);
  const record = JSON.parse(bytes.toString("utf8")) as T;
  expect(bytes.equals(canonicalBytes(record))).toBe(true);
  return { bytes, record };
}

function gitBuffer(args: string[]): Buffer {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
  });
}

function readTaskForExecution(executionId: string): TaskRecord {
  const worktreeTask = JSON.parse(
    fs.readFileSync(path.join(taskRoot, "task.json"), "utf8"),
  ) as TaskRecord;
  const committedFreeze = gitBuffer([
    "ls-tree",
    "-z",
    "HEAD",
    "--",
    freezeRelativePath,
  ]);
  if (committedFreeze.length === 0) return worktreeTask;

  const freeze = JSON.parse(
    gitBuffer(["show", `HEAD:${freezeRelativePath}`]).toString("utf8"),
  ) as { subject?: { commit?: unknown } };
  const subjectCommit = freeze.subject?.commit;
  if (typeof subjectCommit !== "string") {
    throw new Error("Committed S3 freeze lacks an I3 subject commit");
  }
  gitBuffer(["merge-base", "--is-ancestor", subjectCommit, "HEAD"]);
  const frozenTask = JSON.parse(
    gitBuffer(["show", `${subjectCommit}:${taskRelativePath}`]).toString(
      "utf8",
    ),
  ) as TaskRecord;
  return frozenTask.meta.i3ExecutionId === executionId
    ? frozenTask
    : worktreeTask;
}

interface TreeRecord {
  path: string;
  bytes: Buffer;
}

function treeRecords(commit: string): TreeRecord[] {
  const raw = gitBuffer([
    "ls-tree",
    "-r",
    "-z",
    commit,
    "--",
    ...PACKAGE_PATHSPEC,
  ]);
  return raw
    .subarray(0, raw.length - (raw.at(-1) === 0 ? 1 : 0))
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((entry) => {
      const tab = entry.indexOf("\t");
      expect(tab).toBeGreaterThan(0);
      return {
        path: entry.slice(tab + 1),
        bytes: Buffer.from(entry, "utf8"),
      };
    });
}

function treeDigest(records: TreeRecord[]): string {
  return sha256Label(
    Buffer.concat(records.flatMap((entry) => [entry.bytes, Buffer.from([0])])),
  );
}

function changedPaths(left: TreeRecord[], right: TreeRecord[]): string[] {
  const leftMap = new Map(left.map((entry) => [entry.path, entry.bytes]));
  const rightMap = new Map(right.map((entry) => [entry.path, entry.bytes]));
  return [...new Set([...leftMap.keys(), ...rightMap.keys()])]
    .filter((entry) => {
      const leftBytes = leftMap.get(entry);
      const rightBytes = rightMap.get(entry);
      return (
        leftBytes === undefined ||
        rightBytes === undefined ||
        !leftBytes.equals(rightBytes)
      );
    })
    .sort();
}

function candidateTreeRecords(): TreeRecord[] {
  return treeRecords(FINAL_I3_COMMIT);
}

function discoverTestFiles(): string[] {
  const testRoot = path.join(cliRoot, "test");
  const result: string[] = [];
  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        result.push(path.relative(cliRoot, absolute).split(path.sep).join("/"));
      }
    }
  }
  walk(testRoot);
  return result.sort();
}

function configuredProjectSets(): Map<string, string[]> {
  const vitestEntry = path.join(cliRoot, "node_modules/vitest/vitest.mjs");
  const output = execFileSync(
    process.execPath,
    [vitestEntry, "list", "--filesOnly", "--config", "vitest.config.ts"],
    {
      cwd: cliRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        COREPACK_ENABLE_NETWORK: "0",
        npm_config_ignore_scripts: "true",
        npm_config_offline: "true",
        npm_config_trust_policy: "off",
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const sets = new Map<string, string[]>();
  for (const line of output.trim().split("\n")) {
    const match = /^\[([^\]]+)\] (.+)$/.exec(line);
    expect(match, `Unexpected Vitest list row: ${line}`).not.toBeNull();
    if (match === null) throw new Error(`Unexpected Vitest list row: ${line}`);
    const [, project, matchedFile] = match;
    const file = matchedFile.split(path.sep).join("/");
    sets.set(project, [...(sets.get(project) ?? []), file]);
  }
  for (const [project, files] of sets) {
    sets.set(project, files.sort());
  }
  return sets;
}

function observedProjectPartition(): ProjectPartition {
  const sets = configuredProjectSets();
  const configuredProjects = [...sets.keys()].sort();
  const allOwned = [...sets.values()].flat();
  const union = [...new Set(allOwned)].sort();
  const discovery = discoverTestFiles();
  return {
    configuredProjectCount: configuredProjects.length,
    configuredProjects,
    completeDiscoveryCount: discovery.length,
    pairwiseDisjoint: union.length === allOwned.length,
    completeUnion: JSON.stringify(union) === JSON.stringify(discovery),
    projects: Object.fromEntries(
      [...sets.entries()].map(([project, files]) => [
        project,
        { count: files.length, files },
      ]),
    ),
    unionCount: union.length,
  };
}

function assertCommandEvidence(command: {
  argv: string[];
  exitCode: number;
  stdoutDigest?: string;
  stderrDigest?: string;
}): void {
  expect(command.argv.length).toBeGreaterThan(0);
  expect(command.exitCode).toBe(0);
  if (command.stdoutDigest !== undefined) {
    expect(command.stdoutDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  }
  if (command.stderrDigest !== undefined) {
    expect(command.stderrDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  }
}

function assertCleanup(cleanup: Cleanup, rootName: string): void {
  expect(cleanup).toEqual({
    attempted: true,
    rootAbsentAfterCleanup: true,
    succeeded: true,
  });
  expect(fs.existsSync(path.join(os.tmpdir(), rootName))).toBe(false);
}

function assertConsumer(
  consumer: ConsumerEvidence,
  packages: PackedPackage[],
  localPnpm: LocalPnpmIdentity,
): void {
  expect(consumer).toMatchObject({
    executionId: EXECUTION_ID,
    corepackInvoked: false,
    corepackNetworkEnabled: false,
    environment: {
      COREPACK_ENABLE_NETWORK: "0",
      npm_config_ignore_scripts: "true",
      npm_config_offline: "true",
      npm_config_trust_policy: "off",
    },
  });
  expect(consumer.packageManagerVersion).toMatch(/^\d+\.\d+\.\d+/);
  if (consumer.packageManager === "pnpm") {
    expect(consumer.localPnpm).toEqual(localPnpm);
    expect(consumer.localCacheSeed).toEqual({
      destinationContainedByTempRoot: true,
      metadataMirrorSeeded: true,
      sourceKind:
        "existing-local-pnpm-content-addressed-store-and-package-metadata-mirror",
    });
    expect(consumer.installCommand.slice(0, 2)).toEqual([
      "<node>",
      "<local-pnpm-entry>",
    ]);
    expect(consumer.installCommand).toContain("--trust-policy=off");
  }
  expect(consumer.installCommand).toContain("--offline");
  expect(consumer.installCommand).toContain("--ignore-scripts");
  expect(consumer.lifecycleScriptsDisabled).toBe(true);
  expect(consumer.offlineEnforced).toBe(true);
  expect(consumer.registryFallbackAllowed).toBe(false);
  expect(consumer.installedTarballs).toEqual(
    packages.map((entry) => ({
      expectedPath: entry.tarballPath,
      expectedSha256: entry.sha256,
      observedPackageVersion: entry.packageVersion,
      packageName: entry.packageName,
    })),
  );
  expect(consumer.commands.map((entry) => entry.id)).toEqual([
    "package-manager-version",
    ...(consumer.packageManager === "pnpm" ? ["local-lock-import"] : []),
    "offline-install",
    "installed-runtime",
    "trellis-alias-help",
    "tl-alias-help",
  ]);
  consumer.commands.forEach(assertCommandEvidence);
  expect(consumer.installedBehavior).toMatchObject({
    aliasesExecuted: ["trellis", "tl"],
    corePublicImports: true,
    deepImportBlocked: true,
    exactCoreDependency: packages[0].packageVersion,
    installedContract: {
      digest: EXPECTED_CONTRACT_DIGEST,
      mappingRowCount: 17,
      memberAggregate: EXPECTED_MEMBER_AGGREGATE,
      version: "evaluation-contract-v1.3.1",
    },
    installedVersions: {
      cli: packages[1].packageVersion,
      core: packages[0].packageVersion,
    },
    packageRealpathsContainedByTempRoot: true,
    packageRealpathsOutsideRepository: true,
    procedureAuthority: {
      dormantSchema: 2,
      dormantVersion: "2.0.7",
      liveVersion: "1.0.0",
    },
    repositoryStateAbsent: true,
    sourceTreeSubstitutionUsed: false,
    testingNamespaceEmpty: true,
  });
  assertCleanup(consumer.cleanup, consumer.tempRootName);
  expect(consumer.verdict).toBe("pass");
}

describe("v1.3.1 I3 installed-package evidence", () => {
  it("allows only the exact T0A runtime inventory on the correction descendant", () => {
    const state = {
      baseIsAncestor: true,
      commitsSinceBase: 1,
      changedSinceBase: T0A_CORRECTION_INVENTORY,
    };
    expect(
      classifyI3WorktreeScope({
        dirty: T0A_RUNTIME_INVENTORY,
        staged: T0A_RUNTIME_INVENTORY,
        ...state,
      }),
    ).toEqual({ unexpectedDirtyPaths: [], unexpectedStagedPaths: [] });

    const unrelated = ".trellis/tasks/unrelated/task.json";
    expect(
      classifyI3WorktreeScope({
        dirty: [...T0A_RUNTIME_INVENTORY, unrelated],
        staged: [...T0A_RUNTIME_INVENTORY, unrelated],
        ...state,
      }),
    ).toEqual({
      unexpectedDirtyPaths: [unrelated],
      unexpectedStagedPaths: [unrelated],
    });
    expect(
      classifyI3WorktreeScope({
        dirty: T0A_RUNTIME_INVENTORY,
        staged: T0A_RUNTIME_INVENTORY,
        ...state,
        commitsSinceBase: 2,
      }),
    ).toEqual({
      unexpectedDirtyPaths: T0A_RUNTIME_INVENTORY,
      unexpectedStagedPaths: T0A_RUNTIME_INVENTORY,
    });
  });

  it("allows the exact bootstrap governance inventory on the correction descendant", () => {
    expect(
      classifyI3WorktreeScope({
        dirty: M0_CORRECTION_GOVERNANCE_INVENTORY,
        staged: M0_CORRECTION_GOVERNANCE_INVENTORY,
        baseIsAncestor: false,
        commitsSinceBase: -1,
        changedSinceBase: [],
        bootstrapBaseCommit: M0_CORRECTION_BOOTSTRAP_BASE,
        bootstrapBaseIsAncestor: true,
        bootstrapCommitsSinceBase: 1,
        bootstrapChangedSinceBase: T0A_CORRECTION_INVENTORY,
      }),
    ).toEqual({ unexpectedDirtyPaths: [], unexpectedStagedPaths: [] });

    expect(
      classifyI3WorktreeScope({
        dirty: M0_REVIEWER_DEFINITION_INVENTORY,
        staged: M0_REVIEWER_DEFINITION_INVENTORY,
        baseIsAncestor: false,
        commitsSinceBase: -1,
        changedSinceBase: [],
        bootstrapBaseCommit: M0_CORRECTION_BOOTSTRAP_BASE,
        bootstrapBaseIsAncestor: true,
        bootstrapCommitsSinceBase: 1,
        bootstrapChangedSinceBase: T0A_CORRECTION_INVENTORY,
      }),
    ).toEqual({
      unexpectedDirtyPaths: M0_REVIEWER_DEFINITION_INVENTORY,
      unexpectedStagedPaths: M0_REVIEWER_DEFINITION_INVENTORY,
    });
  });

  it("allows the exact bootstrap M0 inventory on the governance descendant", () => {
    expect(
      classifyI3WorktreeScope({
        dirty: M0_REVIEWER_DEFINITION_INVENTORY,
        staged: M0_REVIEWER_DEFINITION_INVENTORY,
        baseIsAncestor: false,
        commitsSinceBase: -1,
        changedSinceBase: [],
        bootstrapBaseCommit: M0_CORRECTION_BOOTSTRAP_BASE,
        bootstrapBaseIsAncestor: true,
        bootstrapCommitsSinceBase: 2,
        bootstrapChangedSinceBase: M0_CORRECTION_BOOTSTRAP_CHANGED_INVENTORY,
      }),
    ).toEqual({ unexpectedDirtyPaths: [], unexpectedStagedPaths: [] });

    expect(
      classifyI3WorktreeScope({
        dirty: M0_CORRECTION_GOVERNANCE_INVENTORY,
        staged: M0_CORRECTION_GOVERNANCE_INVENTORY,
        baseIsAncestor: false,
        commitsSinceBase: -1,
        changedSinceBase: [],
        bootstrapBaseCommit: M0_CORRECTION_BOOTSTRAP_BASE,
        bootstrapBaseIsAncestor: true,
        bootstrapCommitsSinceBase: 2,
        bootstrapChangedSinceBase: M0_CORRECTION_BOOTSTRAP_CHANGED_INVENTORY,
      }),
    ).toEqual({
      unexpectedDirtyPaths: M0_CORRECTION_GOVERNANCE_INVENTORY,
      unexpectedStagedPaths: M0_CORRECTION_GOVERNANCE_INVENTORY,
    });
  });

  it("rejects mismatched bootstrap topology and inventory", () => {
    const exactCorrectionState = {
      baseIsAncestor: false,
      commitsSinceBase: -1,
      changedSinceBase: [],
      bootstrapBaseCommit: M0_CORRECTION_BOOTSTRAP_BASE,
      bootstrapBaseIsAncestor: true,
      bootstrapCommitsSinceBase: 1,
      bootstrapChangedSinceBase: T0A_CORRECTION_INVENTORY,
    };
    const unrelated = ".trellis/tasks/unrelated/task.json";
    expect(
      classifyI3WorktreeScope({
        dirty: [...M0_CORRECTION_GOVERNANCE_INVENTORY, unrelated],
        staged: [...M0_CORRECTION_GOVERNANCE_INVENTORY, unrelated],
        ...exactCorrectionState,
      }),
    ).toEqual({
      unexpectedDirtyPaths: [unrelated],
      unexpectedStagedPaths: [unrelated],
    });

    for (const topologyOverride of [
      { bootstrapBaseCommit: "0".repeat(40) },
      { bootstrapBaseIsAncestor: false },
      { bootstrapCommitsSinceBase: 0 },
      { bootstrapCommitsSinceBase: 3 },
      {
        bootstrapChangedSinceBase: T0A_CORRECTION_INVENTORY.slice(1),
      },
      {
        bootstrapChangedSinceBase: [...T0A_CORRECTION_INVENTORY, unrelated],
      },
      {
        bootstrapChangedSinceBase: [...T0A_CORRECTION_INVENTORY].reverse(),
      },
    ]) {
      expect(
        classifyI3WorktreeScope({
          dirty: M0_CORRECTION_GOVERNANCE_INVENTORY,
          staged: M0_CORRECTION_GOVERNANCE_INVENTORY,
          ...exactCorrectionState,
          ...topologyOverride,
        }),
      ).toEqual({
        unexpectedDirtyPaths: M0_CORRECTION_GOVERNANCE_INVENTORY,
        unexpectedStagedPaths: M0_CORRECTION_GOVERNANCE_INVENTORY,
      });
    }

    for (const changedInventory of [
      M0_CORRECTION_BOOTSTRAP_CHANGED_INVENTORY.filter(
        (entry) => entry !== M0_CORRECTION_GOVERNANCE_INVENTORY[0],
      ),
      [...M0_CORRECTION_BOOTSTRAP_CHANGED_INVENTORY, unrelated],
      [...M0_CORRECTION_BOOTSTRAP_CHANGED_INVENTORY].reverse(),
    ]) {
      expect(
        classifyI3WorktreeScope({
          dirty: M0_REVIEWER_DEFINITION_INVENTORY,
          staged: M0_REVIEWER_DEFINITION_INVENTORY,
          baseIsAncestor: false,
          commitsSinceBase: -1,
          changedSinceBase: [],
          bootstrapBaseCommit: M0_CORRECTION_BOOTSTRAP_BASE,
          bootstrapBaseIsAncestor: true,
          bootstrapCommitsSinceBase: 2,
          bootstrapChangedSinceBase: changedInventory,
        }),
      ).toEqual({
        unexpectedDirtyPaths: M0_REVIEWER_DEFINITION_INVENTORY,
        unexpectedStagedPaths: M0_REVIEWER_DEFINITION_INVENTORY,
      });
    }
  });

  it("authenticates the exact candidate, dynamic lanes, artifacts, consumers, and ledger", () => {
    const before = new Map(
      SCRIPT_RECORD_PATHS.map((relativePath) => [
        relativePath,
        fs.readFileSync(path.join(repoRoot, relativePath)),
      ]),
    );
    execFileSync(process.execPath, [auditScript, "--verify"], {
      cwd: repoRoot,
      stdio: "pipe",
      maxBuffer: 128 * 1024 * 1024,
    });
    for (const [relativePath, bytes] of before) {
      expect(
        fs.readFileSync(path.join(repoRoot, relativePath)).equals(bytes),
      ).toBe(true);
    }

    for (const args of [
      [],
      ["--write", "extra"],
      ["--verify", "target"],
      ["--bad"],
    ]) {
      const result = spawnSync(process.execPath, [auditScript, ...args], {
        cwd: repoRoot,
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
    }

    const { record: input } = readEvidence<InputAttestation>(
      "integration-input-attestation.json",
    );
    const { record: tarballs } = readEvidence<TarballInventory>(
      "package-tarball-inventory.json",
    );
    const { record: install } = readEvidence<InstallEvidence>(
      "external-install-evidence.json",
    );
    const { record: protectedAudit } = readEvidence<ProtectedAudit>(
      "protected-path-audit.json",
    );
    const { record: ledger } = readEvidence<Ledger>(
      "integration-execution-evidence-ledger.json",
    );

    expect(input).toMatchObject({
      schemaVersion: 1,
      recordKind: "i3-integration-input-attestation",
      stage: "I3",
      commitBoundary: "candidate-pre-commit",
      executionId: EXECUTION_ID,
      priorAttemptsExist: true,
      priorExecutionIncident: {
        executionId: PRIOR_EXECUTION_ID,
        status: "aborted",
        reason:
          "Corepack startup was network-capable before offline execution was proven",
        networkActivityCannotBeExcluded: true,
        evidencePublished: false,
        commitCreated: false,
        stagingPerformed: false,
      },
      acceptedContract: {
        contractVersion: "evaluation-contract-v1.3.1",
        semanticDigest: EXPECTED_CONTRACT_DIGEST,
      },
      currentExecutionObservations: {
        preparationHead: {
          commit: PREPARATION_HEAD_COMMIT,
          tree: PREPARATION_HEAD_TREE,
        },
        preparationHeadDescendsFromGovernance: true,
        verificationHeadPolicy: "preparation-head-or-forward-descendant",
        finalI3CommitRecorded: false,
        finalI3TreeRecorded: false,
      },
      mutableWorktreeSemanticAuthority: false,
      networkUsed: false,
      providerUsed: false,
      verdict: "pass",
    });
    expect(input.priorExecutionHistory).toEqual([
      input.priorExecutionIncident,
      {
        executionId: PRIOR_OFFLINE_EXECUTION_ID,
        status: "aborted",
        reason:
          "Zero-network preflight passed, then local pnpm import failed without diagnostics",
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: false,
        commitCreated: false,
        stagingPerformed: false,
      },
      {
        executionId: PRIOR_R3_EXECUTION_ID,
        status: "aborted",
        reason:
          "Restricted zero-network preflight passed, Core and CLI were each packed once, then offline pnpm lock import failed because the isolated package metadata mirror lacked chalk range metadata",
        diagnostic:
          "ERR_PNPM_NO_OFFLINE_META: Failed to resolve chalk@>=5.3.0 <6.0.0-0 in package mirror metadata-v1.3/registry.npmjs.org/chalk.json",
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: false,
        commitCreated: false,
        stagingPerformed: false,
      },
      {
        executionId: PRIOR_R4_EXECUTION_ID,
        status: "failed",
        reason:
          "Offline evidence generation passed, then staged commit verification rejected the two authorized I3 package additions as unexpected tracked package worktree drift",
        diagnostic:
          "Unexpected tracked package worktree drift: packages/cli/scripts/research-v131-installed-package-audit-i3.mjs,packages/cli/test/commands/research-v131-integration-i3.test.ts",
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: true,
        commitCreated: false,
        stagingPerformed: true,
      },
      {
        executionId: PRIOR_R5_EXECUTION_ID,
        status: "superseded",
        reason:
          "Offline evidence and the exact-nine I3 commit succeeded, then S3 hook verification exposed that retained candidate evidence could not verify from its committed forward descendant",
        diagnostic:
          "I3 evidence must be prepared directly on authenticated G-I3",
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: true,
        commitCreated: true,
        commit: "84a143b16f536c7a7f74a3690c402fe65c9ab21f",
        stagingPerformed: true,
        firstS3HookInterrupted: true,
        telemetryRetryExitCode: 1,
        s3CommitCreated: false,
      },
      {
        executionId: PRIOR_R6_EXECUTION_ID,
        status: "failed",
        reason:
          "Retained verification passed, the first corrective commit hook was externally interrupted, then the telemetry retry exposed the I3 integration test's implicit ten-second timeout under full-suite load",
        diagnostic: "Test timed out in 10000ms.",
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: true,
        commitCreated: false,
        stagingPerformed: true,
      },
      {
        executionId: PRIOR_R7_EXECUTION_ID,
        status: "superseded",
        reason:
          "Offline evidence and the corrective exact-nine I3 commit succeeded, then pre-S3 retained verification rejected the authorized exact-one freeze path as unexpected worktree and staged scope",
        diagnostic:
          "I3 worktree scope mismatch: unexpectedDirty=.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json unexpectedStaged=.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json",
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: true,
        commitCreated: true,
        commit: "f5f009e0491db38e5d2e1bd9a3971c05b5566423",
        stagingPerformed: true,
        s3CommitCreated: false,
      },
      {
        executionId: PRIOR_R8_EXECUTION_ID,
        status: "superseded",
        reason:
          "Offline evidence, the corrective exact-nine I3 commit, and exact-one S3 commit succeeded, then the exact-one closure hook exposed that the retained I3 integration test still required mutable task state to remain pre-closure",
        diagnostic:
          'expected status "in_progress", completedAt null, executionState "i3-evidence-prepared", and s3Status "pending"; received the authorized completed closure transition',
        networkActivityCannotBeExcluded: false,
        offlineStartupPreflightPassed: true,
        corePackCount: 1,
        cliPackCount: 1,
        evidencePublished: true,
        commitCreated: true,
        commit: "edbfa66452a8119c3dbdcd6db43cb29b80e802e2",
        stagingPerformed: true,
        s3CommitCreated: true,
        s3Commit: "8793c5aeda09fe8ada263733733569516cb492f5",
        closureCommitCreated: false,
      },
    ]);
    expect(input.offlineStartupPreflight).toMatchObject({
      executionId: EXECUTION_ID,
      completedBeforeBuildAndPack: true,
      networkCapabilityEnabled: false,
      corepackInvoked: false,
      localPnpm: {
        strategy: "direct-node-entry-from-existing-local-corepack-cache",
        corepackInvoked: false,
        version: "10.32.1",
        packageRoot: "<local-corepack-cache>/pnpm/10.32.1",
        entry: {
          path: "<local-corepack-cache>/pnpm/10.32.1/bin/pnpm.cjs",
        },
      },
      localPnpmMetadataMirror: {
        availableBeforeBuildAndPack: true,
        formatVersion: "v1.3",
        sourceKind: "existing-local-pnpm-package-metadata-mirror",
      },
      observedVersions: { pnpm: "10.32.1" },
      verdict: "pass",
    });
    expect(input.offlineStartupPreflight.observedVersions.npm).toMatch(
      /^\d+\.\d+\.\d+/,
    );
    expect(
      input.offlineStartupPreflight.commands.map((entry) => entry.id),
    ).toEqual(["restricted-npm-version", "restricted-local-pnpm-version"]);
    input.offlineStartupPreflight.commands.forEach(assertCommandEvidence);
    expect(input.offlineStartupPreflight.commands[1].argv).toEqual([
      "<node>",
      "<local-pnpm-entry>",
      "--version",
    ]);
    assertCleanup(
      input.offlineStartupPreflight.cleanup,
      input.offlineStartupPreflight.tempRootName,
    );
    expect(
      [...input.currentExecutionObservations.plannedExactNineInventory].sort(),
    ).toEqual(EXACT_NINE);
    expect(
      input.currentExecutionObservations.historicalVerification.map(
        (entry) => ({
          argv: entry.argv.at(-1),
          exitCode: entry.exitCode,
          mode: entry.mode,
          writesAuthorized: entry.writesAuthorized,
        }),
      ),
    ).toEqual([
      {
        argv: "--verify",
        exitCode: 0,
        mode: "verify-only",
        writesAuthorized: false,
      },
      {
        argv: "--verify",
        exitCode: 0,
        mode: "verify-only",
        writesAuthorized: false,
      },
    ]);

    const packageProof = input.currentExecutionObservations.packageProof;
    expect(packageProof.anchors.r3).toMatchObject({
      role: "r3-semantic-anchor",
      commit: R3_COMMIT,
      packagePathCount: 1591,
      packageTupleDigest:
        "sha256:077f223c93c98d8abd0854f0e1f5c71d0782dae2cf2b580237b545aff2d34a51",
    });
    expect(packageProof.anchors.stabilization).toMatchObject({
      role: "runner-stabilization-anchor",
      commit: STABILIZATION_COMMIT,
      packagePathCount: 1591,
      packageTupleDigest:
        "sha256:60e3c8e948d08d4b312908becd8b2e947bb882da053ca9a111174e114ec1042c",
    });
    expect(packageProof.anchors.repair).toMatchObject({
      role: "immediate-git-integration-predecessor",
      commit: REPAIR_COMMIT,
      packagePathCount: 1591,
      packageTupleDigest:
        "sha256:575af4df32b2bc236cd37b675b1b470639ad206c708f79fa735ab1bc83810933",
    });
    expect(packageProof.anchors.governance).toMatchObject({
      role: "g-i3-governance-anchor",
      commit: G_I3_COMMIT,
      tree: G_I3_TREE,
      packagePathCount: 1591,
    });

    const r3Records = treeRecords(R3_COMMIT);
    const repairRecords = treeRecords(REPAIR_COMMIT);
    const candidateRecords = candidateTreeRecords();
    expect(candidateRecords).toHaveLength(1593);
    expect(treeDigest(candidateRecords)).toBe(
      packageProof.candidate.packageTupleDigest,
    );
    expect(packageProof.candidate).toMatchObject({
      finalCommitRecorded: false,
      finalTreeRecorded: false,
      packagePathCount: 1593,
      repairToCandidateDelta: PACKAGE_ADDITIONS,
      r3ToCandidateDelta: R3_TO_CANDIDATE_DELTA,
    });
    expect(changedPaths(repairRecords, candidateRecords)).toEqual(
      PACKAGE_ADDITIONS,
    );
    expect(changedPaths(r3Records, candidateRecords)).toEqual(
      R3_TO_CANDIDATE_DELTA,
    );
    const repairMap = new Map(
      repairRecords.map((entry) => [entry.path, entry.bytes]),
    );
    const sharedR3Records = r3Records.filter((entry) =>
      repairMap.get(entry.path)?.equals(entry.bytes),
    );
    expect(sharedR3Records).toHaveLength(1588);
    expect(treeDigest(sharedR3Records)).toBe(EXPECTED_SHARED_DIGEST);
    expect(packageProof.sharedR3Repair).toEqual({
      count: 1588,
      digest: EXPECTED_SHARED_DIGEST,
      serialization:
        "matching exact R3 git ls-tree records, each NUL-terminated, in original R3 order",
    });

    expect(tarballs).toMatchObject({
      schemaVersion: 1,
      recordKind: "i3-package-tarball-inventory",
      executionId: EXECUTION_ID,
      offlineStartupPreflightPassedBeforeBuildAndPack: true,
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      localPnpm: input.offlineStartupPreflight.localPnpm,
      packLifecycleScriptsDisabled: true,
      sameTarballPathsSuppliedToBothConsumers: true,
      sameTarballSha256SuppliedToBothConsumers: true,
      tarballsPackedOncePerPackage: true,
      tarballsRetainedAfterAudit: false,
      verdict: "pass",
    });
    expect(tarballs.packages.map((entry) => entry.packageName)).toEqual([
      "@mindfoldhq/trellis-core",
      "@mindfoldhq/trellis",
    ]);
    expect(tarballs.buildAndPackCommands.map((entry) => entry.id)).toEqual([
      "build-core",
      "build-cli",
      "pack-core-once",
      "pack-cli-once",
    ]);
    tarballs.buildAndPackCommands.forEach(assertCommandEvidence);
    for (const command of tarballs.buildAndPackCommands) {
      expect(command.argv.slice(0, 2)).toEqual([
        "<node>",
        "<local-pnpm-entry>",
      ]);
    }
    for (const packedPackage of tarballs.packages) {
      expect(packedPackage.sourceCommit).toBe(G_I3_COMMIT);
      expect(packedPackage.byteLength).toBeGreaterThan(0);
      expect(packedPackage.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(packedPackage.fileEntries.length).toBeGreaterThan(0);
      expect(
        new Set(packedPackage.fileEntries.map((entry) => entry.path)).size,
      ).toBe(packedPackage.fileEntries.length);
      const packageJsonEntry = packedPackage.fileEntries.find(
        (entry) => entry.path === "package/package.json",
      );
      expect(packageJsonEntry).toMatchObject(packedPackage.packageJsonIdentity);
      for (const fileEntry of packedPackage.fileEntries) {
        expect(fileEntry.path).toMatch(/^package\//);
        expect(fileEntry.mode).toMatch(/^0[0-7]{3}$/);
        expect(fileEntry.byteLength).toBeGreaterThanOrEqual(0);
        expect(fileEntry.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
      }
    }
    expect(tarballs.packages[1]).toMatchObject({
      exactCoreDependency: tarballs.packages[0].packageVersion,
      bins: { trellis: "./bin/trellis.js", tl: "./bin/trellis.js" },
    });
    assertCleanup(
      tarballs.temporaryPackRootCleanup,
      tarballs.temporaryPackRootName,
    );

    expect(install).toMatchObject({
      schemaVersion: 1,
      recordKind: "i3-external-install-evidence",
      executionId: EXECUTION_ID,
      priorAttemptsExist: true,
      priorExecutionHistory: input.priorExecutionHistory,
      freshExecutionNetworkUsed: false,
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      lifecycleScriptsDisabledForAllConsumers: true,
      networkPackageResolutionAllowed: false,
      providerExecutionPerformed: false,
      publicationPerformed: false,
      pushPerformed: false,
      releasePerformed: false,
      runtimeActivationPerformed: false,
      sameAuthenticatedTarballsUsedByBothConsumers: true,
      verdict: "pass",
    });
    expect(install.consumers.map((entry) => entry.packageManager)).toEqual([
      "npm",
      "pnpm",
    ]);
    assertConsumer(install.consumers[0], tarballs.packages, tarballs.localPnpm);
    assertConsumer(install.consumers[1], tarballs.packages, tarballs.localPnpm);
    expect(install.consumers[1].installCommand).toContain("--frozen-lockfile");

    expect(protectedAudit).toMatchObject({
      schemaVersion: 1,
      recordKind: "i3-protected-path-audit",
      executionId: EXECUTION_ID,
      candidateScope: {
        allowedInventory:
          input.currentExecutionObservations.plannedExactNineInventory,
        allowedSuccessorInventory: [
          ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json",
        ],
        allCandidatePathsPresentOrProspective: true,
        indexContainsOnlyCandidateOrAuthorizedSuccessorPaths: true,
        protectedPathsStaged: false,
        unexpectedDirtyPaths: [],
        unexpectedStagedPaths: [],
      },
      immutableHistoricalEvidenceMutationPerformed: false,
      submoduleWorktreeMutationUsedAsEvidenceAuthority: false,
      verdict: "pass",
    });
    expect(protectedAudit.files).toEqual([
      {
        expectedSha256:
          "sha256:788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48",
        matches: true,
        observedSha256:
          "sha256:788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48",
        path: "AGENTS.md",
        staged: false,
      },
      {
        expectedSha256:
          "sha256:319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3",
        matches: true,
        observedSha256:
          "sha256:319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3",
        path: "CLAUDE.md",
        staged: false,
      },
    ]);
    expect(protectedAudit.gitlinks).toMatchObject([
      {
        path: "docs-site",
        expectedCommit: "be7684f2086abb9b8e24d4d35733a7dda3123a0f",
        indexCommit: "be7684f2086abb9b8e24d4d35733a7dda3123a0f",
        matches: true,
        staged: false,
        submoduleWorktreeMutationUsedAsAuthority: false,
      },
      {
        path: "marketplace",
        expectedCommit: "d7a18bb5411c700237d21483d6889ac296ef0301",
        indexCommit: "d7a18bb5411c700237d21483d6889ac296ef0301",
        matches: true,
        staged: false,
        submoduleWorktreeMutationUsedAsAuthority: false,
      },
    ]);

    const partition = observedProjectPartition();
    expect(partition.configuredProjects).toEqual(EXPECTED_PROJECTS);
    expect(partition).toMatchObject({
      configuredProjectCount: 4,
      completeDiscoveryCount: 87,
      pairwiseDisjoint: true,
      completeUnion: true,
      unionCount: 87,
      projects: {
        "procedure-207-packages": { count: 1 },
        "methodology-116-production": { count: 1 },
        normal: { count: 83 },
        "dist-mutating": { count: 2 },
      },
    });
    expect(partition.projects.normal.files).toContain(
      "test/commands/research-v131-integration-i3.test.ts",
    );

    expect(ledger).toMatchObject({
      schemaVersion: 1,
      recordKind: "i3-integration-execution-evidence-ledger",
      stage: "I3",
      commitBoundary: "candidate-pre-commit",
      executionId: EXECUTION_ID,
      priorAttemptsExist: true,
      priorExecutionIncident: input.priorExecutionIncident,
      priorExecutionHistory: input.priorExecutionHistory,
      freshExecutionNetworkUsed: false,
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      localPnpm: input.offlineStartupPreflight.localPnpm,
      governanceAnchor: { commit: G_I3_COMMIT, tree: G_I3_TREE },
      repairPredecessor: { commit: REPAIR_COMMIT },
      exactNineCandidateInventory: EXACT_NINE,
      projectPartition: partition,
      checks: {
        allFiveRecordsCanonical: true,
        dynamicProjectPartitionPassed: true,
        historicalAuditsVerifyOnly: true,
        offlineStartupPreflightPassed: true,
        priorExecutionHistoryRecorded: true,
        priorExecutionIncidentRecorded: true,
        packageTreeAuthenticationPassed: true,
        protectedPathAuditPassed: true,
        scriptVerifyBytePreserving: true,
        temporaryRootsAbsent: true,
      },
      gitNexus: {
        compareBase: "variant/research-workflow",
        expectedScopeOnly: true,
        highOrCriticalImpactObserved: true,
      },
      finalPreCommitState: {
        finalI3CommitRecorded: false,
        finalI3TreeRecorded: false,
        s3Status: "pending",
        closureComplete: false,
      },
      ledgerSelfHashClaimed: false,
      evidenceDependentSelfValidationClaimed: false,
      verdict: "pass",
    });
    expect(ledger.projectPartition).toEqual(partition);
    expect(ledger.recordLinks).toEqual(
      SCRIPT_RECORD_PATHS.map((relativePath) => {
        const bytes = fs.readFileSync(path.join(repoRoot, relativePath));
        return {
          path: relativePath,
          byteLength: bytes.length,
          sha256: sha256Label(bytes),
        };
      }),
    );
    expect(ledger.recordLinks.map((entry) => entry.path)).not.toContain(
      path.relative(repoRoot, ledgerPath),
    );
    ledger.commands.forEach(assertCommandEvidence);

    const task = readTaskForExecution(EXECUTION_ID);
    expect(task).toMatchObject({
      status: "in_progress",
      completedAt: null,
      meta: {
        executionState: "i3-evidence-prepared",
        i3EvidencePrepared: true,
        s3Status: "pending",
        i3ExecutionId: EXECUTION_ID,
        i3PriorAttemptsExist: true,
        i3PriorExecutionIncident: input.priorExecutionIncident,
        i3PriorExecutionHistory: input.priorExecutionHistory,
      },
    });
  }, 30_000);
});
