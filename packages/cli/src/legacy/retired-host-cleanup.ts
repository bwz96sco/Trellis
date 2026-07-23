import { createRequire } from "node:module";
import path from "node:path";

import type snapshotJson from "./retired-host-generated-paths.json";

export type RetiredHostId =
  | "cursor"
  | "opencode"
  | "kilo"
  | "kiro"
  | "gemini"
  | "antigravity"
  | "devin"
  | "qoder"
  | "codebuddy"
  | "copilot"
  | "droid"
  | "pi"
  | "reasonix"
  | "zcode"
  | "trae"
  | "omp"
  | "grok";

export type RetiredStructuredFile =
  | { path: string; kind: "hooks"; layout: "flat" | "nested" }
  | { path: string; kind: "opencode-package" }
  | { path: string; kind: "pi-settings" }
  | {
      path: string;
      kind: "managed-markdown";
      startMarker: string;
      endMarker: string;
    }
  | { path: ".zcode/config.json"; kind: "zcode-hooks" };

interface RetiredHostGeneratedPathSnapshot {
  schemaVersion: 1;
  sourceVersion: "0.6.7";
  hosts: Record<RetiredHostId, string[]>;
}

export const RETIRED_HOST_IDS = [
  "cursor",
  "opencode",
  "kilo",
  "kiro",
  "gemini",
  "antigravity",
  "devin",
  "qoder",
  "codebuddy",
  "copilot",
  "droid",
  "pi",
  "reasonix",
  "zcode",
  "trae",
  "omp",
  "grok",
] as const satisfies readonly RetiredHostId[];

const loadJson = createRequire(import.meta.url);
const rawSnapshot: unknown = loadJson(
  "./retired-host-generated-paths.json",
) as typeof snapshotJson;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactGeneratedPath(value: unknown, host: RetiredHostId): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid retired generated path for ${host}`);
  }
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    /[*?[\]{}]/.test(value) ||
    value.endsWith("/")
  ) {
    throw new Error(`Unsafe retired generated path for ${host}: ${value}`);
  }

  const segments = value.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    ) ||
    path.posix.normalize(value) !== value
  ) {
    throw new Error(
      `Non-normalized retired generated path for ${host}: ${value}`,
    );
  }
  return value;
}

function loadSnapshot(value: unknown): RetiredHostGeneratedPathSnapshot {
  if (!isPlainObject(value)) {
    throw new Error("Retired generated path snapshot must be an object");
  }
  if (value.schemaVersion !== 1 || value.sourceVersion !== "0.6.7") {
    throw new Error("Unsupported retired generated path snapshot version");
  }
  if (!isPlainObject(value.hosts)) {
    throw new Error("Retired generated path snapshot hosts must be an object");
  }

  const hostKeys = Object.keys(value.hosts);
  if (
    hostKeys.length !== RETIRED_HOST_IDS.length ||
    hostKeys.some((host, index) => host !== RETIRED_HOST_IDS[index])
  ) {
    throw new Error("Retired generated path snapshot host set drifted");
  }

  const hosts = {} as Record<RetiredHostId, string[]>;
  const union = new Set<string>();
  for (const host of RETIRED_HOST_IDS) {
    const rawPaths = value.hosts[host];
    if (!Array.isArray(rawPaths)) {
      throw new Error(`Retired generated paths for ${host} must be an array`);
    }
    const paths = rawPaths.map((item) => assertExactGeneratedPath(item, host));
    const sorted = [...paths].sort();
    if (
      new Set(paths).size !== paths.length ||
      paths.some((item, index) => item !== sorted[index])
    ) {
      throw new Error(
        `Retired generated paths for ${host} must be sorted/unique`,
      );
    }
    for (const generatedPath of paths) {
      if (union.has(generatedPath)) {
        throw new Error(`Duplicate retired generated path: ${generatedPath}`);
      }
      union.add(generatedPath);
    }
    hosts[host] = paths;
  }

  if (union.size !== 1009) {
    throw new Error(
      `Retired generated path snapshot must contain 1009 paths, found ${union.size}`,
    );
  }

  return { schemaVersion: 1, sourceVersion: "0.6.7", hosts };
}

const snapshot = loadSnapshot(rawSnapshot);

export const RETIRED_GENERATED_PATHS: ReadonlySet<string> = new Set(
  RETIRED_HOST_IDS.flatMap((host) => snapshot.hosts[host]),
);

/** Managed roots frozen from the 0.6.7 retired-host registry entries. */
export const RETIRED_MANAGED_ROOTS = [
  ".cursor",
  ".opencode",
  ".kilocode",
  ".kiro/skills",
  ".kiro/agents",
  ".kiro/hooks",
  ".gemini",
  ".agents/skills",
  ".agent/workflows",
  ".agent/skills",
  ".devin/workflows",
  ".devin/skills",
  ".qoder",
  ".codebuddy",
  ".github/copilot",
  ".github/agents",
  ".github/copilot-instructions.md",
  ".github/hooks",
  ".github/prompts",
  ".github/skills",
  ".factory",
  ".pi",
  ".reasonix",
  ".zcode",
  ".zcode/cli/agents",
  ".zcode/agents",
  ".zcode/commands",
  ".zcode/skills",
  ".zcode/hooks",
  ".trae",
  ".omp",
  ".grok",
  ".grok/skills",
  ".grok/commands",
  ".grok/agents",
] as const;

/** Historical host roots represented only by migrations or frozen fixtures. */
export const LEGACY_ALIAS_ROOTS = [
  ".iflow",
  ".windsurf",
  ".zcode/cli/agents",
] as const;

/** Backup/confirmed-empty cleanup roots only; membership is not ownership. */
export const LEGACY_CLEANUP_MANAGED_ROOTS = [
  ...new Set([...RETIRED_MANAGED_ROOTS, ...LEGACY_ALIAS_ROOTS]),
] as const;

const COPILOT_BLOCK_START = "<!-- TRELLIS:COPILOT-GUIDANCE:START -->";
const COPILOT_BLOCK_END = "<!-- TRELLIS:COPILOT-GUIDANCE:END -->";

export const RETIRED_STRUCTURED_FILES: readonly RetiredStructuredFile[] = [
  { path: ".gemini/settings.json", kind: "hooks", layout: "nested" },
  { path: ".factory/settings.json", kind: "hooks", layout: "nested" },
  { path: ".codebuddy/settings.json", kind: "hooks", layout: "nested" },
  { path: ".qoder/settings.json", kind: "hooks", layout: "nested" },
  { path: ".trae/hooks.json", kind: "hooks", layout: "nested" },
  { path: ".trae/settings.json", kind: "hooks", layout: "nested" },
  { path: ".cursor/hooks.json", kind: "hooks", layout: "flat" },
  { path: ".github/copilot/hooks.json", kind: "hooks", layout: "flat" },
  { path: ".opencode/package.json", kind: "opencode-package" },
  { path: ".pi/settings.json", kind: "pi-settings" },
  {
    path: ".github/copilot-instructions.md",
    kind: "managed-markdown",
    startMarker: COPILOT_BLOCK_START,
    endMarker: COPILOT_BLOCK_END,
  },
  { path: ".zcode/config.json", kind: "zcode-hooks" },
];

/** Exact hook paths referenced by frozen configs but absent from minimal manifests. */
export const LEGACY_TRELLIS_HOOK_COMMAND_PATHS = [
  ".trellis/hooks/session-start.py",
  ".trellis/hooks/inject-workflow-state.py",
] as const;
