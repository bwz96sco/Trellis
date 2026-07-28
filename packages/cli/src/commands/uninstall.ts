/**
 * `trellis uninstall` removes current Trellis ownership without deleting
 * protected research state or user-modified content.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";

import { DIR_NAMES, FILE_NAMES } from "../constants/paths.js";
import {
  computeHash,
  readTemplateHashesStatus,
  saveHashes,
} from "../utils/template-hash.js";
import { writeFileAtomic } from "../utils/atomic-write.js";
import {
  cleanupEmptyDirs,
  TRELLIS_BLOCK_START,
  TRELLIS_BLOCK_END,
} from "./update.js";
import {
  ALL_MANAGED_DIRS,
  getConfiguredPlatforms,
  isManagedPath,
} from "../configurators/index.js";
import { pruneOrphanManifestKeys } from "../utils/manifest-prune.js";
import {
  isCwdHomedir,
  homedirGuardMessage,
  homedirBypassEnabled,
} from "../utils/cwd-guard.js";
import { isProtectedResearchPath } from "../utils/protected-paths.js";
import {
  scrubHooksJson,
  scrubOpencodePackageJson,
  scrubPiSettings,
  scrubCodexConfigToml,
  scrubManagedMarkdownBlock,
  scrubZcodeConfigJson,
  type ScrubResult,
} from "../utils/uninstall-scrubbers.js";
import {
  LEGACY_TRELLIS_HOOK_COMMAND_PATHS,
  RETIRED_GENERATED_PATHS,
  RETIRED_STRUCTURED_FILES,
  type RetiredStructuredFile,
} from "../legacy/retired-host-cleanup.js";
import {
  RESEARCH_SKILL_RETIREMENT_TARGET_PATHS,
  getResearchSkillRetirementHashMap,
  hasResearchSkillRetirementAuthority,
} from "../legacy/research-skill-retirement.js";
import { getAllMigrations } from "../migrations/index.js";
import type { TemplateHashes } from "../types/migration.js";

const RESEARCH_STAGE_SKILL_TARGET_SET = new Set<string>(
  RESEARCH_SKILL_RETIREMENT_TARGET_PATHS,
);

/**
 * C08: Research stage Skill paths require evidence ∩ migration ∩ ownership.
 * With authority=none this preserves historical skills rather than inventing deletes.
 */
function mayUninstallResearchStageSkill(
  posixPath: string,
  currentHash: string,
): boolean {
  if (!RESEARCH_STAGE_SKILL_TARGET_SET.has(posixPath)) {
    return true;
  }
  if (!hasResearchSkillRetirementAuthority(posixPath)) {
    return false;
  }
  const evidenceHashes = getResearchSkillRetirementHashMap().get(posixPath);
  if (!evidenceHashes?.includes(currentHash)) {
    return false;
  }
  const migration = getAllMigrations().find(
    (item) =>
      item.type === "safe-file-delete" &&
      item.from === posixPath &&
      item.allowed_hashes?.includes(currentHash),
  );
  return migration !== undefined;
}

export interface UninstallOptions {
  yes?: boolean;
  dryRun?: boolean;
}

interface StructuredFileSpec {
  posixPath: string;
  reason: string;
  scrub: (content: string, deletedPaths: readonly string[]) => ScrubResult;
}

function retiredStructuredSpec(
  descriptor: RetiredStructuredFile,
): StructuredFileSpec {
  switch (descriptor.kind) {
    case "hooks":
      return {
        posixPath: descriptor.path,
        reason: "Strip Trellis hooks; preserve user fields",
        scrub: (content, ownedHookPaths) => {
          const result = scrubHooksJson(
            content,
            ownedHookPaths,
            descriptor.layout,
          );
          // Frozen 0.6.7 settings used direct event arrays before the current
          // nested matcher-block schema. Keep this fallback retired-path-only;
          // current Claude/Codex nested configs remain strict.
          if (
            descriptor.layout === "nested" &&
            result.outcome === "malformed"
          ) {
            return scrubHooksJson(content, ownedHookPaths, "flat");
          }
          return result;
        },
      };
    case "opencode-package":
      return {
        posixPath: descriptor.path,
        reason: "Remove @opencode-ai/plugin dep; preserve other deps",
        scrub: (content) => scrubOpencodePackageJson(content),
      };
    case "pi-settings":
      return {
        posixPath: descriptor.path,
        reason:
          "Strip Trellis extension/skills/prompts entries; preserve user fields",
        scrub: (content) => scrubPiSettings(content),
      };
    case "managed-markdown":
      return {
        posixPath: descriptor.path,
        reason: "Remove Trellis managed guidance; preserve user content",
        scrub: (content) =>
          scrubManagedMarkdownBlock(
            content,
            descriptor.startMarker,
            descriptor.endMarker,
          ),
      };
    case "zcode-hooks":
      return {
        posixPath: descriptor.path,
        reason: "Strip Trellis ZCode hooks; preserve user fields/events",
        scrub: (content, ownedHookPaths) =>
          scrubZcodeConfigJson(content, ownedHookPaths),
      };
  }
}

