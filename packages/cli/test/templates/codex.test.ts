import { proposalSchema, resultSchema } from "@mindfoldhq/trellis-core/research";
import { describe, expect, it } from "vitest";

import {
  getConfigTemplate,
  getHooksConfig,
  getResearchWorkerTemplate,
} from "../../src/templates/codex/index.js";

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

  it("pins the Dispatch-ID envelope and Context-first Procedure order", () => {
    const content = researchWorkerTemplate();
    const orderedMarkers = [
      "## 1. Validate the exact invocation without a process",
      "## 2. Run Context as the first process",
      "## 3. Pre-Context failures are non-materializable",
      "## 4. Execute the embedded Procedure only",
      "## 5. Forbidden actions",
      "## 6. Return exact raw JSON after valid Context",
    ];
    const indexes = orderedMarkers.map((marker) => content.indexOf(marker));
    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    expect(content).toContain(
      "^Research dispatch: (dsp_[0-9a-f]{8}-[0-9a-f]{4}",
    );
    expect(content).toContain(
      "trellis research dispatch context <dsp-id> --host codex --root . --json",
    );
    expect(content).toContain("context.procedure.instructions");
    expect(content).not.toContain("--skill-name");
    expect(content).not.toContain("selectedSkill");
  });

  it("fails closed and forbids nested agents, escalation, and canonical mutation", () => {
    const content = researchWorkerTemplate();
    for (const prohibition of [
      "perform filesystem discovery",
      "package installer",
      "Never call `spawn_agent`",
      "record a Result or consume an approval",
      "review, accept, reject, or apply a Proposal",
      "danger-full-access",
      "--add-dir",
      "git commit",
      "git push",
      "git merge",
      "git rebase",
    ]) {
      expect(content).toContain(prohibition);
    }
    expect(content).toContain('sandbox_mode = "workspace-write"');
    expect(content).toContain("multi_agent = false");
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
      .replaceAll("<proposal-id>", "prp_11111111-1111-4111-8111-111111111111")
      .replaceAll("<dispatch-id>", "dsp_33333333-3333-4333-8333-333333333333")
      .replaceAll("<run-id>", "run_44444444-4444-4444-8444-444444444444")
      .replaceAll("<quest-id>", "qst_55555555-5555-4555-8555-555555555555")
      .replaceAll("<timestamp>", "2026-07-20T12:00:00.000Z");
    const envelope = JSON.parse(materialized) as Record<string, unknown>;
    expect(Object.keys(envelope)).toEqual(["result", "proposal"]);
    const result = resultSchema.parse(envelope.result);
    const proposal = proposalSchema.parse(envelope.proposal);
    expect(result.dispatchId).toBe(proposal.dispatchId);
    expect(proposal.status).toBe("pending");
    expect(proposal.operations).toEqual([]);
  });
});
