/**
 * Package-internal Research stage Skill retirement evidence.
 *
 * Deletion authority for installed stage Skills is empty until immutable
 * published package artifacts reproduce exact installed path/hash pairs.
 * This module never installs into user projects.
 */

import { createRequire } from "node:module";
import path from "node:path";

import { isSafeManifestPath } from "../utils/protected-paths.js";

import type snapshotJson from "./research-skill-retirement.json";

export type ResearchSkillRetirementHost = "claude" | "codex";

export type ResearchSkillRetirementAuthority = "none" | "complete";

export interface ResearchSkillRetirementArtifact {
  readonly packageName: "@mindfoldhq/trellis";
  readonly version: string;
  readonly tarballUrl: string;
  readonly shasumSha1: string;
  readonly integritySha512: string;
}

export interface ResearchSkillRetirementEntry {
  readonly host: ResearchSkillRetirementHost;
  readonly root: ".claude/skills" | ".agents/skills";
  readonly path: string;
  readonly sourceTarEntry: string;
  readonly renderingProfile: string;
  readonly sha256: readonly string[];
  readonly artifacts: readonly ResearchSkillRetirementArtifact[];
}

export interface ResearchSkillRetirementSnapshot {
  readonly schemaVersion: 1;
  readonly normalization: "utf8-lf";
  readonly authority: ResearchSkillRetirementAuthority;
  readonly entries: readonly ResearchSkillRetirementEntry[];
  readonly notes?: string;
}

/** Canonical installed SKILL.md paths when complete authority is claimed. */
export const RESEARCH_STAGE_SKILL_NAMES = [
  "trellis-research-audit",
  "trellis-research-computation",
  "trellis-research-experiment",
  "trellis-research-ideation",
  "trellis-research-literature",
  "trellis-research-quest",
  "trellis-research-setup",
  "trellis-research-theory",
  "trellis-research-writing",
] as const;

export const RESEARCH_SKILL_RETIREMENT_TARGET_PATHS = [
  ...RESEARCH_STAGE_SKILL_NAMES.map(
    (name) => `.claude/skills/${name}/SKILL.md` as const,
  ),
  ...RESEARCH_STAGE_SKILL_NAMES.map(
    (name) => `.agents/skills/${name}/SKILL.md` as const,
  ),
] as const;

const EXPECTED_COMPLETE_COUNT = RESEARCH_SKILL_RETIREMENT_TARGET_PATHS.length;

