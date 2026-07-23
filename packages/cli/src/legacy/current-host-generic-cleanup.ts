import { createRequire } from "node:module";

import type snapshotJson from "./current-host-generic-cleanup.json";
import {
  isProtectedResearchPath,
  isSafeManifestPath,
} from "../utils/protected-paths.js";

export interface CleanupPartition {
  readonly retiredOpaquePaths: readonly string[];
  readonly transitionOpaquePaths: readonly string[];
  readonly optionalOpaquePaths: readonly string[];
  readonly structuredPaths: readonly string[];
}

export interface CurrentHostGenericCleanupSnapshot {
  readonly schemaVersion: 1;
  readonly sourceVersion: "0.6.7";
  readonly hosts: {
    readonly "claude-code": CleanupPartition;
    readonly codex: CleanupPartition;
  };
  readonly trellis: {
    readonly retiredOpaquePaths: readonly string[];
    readonly preReleaseOnlyOpaquePaths: readonly string[];
  };
  readonly root: {
    readonly structuredPaths: readonly string[];
  };
}

const EXPECTED_COUNTS = {
  claudeRetired: 48,
  claudeTransition: 3,
  claudeOptional: 1,
  claudeStructured: 1,
  codexRetired: 49,
  codexTransition: 2,
  codexOptional: 0,
  codexStructured: 2,
  trellisRetired: 29,
  trellisPreReleaseOnly: 1,
  rootStructured: 1,
} as const;

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

const RETAINED_RESEARCH_PATHS = new Set<string>([
  ".claude/agents/trellis-research-worker.md",
  ".codex/agents/trellis-research-worker.toml",
  ...RESEARCH_STAGES.flatMap((stage) => [
    `.claude/skills/trellis-research-${stage}/SKILL.md`,
    `.agents/skills/trellis-research-${stage}/SKILL.md`,
  ]),
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new Error(`${label} keys drifted`);
  }
}

function assertExactPath(value: unknown, label: string): string {
  if (typeof value !== "string" || !isSafeManifestPath(value)) {
    throw new Error(`Invalid ${label} path: ${String(value)}`);
  }
  if (/[*?[\]{}]/.test(value) || value.endsWith("/")) {
    throw new Error(`Non-exact ${label} path: ${value}`);
  }
  if (isProtectedResearchPath(value)) {
    throw new Error(
      `Protected Research path cannot be cleanup-owned: ${value}`,
    );
  }
  if (RETAINED_RESEARCH_PATHS.has(value)) {
    throw new Error(
      `Retained Research output cannot be cleanup-owned: ${value}`,
    );
  }
  if (value.startsWith(".codex/skills/")) {
    throw new Error(
      `Codex cleanup snapshot must not claim .codex/skills: ${value}`,
    );
  }
  if (value === ".trellis/scripts/hooks/linear_sync.py") {
    throw new Error(`Source-only script cannot be cleanup-owned: ${value}`);
  }
  return value;
}

function loadPathArray(
  value: unknown,
  label: string,
  expectedCount: number,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  const paths = value.map((item) => assertExactPath(item, label));
  const sorted = [...paths].sort();
  if (
    new Set(paths).size !== paths.length ||
    paths.some((item, index) => item !== sorted[index])
  ) {
    throw new Error(`${label} must be sorted and unique`);
  }
  if (paths.length !== expectedCount) {
    throw new Error(
      `${label} must contain ${expectedCount} paths, found ${paths.length}`,
    );
  }
  return Object.freeze(paths);
}

function loadPartition(
  value: unknown,
  label: string,
  counts: {
    retired: number;
    transition: number;
    optional: number;
    structured: number;
  },
): CleanupPartition {
  if (!isPlainObject(value)) {
    throw new Error(`${label} cleanup partition must be an object`);
  }
  assertExactKeys(
    value,
    [
      "retiredOpaquePaths",
      "transitionOpaquePaths",
      "optionalOpaquePaths",
      "structuredPaths",
    ],
    label,
  );
  return Object.freeze({
    retiredOpaquePaths: loadPathArray(
      value.retiredOpaquePaths,
      `${label}.retiredOpaquePaths`,
      counts.retired,
    ),
    transitionOpaquePaths: loadPathArray(
      value.transitionOpaquePaths,
      `${label}.transitionOpaquePaths`,
      counts.transition,
    ),
    optionalOpaquePaths: loadPathArray(
      value.optionalOpaquePaths,
      `${label}.optionalOpaquePaths`,
      counts.optional,
    ),
    structuredPaths: loadPathArray(
      value.structuredPaths,
      `${label}.structuredPaths`,
      counts.structured,
    ),
  });
}

