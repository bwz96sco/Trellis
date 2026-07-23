/**
 * Current workflow resolution and historical bundled-id compatibility.
 *
 * `native` remains readable metadata only. The only workflow content this
 * module can resolve is the current bundled Research workflow.
 */

import { researchWorkflowMdTemplate } from "../templates/trellis/index.js";

export const NATIVE_WORKFLOW_ID = "native";
export const RESEARCH_WORKFLOW_ID = "research";
export const BUNDLED_WORKFLOW_IDS = [
  NATIVE_WORKFLOW_ID,
  RESEARCH_WORKFLOW_ID,
] as const;
export type BundledWorkflowId = (typeof BUNDLED_WORKFLOW_IDS)[number];

export interface ResolvedWorkflowTemplate {
  id: typeof RESEARCH_WORKFLOW_ID;
  type: "workflow";
  name: string;
  description: string;
  path: string;
  content: string;
  source: "bundled";
}

export class WorkflowResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowResolveError";
  }
}

const RESEARCH_WORKFLOW: ResolvedWorkflowTemplate = {
  id: RESEARCH_WORKFLOW_ID,
  type: "workflow",
  name: "Managed Research Workflow",
  description:
    "Root-controlled Quest / Campaign / Run research with explicit Evidence, Claim, Result, and Proposal review",
  path: "bundled:trellis/workflows/research/workflow.md",
  content: researchWorkflowMdTemplate,
  source: "bundled",
};

export function isBundledWorkflowId(id: string): id is BundledWorkflowId {
  return BUNDLED_WORKFLOW_IDS.some((bundledId) => bundledId === id);
}

export function resolveBundledWorkflowTemplate(
  id: typeof RESEARCH_WORKFLOW_ID,
): ResolvedWorkflowTemplate {
  if (id !== RESEARCH_WORKFLOW_ID) {
    throw new WorkflowResolveError(
      `Bundled workflow "${id}" is historical metadata only and has no active template.`,
    );
  }
  return { ...RESEARCH_WORKFLOW };
}
