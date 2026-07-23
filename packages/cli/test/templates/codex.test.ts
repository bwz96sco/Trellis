import { proposalSchema, resultSchema } from "@mindfoldhq/trellis-core/research";
import { describe, expect, it } from "vitest";

import { RESEARCH_STAGE_CAPABILITIES } from "../../src/commands/research/legacy-skill-routing.js";
import {
  getConfigTemplate,
  getHooksConfig,
  getResearchWorkerTemplate,
} from "../../src/templates/codex/index.js";

const OPTIONAL_RESEARCH_SKILLS = Object.values(RESEARCH_STAGE_CAPABILITIES)
  .filter((definition) => definition.dispatchable)
  .map((definition) => definition.optionalSkill);

function researchWorkerTemplate(): string {
  const worker = getResearchWorkerTemplate();
  expect(worker.name).toBe("trellis-research-worker");
  return worker.content;
}

describe("Codex Research templates", () => {
  it("returns the Research project config without the incompatible feature block", () => {
    const config = getConfigTemplate();
    expect(config.targetPath).toBe("config.toml");
    expect(config.content).toContain("project_doc_fallback_filenames");
    expect(config.content).toContain("AGENTS.md");
    expect(config.content).not.toMatch(/^\[features\.multi_agent_v2\]/m);
  });

  it("returns valid Research hooks configuration", () => {
    const hooks = JSON.parse(getHooksConfig()) as { hooks?: unknown };
    expect(hooks.hooks).toBeDefined();
  });

  it("pins the one-line pointer, name-only discovery, and preflight-first order", () => {
    const content = researchWorkerTemplate();
    const orderedMarkers = [
      "## 1. Validate the invocation envelope",
      "## 2. Discover optional skill names only",
      "## 3. Run the C07 preflight as the first process",
      "## 4. Validate the preflight response",
      "## 5. Load exactly the selected skill",
      "## 6. Execute only bounded work",
      "## 7. Return raw JSON",
    ];
    const indexes = orderedMarkers.map((marker) => content.indexOf(marker));
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    for (const skillName of OPTIONAL_RESEARCH_SKILLS) {
      expect(content).toContain(`\`${skillName}\``);
    }
    expect(content).toContain("--host codex");
    expect(content).toContain("--skill-name <canonical-name>");
  });

  it("fails closed and forbids nested agents and canonical mutation", () => {
    const content = researchWorkerTemplate();
    for (const prohibition of [
      "Do not manually read or parse `request.json`",
      "Do not use `jq`, pipes, redirects",
      "Never call `spawn_agent`",
      "trellis research dispatch record-result",
      "trellis research dispatch apply",
      "trellis research dispatch reject",
      "git commit",
      "git push",
      "git merge",
      "git rebase",
    ]) {
      expect(content).toContain(prohibition);
    }
    expect(content).not.toContain("Required: Load Trellis Context First");
    expect(content).not.toContain("{TASK_DIR}");
  });

  it("provides a strict Result plus pending Proposal example", () => {
    const match = researchWorkerTemplate().match(
      /RESULT_PROPOSAL_EXAMPLE_START\n([\s\S]*?)\nRESULT_PROPOSAL_EXAMPLE_END/,
    );
    expect(match).not.toBeNull();
    const materialized = (match?.[1] ?? "")
      .replaceAll("<result-id>", "res_11111111-1111-4111-8111-111111111111")
      .replaceAll("<proposal-id>", "prp_22222222-2222-4222-8222-222222222222")
      .replaceAll("<dispatch-id>", "dsp_33333333-3333-4333-8333-333333333333")
      .replaceAll("<run-id>", "run_44444444-4444-4444-8444-444444444444")
      .replaceAll("<quest-id>", "qst_55555555-5555-4555-8555-555555555555")
      .replaceAll("<timestamp>", "2026-07-20T12:00:00.000Z");
    const envelope = JSON.parse(materialized) as Record<string, unknown>;
    const result = resultSchema.parse(envelope.result);
    const proposal = proposalSchema.parse(envelope.proposal);
    expect(result.dispatchId).toBe(proposal.dispatchId);
    expect(proposal.status).toBe("pending");
    expect(proposal.operations).toEqual([]);
  });
});
