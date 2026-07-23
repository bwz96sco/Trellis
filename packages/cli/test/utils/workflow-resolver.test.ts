import { describe, expect, it } from "vitest";

import { researchWorkflowMdTemplate } from "../../src/templates/trellis/index.js";
import * as workflowResolver from "../../src/utils/workflow-resolver.js";
import {
  isBundledWorkflowId,
  NATIVE_WORKFLOW_ID,
  RESEARCH_WORKFLOW_ID,
  resolveBundledWorkflowTemplate,
} from "../../src/utils/workflow-resolver.js";

describe("historical bundled workflow ids", () => {
  it.each([NATIVE_WORKFLOW_ID, RESEARCH_WORKFLOW_ID])(
    "accepts %s as strict bundled metadata",
    (id) => {
      expect(isBundledWorkflowId(id)).toBe(true);
    },
  );

  it("rejects unknown metadata ids", () => {
    expect(isBundledWorkflowId("custom")).toBe(false);
  });
});

describe("Research workflow resolution", () => {
  it("resolves only the current bundled Research template", () => {
    expect(resolveBundledWorkflowTemplate(RESEARCH_WORKFLOW_ID)).toEqual({
      id: RESEARCH_WORKFLOW_ID,
      type: "workflow",
      name: "Managed Research Workflow",
      description:
        "Root-controlled Quest / Campaign / Run research with explicit Evidence, Claim, Result, and Proposal review",
      path: "bundled:trellis/workflows/research/workflow.md",
      content: researchWorkflowMdTemplate,
      source: "bundled",
    });
  });

  it("does not resolve historical native metadata", () => {
    expect(() =>
      resolveBundledWorkflowTemplate(
        NATIVE_WORKFLOW_ID as typeof RESEARCH_WORKFLOW_ID,
      ),
    ).toThrow(/historical metadata only/i);
  });

  it("does not export generic list or custom-source resolver surfaces", () => {
    expect(workflowResolver).not.toHaveProperty("listWorkflowTemplates");
    expect(workflowResolver).not.toHaveProperty("resolveWorkflowTemplate");
  });
});