function buildStructuredFileSpecs(): Map<string, StructuredFileSpec> {
  const currentSpecs: StructuredFileSpec[] = [
    ...([".claude/settings.json", ".codex/hooks.json"] as const).map(
      (posixPath): StructuredFileSpec => ({
        posixPath,
        reason: "Strip Trellis hooks; preserve user fields",
        scrub: (content, deletedPaths) =>
          scrubHooksJson(content, deletedPaths, "nested"),
      }),
    ),
    {
      posixPath: ".codex/config.toml",
      reason: "Remove Trellis project_doc_fallback_filenames and notes",
      scrub: (content) => scrubCodexConfigToml(content),
    },
    {
      posixPath: FILE_NAMES.AGENTS,
      reason: "Strip Trellis managed block; preserve user instructions",
      scrub: (content) =>
        scrubManagedMarkdownBlock(
          content,
          TRELLIS_BLOCK_START,
          TRELLIS_BLOCK_END,
        ),
    },
  ];
  const specs = new Map<string, StructuredFileSpec>();
  for (const descriptor of RETIRED_STRUCTURED_FILES) {
    const spec = retiredStructuredSpec(descriptor);
    specs.set(spec.posixPath, spec);
  }
  // Current descriptors are authoritative if a path is ever shared/reintroduced.
  for (const spec of currentSpecs) {
    specs.set(spec.posixPath, spec);
  }
  return specs;
}

interface PlannedDeletion {
  posixPath: string;
  absPath: string;
  hash: string;
  expectedContent: string;
}

interface PlannedModification {
  posixPath: string;
  absPath: string;
  hash: string;
  reason: string;
  originalContent: string;
  result: ScrubResult;
}

interface UninstallPlan {
  deletions: PlannedDeletion[];
  modifications: PlannedModification[];
  protected: string[];
  modified: string[];
  malformed: string[];
  unchanged: string[];
  missing: string[];
  unknown: string[];
  /**
   * Owned Research stage Skill paths preserved for lack of retirement
   * evidence. Ownership is retained so a later install of evidence can retry.
   */
  researchSkillDeferred: { posixPath: string; hash: string }[];
}

function buildPlan(
  cwd: string,
  hashes: TemplateHashes,
  unknown: string[],
): UninstallPlan {
  const structured = buildStructuredFileSpecs();
  const ownedHookPaths = [
    ...new Set([
      ...Object.keys(hashes),
      ...[...RETIRED_GENERATED_PATHS].filter((generatedPath) =>
        generatedPath.includes("/hooks/"),
      ),
      ...LEGACY_TRELLIS_HOOK_COMMAND_PATHS,
    ]),
  ];
  const plan: UninstallPlan = {
    deletions: [],
    modifications: [],
    protected: [],
    modified: [],
    malformed: [],
    unchanged: [],
    missing: [],
    unknown,
    researchSkillDeferred: [],
  };

  for (const [posixPath, hash] of Object.entries(hashes)) {
    // Protection is checked before path.join or any filesystem access.
    if (isProtectedResearchPath(posixPath)) {
      plan.protected.push(posixPath);
      continue;
    }

    const absPath = path.join(cwd, ...posixPath.split("/"));
    if (!fs.existsSync(absPath)) {
      plan.missing.push(posixPath);
      continue;
    }

    const spec = structured.get(posixPath);
    if (spec) {
      let content: string;
      try {
        content = fs.readFileSync(absPath, "utf-8");
      } catch {
        plan.malformed.push(posixPath);
        continue;
      }
      const result = spec.scrub(content, ownedHookPaths);
      if (result.outcome === "malformed") {
        plan.malformed.push(posixPath);
      } else if (result.outcome === "unchanged") {
        plan.unchanged.push(posixPath);
      } else if (result.fullyEmpty) {
        plan.deletions.push({
          posixPath,
          absPath,
          hash,
          expectedContent: content,
        });
      } else {
        plan.modifications.push({
          posixPath,
          absPath,
          hash,
          reason: spec.reason,
          originalContent: content,
          result,
        });
      }
      continue;
    }

    try {
      const stat = fs.lstatSync(absPath);
      if (!stat.isFile()) {
        plan.modified.push(posixPath);
        continue;
      }
      const currentContent = fs.readFileSync(absPath, "utf-8");
      const currentHash = computeHash(currentContent);
      if (currentHash === hash) {
        if (!mayUninstallResearchStageSkill(posixPath, currentHash)) {
          plan.researchSkillDeferred.push({ posixPath, hash });
          continue;
        }
        plan.deletions.push({
          posixPath,
          absPath,
          hash,
          expectedContent: currentContent,
        });
      } else {
        plan.modified.push(posixPath);
      }
    } catch {
      plan.modified.push(posixPath);
    }
  }

  return plan;
}

