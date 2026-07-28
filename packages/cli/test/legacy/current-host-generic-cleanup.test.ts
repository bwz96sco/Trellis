import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { collectPlatformTemplates } from "../../src/configurators/index.js";
import {
  CURRENT_HOST_GENERIC_CLEANUP_PATHS,
  CURRENT_HOST_GENERIC_OPTIONAL_PATHS,
  CURRENT_HOST_GENERIC_PRE_RELEASE_ONLY_PATHS,
  CURRENT_HOST_GENERIC_RETIRED_PATHS,
  CURRENT_HOST_GENERIC_STRUCTURED_PATHS,
  CURRENT_HOST_GENERIC_TRANSITION_PATHS,
  loadCurrentHostGenericCleanupSnapshot,
} from "../../src/legacy/current-host-generic-cleanup.js";
import { collectSafeFileDeletes } from "../../src/commands/update.js";
import { computeHash } from "../../src/utils/template-hash.js";
import type { MigrationManifest } from "../../src/types/migration.js";

interface MutablePartition {
  retiredOpaquePaths: string[];
  transitionOpaquePaths: string[];
  optionalOpaquePaths: string[];
  structuredPaths: string[];
}

interface MutableSnapshot {
  schemaVersion: number;
  sourceVersion: string;
  hosts: {
    "claude-code": MutablePartition;
    codex: MutablePartition;
  };
  trellis: {
    retiredOpaquePaths: string[];
    preReleaseOnlyOpaquePaths: string[];
  };
  root: { structuredPaths: string[] };
}

interface HashFixture {
  __version: number;
  hashes: Record<string, string>;
}

interface FrozenFixtureMetadata {
  provenance: {
    sourceRef: string;
    releasedFileSources: Record<string, string>;
  };
}

const loadJson = createRequire(import.meta.url);
const rawSnapshot = loadJson(
  "../../src/legacy/current-host-generic-cleanup.json",
) as MutableSnapshot;
const migrationManifest = loadJson(
  "../../src/migrations/manifests/0.7.0-beta.0.json",
) as MigrationManifest;
const fixtureHashes = loadJson(
  "../fixtures/legacy-0.6.7-multi-host/project/.trellis/.template-hashes.json",
) as HashFixture;
const fixtureMetadata = loadJson(
  "../fixtures/legacy-0.6.7-multi-host/fixture.json",
) as FrozenFixtureMetadata;
const V067_CODEX_CHECK_HASH =
  "b21ff04b7680ebacb8c5ecbc48a22d627eb13e2b47fceb78c8ced0b43b60b282";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PROJECT = path.join(
  TEST_DIR,
  "..",
  "fixtures",
  "legacy-0.6.7-multi-host",
  "project",
);
const RESEARCH_STAGES = [
  "audit",
  "computation",
  "experiment",
  "ideation",
  "literature",
  "quest",
  "setup",
  "theory",
  "writing",
] as const;

function cloneSnapshot(): MutableSnapshot {
  return structuredClone(rawSnapshot);
}

/** Paths generic cleanup must never own (workers + historical stage Skills). */
function retainedResearchPaths(host: "claude-code" | "codex"): string[] {
  if (host === "claude-code") {
    return [
      ".claude/agents/trellis-research-worker.md",
      ...RESEARCH_STAGES.map(
        (stage) => `.claude/skills/trellis-research-${stage}/SKILL.md`,
      ),
    ];
  }
  return [
    ".codex/agents/trellis-research-worker.toml",
    ...RESEARCH_STAGES.map(
      (stage) => `.agents/skills/trellis-research-${stage}/SKILL.md`,
    ),
  ];
}

/** C08 active generation paths: workers only (stage Skills no longer generated). */
function activeResearchPaths(host: "claude-code" | "codex"): string[] {
  return host === "claude-code"
    ? [".claude/agents/trellis-research-worker.md"]
    : [".codex/agents/trellis-research-worker.toml"];
}

function hostSnapshotPaths(partition: MutablePartition): string[] {
  return [
    ...partition.retiredOpaquePaths,
    ...partition.transitionOpaquePaths,
    ...partition.structuredPaths,
  ].sort();
}

