import { describe, expect, it } from "vitest";
import { AI_TOOLS, type AITool } from "../../src/types/ai-tools.js";

const ALL_TOOL_IDS = Object.keys(AI_TOOLS) as AITool[];

describe("AI_TOOLS registry", () => {
  it("contains exactly Claude Code and Codex", () => {
    expect(ALL_TOOL_IDS).toEqual(["claude-code", "codex"]);
    expect(AI_TOOLS["claude-code"].cliFlag).toBe("claude");
    expect(AI_TOOLS.codex.cliFlag).toBe("codex");
  });

  it("keeps Claude as the sole non-interactive default", () => {
    expect(
      ALL_TOOL_IDS.filter((id) => AI_TOOLS[id].defaultChecked),
    ).toEqual(["claude-code"]);
  });

  it("keeps Codex ownership of the shared Agent Skills root", () => {
    expect(AI_TOOLS.codex.configDir).toBe(".codex");
    expect(AI_TOOLS.codex.supportsAgentSkills).toBe(true);
  });
});
