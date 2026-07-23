import { describe, expect, it } from "vitest";

import {
  configYamlTemplate,
  gitignoreTemplate,
  researchWorkflowMdTemplate,
} from "../../src/templates/trellis/index.js";

describe("Trellis Research templates", () => {
  it("ships only non-empty Research workflow base templates", () => {
    for (const content of [
      researchWorkflowMdTemplate,
      configYamlTemplate,
      gitignoreTemplate,
    ]) {
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("preserves bounded Research workflow authority and direct commands", () => {
    for (const token of [
      "## Authority model",
      "## Stage capabilities",
      "## Root loop",
      "## Invariants",
      "trellis research status --json",
      "trellis research validate --json",
      "trellis research dispatch prepare",
      "trellis research dispatch context",
      "trellis research dispatch record-result",
      "trellis research dispatch apply",
      "trellis research dispatch reject",
    ]) {
      expect(researchWorkflowMdTemplate).toContain(token);
    }
    expect(researchWorkflowMdTemplate).not.toContain("[workflow-state:");
    expect(researchWorkflowMdTemplate).not.toContain(".trellis/scripts");
  });

  it("keeps Research runtime paths ignored", () => {
    expect(gitignoreTemplate).toContain(".runtime/");
    expect(gitignoreTemplate).toContain(".backup-*");
    expect(gitignoreTemplate).toContain("__pycache__");
    expect(gitignoreTemplate).not.toContain(".developer");
  });
});