const loadJson = createRequire(import.meta.url);
const rawSnapshot: unknown = loadJson(
  "./research-skill-retirement.json",
) as typeof snapshotJson;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactSafePath(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${label}: expected non-empty string`);
  }
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    /[*?[\]{}]/.test(value) ||
    value.endsWith("/") ||
    path.posix.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  if (!isSafeManifestPath(value)) {
    throw new Error(`Non-safe manifest ${label}: ${value}`);
  }
  if (value === ".trellis/research" || value.startsWith(".trellis/research/")) {
    throw new Error(
      `Research state path forbidden in retirement evidence: ${value}`,
    );
  }
  return value;
}

function assertSha256List(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  const hashes = value.map((item, index) => {
    if (typeof item !== "string" || !/^[a-f0-9]{64}$/.test(item)) {
      throw new Error(
        `${label}[${index}] must be lowercase hex SHA-256, got ${String(item)}`,
      );
    }
    return item;
  });
  const sorted = [...hashes].sort();
  if (
    new Set(hashes).size !== hashes.length ||
    hashes.some((hash, index) => hash !== sorted[index])
  ) {
    throw new Error(`${label} must be sorted unique lowercase SHA-256 digests`);
  }
  return hashes;
}

function assertArtifact(
  value: unknown,
  label: string,
): ResearchSkillRetirementArtifact {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  if (value.packageName !== "@mindfoldhq/trellis") {
    throw new Error(`${label}.packageName must be @mindfoldhq/trellis`);
  }
  for (const key of [
    "version",
    "tarballUrl",
    "shasumSha1",
    "integritySha512",
  ] as const) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new Error(`${label}.${key} must be a non-empty string`);
    }
  }
  if (
    typeof value.tarballUrl !== "string" ||
    !value.tarballUrl.startsWith("https://registry.npmjs.org/")
  ) {
    throw new Error(`${label}.tarballUrl must be an npm registry HTTPS URL`);
  }
  if (
    typeof value.shasumSha1 !== "string" ||
    !/^[a-f0-9]{40}$/.test(value.shasumSha1)
  ) {
    throw new Error(`${label}.shasumSha1 must be lowercase hex SHA-1`);
  }
  if (
    typeof value.integritySha512 !== "string" ||
    !value.integritySha512.startsWith("sha512-")
  ) {
    throw new Error(`${label}.integritySha512 must start with sha512-`);
  }
  return {
    packageName: "@mindfoldhq/trellis",
    version: value.version as string,
    tarballUrl: value.tarballUrl as string,
    shasumSha1: value.shasumSha1 as string,
    integritySha512: value.integritySha512 as string,
  };
}

function assertEntry(
  value: unknown,
  index: number,
): ResearchSkillRetirementEntry {
  if (!isPlainObject(value)) {
    throw new Error(`entries[${index}] must be an object`);
  }
  const host = value.host;
  if (host !== "claude" && host !== "codex") {
    throw new Error(`entries[${index}].host must be claude or codex`);
  }
  const root = value.root;
  if (root !== ".claude/skills" && root !== ".agents/skills") {
    throw new Error(
      `entries[${index}].root must be .claude/skills or .agents/skills`,
    );
  }
  const entryPath = assertExactSafePath(value.path, `entries[${index}].path`);
  if (!entryPath.startsWith(`${root}/`)) {
    throw new Error(
      `entries[${index}].path must start with host root ${root}: ${entryPath}`,
    );
  }
  if (host === "claude" && root !== ".claude/skills") {
    throw new Error(
      `entries[${index}] claude host requires .claude/skills root`,
    );
  }
  if (host === "codex" && root !== ".agents/skills") {
    throw new Error(
      `entries[${index}] codex host requires .agents/skills root`,
    );
  }
  if (
    typeof value.sourceTarEntry !== "string" ||
    value.sourceTarEntry.length === 0
  ) {
    throw new Error(
      `entries[${index}].sourceTarEntry must be a non-empty string`,
    );
  }
  if (
    typeof value.renderingProfile !== "string" ||
    value.renderingProfile.length === 0
  ) {
    throw new Error(
      `entries[${index}].renderingProfile must be a non-empty string`,
    );
  }
  const sha256 = assertSha256List(value.sha256, `entries[${index}].sha256`);
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    throw new Error(`entries[${index}].artifacts must be a non-empty array`);
  }
  const artifacts = value.artifacts.map((artifact, artifactIndex) =>
    assertArtifact(artifact, `entries[${index}].artifacts[${artifactIndex}]`),
  );
  return {
    host,
    root,
    path: entryPath,
    sourceTarEntry: value.sourceTarEntry,
    renderingProfile: value.renderingProfile,
    sha256,
    artifacts,
  };
}

export function loadResearchSkillRetirementSnapshot(
  value: unknown = rawSnapshot,
): ResearchSkillRetirementSnapshot {
  if (!isPlainObject(value)) {
    throw new Error("Research skill retirement snapshot must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported research skill retirement schemaVersion");
  }
  if (value.normalization !== "utf8-lf") {
    throw new Error("Unsupported research skill retirement normalization");
  }
  if (value.authority !== "none" && value.authority !== "complete") {
    throw new Error(
      "Research skill retirement authority must be none or complete",
    );
  }
  if (!Array.isArray(value.entries)) {
    throw new Error("Research skill retirement entries must be an array");
  }

  if (value.authority === "none") {
    if (value.entries.length !== 0) {
      throw new Error(
        "authority=none requires empty entries (no deletion authority)",
      );
    }
    return {
      schemaVersion: 1,
      normalization: "utf8-lf",
      authority: "none",
      entries: [],
      notes: typeof value.notes === "string" ? value.notes : undefined,
    };
  }

  if (value.entries.length !== EXPECTED_COMPLETE_COUNT) {
    throw new Error(
      `authority=complete requires exactly ${EXPECTED_COMPLETE_COUNT} entries, found ${value.entries.length}`,
    );
  }

  const entries = value.entries.map((entry, index) =>
    assertEntry(entry, index),
  );
  const paths = entries.map((entry) => entry.path).sort();
  const expected = [...RESEARCH_SKILL_RETIREMENT_TARGET_PATHS].sort();
  if (
    new Set(paths).size !== paths.length ||
    paths.some((entryPath, index) => entryPath !== expected[index])
  ) {
    throw new Error(
      "authority=complete entries must cover exactly the 18 target SKILL.md paths",
    );
  }

  return {
    schemaVersion: 1,
    normalization: "utf8-lf",
    authority: "complete",
    entries,
    notes: typeof value.notes === "string" ? value.notes : undefined,
  };
}

const snapshot = loadResearchSkillRetirementSnapshot(rawSnapshot);

export const RESEARCH_SKILL_RETIREMENT: ResearchSkillRetirementSnapshot =
  Object.freeze({
    schemaVersion: snapshot.schemaVersion,
    normalization: snapshot.normalization,
    authority: snapshot.authority,
    entries: Object.freeze([...snapshot.entries]),
    notes: snapshot.notes,
  });

/** Paths with deletion hashes when authority is complete; empty when none. */
export const RESEARCH_SKILL_RETIREMENT_PATHS: ReadonlySet<string> = new Set(
  RESEARCH_SKILL_RETIREMENT.entries.map((entry) => entry.path),
);

/** Map path -> sorted allowed SHA-256 hashes for migration agreement. */
export function getResearchSkillRetirementHashMap(): ReadonlyMap<
  string,
  readonly string[]
> {
  return new Map(
    RESEARCH_SKILL_RETIREMENT.entries.map((entry) => [
      entry.path,
      entry.sha256,
    ]),
  );
}

/**
 * Whether uninstall/update may consider deleting this exact path under
 * retirement evidence. Still requires migration + ownership at call sites.
 */
export function hasResearchSkillRetirementAuthority(filePath: string): boolean {
  return RESEARCH_SKILL_RETIREMENT_PATHS.has(filePath);
}

/**
 * Fail-closed agreement between retirement evidence and migration
 * safe-file-delete items for Research stage Skill paths.
 *
 * - authority=none: no migration may claim Research target path deletes
 * - authority=complete: each evidence path has exactly one matching
 *   safe-file-delete with identical sorted allowed_hashes
 */
export function assertResearchSkillRetirementAgreesWithMigrations(
  migrations: readonly {
    type: string;
    from: string;
    allowed_hashes?: readonly string[];
  }[],
  evidence: ResearchSkillRetirementSnapshot = RESEARCH_SKILL_RETIREMENT,
): void {
  const targetSet = new Set<string>(RESEARCH_SKILL_RETIREMENT_TARGET_PATHS);
  const researchDeletes = migrations.filter(
    (item) => item.type === "safe-file-delete" && targetSet.has(item.from),
  );

  if (evidence.authority === "none") {
    if (researchDeletes.length > 0) {
      throw new Error(
        "authority=none forbids Research stage Skill safe-file-delete migrations",
      );
    }
    return;
  }

  const byPath = new Map(researchDeletes.map((item) => [item.from, item]));
  if (byPath.size !== researchDeletes.length) {
    throw new Error("Duplicate Research stage Skill safe-file-delete paths");
  }

  const evidenceMap = new Map(
    evidence.entries.map((entry) => [entry.path, entry.sha256]),
  );
  if (evidenceMap.size !== EXPECTED_COMPLETE_COUNT) {
    throw new Error("Complete evidence must contain 18 paths");
  }

  for (const [entryPath, hashes] of evidenceMap) {
    const migration = byPath.get(entryPath);
    if (!migration) {
      throw new Error(`Missing safe-file-delete migration for ${entryPath}`);
    }
    const allowed = [...(migration.allowed_hashes ?? [])].sort();
    const expected = [...hashes].sort();
    if (
      allowed.length !== expected.length ||
      allowed.some((hash, index) => hash !== expected[index])
    ) {
      throw new Error(
        `allowed_hashes disagree with retirement evidence for ${entryPath}`,
      );
    }
  }

  for (const item of researchDeletes) {
    if (!evidenceMap.has(item.from)) {
      throw new Error(
        `Migration claims Research Skill path without evidence: ${item.from}`,
      );
    }
  }
}
