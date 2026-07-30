/**
 * Root-owned bounded composition descriptors (Phase-2).
 * Workers never launch composition edges.
 */

export type CompositionEdgeId = "COMP-001" | "COMP-002" | "COMP-003";

export interface FrozenCompositionEdge {
  readonly id: CompositionEdgeId;
  readonly parentPackage: string;
  readonly childPackageOrAdapter: string;
  readonly kind: "research-child-dispatch" | "bounded-adapter";
  readonly importPrivateImpl: false;
  readonly workerMayLaunch: false;
  readonly transitive: false;
}

export const FROZEN_COMPOSITION_EDGES: readonly FrozenCompositionEdge[] =
  Object.freeze([
    Object.freeze({
      id: "COMP-001" as const,
      parentPackage: "research-experiment-campaign",
      childPackageOrAdapter: "research-experiment",
      kind: "research-child-dispatch" as const,
      importPrivateImpl: false,
      workerMayLaunch: false,
      transitive: false,
    }),
    Object.freeze({
      id: "COMP-002" as const,
      parentPackage: "research-review-campaign",
      childPackageOrAdapter: "research-review-case",
      kind: "research-child-dispatch" as const,
      importPrivateImpl: false,
      workerMayLaunch: false,
      transitive: false,
    }),
    Object.freeze({
      id: "COMP-003" as const,
      parentPackage: "research-slides",
      childPackageOrAdapter: "personal-slides",
      kind: "bounded-adapter" as const,
      importPrivateImpl: false,
      workerMayLaunch: false,
      transitive: false,
    }),
  ]);

export interface RootCompositionDescriptor {
  readonly schemaVersion: 1;
  readonly compositionId: string;
  readonly edgeId: CompositionEdgeId;
  readonly parentDispatchId: string;
  readonly parentActivationId: string;
  readonly maxChildren: number;
  readonly remainingDispatchBudget: number;
  readonly procedureDigest: string;
  readonly policyDigest: string;
  readonly requestDigest: string;
  readonly rootAuthorizationEvidence: string;
}

export type CompositionValidationCode =
  | "UNKNOWN_EDGE"
  | "WORKER_LAUNCH_FORBIDDEN"
  | "BUDGET_EXCEEDED"
  | "MISSING_ROOT_AUTHORIZATION"
  | "TRANSITIVE_FORBIDDEN";

export function validateRootCompositionDescriptor(
  desc: RootCompositionDescriptor,
): { ok: true } | { ok: false; code: CompositionValidationCode; message: string } {
  const edge = FROZEN_COMPOSITION_EDGES.find((e) => e.id === desc.edgeId);
  if (!edge) {
    return {
      ok: false,
      code: "UNKNOWN_EDGE",
      message: `Unknown composition edge ${desc.edgeId}`,
    };
  }
  if (edge.workerMayLaunch) {
    return {
      ok: false,
      code: "WORKER_LAUNCH_FORBIDDEN",
      message: "Composition edge incorrectly allows worker launch",
    };
  }
  if (edge.transitive) {
    return {
      ok: false,
      code: "TRANSITIVE_FORBIDDEN",
      message: "Composition must be non-transitive",
    };
  }
  if (desc.remainingDispatchBudget < 1 || desc.maxChildren < 1) {
    return {
      ok: false,
      code: "BUDGET_EXCEEDED",
      message: "Composition budget exhausted",
    };
  }
  if (!desc.rootAuthorizationEvidence) {
    return {
      ok: false,
      code: "MISSING_ROOT_AUTHORIZATION",
      message: "Root authorization evidence required",
    };
  }
  return { ok: true };
}
