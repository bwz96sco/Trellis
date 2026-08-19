#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditPackedCoreEntries,
  auditPackedCoreEntrySafety,
  buildPackedCoreInventory,
  parseTarListing as parseCoreTarListing,
  validatePackedCorePackage,
  validateTarEntryTypes,
} from "../../core/scripts/packed-core-audit.js";
import {
  PACKED_ACTIVE_RESEARCH_ENTRIES,
  auditPackedActiveContent,
  auditPackedEntries,
  buildPackedCliInventory,
  parseTarListing as parseCliTarListing,
} from "./packed-cli-audit.js";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const CLI_DIR = path.resolve(path.dirname(SCRIPT_FILE), "..");
const CORE_DIR = path.resolve(CLI_DIR, "../core");
const REPO_ROOT = path.resolve(CLI_DIR, "../..");
const TASK_ROOT = path.join(
  REPO_ROOT,
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze",
);
const RESEARCH_ROOT = path.join(TASK_ROOT, "research");
const LEDGER_PATH = path.join(
  RESEARCH_ROOT,
  "integration-execution-evidence-ledger.json",
);

const OUTPUTS = Object.freeze({
  input: path.join(RESEARCH_ROOT, "integration-input-attestation.json"),
  tarballs: path.join(RESEARCH_ROOT, "package-tarball-inventory.json"),
  install: path.join(RESEARCH_ROOT, "external-install-evidence.json"),
  protected: path.join(RESEARCH_ROOT, "protected-path-audit.json"),
});

const I3_INVENTORY = Object.freeze([
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json",
  ".trellis/spec/cli/unit-test/conventions.md",
  "packages/cli/scripts/research-v131-installed-package-audit-i3.mjs",
  "packages/cli/test/commands/research-v131-integration-i3.test.ts",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-input-attestation.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/package-tarball-inventory.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/external-install-evidence.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-execution-evidence-ledger.json",
  ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/protected-path-audit.json",
]);
const PACKAGE_PATHSPEC = Object.freeze([
  "packages/core",
  "packages/cli",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
]);
const I3_PACKAGE_ADDITIONS = Object.freeze([
  "packages/cli/scripts/research-v131-installed-package-audit-i3.mjs",
  "packages/cli/test/commands/research-v131-integration-i3.test.ts",
]);
const R3_TO_REPAIR_DELTA = Object.freeze([
  "packages/cli/test/commands/research-dispatch-activation.integration.test.ts",
  "packages/cli/test/commands/research-dispatch-approved-result.test.ts",
  "packages/cli/vitest.config.ts",
]);
const R3_TO_I3_CANDIDATE_DELTA = Object.freeze(
  [...R3_TO_REPAIR_DELTA, ...I3_PACKAGE_ADDITIONS].sort(),
);

const R3 = Object.freeze({
  role: "r3-semantic-anchor",
  commit: "0028183901b74263a70dacca98bb936dc792ced4",
  tree: "57a66fa619c38d525431f829f3738cd61bb75d83",
  packagePathCount: 1591,
  packageTupleDigest:
    "sha256:077f223c93c98d8abd0854f0e1f5c71d0782dae2cf2b580237b545aff2d34a51",
});
const STABILIZATION = Object.freeze({
  role: "runner-stabilization-anchor",
  commit: "753a5d9a8b1aa293a42f27201f3d9dd458edd723",
  parent: "c7d3423bbe5bade60a4fa9a02ea1849b5403ea70",
  tree: "59d88a337a563cb90e875cc7197489fa4c1a6e93",
  subject: "test(cli): isolate production harness lane",
  packagePathCount: 1591,
  packageTupleDigest:
    "sha256:60e3c8e948d08d4b312908becd8b2e947bb882da053ca9a111174e114ec1042c",
});
const REPAIR = Object.freeze({
  role: "immediate-git-integration-predecessor",
  commit: "5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24",
  parent: STABILIZATION.commit,
  tree: "cc3ce047d4a1b678d9aff74bd831464015acb223",
  subject: "test(cli): split dispatch aggregate scenarios",
  packagePathCount: 1591,
  packageTupleDigest:
    "sha256:575af4df32b2bc236cd37b675b1b470639ad206c708f79fa735ab1bc83810933",
});
const G_I3 = Object.freeze({
  role: "g-i3-governance-anchor",
  commit: "c01c6f9231b3c5b74fd0376411f09dfddda9321f",
  parent: REPAIR.commit,
  tree: "ff9a25df64cc42af512229ef49338e35efd85e90",
  subject: "chore(research): govern repair-aware i3 refreeze",
  inventory: Object.freeze([
    ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/check.jsonl",
    ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/design.md",
    ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/implement.jsonl",
    ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/implement.md",
    ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/prd.md",
    ".trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json",
  ]),
  packagePathCount: 1591,
  packageTupleDigest: REPAIR.packageTupleDigest,
});

const SHARED_R3_REPAIR_COUNT = 1588;
const SHARED_R3_REPAIR_DIGEST =
  "sha256:b2010d0e527a54de1bb2ea9838da7e2af42faadbf26cad4530d82a1c38522187";
const EXPECTED_I3_PACKAGE_COUNT = 1593;
const CONTRACT_VERSION = "evaluation-contract-v1.3.1";
const CONTRACT_DIGEST =
  "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af";
const MEMBER_AGGREGATE =
  "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34";
const COMPLETE_OUTPUT_SET =
  "sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642";
const CANDIDATE_MANIFEST_SHA256 =
  "e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a";
const PACKAGE_SET_DIGEST =
  "sha256:2add30f5b73e7b0df3c22210f308758798b4ad423cad70668a37b9e5430d7104";
const PACKAGE_DIGEST_DOMAIN = Buffer.from(
  "trellis-procedure-207-package-set-v1\0",
  "utf8",
);

const T3_COMMIT = "320dfaf779219441adfa4f7c6d1df9596489fc1f";
const T3_INVENTORY_PATH =
  ".trellis/tasks/08-12-project-procedure-2-0-7-family-packages/research/package-inventory.json";
const A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3";
const A133_TREE = "47633d69ffb68b7e225e01e502fe133616a1078b";
const A133_ROOT =
  ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research";
const A133_MANIFEST = `${A133_ROOT}/contract-candidate-manifest-v1.3.1.json`;
const B133_COMMIT = "56277b874217a3b8a01b63a4905cf6b22708cb05";
const B133_TREE = "3873721fe9208644e856f857a2c34e9651c96edc";
const O133_COMMIT = "2253df9fb67f8ee84d470da23205e9610f8a4e3e";
const O133_TREE = "7e5430197841776a6d8d7f31e8b82517473f082f";
const CORRECTED_T4 = Object.freeze({
  commit: "e7ed93f6b8d2bcb4711715a080ec2984119848bb",
  tree: "7254198c53055ddb9c896fb7d7ef8778595e54d5",
});
const ATTEMPT_COMMITS = Object.freeze([
  Object.freeze({
    number: 1,
    commit: "cd85634a5a1d8e942c78364ef9442be5a28d4816",
    disposition: "immutable-harness-failure-evidence",
  }),
  Object.freeze({
    number: 2,
    commit: "1d389f31cb584ffbab3acb583c4810e7676c7b46",
    disposition: "immutable-failed-non-authoritative-evidence",
  }),
  Object.freeze({
    number: 3,
    commit: "e311146a89a96e21e614304240c655245998e20f",
    disposition: "immutable-failed-complete-system-evidence",
  }),
]);

const RETAINED = Object.freeze({
  i1: Object.freeze({
    subjectCommit: "57572e77f81148bc6aae6d3b727db33a09e45f23",
    subjectTree: "8e2acbf86f6820b6f3557fa5d6b186226284351b",
    freezeCommit: "e6b80d640f0bd264c1acfe6bab906cb3e4ae535a",
    freezeTree: "1304e0faa7262cd1c80cd3e8ab9b01057809f9e0",
    freezePath:
      ".trellis/tasks/08-12-integrate-install-and-freeze-v1-3-1-subject/research/exact-subject-freeze.json",
    auditScript:
      "packages/cli/scripts/research-v131-installed-package-audit.mjs",
  }),
  i2: Object.freeze({
    subjectCommit: "8fdb45e0f00cccf6ea41096c279696dd33d4e71b",
    subjectTree: "fc7f42ae9a189036f52730b2ecc5fc9930481c47",
    freezeCommit: "a2a4ea08bf65cea22a976078aaae104ddb5c4019",
    freezeTree: "fc308a5c264bb33272ee8e54a3dfb475b6a43dbd",
    freezePath:
      ".trellis/tasks/08-15-integrate-install-and-freeze-v1-3-1-subject-successor/research/exact-subject-freeze.json",
    auditScript:
      "packages/cli/scripts/research-v131-installed-package-audit-successor.mjs",
  }),
});

const PROTECTED_FILES = Object.freeze({
  "AGENTS.md":
    "788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48",
  "CLAUDE.md":
    "319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3",
});
const PROTECTED_GITLINKS = Object.freeze({
  "docs-site": "be7684f2086abb9b8e24d4d35733a7dda3123a0f",
  marketplace: "d7a18bb5411c700237d21483d6889ac296ef0301",
});

