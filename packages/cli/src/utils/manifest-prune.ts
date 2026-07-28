/**
 * Self-heal poisoned `.template-hashes.json` manifests.
 *
 * Versions before this fix walked `.codex/`, `.claude/`, etc. with a blind
 * recursive scan when computing the manifest, so they hashed user-owned
 * runtime data (`.codex/sessions/*`, `.claude/projects/*.jsonl`, pre-existing
 * `AGENTS.md`, user-added `.codex/skills/<custom>/`, …). On uninstall, every
 * manifest entry is unlinked, which silently deletes user data.
 *
 * `pruneOrphanManifestKeys` removes any manifest entry that no current
 * platform configurator owns. The two entry points that consume it are
 * `trellis update` (before migration classification) and `trellis uninstall`
 * (before plan building). Together they ensure existing poisoned manifests
 * self-correct on the next routine command.
 *
 * Rules:
 *   - Current managed `.trellis` files, configured registry spec files,
 *     migration-referenced paths, and protected `.trellis/research` paths are
 *     kept. Unknown `.trellis` entries are pruned rather than treated as proof
 *     of Trellis ownership.
 *   - Root-level `AGENTS.md` is kept only when it still looks Trellis-managed
 *     (contains the managed block markers) or is missing on disk. This
 *     self-heals old poisoned manifests for user-owned AGENTS.md files that
 *     predated init and were skipped.
 *   - Paths referenced by `from`/`to` of any migration manifest entry
 *     (rename, rename-dir, delete, safe-file-delete) are preserved. Pruning
 *     them would prevent legitimate pending migrations from finding their
 *     source/target.
 *   - Current ownership is limited to the exact Research base paths and the
 *     exact Research payload returned for currently configured platforms.
 *   - Everything else is pruned. This matches "files trellis actually wrote
 *     during current Research init/update" without making a managed directory
 *     or inactive generic template inventory into ownership evidence.
 */

import fs from "node:fs";
import path from "node:path";

import { collectPlatformTemplates } from "../configurators/index.js";
import { DIR_NAMES, FILE_NAMES, PATHS } from "../constants/paths.js";
import { getAllMigrations } from "../migrations/index.js";
import { CURRENT_HOST_GENERIC_CLEANUP_PATHS } from "../legacy/current-host-generic-cleanup.js";
import { RESEARCH_SKILL_RETIREMENT_TARGET_PATHS } from "../legacy/research-skill-retirement.js";
import {
  RETIRED_GENERATED_PATHS,
  RETIRED_STRUCTURED_FILES,
} from "../legacy/retired-host-cleanup.js";
import { loadSpecRegistryConfig } from "./registry-config.js";
import { saveHashes } from "./template-hash.js";
import { toPosix } from "./posix.js";
import {
  isProtectedResearchPath,
  isSafeManifestPath,
} from "./protected-paths.js";
import type { AITool } from "../types/ai-tools.js";
import type { TemplateHashes } from "../types/migration.js";

const TRELLIS_BLOCK_START = "<!-- TRELLIS:START -->";
const TRELLIS_BLOCK_END = "<!-- TRELLIS:END -->";
const RESEARCH_BASE_TEMPLATE_PATHS = [
  `${DIR_NAMES.WORKFLOW}/config.yaml`,
  `${DIR_NAMES.WORKFLOW}/.gitignore`,
  PATHS.WORKFLOW_GUIDE_FILE,
] as const;

export interface PruneResult {
  /** Manifest keys removed (POSIX-style relative paths). */
  pruned: string[];
  /** The post-prune manifest (saved to disk only when `pruned.length > 0`). */
  hashes: TemplateHashes;
}

/**
 * Compute the exact current Research ownership set plus historical
 * compatibility evidence needed for safe cleanup and pending migrations.
 * Root-level AGENTS.md remains marker-gated in `shouldKeepAgentsMd`.
 */