/** @internal Exported for snapshot contract tests only. */
export function loadCurrentHostGenericCleanupSnapshot(
  value: unknown,
): CurrentHostGenericCleanupSnapshot {
  if (!isPlainObject(value)) {
    throw new Error("Current-host cleanup snapshot must be an object");
  }
  assertExactKeys(
    value,
    ["schemaVersion", "sourceVersion", "hosts", "trellis", "root"],
    "current-host cleanup snapshot",
  );
  if (value.schemaVersion !== 1 || value.sourceVersion !== "0.6.7") {
    throw new Error("Unsupported current-host cleanup snapshot version");
  }
  if (!isPlainObject(value.hosts)) {
    throw new Error("Current-host cleanup snapshot hosts must be an object");
  }
  assertExactKeys(value.hosts, ["claude-code", "codex"], "cleanup hosts");
  const claude = loadPartition(value.hosts["claude-code"], "claude-code", {
    retired: EXPECTED_COUNTS.claudeRetired,
    transition: EXPECTED_COUNTS.claudeTransition,
    optional: EXPECTED_COUNTS.claudeOptional,
    structured: EXPECTED_COUNTS.claudeStructured,
  });
  const codex = loadPartition(value.hosts.codex, "codex", {
    retired: EXPECTED_COUNTS.codexRetired,
    transition: EXPECTED_COUNTS.codexTransition,
    optional: EXPECTED_COUNTS.codexOptional,
    structured: EXPECTED_COUNTS.codexStructured,
  });

  if (!isPlainObject(value.trellis)) {
    throw new Error("Current-host cleanup snapshot trellis must be an object");
  }
  assertExactKeys(
    value.trellis,
    ["retiredOpaquePaths", "preReleaseOnlyOpaquePaths"],
    "trellis cleanup",
  );
  const trellisRetired = loadPathArray(
    value.trellis.retiredOpaquePaths,
    "trellis.retiredOpaquePaths",
    EXPECTED_COUNTS.trellisRetired,
  );
  const trellisPreRelease = loadPathArray(
    value.trellis.preReleaseOnlyOpaquePaths,
    "trellis.preReleaseOnlyOpaquePaths",
    EXPECTED_COUNTS.trellisPreReleaseOnly,
  );

  if (!isPlainObject(value.root)) {
    throw new Error("Current-host cleanup snapshot root must be an object");
  }
  assertExactKeys(value.root, ["structuredPaths"], "root cleanup");
  const rootStructured = loadPathArray(
    value.root.structuredPaths,
    "root.structuredPaths",
    EXPECTED_COUNTS.rootStructured,
  );

  const allPaths = [
    ...claude.retiredOpaquePaths,
    ...claude.transitionOpaquePaths,
    ...claude.optionalOpaquePaths,
    ...claude.structuredPaths,
    ...codex.retiredOpaquePaths,
    ...codex.transitionOpaquePaths,
    ...codex.optionalOpaquePaths,
    ...codex.structuredPaths,
    ...trellisRetired,
    ...trellisPreRelease,
    ...rootStructured,
  ];
  if (new Set(allPaths).size !== allPaths.length) {
    throw new Error("Current-host cleanup snapshot categories overlap");
  }

  return Object.freeze({
    schemaVersion: 1,
    sourceVersion: "0.6.7",
    hosts: Object.freeze({ "claude-code": claude, codex }),
    trellis: Object.freeze({
      retiredOpaquePaths: trellisRetired,
      preReleaseOnlyOpaquePaths: trellisPreRelease,
    }),
    root: Object.freeze({ structuredPaths: rootStructured }),
  });
}

const loadJson = createRequire(import.meta.url);
const rawSnapshot: unknown = loadJson(
  "./current-host-generic-cleanup.json",
) as typeof snapshotJson;
const snapshot = loadCurrentHostGenericCleanupSnapshot(rawSnapshot);

export const CURRENT_HOST_GENERIC_RETIRED_PATHS: ReadonlySet<string> = new Set([
  ...snapshot.hosts["claude-code"].retiredOpaquePaths,
  ...snapshot.hosts.codex.retiredOpaquePaths,
  ...snapshot.trellis.retiredOpaquePaths,
]);

export const CURRENT_HOST_GENERIC_TRANSITION_PATHS: ReadonlySet<string> =
  new Set([
    ...snapshot.hosts["claude-code"].transitionOpaquePaths,
    ...snapshot.hosts.codex.transitionOpaquePaths,
  ]);

export const CURRENT_HOST_GENERIC_OPTIONAL_PATHS: ReadonlySet<string> = new Set(
  [
    ...snapshot.hosts["claude-code"].optionalOpaquePaths,
    ...snapshot.hosts.codex.optionalOpaquePaths,
  ],
);

export const CURRENT_HOST_GENERIC_STRUCTURED_PATHS: ReadonlySet<string> =
  new Set([
    ...snapshot.hosts["claude-code"].structuredPaths,
    ...snapshot.hosts.codex.structuredPaths,
    ...snapshot.root.structuredPaths,
  ]);

export const CURRENT_HOST_GENERIC_PRE_RELEASE_ONLY_PATHS: ReadonlySet<string> =
  new Set(snapshot.trellis.preReleaseOnlyOpaquePaths);

export const CURRENT_HOST_GENERIC_CLEANUP_PATHS: ReadonlySet<string> = new Set([
  ...CURRENT_HOST_GENERIC_RETIRED_PATHS,
  ...CURRENT_HOST_GENERIC_TRANSITION_PATHS,
  ...CURRENT_HOST_GENERIC_OPTIONAL_PATHS,
  ...CURRENT_HOST_GENERIC_STRUCTURED_PATHS,
  ...CURRENT_HOST_GENERIC_PRE_RELEASE_ONLY_PATHS,
]);