function renderGroup(
  label: string,
  paths: readonly string[],
  marker: string,
  color: (text: string) => string,
): void {
  if (paths.length === 0) return;
  console.log(color(`${label} (${paths.length}):`));
  for (const item of paths) {
    console.log(`  ${color(marker)} ${item}`);
  }
  console.log();
}

function renderPlan(plan: UninstallPlan): void {
  console.log(chalk.bold("\nTrellis uninstall plan\n"));
  renderGroup(
    "Will be deleted",
    plan.deletions.map((item) => item.posixPath),
    "-",
    chalk.red,
  );
  if (plan.modifications.length > 0) {
    console.log(
      chalk.yellow(`Will be scrubbed (${plan.modifications.length}):`),
    );
    for (const item of plan.modifications) {
      console.log(
        `  ${chalk.yellow("~")} ${item.posixPath} ${chalk.gray(`(${item.reason})`)}`,
      );
    }
    console.log();
  }
  renderGroup("Protected research", plan.protected, "=", chalk.green);
  renderGroup("Modified and preserved", plan.modified, "!", chalk.yellow);
  renderGroup("Malformed and preserved", plan.malformed, "?", chalk.yellow);
  renderGroup("Unchanged and preserved", plan.unchanged, "=", chalk.gray);
  renderGroup(
    "Research stage Skills deferred (no immutable retirement authority)",
    plan.researchSkillDeferred.map((item) => item.posixPath),
    "!",
    chalk.yellow,
  );
  renderGroup("Missing", plan.missing, "○", chalk.gray);
  renderGroup("Unknown ownership released", plan.unknown, "○", chalk.gray);
}

async function promptContinue(): Promise<boolean> {
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: "confirm",
      name: "proceed",
      message: "Continue?",
      default: true,
    },
  ]);
  return proceed;
}

interface UninstallSummary {
  deletedFiles: number;
  scrubbedFiles: number;
  deletedDirs: number;
  failedOperations: number;
}

function removeEmptyManagedRoots(cwd: string): number {
  let deletedDirs = 0;
  const sortedManagedDirs = [...ALL_MANAGED_DIRS].sort(
    (a, b) => b.split("/").length - a.split("/").length,
  );

  for (const managedDir of sortedManagedDirs) {
    if (isProtectedResearchPath(managedDir)) continue;
    const abs = path.join(cwd, ...managedDir.split("/"));
    if (!fs.existsSync(abs)) continue;
    try {
      if (!fs.statSync(abs).isDirectory() || fs.readdirSync(abs).length !== 0) {
        continue;
      }
      fs.rmdirSync(abs);
      deletedDirs += 1;

      let parentPosix = managedDir.split("/").slice(0, -1).join("/");
      while (parentPosix.length > 0) {
        if (
          isProtectedResearchPath(parentPosix) ||
          !isManagedPath(parentPosix)
        ) {
          break;
        }
        const parentAbs = path.join(cwd, ...parentPosix.split("/"));
        if (
          !fs.existsSync(parentAbs) ||
          fs.readdirSync(parentAbs).length !== 0
        ) {
          break;
        }
        fs.rmdirSync(parentAbs);
        deletedDirs += 1;
        parentPosix = parentPosix.split("/").slice(0, -1).join("/");
      }
    } catch {
      // Best-effort empty-directory cleanup.
    }
  }

  return deletedDirs;
}

