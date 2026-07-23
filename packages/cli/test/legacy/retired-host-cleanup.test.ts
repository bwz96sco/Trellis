import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import type snapshotJson from "../../src/legacy/retired-host-generated-paths.json";
import { PLATFORM_MANAGED_DIRS } from "../../src/configurators/index.js";
import {
  LEGACY_ALIAS_ROOTS,
  LEGACY_CLEANUP_MANAGED_ROOTS,
  RETIRED_GENERATED_PATHS,
  RETIRED_HOST_IDS,
  RETIRED_MANAGED_ROOTS,
  RETIRED_STRUCTURED_FILES,
} from "../../src/legacy/retired-host-cleanup.js";

const loadJson = createRequire(import.meta.url);
const snapshot = loadJson(
  "../../src/legacy/retired-host-generated-paths.json",
) as typeof snapshotJson;

const EXPECTED_RETIRED_IDS = [
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
] as const;

const EXPECTED_HOST_PATH_COUNTS = {
  cursor: 61,
  opencode: 64,
  kilo: 55,
  kiro: 62,
  gemini: 60,
  antigravity: 55,
  devin: 55,
  qoder: 60,
  codebuddy: 61,
  copilot: 62,
  droid: 61,
  pi: 60,
  reasonix: 56,
  zcode: 61,
  trae: 60,
  omp: 58,
  grok: 58,
} as const;

const EXPECTED_RETIRED_MANAGED_ROOTS = [
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

describe("retired host cleanup inventory", () => {
  it("freezes snapshot metadata and exactly the 17 retired IDs", () => {
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.sourceVersion).toBe("0.6.7");
    expect(Object.keys(snapshot.hosts)).toEqual(EXPECTED_RETIRED_IDS);
    expect(RETIRED_HOST_IDS).toEqual(EXPECTED_RETIRED_IDS);
    expect(RETIRED_HOST_IDS).not.toContain("claude-code");
    expect(RETIRED_HOST_IDS).not.toContain("codex");
  });

  it("pins each frozen host path count and sorted uniqueness", () => {
    for (const host of RETIRED_HOST_IDS) {
      const paths = snapshot.hosts[host];
      expect(paths).toHaveLength(EXPECTED_HOST_PATH_COUNTS[host]);
      expect(paths).toEqual([...new Set(paths)].sort());
    }
  });

  it("contains exactly 1,009 unique safe exact paths", () => {
    const snapshotUnion = new Set(
      RETIRED_HOST_IDS.flatMap((host) => snapshot.hosts[host]),
    );
    expect(snapshotUnion.size).toBe(1009);
    expect(RETIRED_GENERATED_PATHS).toEqual(snapshotUnion);

    for (const generatedPath of RETIRED_GENERATED_PATHS) {
      expect(generatedPath).not.toMatch(/[\\\0*?[\]{}]/);
      expect(generatedPath).not.toMatch(/^(?:\/|[A-Za-z]:)/);
      expect(generatedPath).not.toMatch(/(?:^|\/)\.\.?(?:\/|$)/);
      expect(generatedPath.endsWith("/")).toBe(false);
    }

    expect(RETIRED_GENERATED_PATHS.has(".trae/settings.json")).toBe(false);
    expect(RETIRED_STRUCTURED_FILES).toContainEqual({
      path: ".trae/settings.json",
      kind: "hooks",
      layout: "nested",
    });
  });

  it("pins the frozen retired managed roots without active collectors", () => {
    expect(RETIRED_MANAGED_ROOTS).toEqual(EXPECTED_RETIRED_MANAGED_ROOTS);
  });

  it("keeps cleanup-only roots separate from exact active roots", () => {
    expect(LEGACY_ALIAS_ROOTS).toEqual([
      ".iflow",
      ".windsurf",
      ".zcode/cli/agents",
    ]);
    expect(PLATFORM_MANAGED_DIRS).toEqual([
      ".claude",
      ".codex",
      ".agents/skills",
    ]);
    for (const root of LEGACY_ALIAS_ROOTS) {
      expect(PLATFORM_MANAGED_DIRS).not.toContain(root);
      expect(LEGACY_CLEANUP_MANAGED_ROOTS).toContain(root);
    }
  });
});
