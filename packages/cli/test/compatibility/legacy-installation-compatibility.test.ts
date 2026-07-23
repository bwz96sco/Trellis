import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const FIXTURE_ROOT = fileURLToPath(
  new URL("../fixtures/legacy-0.6.7-multi-host/", import.meta.url),
);
const PROJECT_ROOT = path.join(FIXTURE_ROOT, "project");

const HISTORICAL_HOST_PATHS = {
  "claude-code": ".claude/settings.json",
  cursor: ".cursor/hooks.json",
  opencode: ".opencode/package.json",
  codex: ".codex/config.toml",
  kilo: ".kilocode/workflows/continue.md",
  kiro: ".kiro/agents/trellis.json",
  gemini: ".gemini/settings.json",
  antigravity: ".agent/workflows/continue.md",
  devin: ".devin/workflows/trellis-continue.md",
  qoder: ".qoder/settings.json",
  codebuddy: ".codebuddy/settings.json",
  copilot: ".github/copilot/hooks.json",
  droid: ".factory/settings.json",
  pi: ".pi/settings.json",
  reasonix: ".reasonix/skills/trellis-check/SKILL.md",
  zcode: ".zcode/config.json",
  trae: ".trae/settings.json",
  omp: ".omp/extensions/trellis/index.ts",
  grok: ".grok/commands/trellis-continue.md",
} as const;

interface LegacyFixture {
  fixtureVersion: number;
  installedTrellisVersion: string;
  hosts: Record<string, string>;
  ownership: {
    trackedModified: string[];
    trackedMixedConfiguration: string[];
    sharedGenerated: string[];
    legacyGenerated: string[];
    untrackedUserOwned: string[];
  };
}

interface StoredHashes {
  __version: number;
  hashes: Record<string, string>;
}

function readProjectFile(relative: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, ...relative.split("/")), "utf-8");
}

function contentHash(content: string): string {
  return createHash("sha256")
    .update(content.replace(/\r\n/g, "\n"), "utf-8")
    .digest("hex");
}

describe("frozen 0.6.7 multi-host installation fixture", () => {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(FIXTURE_ROOT, "fixture.json"), "utf-8"),
  ) as LegacyFixture;
  const manifest = JSON.parse(
    readProjectFile(".trellis/.template-hashes.json"),
  ) as StoredHashes;

  it("enumerates the historical 19 host IDs and representative owned paths", () => {
    expect(fixture.fixtureVersion).toBe(1);
    expect(fixture.installedTrellisVersion).toBe("0.6.7");
    expect(readProjectFile(".trellis/.version")).toBe("0.6.7\n");
    expect(fixture.hosts).toEqual(HISTORICAL_HOST_PATHS);

    for (const [host, relative] of Object.entries(HISTORICAL_HOST_PATHS)) {
      expect(fs.existsSync(path.join(PROJECT_ROOT, relative)), host).toBe(true);
      expect(manifest.hashes, host).toHaveProperty(relative);
    }
  });

  it("freezes a valid v2 ownership manifest with pristine and modified evidence", () => {
    expect(manifest.__version).toBe(2);
    for (const [relative, digest] of Object.entries(manifest.hashes)) {
      expect(relative).not.toContain("\\");
      expect(path.posix.isAbsolute(relative)).toBe(false);
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }

    for (const relative of Object.values(HISTORICAL_HOST_PATHS)) {
      const currentDigest = contentHash(readProjectFile(relative));
      if (fixture.ownership.trackedModified.includes(relative)) {
        expect(currentDigest, relative).not.toBe(manifest.hashes[relative]);
      } else {
        expect(currentDigest, relative).toBe(manifest.hashes[relative]);
      }
    }
    expect(fixture.ownership.trackedModified).toEqual([".cursor/hooks.json"]);
  });

  it("captures shared, legacy, mixed, and untracked user-owned paths", () => {
    for (const relative of [
      ...fixture.ownership.sharedGenerated,
      ...fixture.ownership.legacyGenerated,
    ]) {
      expect(contentHash(readProjectFile(relative)), relative).toBe(
        manifest.hashes[relative],
      );
    }

    expect(fixture.ownership.trackedMixedConfiguration).toEqual([
      ".claude/settings.json",
      ".codex/config.toml",
      "AGENTS.md",
    ]);
    expect(readProjectFile(".claude/settings.json")).toContain("userTheme");
    expect(readProjectFile(".codex/config.toml")).toContain('model = "gpt-5"');
    expect(readProjectFile("AGENTS.md")).toContain(
      "Keep this user-authored introduction.",
    );
    expect(readProjectFile("AGENTS.md")).toContain("<!-- TRELLIS:START -->");

    for (const relative of fixture.ownership.untrackedUserOwned) {
      expect(fs.existsSync(path.join(PROJECT_ROOT, relative)), relative).toBe(
        true,
      );
      expect(manifest.hashes, relative).not.toHaveProperty(relative);
    }
  });
});