function isMissingFsError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function executePlan(cwd: string, plan: UninstallPlan): UninstallSummary {
  let deletedFiles = 0;
  let scrubbedFiles = 0;
  let failedOperations = 0;
  const retained: TemplateHashes = {};
  const deletedDirCandidates = new Set<string>();

  // Capture deferred Research stage Skill ownership first.
  for (const deferred of plan.researchSkillDeferred) {
    retained[deferred.posixPath] = deferred.hash;
  }

  for (const mod of plan.modifications) {
    try {
      const currentContent = fs.readFileSync(mod.absPath, "utf-8");
      if (currentContent !== mod.originalContent) {
        continue;
      }
      writeFileAtomic(mod.absPath, mod.result.content);
      scrubbedFiles += 1;
    } catch (error) {
      if (isMissingFsError(error)) continue;
      retained[mod.posixPath] = mod.hash;
      failedOperations += 1;
    }
  }

  for (const del of plan.deletions) {
    try {
      const stat = fs.lstatSync(del.absPath);
      if (!stat.isFile()) continue;
      const currentContent = fs.readFileSync(del.absPath, "utf-8");
      if (currentContent !== del.expectedContent) {
        continue;
      }
      fs.unlinkSync(del.absPath);
      deletedFiles += 1;
      deletedDirCandidates.add(path.posix.dirname(del.posixPath));
    } catch (error) {
      if (isMissingFsError(error)) continue;
      retained[del.posixPath] = del.hash;
      failedOperations += 1;
    }
  }

  // All other non-action outcomes intentionally release ownership. Failed
  // delete/write ops and deferred Research stage Skills remain for retry.
  saveHashes(cwd, retained);

  for (const dirPosix of deletedDirCandidates) {
    if (dirPosix === "." || dirPosix.length === 0) continue;
    cleanupEmptyDirs(cwd, dirPosix);
  }

  const deletedDirs = removeEmptyManagedRoots(cwd);
  return { deletedFiles, scrubbedFiles, deletedDirs, failedOperations };
}

/**
 * Legacy diagnostic helper retained for callers that want to inspect dirty
 * Trellis authoring data. Uninstall no longer recursively deletes these trees.
 */
export function collectUncommittedTrellisData(cwd: string): string[] {
  const workflow = DIR_NAMES.WORKFLOW;
  const userDataDirs = [
    `${workflow}/${DIR_NAMES.SPEC}`,
    `${workflow}/${DIR_NAMES.TASKS}`,
    `${workflow}/${DIR_NAMES.WORKSPACE}`,
  ];
  try {
    const out = execFileSync(
      "git",
      ["-C", cwd, "status", "--porcelain", "--", ...userDataDirs],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\S+\s+/, "").replace(/^.*\s->\s/, ""));
  } catch {
    return [];
  }
}

function hasOnlyProtectedResearchWithoutManifest(trellisDir: string): boolean {
  try {
    const entries = fs.readdirSync(trellisDir);
    return (
      entries.length === 0 || entries.every((entry) => entry === "research")
    );
  } catch {
    return false;
  }
}

export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  if (isCwdHomedir() && !homedirBypassEnabled()) {
    console.error(chalk.red(homedirGuardMessage("uninstall")));
    process.exit(1);
  }

  const cwd = process.cwd();
  const trellisDir = path.join(cwd, DIR_NAMES.WORKFLOW);
  if (!fs.existsSync(trellisDir)) {
    console.log(
      chalk.gray(
        "Trellis is not installed in this project (no .trellis/ directory found).",
      ),
    );
    return;
  }

  const manifest = readTemplateHashesStatus(cwd);
  if (manifest.status === "invalid") {
    console.error(
      chalk.red(
        `Trellis ownership manifest is malformed (${manifest.reason}); refusing destructive cleanup.`,
      ),
    );
    process.exit(1);
  }
  if (manifest.status === "missing") {
    if (hasOnlyProtectedResearchWithoutManifest(trellisDir)) {
      console.log(
        chalk.gray(
          "No Trellis-managed ownership remains; protected research data was left unchanged.",
        ),
      );
      return;
    }
    console.error(
      chalk.red(
        "Trellis directory found but manifest is missing — cannot determine which files are managed.",
      ),
    );
    process.exit(1);
  }
  if (Object.keys(manifest.hashes).length === 0) {
    console.log(
      chalk.gray(
        "No Trellis-managed ownership remains; existing project data was left unchanged.",
      ),
    );
    return;
  }

  const configuredPlatforms = getConfiguredPlatforms(cwd);
  const prune = pruneOrphanManifestKeys(
    cwd,
    [...configuredPlatforms],
    manifest.hashes,
    { persist: false },
  );
  const plan = buildPlan(cwd, prune.hashes, prune.pruned);
  renderPlan(plan);

  if (options.dryRun) {
    console.log(chalk.gray("Dry run — no files were modified."));
    return;
  }

  if (!options.yes) {
    if (!process.stdin.isTTY) {
      console.error(
        chalk.red(
          "Refusing to prompt for confirmation in a non-interactive shell. Pass --yes/-y to confirm or --dry-run to preview.",
        ),
      );
      process.exit(1);
    }
    if (!(await promptContinue())) {
      console.log(chalk.yellow("Uninstall cancelled. No files modified."));
      return;
    }
  }

  const summary = executePlan(cwd, plan);
  console.log();
  console.log(
    chalk.green(
      `Uninstalled Trellis ownership: ${summary.deletedFiles} files deleted, ` +
        `${summary.scrubbedFiles} files scrubbed, ${summary.deletedDirs} directories removed, ` +
        `${summary.failedOperations} operations retained for retry.`,
    ),
  );
}