describe("current-host generic cleanup inventory", () => {
  it("freezes the expected provenance, partitions, and exact immutable sets", () => {
    const snapshot = loadCurrentHostGenericCleanupSnapshot(rawSnapshot);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.sourceVersion).toBe("0.6.7");
    expect(snapshot.hosts["claude-code"].retiredOpaquePaths).toHaveLength(48);
    expect(snapshot.hosts["claude-code"].transitionOpaquePaths).toHaveLength(3);
    expect(snapshot.hosts["claude-code"].optionalOpaquePaths).toHaveLength(1);
    expect(snapshot.hosts["claude-code"].structuredPaths).toHaveLength(1);
    expect(snapshot.hosts.codex.retiredOpaquePaths).toHaveLength(49);
    expect(snapshot.hosts.codex.transitionOpaquePaths).toHaveLength(2);
    expect(snapshot.hosts.codex.optionalOpaquePaths).toHaveLength(0);
    expect(snapshot.hosts.codex.structuredPaths).toHaveLength(2);
    expect(snapshot.trellis.retiredOpaquePaths).toHaveLength(29);
    expect(snapshot.trellis.preReleaseOnlyOpaquePaths).toEqual([
      ".trellis/agents/research.md",
    ]);
    expect(snapshot.root.structuredPaths).toEqual(["AGENTS.md"]);

    expect(CURRENT_HOST_GENERIC_RETIRED_PATHS.size).toBe(126);
    expect(CURRENT_HOST_GENERIC_TRANSITION_PATHS.size).toBe(5);
    expect(CURRENT_HOST_GENERIC_OPTIONAL_PATHS).toEqual(
      new Set([".claude/hooks/statusline.py"]),
    );
    expect(CURRENT_HOST_GENERIC_STRUCTURED_PATHS).toEqual(
      new Set([
        ".claude/settings.json",
        ".codex/config.toml",
        ".codex/hooks.json",
        "AGENTS.md",
      ]),
    );
    expect(CURRENT_HOST_GENERIC_PRE_RELEASE_ONLY_PATHS).toEqual(
      new Set([".trellis/agents/research.md"]),
    );
    expect(CURRENT_HOST_GENERIC_CLEANUP_PATHS.size).toBe(137);
  });

  it("keeps the frozen 62-path Claude historical partition while active collection narrows", () => {
    const historical = [
      ...hostSnapshotPaths(rawSnapshot.hosts["claude-code"]),
      ...retainedResearchPaths("claude-code"),
    ].sort();
    const active = [...collectPlatformTemplates("claude-code").keys()].sort();
    const expectedActive = [
      ...activeResearchPaths("claude-code"),
      ...rawSnapshot.hosts["claude-code"].transitionOpaquePaths,
      ...rawSnapshot.hosts["claude-code"].structuredPaths,
    ].sort();

    expect(historical).toHaveLength(62);
    expect(new Set(historical).size).toBe(62);
    expect(active).toEqual(expectedActive);
    expect(
      active.some((item) => item.includes("/skills/trellis-research-")),
    ).toBe(false);
    expect(rawSnapshot.hosts["claude-code"].optionalOpaquePaths).toEqual([
      ".claude/hooks/statusline.py",
    ]);
  });

  it("keeps the frozen 63-path Codex historical partition while active collection narrows", () => {
    const historical = [
      ...hostSnapshotPaths(rawSnapshot.hosts.codex),
      ...retainedResearchPaths("codex"),
    ].sort();
    const active = [...collectPlatformTemplates("codex").keys()].sort();
    const expectedActive = [
      ...activeResearchPaths("codex"),
      ...rawSnapshot.hosts.codex.transitionOpaquePaths.filter(
        (item) => item !== ".codex/hooks/session-start.py",
      ),
      ...rawSnapshot.hosts.codex.structuredPaths,
    ].sort();

    expect(historical).toHaveLength(63);
    expect(new Set(historical).size).toBe(63);
    expect(active).toEqual(expectedActive);
    expect(active.some((item) => item.startsWith(".codex/skills/"))).toBe(false);
    expect(
      active.some((item) => item.includes("/skills/trellis-research-")),
    ).toBe(false);
  });

  it("keeps the frozen 30-path generic Trellis cleanup partition", () => {
    const frozen = [
      ...rawSnapshot.trellis.retiredOpaquePaths,
      ...rawSnapshot.trellis.preReleaseOnlyOpaquePaths,
    ].sort();

    expect(frozen).toHaveLength(30);
    expect(new Set(frozen).size).toBe(30);
    expect(frozen).not.toContain(".trellis/scripts/hooks/linear_sync.py");
  });

  it("excludes retained workers, stage skills, and canonical Research state", () => {
    const retained = [
      ...retainedResearchPaths("claude-code"),
      ...retainedResearchPaths("codex"),
    ];
    for (const retainedPath of retained) {
      expect(CURRENT_HOST_GENERIC_CLEANUP_PATHS.has(retainedPath)).toBe(false);
    }
    expect(
      [...CURRENT_HOST_GENERIC_CLEANUP_PATHS].some(
        (item) =>
          item === ".trellis/research" || item.startsWith(".trellis/research/"),
      ),
    ).toBe(false);
  });

  it.each([
    "",
    "/absolute.md",
    "C:drive-relative.md",
    "bad\\windows.md",
    "bad\0nul.md",
    "../traversal.md",
    "wild*.md",
    "directory/",
    ".trellis/research/events.jsonl",
    ".claude/agents/trellis-research-worker.md",
    ".codex/skills/custom/SKILL.md",
  ])("rejects unsafe or excluded exact path %j", (unsafePath) => {
    const snapshot = cloneSnapshot();
    snapshot.hosts["claude-code"].optionalOpaquePaths[0] = unsafePath;

    expect(() => loadCurrentHostGenericCleanupSnapshot(snapshot)).toThrow();
  });

  it("rejects duplicate, unsorted, overlapping, and unsupported snapshots", () => {
    const duplicate = cloneSnapshot();
    duplicate.hosts["claude-code"].retiredOpaquePaths[0] =
      duplicate.hosts["claude-code"].retiredOpaquePaths[1];
    expect(() => loadCurrentHostGenericCleanupSnapshot(duplicate)).toThrow(
      /sorted and unique/,
    );

    const unsorted = cloneSnapshot();
    const first = unsorted.hosts.codex.retiredOpaquePaths[0];
    unsorted.hosts.codex.retiredOpaquePaths[0] =
      unsorted.hosts.codex.retiredOpaquePaths[1];
    unsorted.hosts.codex.retiredOpaquePaths[1] = first;
    expect(() => loadCurrentHostGenericCleanupSnapshot(unsorted)).toThrow(
      /sorted and unique/,
    );

    const overlapping = cloneSnapshot();
    overlapping.hosts["claude-code"].optionalOpaquePaths[0] =
      overlapping.hosts["claude-code"].retiredOpaquePaths[0];
    expect(() => loadCurrentHostGenericCleanupSnapshot(overlapping)).toThrow(
      /categories overlap/,
    );

    const unsupported = cloneSnapshot();
    unsupported.schemaVersion = 2;
    expect(() => loadCurrentHostGenericCleanupSnapshot(unsupported)).toThrow(
      /Unsupported/,
    );
  });
});