function buildKnownKeys(configuredPlatforms: readonly AITool[]): Set<string> {
  const known = new Set<string>(RESEARCH_BASE_TEMPLATE_PATHS);
  for (const id of configuredPlatforms) {
    const templates = collectPlatformTemplates(id);
    if (!templates) continue;
    for (const key of templates.keys()) {
      known.add(toPosix(key));
    }
  }
  // Retired generated files remain cleanup candidates by exact manifest key.
  // Root membership is deliberately not consulted here: an unknown descendant
  // under a retired root remains unknown ownership and is pruned.
  for (const retiredPath of RETIRED_GENERATED_PATHS) {
    known.add(retiredPath);
  }
  // Compatibility-only structured paths (notably legacy .trae/settings.json)
  // are exact ownership descriptors even when absent from current collectors.
  for (const descriptor of RETIRED_STRUCTURED_FILES) {
    known.add(descriptor.path);
  }
  // Current Claude/Codex generic outputs must remain exact cleanup candidates
  // after their active collectors are narrowed to Research-only assets.
  for (const cleanupPath of CURRENT_HOST_GENERIC_CLEANUP_PATHS) {
    known.add(cleanupPath);
  }
  // Preserve any path referenced by a migration: legitimate pending
  // rename/delete operations need to resolve their `from` (and the target's
  // hash record for `to`) even if the current registry doesn't list it.
  for (const migration of getAllMigrations()) {
    if (migration.from) known.add(toPosix(migration.from));
    if (migration.to) known.add(toPosix(migration.to));
  }
  // C08/C10: exact Research stage Skill targets must survive prune so uninstall
  // can apply evidence∩migration∩ownership (or defer when authority is none).
  for (const retirementPath of RESEARCH_SKILL_RETIREMENT_TARGET_PATHS) {
    known.add(retirementPath);
  }

  return known;
}

/**
 * Root-level AGENTS.md needs special handling because it has no platform
 * registry owner. New fixed inits record it only when written, but old
 * manifests may contain a user-owned AGENTS.md that init skipped. The
 * managed block markers are the least destructive ownership signal: no
 * markers means preserve the user's file by pruning the stale manifest key.
 */
function shouldKeepAgentsMd(cwd: string): boolean {
  const fullPath = path.join(cwd, FILE_NAMES.AGENTS);
  if (!fs.existsSync(fullPath)) {
    return true;
  }
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return (
      content.includes(TRELLIS_BLOCK_START) &&
      content.includes(TRELLIS_BLOCK_END)
    );
  } catch {
    return true;
  }
}

export interface PruneOptions {
  /**
   * Save the pruned manifest to `.template-hashes.json`. Defaults to true.
   * Callers can pass `false` to compute the prune without mutating disk
   * (dry-run, change-analysis passes).
   */
  persist?: boolean;
}

/**
 * Walk the manifest and split it into kept vs pruned entries.
 *
 * @param cwd  Project root — used to save the rewritten manifest.
 * @param configuredPlatforms Output of `getConfiguredPlatforms(cwd)` — caller
 *   resolves this so we don't have to re-walk the filesystem.
 * @param hashes Already-loaded manifest contents. Passing it in (vs reading
 *   from disk) lets the caller chain `loadHashes` → prune → use the result.
 * @param options.persist When true (default), saves the pruned manifest to
 *   disk. Pass `false` for dry-run flows.
 */
export function pruneOrphanManifestKeys(
  cwd: string,
  configuredPlatforms: readonly AITool[],
  hashes: TemplateHashes,
  options: PruneOptions = {},
): PruneResult {
  const persist = options.persist ?? true;
  const known = buildKnownKeys(configuredPlatforms);
  const migrationDirPrefixes = getAllMigrations()
    .filter((migration) => migration.type === "rename-dir")
    .flatMap((migration) => [migration.from, migration.to])
    .filter((migrationPath): migrationPath is string => Boolean(migrationPath))
    .map((migrationPath) => `${toPosix(migrationPath).replace(/\/$/, "")}/`);
  const hasSpecRegistry = loadSpecRegistryConfig(cwd) !== null;
  const pruned: string[] = [];
  const kept: TemplateHashes = {};

  for (const [rawKey, value] of Object.entries(hashes)) {
    // Validate before normalization or filesystem access. Backslashes,
    // traversal, absolute paths, and malformed segments are unknown ownership.
    if (!isSafeManifestPath(rawKey)) {
      pruned.push(rawKey);
      continue;
    }
    const key = toPosix(rawKey);
    // Canonical research state is protected even if an older init accidentally
    // recorded it. Update keeps the key intact; uninstall later releases it
    // after reporting the protected outcome.
    if (isProtectedResearchPath(key)) {
      kept[key] = value;
      continue;
    }
    if (hasSpecRegistry && key.startsWith(`${PATHS.SPEC}/`)) {
      kept[key] = value;
      continue;
    }
    if (key === FILE_NAMES.AGENTS) {
      if (shouldKeepAgentsMd(cwd)) {
        kept[key] = value;
      } else {
        pruned.push(key);
      }
      continue;
    }
    if (
      known.has(key) ||
      migrationDirPrefixes.some((prefix) => key.startsWith(prefix))
    ) {
      kept[key] = value;
      continue;
    }
    pruned.push(key);
  }

  if (persist && pruned.length > 0) {
    saveHashes(cwd, kept);
  }

  return { pruned, hashes: kept };
}