const EXECUTION_ID = "i3-c01c6f9231b3-offline-r5";
const PRIOR_EXECUTION_HISTORY = Object.freeze([
  Object.freeze({
    executionId: "i3-c01c6f9231b3-aborted-r1",
    status: "aborted",
    reason:
      "Corepack startup was network-capable before offline execution was proven",
    networkActivityCannotBeExcluded: true,
    evidencePublished: false,
    commitCreated: false,
    stagingPerformed: false,
  }),
  Object.freeze({
    executionId: "i3-c01c6f9231b3-offline-r2",
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
  }),
  Object.freeze({
    executionId: "i3-c01c6f9231b3-offline-r3",
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
  }),
  Object.freeze({
    executionId: "i3-c01c6f9231b3-offline-r4",
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
  }),
]);
const PRIOR_EXECUTION_INCIDENT = PRIOR_EXECUTION_HISTORY[0];
const PNPM_VERSION = "10.32.1";
const LOCAL_PNPM_PACKAGE_ROOT = path.join(
  os.homedir(),
  ".cache/node/corepack/v1/pnpm",
  PNPM_VERSION,
);
const LOCAL_PNPM_ENTRY = path.join(LOCAL_PNPM_PACKAGE_ROOT, "bin/pnpm.cjs");
const LOCAL_PNPM_PACKAGE_JSON = path.join(
  LOCAL_PNPM_PACKAGE_ROOT,
  "package.json",
);
const LOCAL_PNPM_METADATA_ROOT = path.join(
  os.homedir(),
  "Library/Caches/pnpm/metadata-v1.3",
);
const TEMP_ROOT_NAMES = Object.freeze({
  preflight: `trellis-v131-i3-${G_I3.commit.slice(0, 12)}-offline-r5-preflight`,
  pack: `trellis-v131-i3-${G_I3.commit.slice(0, 12)}-offline-r5-pack`,
  npm: `trellis-v131-i3-${G_I3.commit.slice(0, 12)}-offline-r5-npm`,
  pnpm: `trellis-v131-i3-${G_I3.commit.slice(0, 12)}-offline-r5-pnpm`,
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Label(bytes) {
  return `sha256:${sha256(bytes)}`;
}

function gitBlobOid(bytes) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(canonical(value))}\n`, "utf8");
}

function assertResolved(value, location = "record") {
  if (value === undefined) {
    throw new Error(`Unresolved undefined value at ${location}`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Non-finite number at ${location}`);
  }
  if (typeof value === "string") {
    if (value.length === 0)
      throw new Error(`Empty required string at ${location}`);
    if (/\b(?:TBD|TODO|UNKNOWN)\b/i.test(value)) {
      throw new Error(`Placeholder value at ${location}`);
    }
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertResolved(entry, `${location}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertResolved(entry, `${location}.${key}`);
    }
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readCanonicalJson(file) {
  const bytes = fs.readFileSync(file);
  const record = JSON.parse(bytes.toString("utf8"));
  if (!bytes.equals(canonicalBytes(record))) {
    throw new Error(
      `Evidence is not canonical JSON: ${path.relative(REPO_ROOT, file)}`,
    );
  }
  assertResolved(record, path.relative(REPO_ROOT, file));
  return { bytes, record };
}

function gitBuffer(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
}

function gitText(args, options = {}) {
  return gitBuffer(args, options).toString("utf8");
}

function gitObjectBytes(commit, relativePath) {
  return gitBuffer(["show", `${commit}:${relativePath}`]);
}

function gitTree(commit) {
  return gitText(["rev-parse", `${commit}^{tree}`]).trim();
}

function gitParent(commit) {
  return gitText(["rev-parse", `${commit}^`]).trim();
}

function gitSubject(commit) {
  return gitText(["show", "-s", "--format=%s", commit]).trim();
}

function gitCommitInventory(commit) {
  return gitText([
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "-r",
    "-z",
    commit,
  ])
    .split("\0")
    .filter(Boolean)
    .sort();
}

function gitFileIdentity(commit, relativePath, parseJson = false) {
  const line = gitText(["ls-tree", commit, "--", relativePath]).trim();
  const match = /^(\d{6}) (blob|commit) ([0-9a-f]{40})\t/.exec(line);
  if (!match)
    throw new Error(`Missing committed object ${commit}:${relativePath}`);
  const bytes = gitObjectBytes(commit, relativePath);
  const identity = {
    path: relativePath,
    mode: match[1],
    type: match[2],
    blob: match[3],
    byteLength: bytes.length,
    sha256: sha256(bytes),
  };
  if (parseJson) {
    JSON.parse(bytes.toString("utf8"));
    return { ...identity, jsonParsePassed: true };
  }
  return identity;
}

function assertExactArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} mismatch: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
    );
  }
}

function packageTreeSnapshot(commit) {
  const bytes = gitBuffer([
    "ls-tree",
    "-r",
    "-z",
    commit,
    "--",
    ...PACKAGE_PATHSPEC,
  ]);
  const records = bytes
    .subarray(0, bytes.length - (bytes.at(-1) === 0 ? 1 : 0))
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const tab = record.indexOf("\t");
      if (tab < 0) throw new Error(`Malformed ls-tree record for ${commit}`);
      return {
        path: record.slice(tab + 1),
        bytes: Buffer.from(record, "utf8"),
      };
    });
  return {
    count: records.length,
    digest: sha256Label(bytes),
    bytes,
    records,
  };
}

function assertAnchor(anchor) {
  if (gitTree(anchor.commit) !== anchor.tree) {
    throw new Error(`${anchor.role} tree mismatch`);
  }
  if (
    anchor.parent !== undefined &&
    gitParent(anchor.commit) !== anchor.parent
  ) {
    throw new Error(`${anchor.role} parent mismatch`);
  }
  if (
    anchor.subject !== undefined &&
    gitSubject(anchor.commit) !== anchor.subject
  ) {
    throw new Error(`${anchor.role} subject mismatch`);
  }
  if (anchor.inventory !== undefined) {
    assertExactArray(
      gitCommitInventory(anchor.commit),
      [...anchor.inventory].sort(),
      `${anchor.role} inventory`,
    );
  }
  const packageTree = packageTreeSnapshot(anchor.commit);
  if (
    packageTree.count !== anchor.packagePathCount ||
    packageTree.digest !== anchor.packageTupleDigest
  ) {
    throw new Error(`${anchor.role} package tuple mismatch`);
  }
  return {
    ...anchor,
    subject: anchor.subject ?? gitSubject(anchor.commit),
  };
}

function recordMap(snapshot) {
  return new Map(snapshot.records.map((record) => [record.path, record.bytes]));
}

function changedPaths(leftSnapshot, rightSnapshot) {
  const left = recordMap(leftSnapshot);
  const right = recordMap(rightSnapshot);
  return [...new Set([...left.keys(), ...right.keys()])]
    .filter((entry) => {
      const leftBytes = left.get(entry);
      const rightBytes = right.get(entry);
      return (
        leftBytes === undefined ||
        rightBytes === undefined ||
        !leftBytes.equals(rightBytes)
      );
    })
    .sort();
}

function buildPackageProof() {
  const r3Anchor = assertAnchor(R3);
  const stabilizationAnchor = assertAnchor(STABILIZATION);
  const repairAnchor = assertAnchor(REPAIR);
  const governanceAnchor = assertAnchor(G_I3);
  const r3 = packageTreeSnapshot(R3.commit);
  const stabilization = packageTreeSnapshot(STABILIZATION.commit);
  const repair = packageTreeSnapshot(REPAIR.commit);
  const governance = packageTreeSnapshot(G_I3.commit);
  assertExactArray(
    changedPaths(r3, stabilization),
    ["packages/cli/vitest.config.ts"],
    "R3 to stabilization package delta",
  );
  assertExactArray(
    changedPaths(stabilization, repair),
    [
      "packages/cli/test/commands/research-dispatch-activation.integration.test.ts",
      "packages/cli/test/commands/research-dispatch-approved-result.test.ts",
    ],
    "stabilization to repair package delta",
  );
  assertExactArray(
    changedPaths(r3, repair),
    [...R3_TO_REPAIR_DELTA],
    "R3 to repair package delta",
  );
  if (!repair.bytes.equals(governance.bytes)) {
    throw new Error("G-I3 package tree differs from repair predecessor");
  }

  const repairMap = recordMap(repair);
  const sharedRecords = r3.records.filter((record) => {
    const repairRecord = repairMap.get(record.path);
    return repairRecord !== undefined && record.bytes.equals(repairRecord);
  });
  const sharedBytes = Buffer.concat(
    sharedRecords.flatMap((record) => [record.bytes, Buffer.from([0])]),
  );
  if (
    sharedRecords.length !== SHARED_R3_REPAIR_COUNT ||
    sha256Label(sharedBytes) !== SHARED_R3_REPAIR_DIGEST
  ) {
    throw new Error("Shared R3/repair tuple identity mismatch");
  }

  const trackedPackageDiff = gitText([
    "diff",
    "--name-only",
    G_I3.commit,
    "--",
    ...PACKAGE_PATHSPEC,
  ])
    .split("\n")
    .filter(Boolean)
    .sort();
  const unexpectedTrackedPackageDiff = trackedPackageDiff.filter(
    (relativePath) => !I3_PACKAGE_ADDITIONS.includes(relativePath),
  );
  if (unexpectedTrackedPackageDiff.length !== 0) {
    throw new Error(
      `Unexpected tracked package worktree drift: ${unexpectedTrackedPackageDiff.join(",")}`,
    );
  }

  const additions = I3_PACKAGE_ADDITIONS.map((relativePath) => {
    if (repairMap.has(relativePath)) {
      throw new Error(
        `I3 package addition already exists at repair: ${relativePath}`,
      );
    }
    const absolute = path.join(REPO_ROOT, relativePath);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(
        `I3 package addition is not a regular file: ${relativePath}`,
      );
    }
    const bytes = fs.readFileSync(absolute);
    const mode = (stat.mode & 0o111) === 0 ? "100644" : "100755";
    if (mode !== "100644") {
      throw new Error(
        `I3 package addition must use mode 100644: ${relativePath}`,
      );
    }
    const blob = gitBlobOid(bytes);
    return {
      path: relativePath,
      mode,
      type: "blob",
      blob,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      tupleBytes: Buffer.from(`${mode} blob ${blob}\t${relativePath}`, "utf8"),
    };
  });

  const candidateRecords = [
    ...governance.records.map((record) => ({
      path: record.path,
      bytes: record.bytes,
    })),
    ...additions.map((entry) => ({
      path: entry.path,
      bytes: entry.tupleBytes,
    })),
  ].sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.path, "utf8"),
      Buffer.from(right.path, "utf8"),
    ),
  );
  const candidateBytes = Buffer.concat(
    candidateRecords.flatMap((record) => [record.bytes, Buffer.from([0])]),
  );
  const candidateSnapshot = {
    count: candidateRecords.length,
    digest: sha256Label(candidateBytes),
    bytes: candidateBytes,
    records: candidateRecords,
  };
  if (candidateSnapshot.count !== EXPECTED_I3_PACKAGE_COUNT) {
    throw new Error(
      `I3 candidate package count mismatch: ${candidateSnapshot.count}`,
    );
  }
  assertExactArray(
    changedPaths(r3, candidateSnapshot),
    [...R3_TO_I3_CANDIDATE_DELTA],
    "R3 to I3 candidate package delta",
  );
  assertExactArray(
    changedPaths(repair, candidateSnapshot),
    [...I3_PACKAGE_ADDITIONS],
    "repair to I3 candidate package delta",
  );

  return {
    anchors: {
      governance: governanceAnchor,
      r3: r3Anchor,
      repair: repairAnchor,
      stabilization: stabilizationAnchor,
    },
    candidate: {
      finalCommitRecorded: false,
      finalTreeRecorded: false,
      packageAdditions: additions.map(
        ({ tupleBytes: _tupleBytes, ...entry }) => entry,
      ),
      packagePathCount: candidateSnapshot.count,
      packageTupleDigest: candidateSnapshot.digest,
      repairToCandidateDelta: [...I3_PACKAGE_ADDITIONS],
      r3ToCandidateDelta: [...R3_TO_I3_CANDIDATE_DELTA],
    },
    sharedR3Repair: {
      count: sharedRecords.length,
      digest: sha256Label(sharedBytes),
      serialization:
        "matching exact R3 git ls-tree records, each NUL-terminated, in original R3 order",
    },
  };
}

function verifyRetainedSubject(name, retained) {
  if (gitTree(retained.subjectCommit) !== retained.subjectTree) {
    throw new Error(`${name} subject tree mismatch`);
  }
  if (gitTree(retained.freezeCommit) !== retained.freezeTree) {
    throw new Error(`${name} freeze tree mismatch`);
  }
  if (gitParent(retained.freezeCommit) !== retained.subjectCommit) {
    throw new Error(`${name} freeze parent mismatch`);
  }
  const identity = gitFileIdentity(
    retained.freezeCommit,
    retained.freezePath,
    true,
  );
  const freezeBytes = gitObjectBytes(
    retained.freezeCommit,
    retained.freezePath,
  );
  const freeze = JSON.parse(freezeBytes.toString("utf8"));
  if (!freezeBytes.equals(canonicalBytes(freeze))) {
    throw new Error(`${name} freeze is not canonical JSON`);
  }
  if (
    freeze.frozenSubject?.commit !== retained.subjectCommit ||
    freeze.frozenSubject?.tree !== retained.subjectTree ||
    freeze.freezeRules?.mutableWorktreeBytesAreSemanticAuthority !== false ||
    freeze.freezeRules?.selfHashClaimed !== false ||
    freeze.verdict !== "pass"
  ) {
    throw new Error(`${name} freeze semantic mismatch`);
  }
  return {
    freeze: {
      commit: retained.freezeCommit,
      identity,
      parent: retained.subjectCommit,
      tree: retained.freezeTree,
    },
    subject: {
      commit: retained.subjectCommit,
      subject: gitSubject(retained.subjectCommit),
      tree: retained.subjectTree,
    },
  };
}

function normalizeText(text, replacements) {
  let normalized = text.replaceAll("\r\n", "\n");
  for (const [actual, token] of [...replacements].sort(
    ([left], [right]) => right.length - left.length,
  )) {
    normalized = normalized.replaceAll(actual, token);
  }
  return normalized;
}

function normalizeArg(arg, replacements) {
  return normalizeText(arg, replacements);
}

function runRecorded(command, args, options = {}) {
  const cwd = options.cwd ?? REPO_ROOT;
  const env = options.env ?? process.env;
  const replacements = options.replacements ?? [[REPO_ROOT, "<repo-root>"]];
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const normalizedStdout = normalizeText(stdout, replacements);
  const normalizedStderr = normalizeText(stderr, replacements);
  const record = {
    argv: [command, ...args].map((entry) => normalizeArg(entry, replacements)),
    cwd: normalizeArg(cwd, replacements),
    exitCode: result.status ?? -1,
    stderrDigest: sha256Label(Buffer.from(normalizedStderr, "utf8")),
    stdoutDigest: sha256Label(Buffer.from(normalizedStdout, "utf8")),
  };
  if (result.status !== 0) {
    const diagnostics = [stderr, stdout]
      .filter(Boolean)
      .join("\n")
      .slice(0, 8192);
    throw new Error(
      `Command failed (${record.exitCode}): ${record.argv.join(" ")}\n${diagnostics}`,
    );
  }
  return { record, stderr, stdout };
}

function runRaw(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? process.env,
    encoding: options.encoding === undefined ? "utf8" : options.encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function localPnpmReplacements(extra = []) {
  return [
    [LOCAL_PNPM_ENTRY, "<local-pnpm-entry>"],
    [LOCAL_PNPM_PACKAGE_ROOT, "<local-pnpm-package-root>"],
    [process.execPath, "<node>"],
    ...extra,
  ];
}

function runLocalPnpmRecorded(args, options = {}) {
  return runRecorded(process.execPath, [LOCAL_PNPM_ENTRY, ...args], {
    ...options,
    replacements: localPnpmReplacements(options.replacements ?? []),
  });
}

function runLocalPnpmRaw(args, options = {}) {
  return runRaw(process.execPath, [LOCAL_PNPM_ENTRY, ...args], options);
}

function localToolEnvironment() {
  return {
    ...process.env,
    COREPACK_ENABLE_NETWORK: "0",
    NO_UPDATE_NOTIFIER: "1",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_ignore_scripts: "true",
    npm_config_offline: "true",
    npm_config_trust_policy: "off",
  };
}

function authenticateLocalPnpm() {
  if (
    !fs.existsSync(LOCAL_PNPM_ENTRY) ||
    !fs.existsSync(LOCAL_PNPM_PACKAGE_JSON)
  ) {
    throw new Error("Authenticated local pnpm implementation is unavailable");
  }
  if (!isWithin(LOCAL_PNPM_PACKAGE_ROOT, LOCAL_PNPM_ENTRY)) {
    throw new Error("Local pnpm entry escaped its authenticated package root");
  }
  const packageJsonBytes = fs.readFileSync(LOCAL_PNPM_PACKAGE_JSON);
  const packageJson = JSON.parse(packageJsonBytes.toString("utf8"));
  if (packageJson.name !== "pnpm" || packageJson.version !== PNPM_VERSION) {
    throw new Error("Local pnpm package identity mismatch");
  }
  const entryBytes = fs.readFileSync(LOCAL_PNPM_ENTRY);
  return {
    strategy: "direct-node-entry-from-existing-local-corepack-cache",
    corepackInvoked: false,
    version: PNPM_VERSION,
    packageRoot: `<local-corepack-cache>/pnpm/${PNPM_VERSION}`,
    packageJson: {
      byteLength: packageJsonBytes.length,
      sha256: sha256Label(packageJsonBytes),
    },
    entry: {
      path: `<local-corepack-cache>/pnpm/${PNPM_VERSION}/bin/pnpm.cjs`,
      byteLength: entryBytes.length,
      sha256: sha256Label(entryBytes),
    },
  };
}

function runHistoricalVerifications() {
  return Object.entries(RETAINED).map(([name, retained]) => {
    const absolute = path.join(REPO_ROOT, retained.auditScript);
    const result = runRecorded(process.execPath, [absolute, "--verify"], {
      replacements: [
        [REPO_ROOT, "<repo-root>"],
        [process.execPath, "<node>"],
      ],
    });
    return {
      ...result.record,
      historicalSubject: name.toUpperCase(),
      mode: "verify-only",
      writesAuthorized: false,
    };
  });
}

function commitIdentity(commit) {
  return {
    commit,
    subject: gitSubject(commit),
    tree: gitTree(commit),
  };
}

function buildInputAttestation(offlineStartupPreflight) {
  if (
    gitTree(A133_COMMIT) !== A133_TREE ||
    gitTree(B133_COMMIT) !== B133_TREE ||
    gitTree(O133_COMMIT) !== O133_TREE ||
    gitTree(CORRECTED_T4.commit) !== CORRECTED_T4.tree
  ) {
    throw new Error("Accepted semantic input tree mismatch");
  }
  if (gitText(["rev-parse", "HEAD"]).trim() !== G_I3.commit) {
    throw new Error(
      "I3 evidence must be prepared directly on authenticated G-I3",
    );
  }
  const candidateManifestBytes = gitObjectBytes(A133_COMMIT, A133_MANIFEST);
  if (sha256(candidateManifestBytes) !== CANDIDATE_MANIFEST_SHA256) {
    throw new Error("A133 candidate manifest digest mismatch");
  }
  const candidateManifest = JSON.parse(candidateManifestBytes.toString("utf8"));
  const semanticMembers = candidateManifest.members.map((member) => {
    const relativePath = `${A133_ROOT}/${member.filename}`;
    const identity = gitFileIdentity(A133_COMMIT, relativePath, true);
    if (
      identity.byteLength !== member.byteLength ||
      identity.sha256 !== member.sha256
    ) {
      throw new Error(`A133 semantic member mismatch: ${member.filename}`);
    }
    return identity;
  });
  const packageProof = buildPackageProof();
  const retainedSubjects = {
    i1s1: verifyRetainedSubject("I1/S1", RETAINED.i1),
    i2s2: verifyRetainedSubject("I2/S2", RETAINED.i2),
  };
  const historicalVerification = runHistoricalVerifications();
  const attempts = ATTEMPT_COMMITS.map((attempt) => ({
    ...attempt,
    subject: gitSubject(attempt.commit),
    tree: gitTree(attempt.commit),
  }));
  return {
    schemaVersion: 1,
    recordKind: "i3-integration-input-attestation",
    stage: "I3",
    commitBoundary: "candidate-pre-commit",
    executionId: EXECUTION_ID,
    priorAttemptsExist: true,
    priorExecutionIncident: { ...PRIOR_EXECUTION_INCIDENT },
    priorExecutionHistory: PRIOR_EXECUTION_HISTORY.map((entry) => ({
      ...entry,
    })),
    offlineStartupPreflight,
    acceptedContract: {
      completeOutputSetSha256: COMPLETE_OUTPUT_SET,
      contractVersion: CONTRACT_VERSION,
      semanticDigest: CONTRACT_DIGEST,
    },
    immutableObjectFacts: {
      attempts,
      correctedT4: {
        ...CORRECTED_T4,
        subject: gitSubject(CORRECTED_T4.commit),
      },
      retainedSubjects,
      semanticAuthority: {
        a133: { commit: A133_COMMIT, tree: A133_TREE },
        b133: {
          commit: B133_COMMIT,
          findings: 0,
          humanEquivalent: false,
          humanReviewed: false,
          tree: B133_TREE,
          verdict: "pass",
        },
        candidateManifestSha256: CANDIDATE_MANIFEST_SHA256,
        memberAggregateSha256: MEMBER_AGGREGATE,
        members: semanticMembers,
        o133: {
          authority: "semantic-use-only",
          commit: O133_COMMIT,
          decision: "accept-with-rationale",
          tree: O133_TREE,
        },
      },
    },
    currentExecutionObservations: {
      currentHead: commitIdentity(G_I3.commit),
      finalI3CommitRecorded: false,
      finalI3TreeRecorded: false,
      historicalVerification,
      packageProof,
      packagePathspec: [...PACKAGE_PATHSPEC],
      plannedExactNineInventory: [...I3_INVENTORY],
      protectedIdentities: {
        files: Object.entries(PROTECTED_FILES).map(([entryPath, digest]) => ({
          path: entryPath,
          sha256: `sha256:${digest}`,
        })),
        gitlinks: Object.entries(PROTECTED_GITLINKS).map(
          ([entryPath, commit]) => ({ path: entryPath, commit }),
        ),
      },
    },
    procedureAuthority: {
      activationAuthorized: false,
      dormantVersion: "2.0.7",
      familyCount: 17,
      liveSelectionChangeAuthorized: false,
      liveVersion: "1.0.0",
      packageSetDigest: PACKAGE_SET_DIGEST,
    },
    authority: {
      activationAuthorized: false,
      archiveAuthorized: false,
      assuranceRunAuthorized: false,
      completeSystemAcceptanceAuthorized: false,
      evidenceTransmissionAuthorized: false,
      journalAuthorized: false,
      liveSelectionChangeAuthorized: false,
      m0A4PreparationAuthorized: false,
      networkAuthorized: false,
      providerExecutionAuthorized: false,
      publicationAuthorized: false,
      pushAuthorized: false,
      releaseAuthorized: false,
      remoteReadAuthorized: false,
      runtimeActivationAuthorized: false,
      t6ClosureAuthorized: false,
      technicalOperatorDecisionAuthorized: false,
      workerAuthorityChangeAuthorized: false,
    },
    mutableWorktreeSemanticAuthority: false,
    networkUsed: false,
    providerUsed: false,
    verdict: "pass",
  };
}

function worktreeStatusPaths() {
  const fields = gitText([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]).split("\0");
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const row = fields[index];
    if (row === "") continue;
    if (row.length < 4 || row[2] !== " ") {
      throw new Error("Malformed Git porcelain status row");
    }
    const status = row.slice(0, 2);
    paths.push(row.slice(3));
    if (status.includes("R") || status.includes("C")) {
      const pairedPath = fields[index + 1];
      if (!pairedPath) throw new Error("Malformed Git rename/copy status row");
      paths.push(pairedPath);
      index += 1;
    }
  }
  return [...new Set(paths)].sort();
}

function stagedPaths() {
  return gitText(["diff", "--cached", "--name-only", "-z"])
    .split("\0")
    .filter(Boolean)
    .sort();
}

function indexGitlink(relativePath) {
  const line = gitText(["ls-files", "--stage", "--", relativePath]).trim();
  const match = /^160000 ([0-9a-f]{40}) 0\t/.exec(line);
  if (!match) throw new Error(`Missing indexed gitlink: ${relativePath}`);
  return match[1];
}

function buildProtectedAudit() {
  const allowedDirty = new Set([
    ...I3_INVENTORY,
    ...Object.keys(PROTECTED_FILES),
  ]);
  const dirty = worktreeStatusPaths();
  const staged = stagedPaths();
  const unexpectedDirtyPaths = dirty.filter(
    (entry) => !allowedDirty.has(entry),
  );
  const unexpectedStagedPaths = staged.filter(
    (entry) => !I3_INVENTORY.includes(entry),
  );
  if (unexpectedDirtyPaths.length > 0 || unexpectedStagedPaths.length > 0) {
    throw new Error(
      `I3 worktree scope mismatch: unexpectedDirty=${unexpectedDirtyPaths.join(",")} unexpectedStaged=${unexpectedStagedPaths.join(",")}`,
    );
  }
  const protectedPathSet = new Set([
    ...Object.keys(PROTECTED_FILES),
    ...Object.keys(PROTECTED_GITLINKS),
  ]);
  const protectedStagedPaths = staged.filter((entry) =>
    protectedPathSet.has(entry),
  );
  if (protectedStagedPaths.length > 0) {
    throw new Error(
      `Protected path is staged: ${protectedStagedPaths.join(",")}`,
    );
  }

  const files = Object.entries(PROTECTED_FILES).map(
    ([relativePath, expectedSha256]) => {
      const absolute = path.join(REPO_ROOT, relativePath);
      const stat = fs.lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error(`Protected file is not regular: ${relativePath}`);
      }
      const observedSha256 = sha256(fs.readFileSync(absolute));
      if (observedSha256 !== expectedSha256) {
        throw new Error(`Protected file digest mismatch: ${relativePath}`);
      }
      return {
        path: relativePath,
        expectedSha256: `sha256:${expectedSha256}`,
        observedSha256: `sha256:${observedSha256}`,
        staged: false,
        matches: true,
      };
    },
  );
  const gitlinks = Object.entries(PROTECTED_GITLINKS).map(
    ([relativePath, expectedCommit]) => {
      const observedCommit = indexGitlink(relativePath);
      if (observedCommit !== expectedCommit) {
        throw new Error(`Protected gitlink mismatch: ${relativePath}`);
      }
      return {
        path: relativePath,
        expectedCommit,
        indexCommit: observedCommit,
        staged: false,
        submoduleWorktreeInspectedForAuthority: false,
        submoduleWorktreeMutationUsedAsAuthority: false,
        matches: true,
      };
    },
  );
  const prospective = new Set([
    ...Object.values(OUTPUTS).map((entry) => path.relative(REPO_ROOT, entry)),
    path.relative(REPO_ROOT, LEDGER_PATH),
  ]);
  const missingCandidatePaths = I3_INVENTORY.filter(
    (entry) =>
      !fs.existsSync(path.join(REPO_ROOT, entry)) && !prospective.has(entry),
  );
  if (missingCandidatePaths.length > 0) {
    throw new Error(
      `I3 candidate path missing: ${missingCandidatePaths.join(",")}`,
    );
  }
  return {
    schemaVersion: 1,
    recordKind: "i3-protected-path-audit",
    stage: "I3",
    commitBoundary: "candidate-pre-commit",
    executionId: EXECUTION_ID,
    governanceAnchor: {
      commit: G_I3.commit,
      tree: G_I3.tree,
    },
    candidateScope: {
      allowedInventory: [...I3_INVENTORY],
      allCandidatePathsPresentOrProspective: true,
      indexContainsOnlyCandidatePaths: true,
      missingCandidatePaths,
      protectedPathsStaged: false,
      unexpectedDirtyPaths,
      unexpectedStagedPaths,
    },
    files,
    gitlinks,
    immutableHistoricalEvidenceMutationPerformed: false,
    submoduleWorktreeMutationUsedAsEvidenceAuthority: false,
    verdict: "pass",
  };
}

function isWithin(parent, child) {
  const parentReal = fs.realpathSync(parent);
  const childReal = fs.realpathSync(child);
  const relative = path.relative(parentReal, childReal);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function createExclusiveTempRoot(name) {
  const root = path.join(os.tmpdir(), name);
  if (fs.existsSync(root)) {
    throw new Error(`Temporary audit root already exists: ${root}`);
  }
  fs.mkdirSync(root, { recursive: false, mode: 0o700 });
  if (isWithin(REPO_ROOT, root)) {
    throw new Error(`Temporary audit root is inside repository: ${root}`);
  }
  return root;
}

function cleanupRoot(root) {
  const cleanup = {
    attempted: true,
    rootAbsentAfterCleanup: false,
    succeeded: false,
  };
  fs.rmSync(root, { recursive: true, force: true });
  cleanup.rootAbsentAfterCleanup = !fs.existsSync(root);
  cleanup.succeeded = cleanup.rootAbsentAfterCleanup;
  if (!cleanup.succeeded)
    throw new Error(`Temporary audit cleanup failed: ${root}`);
  return cleanup;
}

function copyTreeCow(source, destination) {
  const sourceStat = fs.lstatSync(source);
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
    throw new Error(`Cache seed source is not a regular directory: ${source}`);
  }
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyTreeCow(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(
        sourcePath,
        destinationPath,
        fs.constants.COPYFILE_FICLONE,
      );
    } else {
      throw new Error(`Unsupported cache seed entry: ${sourcePath}`);
    }
  }
}

function findOneTarball(directory) {
  const names = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".tgz"));
  if (names.length !== 1) {
    throw new Error(
      `Expected one tarball in ${directory}, found ${names.length}`,
    );
  }
  return path.join(directory, names[0]);
}

function tarBytes(tarball, entry) {
  return runRaw("tar", ["-xOf", tarball, entry], { encoding: null });
}

function tarPackageJson(tarball) {
  return JSON.parse(tarBytes(tarball, "package/package.json").toString("utf8"));
}

function walkRegularFiles(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        const stat = fs.lstatSync(absolute);
        const bytes = fs.readFileSync(absolute);
        files.push({
          path: path.relative(root, absolute).split(path.sep).join("/"),
          mode: `0${(stat.mode & 0o777).toString(8).padStart(3, "0")}`,
          byteLength: bytes.length,
          sha256: sha256Label(bytes),
        });
      } else {
        throw new Error(
          `Packed extraction contains non-regular entry: ${absolute}`,
        );
      }
    }
  }
  walk(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function extractFileEntries(tarball, extractRoot) {
  fs.mkdirSync(extractRoot, { recursive: false });
  runRaw("tar", ["-xzf", tarball, "-C", extractRoot]);
  const packageRoot = path.join(extractRoot, "package");
  if (!fs.statSync(packageRoot).isDirectory()) {
    throw new Error("Packed tarball lacks package directory");
  }
  return walkRegularFiles(extractRoot);
}

function packedRecord({
  tarball,
  tarballPath,
  entries,
  fileEntries,
  packageJson,
  audit,
}) {
  const bytes = fs.readFileSync(tarball);
  const packageBytes = tarBytes(tarball, "package/package.json");
  const packageJsonEntry = fileEntries.find(
    (entry) => entry.path === "package/package.json",
  );
  if (
    packageJsonEntry === undefined ||
    packageJsonEntry.byteLength !== packageBytes.length ||
    packageJsonEntry.sha256 !== sha256Label(packageBytes)
  ) {
    throw new Error("Packed package.json file-entry identity mismatch");
  }
  return {
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    sourceCommit: G_I3.commit,
    sourceBoundary:
      "authenticated G-I3 source plus exact I3 candidate additions",
    tarballPath,
    byteLength: bytes.length,
    sha256: sha256Label(bytes),
    packageJsonIdentity: {
      byteLength: packageBytes.length,
      sha256: sha256Label(packageBytes),
    },
    normalizedEntryCount: entries.length,
    fileEntries,
    audit,
  };
}

function auditTarballs(coreTarball, cliTarball, packRoot) {
  const candidateManifest = JSON.parse(
    gitObjectBytes(A133_COMMIT, A133_MANIFEST).toString("utf8"),
  );
  const t3Inventory = JSON.parse(
    gitObjectBytes(T3_COMMIT, T3_INVENTORY_PATH).toString("utf8"),
  );

  const coreListing = runRaw("tar", ["-tzf", coreTarball]);
  const coreEntries = parseCoreTarListing(coreListing);
  validateTarEntryTypes(
    runRaw("tar", ["-tvzf", coreTarball]),
    coreEntries.length,
  );
  auditPackedCoreEntrySafety(coreEntries);
  const corePackage = tarPackageJson(coreTarball);
  const sourceCorePackage = readJson(path.join(CORE_DIR, "package.json"));
  validatePackedCorePackage(corePackage, sourceCorePackage.version);
  const coreAudit = auditPackedCoreEntries(
    coreEntries,
    buildPackedCoreInventory(corePackage),
  );
  const coreFiles = extractFileEntries(
    coreTarball,
    path.join(packRoot, "extract-core"),
  );

  const cliListing = runRaw("tar", ["-tzf", cliTarball]);
  const cliEntries = parseCliTarListing(cliListing);
  validateTarEntryTypes(
    runRaw("tar", ["-tvzf", cliTarball]),
    cliEntries.length,
  );
  if (new Set(cliEntries).size !== cliEntries.length) {
    throw new Error("Packed CLI contains duplicate normalized entries");
  }
  const migrationManifestNames = cliEntries
    .filter((entry) => entry.startsWith("package/dist/migrations/manifests/"))
    .map((entry) => path.posix.basename(entry));
  const cliAudit = auditPackedEntries(
    cliEntries,
    buildPackedCliInventory(migrationManifestNames),
  );
  const activeContents = new Map(
    Object.values(PACKED_ACTIVE_RESEARCH_ENTRIES).map((entry) => [
      entry,
      tarBytes(cliTarball, entry).toString("utf8"),
    ]),
  );
  auditPackedActiveContent(activeContents);
  const cliPackage = tarPackageJson(cliTarball);
  const sourceCliPackage = readJson(path.join(CLI_DIR, "package.json"));
  if (
    cliPackage.name !== sourceCliPackage.name ||
    cliPackage.version !== sourceCliPackage.version
  ) {
    throw new Error("Packed CLI identity differs from source package identity");
  }
  if (
    cliPackage.dependencies?.["@mindfoldhq/trellis-core"] !==
    corePackage.version
  ) {
    throw new Error(
      "Packed CLI Core dependency is not the exact package version",
    );
  }
  if (
    JSON.stringify(cliPackage.bin) !==
    JSON.stringify({ trellis: "./bin/trellis.js", tl: "./bin/trellis.js" })
  ) {
    throw new Error("Packed CLI bin contract drifted");
  }

  const expected207 = new Map(
    t3Inventory.files.map((record) => [
      `package/${record.path.replace("packages/cli/src/", "dist/")}`,
      record,
    ]),
  );
  const actual207 = cliEntries.filter((entry) =>
    /^package\/dist\/templates\/research\/procedures\/[^/]+\/2\.0\.7\//.test(
      entry,
    ),
  );
  if (
    actual207.length !== expected207.size ||
    actual207.some((entry) => !expected207.has(entry))
  ) {
    throw new Error(
      "Packed CLI Procedure 2.0.7 inventory is not the exact T3 set",
    );
  }
  const packageDigest = createHash("sha256").update(PACKAGE_DIGEST_DOMAIN);
  for (const [entry, expected] of [...expected207].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    const bytes = tarBytes(cliTarball, entry);
    if (
      bytes.length !== expected.byteLength ||
      sha256(bytes) !== expected.sha256
    ) {
      throw new Error(`Packed Procedure bytes drifted: ${entry}`);
    }
    packageDigest.update(expected.path, "utf8");
    packageDigest.update(Buffer.from([0]));
    packageDigest.update(bytes);
    packageDigest.update(Buffer.from([0]));
  }
  const observedPackageSetDigest = `sha256:${packageDigest.digest("hex")}`;
  if (observedPackageSetDigest !== PACKAGE_SET_DIGEST) {
    throw new Error(
      `Packed Procedure 2.0.7 package-set digest mismatch: ${observedPackageSetDigest}`,
    );
  }
  for (const member of candidateManifest.members) {
    const entry = `package/dist/templates/research/evaluation-contracts/1.3.1/${member.filename}`;
    const bytes = tarBytes(cliTarball, entry);
    if (bytes.length !== member.byteLength || sha256(bytes) !== member.sha256) {
      throw new Error(`Packed v1.3.1 member drifted: ${member.filename}`);
    }
  }
  const cliFiles = extractFileEntries(
    cliTarball,
    path.join(packRoot, "extract-cli"),
  );

  return {
    core: packedRecord({
      tarball: coreTarball,
      tarballPath: `<pack-root>/core/${path.basename(coreTarball)}`,
      entries: coreEntries,
      fileEntries: coreFiles,
      packageJson: corePackage,
      audit: {
        ...coreAudit,
        deepImportsExported: false,
        duplicates: "absent",
        entryTypes: "regular-files-and-directories-only",
        exportKeys: Object.keys(corePackage.exports),
        pathSafety: "pass",
        sourceTestConfigLeakage: "absent",
      },
    }),
    cli: {
      ...packedRecord({
        tarball: cliTarball,
        tarballPath: `<pack-root>/cli/${path.basename(cliTarball)}`,
        entries: cliEntries,
        fileEntries: cliFiles,
        packageJson: cliPackage,
        audit: {
          ...cliAudit,
          acceptedV131MemberCount: candidateManifest.memberCount,
          dormantProcedureVersion: "2.0.7",
          duplicates: "absent",
          entryTypes: "regular-files-and-directories-only",
          forbiddenEntries: "absent",
          liveProcedureSelection: "1.0.0",
          pathSafety: "pass",
          procedure207FamilyCount: t3Inventory.familyCount,
          procedure207FileCount: actual207.length,
          procedure207PackageSetDigest: observedPackageSetDigest,
        },
      }),
      bins: cliPackage.bin,
      exactCoreDependency: cliPackage.dependencies["@mindfoldhq/trellis-core"],
    },
  };
}

function consumerFixture() {
  return `import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as root from "@mindfoldhq/trellis-core";
import * as channel from "@mindfoldhq/trellis-core/channel";
import * as mem from "@mindfoldhq/trellis-core/mem";
import * as research from "@mindfoldhq/trellis-core/research";
import * as task from "@mindfoldhq/trellis-core/task";
import * as testing from "@mindfoldhq/trellis-core/testing";
const require = createRequire(import.meta.url);
const corePackagePath = require.resolve("@mindfoldhq/trellis-core/package.json");
const cliPackagePath = require.resolve("@mindfoldhq/trellis/package.json");
const corePackage = JSON.parse(fs.readFileSync(corePackagePath, "utf8"));
const cliPackage = JSON.parse(fs.readFileSync(cliPackagePath, "utf8"));
const cliRoot = path.dirname(cliPackagePath);
const validation = await import(pathToFileURL(path.join(cliRoot, "dist/commands/research/dispatch-methodology-validation.js")));
const resolution = await import(pathToFileURL(path.join(cliRoot, "dist/commands/research/procedure-resolution.js")));
const pack = validation.loadAcceptedV131ContractPackFromLeaves();
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "project");
fs.mkdirSync(projectRoot, { recursive: true });
const live = await resolution.resolveResearchProcedure({ root: projectRoot, capabilityId: "research.ideation.generate" });
const dormant = await resolution.resolveResearchProcedure({ root: projectRoot, capabilityId: "research.ideation.generate", mode: "activation-recorded", procedureId: "idea-generation-v1", procedureVersion: "2.0.7" });
let deepImportBlocked = false;
try { await import("@mindfoldhq/trellis-core/dist/research/index.js"); } catch (error) { deepImportBlocked = error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"; }
const functions = [root.parseChannelType, channel.parseChannelType, mem.searchMemSessions, research.readResearchState, task.emptyTaskRecord];
if (functions.some((value) => typeof value !== "function")) throw new Error("Core public export missing");
if (Object.keys(testing).length !== 0) throw new Error("Testing namespace is not empty");
if (!deepImportBlocked) throw new Error("Core deep import unexpectedly resolved");
process.stdout.write(JSON.stringify({
  corePackagePath: fs.realpathSync(path.dirname(corePackagePath)),
  cliPackagePath: fs.realpathSync(cliRoot),
  coreVersion: corePackage.version,
  cliVersion: cliPackage.version,
  cliCoreDependency: cliPackage.dependencies["@mindfoldhq/trellis-core"],
  corePublicImports: true,
  testingNamespaceEmpty: true,
  deepImportBlocked,
  contractVersion: pack.contractVersion,
  contractDigest: pack.acceptedContractDigest,
  memberAggregate: pack.derivedMemberAggregateSha256,
  mappingRowCount: pack.mappingRows.length,
  live: { source: live.source, version: live.manifest.version },
  dormant: { source: dormant.source, version: dormant.manifest.version, schema: dormant.packageSchemaVersion, contractVersion: dormant.supportPack?.manifest.methodologyContractVersion, contractDigest: dormant.supportPack?.manifest.methodologyContractDigest }
}));
`;
}

function containedEnvironment(root, manager) {
  const paths = {
    cache: path.join(root, "cache"),
    config: path.join(root, "config"),
    corepack: path.join(root, "corepack"),
    data: path.join(root, "data"),
    home: path.join(root, "home"),
    pnpmHome: path.join(root, "pnpm-home"),
    store: path.join(root, "store"),
    temp: path.join(root, "tmp"),
  };
  for (const entry of Object.values(paths)) {
    fs.mkdirSync(entry, { recursive: true });
    if (!isWithin(root, entry)) {
      throw new Error(`${manager} environment path escaped isolated root`);
    }
  }
  const inherited = {};
  for (const key of [
    "PATH",
    "SHELL",
    "USER",
    "LOGNAME",
    "LANG",
    "LC_ALL",
    "SystemRoot",
    "ComSpec",
    "PATHEXT",
  ]) {
    if (process.env[key] !== undefined) inherited[key] = process.env[key];
  }
  const env = {
    ...inherited,
    COREPACK_ENABLE_NETWORK: "0",
    COREPACK_HOME: paths.corepack,
    HOME: paths.home,
    TMP: paths.temp,
    TEMP: paths.temp,
    TMPDIR: paths.temp,
    XDG_CACHE_HOME: paths.cache,
    XDG_CONFIG_HOME: paths.config,
    XDG_DATA_HOME: paths.data,
    PNPM_HOME: paths.pnpmHome,
    npm_config_audit: "false",
    npm_config_cache: path.join(paths.cache, "npm"),
    npm_config_fund: "false",
    npm_config_ignore_scripts: "true",
    npm_config_offline: "true",
    npm_config_store_dir: paths.store,
    npm_config_trust_policy: "off",
    TRELLIS_QUIET: "1",
    NO_UPDATE_NOTIFIER: "1",
  };
  return { env, paths };
}

function environmentEvidence(manager) {
  return {
    COREPACK_ENABLE_NETWORK: "0",
    COREPACK_HOME: `<${manager}-root>/corepack`,
    HOME: `<${manager}-root>/home`,
    TMPDIR: `<${manager}-root>/tmp`,
    XDG_CACHE_HOME: `<${manager}-root>/cache`,
    XDG_CONFIG_HOME: `<${manager}-root>/config`,
    XDG_DATA_HOME: `<${manager}-root>/data`,
    PNPM_HOME: `<${manager}-root>/pnpm-home`,
    npm_config_cache: `<${manager}-root>/cache/npm`,
    npm_config_ignore_scripts: "true",
    npm_config_offline: "true",
    npm_config_store_dir: `<${manager}-root>/store`,
    npm_config_trust_policy: "off",
    store: `<${manager}-root>/store`,
  };
}

function runOfflineStartupPreflight() {
  const localPnpm = authenticateLocalPnpm();
  if (!fs.statSync(LOCAL_PNPM_METADATA_ROOT).isDirectory()) {
    throw new Error("Local pnpm package metadata mirror is not a directory");
  }
  const root = createExclusiveTempRoot(TEMP_ROOT_NAMES.preflight);
  let result;
  let operationError;
  try {
    const npmRoot = path.join(root, "npm");
    const pnpmRoot = path.join(root, "pnpm");
    fs.mkdirSync(npmRoot);
    fs.mkdirSync(pnpmRoot);
    const npmRuntime = containedEnvironment(npmRoot, "npm-preflight");
    const pnpmRuntime = containedEnvironment(pnpmRoot, "pnpm-preflight");
    const replacements = [
      [root, "<preflight-root>"],
      [process.execPath, "<node>"],
    ];
    const npmVersion = runRecorded("npm", ["--version"], {
      cwd: npmRoot,
      env: npmRuntime.env,
      replacements,
    });
    const pnpmVersion = runLocalPnpmRecorded(["--version"], {
      cwd: pnpmRoot,
      env: pnpmRuntime.env,
      replacements,
    });
    if (!/^\d+\.\d+\.\d+/.test(npmVersion.stdout.trim())) {
      throw new Error("Restricted npm preflight returned an invalid version");
    }
    if (pnpmVersion.stdout.trim() !== PNPM_VERSION) {
      throw new Error("Restricted local pnpm preflight version mismatch");
    }
    result = {
      executionId: EXECUTION_ID,
      completedBeforeBuildAndPack: true,
      networkCapabilityEnabled: false,
      corepackInvoked: false,
      localPnpm,
      localPnpmMetadataMirror: {
        availableBeforeBuildAndPack: true,
        formatVersion: "v1.3",
        sourceKind: "existing-local-pnpm-package-metadata-mirror",
      },
      commands: [
        { id: "restricted-npm-version", ...npmVersion.record },
        { id: "restricted-local-pnpm-version", ...pnpmVersion.record },
      ],
      environments: {
        npm: environmentEvidence("preflight-npm"),
        pnpm: environmentEvidence("preflight-pnpm"),
      },
      observedVersions: {
        npm: npmVersion.stdout.trim(),
        pnpm: pnpmVersion.stdout.trim(),
      },
      tempRoot: `<os-temp>/${TEMP_ROOT_NAMES.preflight}`,
      tempRootName: TEMP_ROOT_NAMES.preflight,
      verdict: "pass",
    };
  } catch (error) {
    operationError = error;
  }
  const cleanup = cleanupRoot(root);
  if (operationError !== undefined) throw operationError;
  return { ...result, cleanup };
}

function binPath(consumerDir, name) {
  const base = path.join(consumerDir, "node_modules", ".bin", name);
  if (process.platform === "win32" && fs.existsSync(`${base}.cmd`)) {
    return `${base}.cmd`;
  }
  return base;
}

function yamlBlockByPrefix(text, prefix) {
  const marker = `\n  '${prefix}`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Missing lockfile block ${prefix}`);
  const bodyStart = start + 1;
  const remainder = text.slice(bodyStart);
  const next = remainder.slice(1).search(/\n  \S/);
  return next < 0
    ? remainder.trimEnd()
    : remainder.slice(0, next + 1).trimEnd();
}

function importerVersion(importer, packageName) {
  const quoted = `      '${packageName}':`;
  const plain = `      ${packageName}:`;
  const start = Math.max(importer.indexOf(quoted), importer.indexOf(plain));
  if (start < 0)
    throw new Error(`Missing root importer dependency ${packageName}`);
  const remainder = importer.slice(start);
  const next = remainder.slice(1).search(/\n      \S/);
  const block = next < 0 ? remainder : remainder.slice(0, next + 1);
  const match = /\n        version: ([^\n]+)/.exec(block);
  if (!match) throw new Error(`Missing root importer version ${packageName}`);
  return match[1];
}

function buildExternalPnpmLock(importedLock, localCoreSpecifier) {
  const rootLock = fs.readFileSync(
    path.join(REPO_ROOT, "pnpm-lock.yaml"),
    "utf8",
  );
  const packagesStart = rootLock.indexOf("packages:\n");
  const snapshotsStart = rootLock.indexOf("\nsnapshots:\n");
  if (packagesStart < 0 || snapshotsStart < 0) {
    throw new Error("Root pnpm lockfile shape drifted");
  }
  const rootPackages = rootLock
    .slice(packagesStart + "packages:\n".length, snapshotsStart)
    .replace(/^\n+/, "")
    .trimEnd();
  const rootSnapshots = rootLock
    .slice(snapshotsStart + "\nsnapshots:\n".length)
    .replace(/^\n+/, "")
    .trimEnd();
  const importedImporter = importedLock
    .slice(
      importedLock.indexOf("importers:\n") + "importers:\n".length,
      importedLock.indexOf("\npackages:\n"),
    )
    .replace(/^\n+/, "")
    .trimEnd();
  const rootCliImporter = rootLock.slice(
    rootLock.indexOf("  packages/cli:"),
    rootLock.indexOf("\n  packages/core:"),
  );
  const localCorePackage = yamlBlockByPrefix(
    importedLock,
    "@mindfoldhq/trellis-core@file:",
  );
  const localCliPackage = yamlBlockByPrefix(
    importedLock,
    "@mindfoldhq/trellis@file:",
  );
  const importedSnapshots = importedLock.slice(
    importedLock.indexOf("\nsnapshots:\n"),
  );
  const localCoreSnapshot = yamlBlockByPrefix(
    importedSnapshots,
    "@mindfoldhq/trellis-core@file:",
  );
  let localCliSnapshot = yamlBlockByPrefix(
    importedSnapshots,
    "@mindfoldhq/trellis@file:",
  );
  const dependencyVersions = {
    "@mindfoldhq/trellis-core": localCoreSpecifier,
    chalk: importerVersion(rootCliImporter, "chalk"),
    commander: importerVersion(rootCliImporter, "commander"),
    figlet: importerVersion(rootCliImporter, "figlet"),
    inquirer: importerVersion(rootCliImporter, "inquirer"),
    undici: importerVersion(rootCliImporter, "undici"),
    zod: importerVersion(rootCliImporter, "zod"),
  };
  for (const [name, version] of Object.entries(dependencyVersions)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(      ['\"]?${escaped}['\"]?:) [^\\n]+`);
    if (!pattern.test(localCliSnapshot)) {
      throw new Error(`Missing imported CLI snapshot dependency ${name}`);
    }
    localCliSnapshot = localCliSnapshot.replace(pattern, `$1 ${version}`);
  }
  const header = rootLock.slice(0, rootLock.indexOf("importers:\n"));
  return `${header}importers:\n\n${importedImporter}\n\npackages:\n\n${localCorePackage}\n\n${localCliPackage}\n\n${rootPackages}\n\nsnapshots:\n\n${localCoreSnapshot}\n\n${localCliSnapshot}\n\n${rootSnapshots}\n`;
}

function verifyRuntimeResult(manager, result, versions, consumerRoot) {
  if (
    !isWithin(consumerRoot, result.corePackagePath) ||
    !isWithin(consumerRoot, result.cliPackagePath)
  ) {
    throw new Error(`${manager} installed package escaped isolated root`);
  }
  if (
    isWithin(REPO_ROOT, result.corePackagePath) ||
    isWithin(REPO_ROOT, result.cliPackagePath)
  ) {
    throw new Error(`${manager} resolved installed package into repository`);
  }
  if (
    result.coreVersion !== versions.core ||
    result.cliVersion !== versions.cli ||
    result.cliCoreDependency !== versions.core ||
    result.cliCoreDependency.includes("workspace:")
  ) {
    throw new Error(`${manager} installed package version/dependency mismatch`);
  }
  if (
    result.contractVersion !== CONTRACT_VERSION ||
    result.contractDigest !== CONTRACT_DIGEST ||
    result.memberAggregate !== MEMBER_AGGREGATE ||
    result.mappingRowCount !== 17
  ) {
    throw new Error(
      `${manager} installed v1.3.1 contract authentication failed`,
    );
  }
  if (
    result.live.version !== "1.0.0" ||
    result.dormant.version !== "2.0.7" ||
    result.dormant.schema !== 2 ||
    result.dormant.contractVersion !== CONTRACT_VERSION ||
    result.dormant.contractDigest !== CONTRACT_DIGEST
  ) {
    throw new Error(`${manager} installed Procedure authority drifted`);
  }
  return {
    corePublicImports: result.corePublicImports,
    deepImportBlocked: result.deepImportBlocked,
    installedContract: {
      digest: result.contractDigest,
      mappingRowCount: result.mappingRowCount,
      memberAggregate: result.memberAggregate,
      version: result.contractVersion,
    },
    procedureAuthority: {
      dormantSchema: result.dormant.schema,
      dormantVersion: result.dormant.version,
      liveVersion: result.live.version,
      source: result.dormant.source,
    },
    testingNamespaceEmpty: result.testingNamespaceEmpty,
  };
}

function runInstalledBehavior({
  manager,
  root,
  consumerDir,
  env,
  replacements,
  commands,
  versions,
}) {
  const fixture = path.join(consumerDir, "runtime-check.mjs");
  fs.writeFileSync(fixture, consumerFixture());
  const runtime = runRecorded(process.execPath, [fixture], {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "installed-runtime", ...runtime.record });
  const result = JSON.parse(runtime.stdout);
  const verified = verifyRuntimeResult(manager, result, versions, root);
  const trellis = runRecorded(binPath(consumerDir, "trellis"), ["--help"], {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "trellis-alias-help", ...trellis.record });
  const tl = runRecorded(binPath(consumerDir, "tl"), ["--help"], {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "tl-alias-help", ...tl.record });
  if (!trellis.stdout.includes("trellis") || !tl.stdout.includes("trellis")) {
    throw new Error(`${manager} installed aliases did not execute`);
  }
  const forbiddenPaths = [
    path.join(consumerDir, ".git"),
    path.join(consumerDir, ".trellis", "tasks"),
    path.join(result.corePackagePath, ".trellis", "tasks"),
    path.join(result.cliPackagePath, ".trellis", "tasks"),
  ];
  if (forbiddenPaths.some((entry) => fs.existsSync(entry))) {
    throw new Error(`${manager} consumer contains forbidden repository state`);
  }
  return {
    ...verified,
    aliasesExecuted: ["trellis", "tl"],
    exactCoreDependency: result.cliCoreDependency,
    installedVersions: { cli: result.cliVersion, core: result.coreVersion },
    packageRealpathsContainedByTempRoot: true,
    packageRealpathsOutsideRepository: true,
    repositoryStateAbsent: true,
    sourceTreeSubstitutionUsed: false,
  };
}

function installNpmConsumer({
  root,
  coreTarball,
  cliTarball,
  packageInventory,
}) {
  const manager = "npm";
  const consumerDir = path.join(root, "consumer");
  fs.mkdirSync(consumerDir, { recursive: true });
  const { env, paths } = containedEnvironment(root, manager);
  const npmCacheSource = path.join(
    runRaw("npm", ["config", "get", "cache"]).trim(),
    "_cacache",
  );
  const isolatedCache = path.join(paths.cache, "npm", "_cacache");
  copyTreeCow(npmCacheSource, isolatedCache);
  const replacements = [
    [coreTarball, `<pack-root>/core/${path.basename(coreTarball)}`],
    [cliTarball, `<pack-root>/cli/${path.basename(cliTarball)}`],
    [root, "<npm-root>"],
    [path.dirname(path.dirname(coreTarball)), "<pack-root>"],
    [REPO_ROOT, "<repo-root>"],
    [process.execPath, "<node>"],
  ];
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    `${JSON.stringify(
      { name: "trellis-v131-i3-npm-consumer", private: true, type: "module" },
      null,
      2,
    )}\n`,
  );
  const commands = [];
  const versionResult = runRecorded("npm", ["--version"], {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "package-manager-version", ...versionResult.record });
  const installArgs = [
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--loglevel=error",
    "--cache",
    path.join(paths.cache, "npm"),
    coreTarball,
    cliTarball,
  ];
  const installResult = runRecorded("npm", installArgs, {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "offline-install", ...installResult.record });
  const versions = {
    cli: packageInventory.cli.packageVersion,
    core: packageInventory.core.packageVersion,
  };
  const behavior = runInstalledBehavior({
    manager,
    root,
    consumerDir,
    env,
    replacements,
    commands,
    versions,
  });
  const packageJsonBytes = fs.readFileSync(
    path.join(consumerDir, "package.json"),
  );
  const packageLockBytes = fs.readFileSync(
    path.join(consumerDir, "package-lock.json"),
  );
  return {
    evidence: {
      executionId: EXECUTION_ID,
      packageManager: manager,
      packageManagerVersion: versionResult.stdout.trim(),
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      tempRoot: `<os-temp>/${TEMP_ROOT_NAMES.npm}`,
      tempRootName: TEMP_ROOT_NAMES.npm,
      consumerPath: "<npm-root>/consumer",
      cachePath: "<npm-root>/cache/npm",
      storePath: "<npm-root>/store",
      environment: environmentEvidence(manager),
      installCommand: commands.find((entry) => entry.id === "offline-install")
        .argv,
      lifecycleScriptsDisabled: true,
      offlineEnforced: true,
      registryFallbackAllowed: false,
      localCacheSeed: {
        destinationContainedByTempRoot: true,
        sourceKind: "existing-local-npm-content-addressed-cache",
      },
      installedTarballs: [
        {
          expectedPath: packageInventory.core.tarballPath,
          expectedSha256: packageInventory.core.sha256,
          observedPackageVersion: behavior.installedVersions.core,
          packageName: packageInventory.core.packageName,
        },
        {
          expectedPath: packageInventory.cli.tarballPath,
          expectedSha256: packageInventory.cli.sha256,
          observedPackageVersion: behavior.installedVersions.cli,
          packageName: packageInventory.cli.packageName,
        },
      ],
      commands,
      installedBehavior: behavior,
      verdict: "pass",
    },
    packageJsonBytes,
    packageLockBytes,
  };
}

function installPnpmConsumer({
  root,
  coreTarball,
  cliTarball,
  packageInventory,
  npmPackageJsonBytes,
  npmPackageLockBytes,
}) {
  const manager = "pnpm";
  const consumerDir = path.join(root, "consumer");
  fs.mkdirSync(consumerDir, { recursive: true });
  const { env, paths } = containedEnvironment(root, manager);
  const pnpmStoreSource = runLocalPnpmRaw(["store", "path"], {
    env: localToolEnvironment(),
  }).trim();
  const isolatedStoreVersion = runLocalPnpmRaw(["store", "path"], {
    cwd: consumerDir,
    env,
  }).trim();
  fs.mkdirSync(isolatedStoreVersion, { recursive: true });
  if (!isWithin(root, isolatedStoreVersion)) {
    throw new Error("Resolved pnpm store path escaped isolated root");
  }
  for (const component of ["files", "index"]) {
    copyTreeCow(
      path.join(pnpmStoreSource, component),
      path.join(isolatedStoreVersion, component),
    );
  }
  copyTreeCow(
    LOCAL_PNPM_METADATA_ROOT,
    path.join(paths.cache, "pnpm", "metadata-v1.3"),
  );
  const replacements = [
    [coreTarball, `<pack-root>/core/${path.basename(coreTarball)}`],
    [cliTarball, `<pack-root>/cli/${path.basename(cliTarball)}`],
    [root, "<pnpm-root>"],
    [path.dirname(path.dirname(coreTarball)), "<pack-root>"],
    [REPO_ROOT, "<repo-root>"],
    [process.execPath, "<node>"],
  ];
  fs.writeFileSync(path.join(consumerDir, "package.json"), npmPackageJsonBytes);
  const pnpmPackage = readJson(path.join(consumerDir, "package.json"));
  pnpmPackage.name = "trellis-v131-i3-pnpm-consumer";
  const commands = [];
  const versionResult = runLocalPnpmRecorded(["--version"], {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "package-manager-version", ...versionResult.record });
  pnpmPackage.packageManager = `pnpm@${versionResult.stdout.trim()}`;
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    `${JSON.stringify(pnpmPackage, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(consumerDir, "package-lock.json"),
    npmPackageLockBytes,
  );
  const importResult = runLocalPnpmRecorded(
    ["import", "--reporter=append-only"],
    {
      cwd: consumerDir,
      env,
      replacements,
    },
  );
  commands.push({ id: "local-lock-import", ...importResult.record });
  const localCoreSpecifier = readJson(path.join(consumerDir, "package.json"))
    .dependencies["@mindfoldhq/trellis-core"];
  if (
    typeof localCoreSpecifier !== "string" ||
    !localCoreSpecifier.startsWith("file:")
  ) {
    throw new Error(
      "Imported pnpm lockfile lacks exact local Core tarball binding",
    );
  }
  const lockfilePath = path.join(consumerDir, "pnpm-lock.yaml");
  const importedLock = fs.readFileSync(lockfilePath, "utf8");
  fs.writeFileSync(
    lockfilePath,
    buildExternalPnpmLock(importedLock, localCoreSpecifier),
  );
  const installArgs = [
    "install",
    "--offline",
    "--ignore-scripts",
    "--frozen-lockfile",
    "--trust-policy=off",
    "--store-dir",
    paths.store,
    "--reporter=append-only",
  ];
  const installResult = runLocalPnpmRecorded(installArgs, {
    cwd: consumerDir,
    env,
    replacements,
  });
  commands.push({ id: "offline-install", ...installResult.record });
  const versions = {
    cli: packageInventory.cli.packageVersion,
    core: packageInventory.core.packageVersion,
  };
  const behavior = runInstalledBehavior({
    manager,
    root,
    consumerDir,
    env,
    replacements,
    commands,
    versions,
  });
  return {
    evidence: {
      executionId: EXECUTION_ID,
      packageManager: manager,
      packageManagerVersion: versionResult.stdout.trim(),
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      tempRoot: `<os-temp>/${TEMP_ROOT_NAMES.pnpm}`,
      tempRootName: TEMP_ROOT_NAMES.pnpm,
      consumerPath: "<pnpm-root>/consumer",
      cachePath: "<pnpm-root>/cache",
      storePath: "<pnpm-root>/store",
      environment: environmentEvidence(manager),
      installCommand: commands.find((entry) => entry.id === "offline-install")
        .argv,
      lifecycleScriptsDisabled: true,
      offlineEnforced: true,
      registryFallbackAllowed: false,
      localCacheSeed: {
        destinationContainedByTempRoot: true,
        metadataMirrorSeeded: true,
        sourceKind:
          "existing-local-pnpm-content-addressed-store-and-package-metadata-mirror",
      },
      localPnpm: authenticateLocalPnpm(),
      localNpmLockImported: true,
      localCoreTarballBindingPreserved: true,
      installedTarballs: [
        {
          expectedPath: packageInventory.core.tarballPath,
          expectedSha256: packageInventory.core.sha256,
          observedPackageVersion: behavior.installedVersions.core,
          packageName: packageInventory.core.packageName,
        },
        {
          expectedPath: packageInventory.cli.tarballPath,
          expectedSha256: packageInventory.cli.sha256,
          observedPackageVersion: behavior.installedVersions.cli,
          packageName: packageInventory.cli.packageName,
        },
      ],
      commands,
      installedBehavior: behavior,
      verdict: "pass",
    },
  };
}

function runConsumerWithCleanup(manager, operation) {
  const root = createExclusiveTempRoot(TEMP_ROOT_NAMES[manager]);
  let result;
  let operationError;
  try {
    result = operation(root);
  } catch (error) {
    operationError = error;
  }
  const cleanup = cleanupRoot(root);
  if (operationError !== undefined) throw operationError;
  return {
    ...result,
    evidence: {
      ...result.evidence,
      cleanup,
    },
  };
}

function buildAndAuditPackages() {
  const packRoot = createExclusiveTempRoot(TEMP_ROOT_NAMES.pack);
  let packageInventory;
  let npmResult;
  let pnpmResult;
  let operationError;
  const buildAndPackCommands = [];
  try {
    const replacements = [
      [packRoot, "<pack-root>"],
      [REPO_ROOT, "<repo-root>"],
    ];
    const toolEnv = localToolEnvironment();
    for (const [id, cwd] of [
      ["build-core", CORE_DIR],
      ["build-cli", CLI_DIR],
    ]) {
      const result = runLocalPnpmRecorded(["run", "build"], {
        cwd,
        env: toolEnv,
        replacements,
      });
      buildAndPackCommands.push({ id, ...result.record });
    }
    const corePackDir = path.join(packRoot, "core");
    const cliPackDir = path.join(packRoot, "cli");
    fs.mkdirSync(corePackDir, { recursive: true });
    fs.mkdirSync(cliPackDir, { recursive: true });
    const corePack = runLocalPnpmRecorded(
      ["pack", "--pack-destination", corePackDir],
      { cwd: CORE_DIR, env: toolEnv, replacements },
    );
    buildAndPackCommands.push({ id: "pack-core-once", ...corePack.record });
    const cliPack = runLocalPnpmRecorded(
      ["pack", "--pack-destination", cliPackDir],
      { cwd: CLI_DIR, env: toolEnv, replacements },
    );
    buildAndPackCommands.push({ id: "pack-cli-once", ...cliPack.record });
    const coreTarball = findOneTarball(corePackDir);
    const cliTarball = findOneTarball(cliPackDir);
    packageInventory = auditTarballs(coreTarball, cliTarball, packRoot);
    npmResult = runConsumerWithCleanup("npm", (root) =>
      installNpmConsumer({
        root,
        coreTarball,
        cliTarball,
        packageInventory,
      }),
    );
    pnpmResult = runConsumerWithCleanup("pnpm", (root) =>
      installPnpmConsumer({
        root,
        coreTarball,
        cliTarball,
        packageInventory,
        npmPackageJsonBytes: npmResult.packageJsonBytes,
        npmPackageLockBytes: npmResult.packageLockBytes,
      }),
    );
  } catch (error) {
    operationError = error;
  }
  const packCleanup = cleanupRoot(packRoot);
  if (operationError !== undefined) throw operationError;
  return {
    packageRecord: {
      schemaVersion: 1,
      recordKind: "i3-package-tarball-inventory",
      stage: "I3",
      commitBoundary: "candidate-pre-commit",
      executionId: EXECUTION_ID,
      offlineStartupPreflightPassedBeforeBuildAndPack: true,
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      localPnpm: authenticateLocalPnpm(),
      buildAndPackCommands,
      packages: [packageInventory.core, packageInventory.cli],
      packLifecycleScriptsDisabled: true,
      sameTarballPathsSuppliedToBothConsumers: true,
      sameTarballSha256SuppliedToBothConsumers: true,
      tarballsPackedOncePerPackage: true,
      temporaryPackRoot: `<os-temp>/${TEMP_ROOT_NAMES.pack}`,
      temporaryPackRootName: TEMP_ROOT_NAMES.pack,
      temporaryPackRootCleanup: packCleanup,
      tarballsRetainedAfterAudit: false,
      verdict: "pass",
    },
    installRecord: {
      schemaVersion: 1,
      recordKind: "i3-external-install-evidence",
      stage: "I3",
      commitBoundary: "candidate-pre-commit",
      executionId: EXECUTION_ID,
      priorAttemptsExist: true,
      priorExecutionHistory: PRIOR_EXECUTION_HISTORY.map((entry) => ({
        ...entry,
      })),
      freshExecutionNetworkUsed: false,
      corepackInvoked: false,
      corepackNetworkEnabled: false,
      consumers: [npmResult.evidence, pnpmResult.evidence],
      sameAuthenticatedTarballsUsedByBothConsumers: true,
      lifecycleScriptsDisabledForAllConsumers: true,
      networkPackageResolutionAllowed: false,
      providerExecutionPerformed: false,
      publicationPerformed: false,
      pushPerformed: false,
      releasePerformed: false,
      runtimeActivationPerformed: false,
      verdict: "pass",
    },
  };
}

function assertOutputOwnership() {
  const expectedNames = [
    "external-install-evidence.json",
    "integration-input-attestation.json",
    "package-tarball-inventory.json",
    "protected-path-audit.json",
  ];
  const actualNames = Object.values(OUTPUTS)
    .map((entry) => path.basename(entry))
    .sort();
  assertExactArray(actualNames, expectedNames, "I3 script-owned output set");
  if (Object.values(OUTPUTS).includes(LEDGER_PATH)) {
    throw new Error("The orchestration ledger is not a script-owned output");
  }
  if (
    path.basename(LEDGER_PATH) !== "integration-execution-evidence-ledger.json"
  ) {
    throw new Error("Unexpected orchestration ledger target");
  }
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function writeRecordsAtomically(records) {
  assertOutputOwnership();
  if (fs.existsSync(RESEARCH_ROOT)) {
    const stat = fs.lstatSync(RESEARCH_ROOT);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("I3 research output root is not a regular directory");
    }
  } else {
    fs.mkdirSync(RESEARCH_ROOT, { recursive: false, mode: 0o755 });
  }
  const staged = [];
  const published = [];
  try {
    for (const [key, record] of Object.entries(records)) {
      const target = OUTPUTS[key];
      if (target === undefined || target === LEDGER_PATH) {
        throw new Error(`Rejected non-owned output target: ${String(target)}`);
      }
      if (fs.existsSync(target)) {
        throw new Error(`Refusing to replace existing I3 evidence: ${target}`);
      }
      assertResolved(record, key);
      const bytes = canonicalBytes(record);
      const temporary = path.join(
        RESEARCH_ROOT,
        `.${path.basename(target)}.${process.pid}.tmp`,
      );
      const descriptor = fs.openSync(temporary, "wx", 0o644);
      try {
        fs.writeFileSync(descriptor, bytes);
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      staged.push({ bytes, target, temporary });
    }
    for (const entry of staged) {
      fs.linkSync(entry.temporary, entry.target);
      published.push(entry.target);
      fs.unlinkSync(entry.temporary);
    }
    fsyncDirectory(RESEARCH_ROOT);
    for (const entry of staged) {
      if (!fs.readFileSync(entry.target).equals(entry.bytes)) {
        throw new Error(
          `Published I3 evidence reread mismatch: ${entry.target}`,
        );
      }
      readCanonicalJson(entry.target);
    }
  } catch (error) {
    for (const entry of staged) {
      fs.rmSync(entry.temporary, { force: true });
    }
    for (const target of published) {
      fs.rmSync(target, { force: true });
    }
    throw error;
  }
}

function verifyTempRootsAbsent() {
  for (const name of Object.values(TEMP_ROOT_NAMES)) {
    if (fs.existsSync(path.join(os.tmpdir(), name))) {
      throw new Error(`Temporary I3 audit root remains: ${name}`);
    }
  }
}

function verifyStoredRecords() {
  assertOutputOwnership();
  verifyTempRootsAbsent();
  const loaded = Object.fromEntries(
    Object.entries(OUTPUTS).map(([key, target]) => {
      if (!fs.existsSync(target)) {
        throw new Error(
          `Missing I3 evidence: ${path.relative(REPO_ROOT, target)}`,
        );
      }
      return [key, readCanonicalJson(target)];
    }),
  );
  const storedPreflight = loaded.input.record.offlineStartupPreflight;
  const expectedLocalPnpm = authenticateLocalPnpm();
  if (
    loaded.input.record.executionId !== EXECUTION_ID ||
    loaded.input.record.priorAttemptsExist !== true ||
    !canonicalBytes(loaded.input.record.priorExecutionIncident).equals(
      canonicalBytes(PRIOR_EXECUTION_INCIDENT),
    ) ||
    !canonicalBytes(loaded.input.record.priorExecutionHistory).equals(
      canonicalBytes(PRIOR_EXECUTION_HISTORY),
    ) ||
    storedPreflight?.executionId !== EXECUTION_ID ||
    storedPreflight.completedBeforeBuildAndPack !== true ||
    storedPreflight.networkCapabilityEnabled !== false ||
    storedPreflight.corepackInvoked !== false ||
    storedPreflight.localPnpmMetadataMirror?.availableBeforeBuildAndPack !==
      true ||
    storedPreflight.localPnpmMetadataMirror?.formatVersion !== "v1.3" ||
    storedPreflight.cleanup?.attempted !== true ||
    storedPreflight.cleanup?.succeeded !== true ||
    storedPreflight.cleanup?.rootAbsentAfterCleanup !== true ||
    !canonicalBytes(storedPreflight.localPnpm).equals(
      canonicalBytes(expectedLocalPnpm),
    ) ||
    storedPreflight.verdict !== "pass"
  ) {
    throw new Error("I3 offline startup preflight evidence mismatch");
  }
  const expectedInput = buildInputAttestation(storedPreflight);
  if (!loaded.input.bytes.equals(canonicalBytes(expectedInput))) {
    throw new Error(
      "I3 input attestation drifted from current authenticated inputs",
    );
  }
  const expectedProtected = buildProtectedAudit();
  if (!loaded.protected.bytes.equals(canonicalBytes(expectedProtected))) {
    throw new Error(
      "I3 protected-path audit drifted from current protected state",
    );
  }
  const packageRecord = loaded.tarballs.record;
  const installRecord = loaded.install.record;
  if (
    packageRecord.recordKind !== "i3-package-tarball-inventory" ||
    packageRecord.executionId !== EXECUTION_ID ||
    packageRecord.offlineStartupPreflightPassedBeforeBuildAndPack !== true ||
    packageRecord.corepackInvoked !== false ||
    packageRecord.corepackNetworkEnabled !== false ||
    !canonicalBytes(packageRecord.localPnpm).equals(
      canonicalBytes(expectedLocalPnpm),
    ) ||
    packageRecord.packages?.length !== 2 ||
    packageRecord.tarballsPackedOncePerPackage !== true ||
    packageRecord.temporaryPackRootCleanup?.succeeded !== true ||
    packageRecord.temporaryPackRootCleanup?.rootAbsentAfterCleanup !== true ||
    packageRecord.verdict !== "pass"
  ) {
    throw new Error("I3 package inventory semantic mismatch");
  }
  const packageNames = packageRecord.packages.map((entry) => entry.packageName);
  assertExactArray(
    packageNames,
    ["@mindfoldhq/trellis-core", "@mindfoldhq/trellis"],
    "I3 package inventory order",
  );
  for (const packageEntry of packageRecord.packages) {
    if (
      packageEntry.sourceCommit !== G_I3.commit ||
      !Array.isArray(packageEntry.fileEntries) ||
      packageEntry.fileEntries.length === 0 ||
      !packageEntry.fileEntries.some(
        (entry) => entry.path === "package/package.json",
      )
    ) {
      throw new Error(
        `I3 packed package identity mismatch: ${packageEntry.packageName}`,
      );
    }
  }
  if (
    installRecord.recordKind !== "i3-external-install-evidence" ||
    installRecord.executionId !== EXECUTION_ID ||
    installRecord.priorAttemptsExist !== true ||
    !canonicalBytes(installRecord.priorExecutionHistory).equals(
      canonicalBytes(PRIOR_EXECUTION_HISTORY),
    ) ||
    installRecord.freshExecutionNetworkUsed !== false ||
    installRecord.corepackInvoked !== false ||
    installRecord.corepackNetworkEnabled !== false ||
    installRecord.networkPackageResolutionAllowed !== false ||
    installRecord.lifecycleScriptsDisabledForAllConsumers !== true ||
    installRecord.sameAuthenticatedTarballsUsedByBothConsumers !== true ||
    installRecord.providerExecutionPerformed !== false ||
    installRecord.runtimeActivationPerformed !== false ||
    installRecord.consumers?.length !== 2 ||
    installRecord.verdict !== "pass"
  ) {
    throw new Error("I3 external install evidence semantic mismatch");
  }
  assertExactArray(
    installRecord.consumers.map((entry) => entry.packageManager),
    ["npm", "pnpm"],
    "I3 external manager order",
  );
  const expectedTarballs = packageRecord.packages.map((entry) => ({
    expectedPath: entry.tarballPath,
    expectedSha256: entry.sha256,
    observedPackageVersion: entry.packageVersion,
    packageName: entry.packageName,
  }));
  for (const consumer of installRecord.consumers) {
    if (
      consumer.executionId !== EXECUTION_ID ||
      consumer.corepackInvoked !== false ||
      consumer.corepackNetworkEnabled !== false ||
      consumer.environment?.COREPACK_ENABLE_NETWORK !== "0" ||
      consumer.environment?.npm_config_offline !== "true" ||
      consumer.environment?.npm_config_trust_policy !== "off" ||
      consumer.offlineEnforced !== true ||
      consumer.lifecycleScriptsDisabled !== true ||
      consumer.registryFallbackAllowed !== false ||
      (consumer.packageManager === "pnpm" &&
        consumer.localCacheSeed?.metadataMirrorSeeded !== true) ||
      consumer.cleanup?.attempted !== true ||
      consumer.cleanup?.succeeded !== true ||
      consumer.cleanup?.rootAbsentAfterCleanup !== true ||
      consumer.installedBehavior?.sourceTreeSubstitutionUsed !== false ||
      consumer.installedBehavior?.packageRealpathsOutsideRepository !== true ||
      consumer.verdict !== "pass"
    ) {
      throw new Error(
        `I3 ${consumer.packageManager} consumer evidence semantic mismatch`,
      );
    }
    if (
      consumer.packageManager === "pnpm" &&
      !canonicalBytes(consumer.localPnpm).equals(
        canonicalBytes(expectedLocalPnpm),
      )
    ) {
      throw new Error("I3 pnpm local implementation identity mismatch");
    }
    if (
      JSON.stringify(consumer.installedTarballs) !==
      JSON.stringify(expectedTarballs)
    ) {
      throw new Error(`I3 ${consumer.packageManager} tarball linkage mismatch`);
    }
  }
  return {
    input: loaded.input.record,
    install: installRecord,
    protected: loaded.protected.record,
    tarballs: packageRecord,
  };
}

export function runInstalledPackageAudit(mode = "verify") {
  if (mode !== "write" && mode !== "verify") {
    throw new Error("Expected exactly --write or --verify");
  }
  if (mode === "verify") return verifyStoredRecords();
  assertOutputOwnership();
  verifyTempRootsAbsent();
  for (const target of Object.values(OUTPUTS)) {
    if (fs.existsSync(target)) {
      throw new Error(`Refusing to overwrite existing I3 evidence: ${target}`);
    }
  }
  if (fs.existsSync(LEDGER_PATH)) {
    throw new Error(
      "I3 orchestration ledger must not exist before script outputs",
    );
  }
  const offlineStartupPreflight = runOfflineStartupPreflight();
  const input = buildInputAttestation(offlineStartupPreflight);
  buildProtectedAudit();
  const { packageRecord, installRecord } = buildAndAuditPackages();
  verifyTempRootsAbsent();
  const protectedRecord = buildProtectedAudit();
  writeRecordsAtomically({
    input,
    tarballs: packageRecord,
    install: installRecord,
    protected: protectedRecord,
  });
  return {
    input,
    install: installRecord,
    protected: protectedRecord,
    tarballs: packageRecord,
  };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE;
if (direct) {
  if (process.argv.length !== 3) {
    throw new Error(
      "Usage: research-v131-installed-package-audit-i3.mjs --write|--verify",
    );
  }
  const arg = process.argv[2];
  const mode =
    arg === "--write" ? "write" : arg === "--verify" ? "verify" : null;
  if (mode === null) {
    throw new Error(
      "Usage: research-v131-installed-package-audit-i3.mjs --write|--verify",
    );
  }
  runInstalledPackageAudit(mode);
  process.stdout.write(`I3 installed-package audit ${mode} passed\n`);
}