describe("0.7 current-host safe-delete evidence", () => {
  it("admits only released opaque paths proven by the frozen v0.6.7 fixture", () => {
    const operations = migrationManifest.migrations;
    const admittedPaths = operations.map((item) => item.from).sort();
    const provenReleasedPaths = Object.keys(fixtureHashes.hashes)
      .filter((item) => CURRENT_HOST_GENERIC_RETIRED_PATHS.has(item))
      .sort();

    expect(migrationManifest.breaking).toBe(false);
    expect(migrationManifest.recommendMigrate).toBe(false);
    expect(operations.every((item) => item.type === "safe-file-delete")).toBe(
      true,
    );
    expect(admittedPaths).toEqual(provenReleasedPaths);
    expect(admittedPaths).toEqual([".agents/skills/trellis-check/SKILL.md"]);
    expect(fixtureMetadata.provenance).toEqual({
      sourceRef: "v0.6.7",
      releasedFileSources: {
        ".agents/skills/trellis-check/SKILL.md":
          "v0.6.7:.agents/skills/trellis-check/SKILL.md",
      },
    });
    expect(
      fixtureHashes.hashes[".agents/skills/trellis-check/SKILL.md"],
    ).toBe(V067_CODEX_CHECK_HASH);

    for (const operation of operations) {
      expect(operation.allowed_hashes).toEqual([
        fixtureHashes.hashes[operation.from],
      ]);
      expect(operation.allowed_hashes?.[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(CURRENT_HOST_GENERIC_STRUCTURED_PATHS.has(operation.from)).toBe(
        false,
      );
      expect(CURRENT_HOST_GENERIC_TRANSITION_PATHS.has(operation.from)).toBe(
        false,
      );
      expect(CURRENT_HOST_GENERIC_OPTIONAL_PATHS.has(operation.from)).toBe(
        false,
      );
      expect(
        CURRENT_HOST_GENERIC_PRE_RELEASE_ONLY_PATHS.has(operation.from),
      ).toBe(false);
    }
  });

  it("reproduces every admitted hash from the frozen fixture bytes", () => {
    for (const operation of migrationManifest.migrations) {
      const fixturePath = path.join(
        FIXTURE_PROJECT,
        ...operation.from.split("/"),
      );
      const content = fs.readFileSync(fixturePath, "utf-8");
      expect(computeHash(content)).toBe(operation.allowed_hashes?.[0]);
    }
  });

  it("gives active Research worker ownership precedence over matching historical delete evidence", () => {
    // C08: stage Skills left the current template set; workers remain active.
    const activePath = ".codex/agents/trellis-research-worker.toml";
    const content = "current Research worker\n";
    const operation = {
      ...migrationManifest.migrations[0],
      from: activePath,
      allowed_hashes: [computeHash(content)],
    };
    const currentTemplatePaths = new Set(
      collectPlatformTemplates("codex").keys(),
    );
    const projectRoot = fs.mkdtempSync(path.join(TEST_DIR, "cleanup-current-"));
    try {
      const activeFile = path.join(projectRoot, ...activePath.split("/"));
      fs.mkdirSync(path.dirname(activeFile), { recursive: true });
      fs.writeFileSync(activeFile, content);

      expect(currentTemplatePaths.has(activePath)).toBe(true);
      expect(
        currentTemplatePaths.has(
          ".agents/skills/trellis-research-writing/SKILL.md",
        ),
      ).toBe(false);
      expect(
        collectSafeFileDeletes(
          [operation],
          projectRoot,
          [],
          currentTemplatePaths,
        ),
      ).toEqual([]);
      expect(fs.readFileSync(activeFile, "utf-8")).toBe(content);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("allows historical deletion after active template ownership is retired", () => {
    const currentTemplatePaths = new Set(
      collectPlatformTemplates("codex").keys(),
    );
    const result = collectSafeFileDeletes(
      migrationManifest.migrations,
      FIXTURE_PROJECT,
      [],
      currentTemplatePaths,
    );

    expect(currentTemplatePaths.has(".agents/skills/trellis-check/SKILL.md")).toBe(
      false,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      item: migrationManifest.migrations[0],
      action: "delete",
    });
    expect(result[0].plannedContent).toEqual(expect.any(String));
    expect(result[0].plannedHash).toBe(
      migrationManifest.migrations[0].allowed_hashes?.[0],
    );
  });

  it("classifies pristine, modified, and missing bytes without inventing evidence", () => {
    const operation = migrationManifest.migrations[0];
    const pristine = collectSafeFileDeletes(
      [operation],
      FIXTURE_PROJECT,
      [],
      new Set(),
    );
    expect(pristine).toHaveLength(1);
    expect(pristine[0]).toMatchObject({ item: operation, action: "delete" });
    expect(pristine[0].plannedHash).toBe(operation.allowed_hashes?.[0]);

    const modifiedRoot = fs.mkdtempSync(
      path.join(TEST_DIR, "cleanup-modified-"),
    );
    try {
      const modifiedPath = path.join(
        modifiedRoot,
        ...operation.from.split("/"),
      );
      fs.mkdirSync(path.dirname(modifiedPath), { recursive: true });
      fs.writeFileSync(modifiedPath, "user-modified\n");
      expect(
        collectSafeFileDeletes([operation], modifiedRoot, [], new Set()),
      ).toEqual([{ item: operation, action: "skip-modified" }]);
    } finally {
      fs.rmSync(modifiedRoot, { recursive: true, force: true });
    }

    expect(
      collectSafeFileDeletes(
        [operation],
        path.join(TEST_DIR, "missing-project"),
        [],
        new Set(),
      ),
    ).toEqual([{ item: operation, action: "skip-missing" }]);
  });
});
