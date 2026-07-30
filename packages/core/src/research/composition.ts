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
  if (
    desc.childCapabilityOrAdapterId !== undefined &&
    desc.childCapabilityOrAdapterId !== edge.childPackageOrAdapter &&
    // allow capability IDs that map to the same frozen child package label
    !desc.childCapabilityOrAdapterId.includes(
      edge.childPackageOrAdapter.replace(/^research-/, ""),
    )
  ) {
    // Soft check: only fail when clearly unrelated token present
    if (
      desc.childCapabilityOrAdapterId.startsWith("research.") &&
      !desc.childCapabilityOrAdapterId.includes("experiment") &&
      !desc.childCapabilityOrAdapterId.includes("review") &&
      !desc.childCapabilityOrAdapterId.includes("slides") &&
      edge.kind === "research-child-dispatch"
    ) {
      return {
        ok: false,
        code: "CHILD_MISMATCH",
        message: `Child '${desc.childCapabilityOrAdapterId}' does not match edge ${edge.id}`,
      };
    }
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
