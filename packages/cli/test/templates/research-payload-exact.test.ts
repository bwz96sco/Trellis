import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_PAYLOAD_PATHS,
  collectResearchPlatformPayload,
} from "../../src/configurators/research-payload.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";
import { RESEARCH_STAGE_SKILL_NAMES } from "../../src/legacy/research-skill-retirement.js";
import { getResearchWorkerTemplate as getClaudeResearchWorkerTemplate } from "../../src/templates/claude/index.js";
import { getResearchWorkerTemplate as getCodexResearchWorkerTemplate } from "../../src/templates/codex/index.js";

const STAGE_SKILL_SOURCE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/common/bundled-skills",
);

describe("exact Research payload template APIs", () => {
  it("has no Research stage Skill source roots after C09", () => {
    for (const name of RESEARCH_STAGE_SKILL_NAMES) {
      expect(
        fs.existsSync(path.join(STAGE_SKILL_SOURCE_ROOT, name)),
        `source root must be removed: ${name}`,
      ).toBe(false);
    }
  });

  it("loads the exact Claude and Codex Research workers", () => {
    const claude = getClaudeResearchWorkerTemplate();
    const codex = getCodexResearchWorkerTemplate();

    expect(claude.name).toBe("trellis-research-worker");
    expect(codex.name).toBe("trellis-research-worker");
    expect(claude.content.length).toBeGreaterThan(0);
    expect(codex.content.length).toBeGreaterThan(0);
  });

  it("collects workers without generating Research stage Skill directories", () => {
    const claude = collectResearchPlatformPayload("claude-code");
    const codex = collectResearchPlatformPayload("codex");

    expect(claude.get(RESEARCH_PAYLOAD_PATHS.claude.worker)).toBe(
      replacePythonCommandLiterals(getClaudeResearchWorkerTemplate().content),
    );
    expect(codex.get(RESEARCH_PAYLOAD_PATHS.codex.worker)).toBe(
      replacePythonCommandLiterals(getCodexResearchWorkerTemplate().content),
    );

    for (const name of RESEARCH_STAGE_SKILL_NAMES) {
      expect(claude.has(`.claude/skills/${name}/SKILL.md`)).toBe(false);
      expect(codex.has(`.agents/skills/${name}/SKILL.md`)).toBe(false);
    }
    expect(
      [...claude.keys()].some((key) => key.includes("/skills/trellis-research-")),
    ).toBe(false);
    expect(
      [...codex.keys()].some((key) => key.includes("/skills/trellis-research-")),
    ).toBe(false);
  });

  it("keeps malformed structured host files byte-identical while collecting exact assets", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-exact-payload-"));
    try {
      fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
      fs.mkdirSync(path.join(root, ".codex"), { recursive: true });
      const malformedClaude = "{ not-json\n";
      const malformedCodexHooks = "[ not-json\n";
      const malformedCodexConfig = "this is not = valid = toml\n";
      fs.writeFileSync(path.join(root, ".claude/settings.json"), malformedClaude);
      fs.writeFileSync(path.join(root, ".codex/hooks.json"), malformedCodexHooks);
      fs.writeFileSync(path.join(root, ".codex/config.toml"), malformedCodexConfig);

      const claude = collectResearchPlatformPayload("claude-code", root, {
        withStatusline: true,
      });
      const codex = collectResearchPlatformPayload("codex", root);

      expect(claude.get(RESEARCH_PAYLOAD_PATHS.claude.config)).toBe(malformedClaude);
      expect(claude.has(RESEARCH_PAYLOAD_PATHS.claude.statusline)).toBe(true);
      expect(codex.get(".codex/hooks.json")).toBe(malformedCodexHooks);
      expect(codex.get(".codex/config.toml")).toBe(malformedCodexConfig);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
