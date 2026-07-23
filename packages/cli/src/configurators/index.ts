/**
 * Current platform registry and derived helpers.
 *
 * Active installation, detection, update generation, and runtime integration
 * are limited to Claude Code and Codex. Historical host cleanup is supplied by
 * the separate frozen legacy inventory.
 */

import fs from "node:fs";
import path from "node:path";
import {
  AI_TOOLS,
  getManagedPaths,
  type AITool,
  type CliFlag,
} from "../types/ai-tools.js";
import { LEGACY_CLEANUP_MANAGED_ROOTS } from "../legacy/retired-host-cleanup.js";
import { configureClaude } from "./claude.js";
import { configureCodex } from "./codex.js";
import type { PlatformConfigureOptions } from "./shared.js";
import { collectResearchPlatformPayload } from "./research-payload.js";

interface PlatformFunctions {
  configure: (cwd: string, options?: PlatformConfigureOptions) => Promise<void>;
  collectTemplates: (
    cwd?: string,
    options?: PlatformConfigureOptions,
  ) => Map<string, string>;
}

const PLATFORM_FUNCTIONS: Record<AITool, PlatformFunctions> = {
  "claude-code": {
    configure: configureClaude,
    collectTemplates: (cwd, options) =>
      collectResearchPlatformPayload("claude-code", cwd, options),
  },
  codex: {
    configure: configureCodex,
    collectTemplates: (cwd) => collectResearchPlatformPayload("codex", cwd),
  },
};

export const PLATFORM_IDS = Object.keys(AI_TOOLS) as AITool[];

export const CONFIG_DIRS = PLATFORM_IDS.map((id) => AI_TOOLS[id].configDir);

export const PLATFORM_MANAGED_DIRS = PLATFORM_IDS.flatMap((id) =>
  getManagedPaths(id),
);

/**
 * Current and cleanup-only roots used by backup and confirmed-empty cleanup.
 * Legacy root membership never configures or detects a platform and never
 * proves ownership of descendants.
 */
export const ALL_MANAGED_DIRS = [
  ".trellis",
  ...new Set([...PLATFORM_MANAGED_DIRS, ...LEGACY_CLEANUP_MANAGED_ROOTS]),
];

/** Detect current platforms using only their platform-specific config roots. */
export function getConfiguredPlatforms(cwd: string): Set<AITool> {
  const platforms = new Set<AITool>();
  for (const id of PLATFORM_IDS) {
    if (fs.existsSync(path.join(cwd, AI_TOOLS[id].configDir))) {
      platforms.add(id);
    }
  }
  return platforms;
}

export function getPlatformsWithPythonHooks(): AITool[] {
  return PLATFORM_IDS.filter((id) => AI_TOOLS[id].hasPythonHooks);
}

export function isManagedPath(dirPath: string): boolean {
  const normalized = dirPath.replace(/\\/g, "/");
  return ALL_MANAGED_DIRS.some(
    (dir) => normalized.startsWith(`${dir}/`) || normalized === dir,
  );
}

export function isManagedRootDir(dirName: string): boolean {
  return ALL_MANAGED_DIRS.includes(dirName);
}

export function getPlatformManagedPaths(platformId: AITool): string[] {
  return getManagedPaths(platformId);
}

export function configurePlatform(
  platformId: AITool,
  cwd: string,
  options?: PlatformConfigureOptions,
): Promise<void> {
  return PLATFORM_FUNCTIONS[platformId].configure(cwd, options);
}

export function collectPlatformTemplates(
  platformId: AITool,
  cwd?: string,
  options?: PlatformConfigureOptions,
): Map<string, string> {
  return PLATFORM_FUNCTIONS[platformId].collectTemplates(cwd, options);
}

export function getInitToolChoices(): {
  key: CliFlag;
  name: string;
  defaultChecked: boolean;
  platformId: AITool;
}[] {
  return PLATFORM_IDS.map((id) => ({
    key: AI_TOOLS[id].cliFlag,
    name: AI_TOOLS[id].name,
    defaultChecked: AI_TOOLS[id].defaultChecked,
    platformId: id,
  }));
}

export function resolveCliFlag(flag: string): AITool | undefined {
  return PLATFORM_IDS.find((id) => AI_TOOLS[id].cliFlag === flag);
}
