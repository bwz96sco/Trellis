/**
 * Root-owned bounded composition descriptors (Phase-2 / Completion Wave-3).
 * Workers never launch composition edges. Matching is exact, not substring.
 */

export type CompositionEdgeId = "COMP-001" | "COMP-002" | "COMP-003";

export interface FrozenCompositionEdge {
  readonly id: CompositionEdgeId;
  /** Exact parent capability id (Trellis registry id). */
  readonly parentCapabilityId: string;
  /** Exact child capability id or bounded adapter id. */
  readonly childCapabilityOrAdapterId: string;
  readonly kind: "research-child-dispatch" | "bounded-adapter";
  readonly importPrivateImpl: false;
  readonly workerMayLaunch: false;
  readonly transitive: false;
  /**
   * Legacy package labels retained for report compatibility only.
   * Exact matching uses parentCapabilityId / childCapabilityOrAdapterId.
   */
  readonly parentPackage: string;
  readonly childPackageOrAdapter: string;
}

export const FROZEN_COMPOSITION_EDGES: readonly FrozenCompositionEdge[] =
  Object.freeze([
    Object.freeze({
      id: "COMP-001" as const,
      parentCapabilityId: "research.experiment.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
      kind: "research-child-dispatch" as const,
      importPrivateImpl: false,
      workerMayLaunch: false,
      transitive: false,
      parentPackage: "research-experiment-campaign",
      childPackageOrAdapter: "research-experiment",
    }),
    Object.freeze({
      id: "COMP-002" as const,
      parentCapabilityId: "research.audit.campaign",
      childCapabilityOrAdapterId: "research.audit.case",
      kind: "research-child-dispatch" as const,
      importPrivateImpl: false,
      workerMayLaunch: false,
      transitive: false,
      parentPackage: "research-review-campaign",
      childPackageOrAdapter: "research-review-case",
    }),
    Object.freeze({
      id: "COMP-003" as const,
      parentCapabilityId: "research.writing.slides",
      childCapabilityOrAdapterId: "personal-slides",
      kind: "bounded-adapter" as const,
      importPrivateImpl: false,
      workerMayLaunch: false,
      transitive: false,
      parentPackage: "research-slides",
      childPackageOrAdapter: "personal-slides",
    }),
  ]);

export interface RootCompositionDescriptor {
  readonly schemaVersion: 1;
  readonly compositionId: string;
  readonly edgeId: CompositionEdgeId;
  readonly parentDispatchId: string;
  readonly parentActivationId: string;
  readonly parentCapabilityId?: string;
  readonly childCapabilityOrAdapterId?: string;
  readonly maxChildren: number;
  readonly remainingDispatchBudget: number;
  readonly actualChildCount?: number;
  readonly procedureDigest: string;
  readonly policyDigest: string;
  readonly requestDigest: string;
  readonly scopeHash?: string;
  readonly rootAuthorizationEvidence: string;
  readonly cancelled?: boolean;
  readonly failed?: boolean;
  readonly rollbackEvidence?: string;
}

export type CompositionValidationCode =
  | "UNKNOWN_EDGE"
  | "WORKER_LAUNCH_FORBIDDEN"
  | "BUDGET_EXCEEDED"
  | "MISSING_ROOT_AUTHORIZATION"
  | "TRANSITIVE_FORBIDDEN"
  | "CHILD_COUNT_EXCEEDED"
  | "CHILD_MISMATCH"
  | "PARENT_MISMATCH"
  | "DIGEST_BINDING_MISSING"
  | "CANCELLED_OR_FAILED_WITHOUT_ROLLBACK";

export function getFrozenCompositionEdge(
  edgeId: string,
): FrozenCompositionEdge | undefined {
  return FROZEN_COMPOSITION_EDGES.find((e) => e.id === edgeId);
}

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
  if (
    !desc.procedureDigest ||
    !desc.policyDigest ||
    !desc.requestDigest
  ) {
    return {
      ok: false,
      code: "DIGEST_BINDING_MISSING",
      message: "Composition requires procedure/policy/request digests",
    };
  }
  if (desc.remainingDispatchBudget < 1 || desc.maxChildren < 1) {
    return {
      ok: false,
      code: "BUDGET_EXCEEDED",
      message: "Composition budget exhausted",
    };
  }
  if (
    desc.actualChildCount !== undefined &&
    desc.actualChildCount > desc.maxChildren
  ) {
    return {
      ok: false,
      code: "CHILD_COUNT_EXCEEDED",
      message: `Actual child count ${desc.actualChildCount} exceeds maxChildren ${desc.maxChildren}`,
    };
  }
  // Exact parent/child capability bindings are required (no optional soft match).
  if (
    desc.parentCapabilityId === undefined ||
    desc.parentCapabilityId.length === 0
  ) {
    return {
      ok: false,
      code: "PARENT_MISMATCH",
      message: `Parent capability is required for edge ${edge.id}`,
    };
  }
  if (desc.parentCapabilityId !== edge.parentCapabilityId) {
    return {
      ok: false,
      code: "PARENT_MISMATCH",
      message: `Parent capability '${desc.parentCapabilityId}' does not match edge ${edge.id} (${edge.parentCapabilityId})`,
    };
  }
  if (
    desc.childCapabilityOrAdapterId === undefined ||
    desc.childCapabilityOrAdapterId.length === 0
  ) {
    return {
      ok: false,
      code: "CHILD_MISMATCH",
      message: `Child capability or adapter is required for edge ${edge.id}`,
    };
  }
  if (desc.childCapabilityOrAdapterId !== edge.childCapabilityOrAdapterId) {
    return {
      ok: false,
      code: "CHILD_MISMATCH",
      message: `Child '${desc.childCapabilityOrAdapterId}' does not match edge ${edge.id} (${edge.childCapabilityOrAdapterId})`,
    };
  }
  if (!desc.rootAuthorizationEvidence) {
    return {
      ok: false,
      code: "MISSING_ROOT_AUTHORIZATION",
      message: "Root authorization evidence required",
    };
  }
  if (
    (desc.cancelled === true || desc.failed === true) &&
    !desc.rollbackEvidence
  ) {
    return {
      ok: false,
      code: "CANCELLED_OR_FAILED_WITHOUT_ROLLBACK",
      message: "Cancelled/failed composition requires rollback evidence",
    };
  }
  return { ok: true };
}
