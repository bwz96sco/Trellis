import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_PAYLOAD_PATHS,
  RESEARCH_STAGE_SKILL_NAMES,
  collectResearchPlatformPayload,
} from "../../src/configurators/research-payload.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";
import { getResearchWorkerTemplate as getClaudeResearchWorkerTemplate } from "../../src/templates/claude/index.js";
import { getResearchWorkerTemplate as getCodexResearchWorkerTemplate } from "../../src/templates/codex/index.js";
import { getResearchStageSkillTemplates } from "../../src/templates/common/index.js";

describe("exact Research payload template APIs", () => {
  it("loads exactly the nine named Research stage bundles without neighboring generic skills", () => {
    const exact = getResearchStageSkillTemplates();
    expect(exact.map((skill) => skill.name)).toEqual(RESEARCH_STAGE_SKILL_NAMES);
    expect(exact.every((skill) => skill.files.some((file) => file.relativePath === "SKILL.md"))).toBe(
      true,
    );

    expect(exact.map((skill) => skill.name)).not.toContain("trellis-meta");
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
    const skills = getResearchStageSkillTemplates();
    const claude = collectResearchPlatformPayload("claude-code");
    const codex = collectResearchPlatformPayload("codex");

    expect(claude.get(RESEARCH_PAYLOAD_PATHS.claude.worker)).toBe(
      replacePythonCommandLiterals(getClaudeResearchWorkerTemplate().content),
    );
    expect(codex.get(RESEARCH_PAYLOAD_PATHS.codex.worker)).toBe(
      replacePythonCommandLiterals(getCodexResearchWorkerTemplate().content),
    );

    // C08: generation stopped; dormant source templates remain loadable for C09.
    expect(skills).toHaveLength(RESEARCH_STAGE_SKILL_NAMES.length);
    for (const skill of skills) {
      for (const file of skill.files) {
        expect(
          claude.has(`.claude/skills/${skill.name}/${file.relativePath}`),
        ).toBe(false);
        expect(
          codex.has(`.agents/skills/${skill.name}/${file.relativePath}`),
        ).toBe(false);
      }
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
