/**
 * Root-owned composition execution planning (no worker launch authority).
 * Binds COMP-001/002/003 to child Dispatch intent or bounded adapter invoke.
 */

import {
  FROZEN_COMPOSITION_EDGES,
  getFrozenCompositionEdge,
  validateRootCompositionDescriptor,
  type RootCompositionDescriptor,
} from "./composition.js";

export type RootCompositionAction =
  | {
      readonly kind: "create-child-dispatch";
      readonly edgeId: "COMP-001" | "COMP-002";
      readonly parentCapabilityId: string;
      readonly childCapabilityId: string;
      readonly parentDispatchId: string;
      readonly parentActivationId: string;
    }
  | {
      readonly kind: "invoke-bounded-adapter";
      readonly edgeId: "COMP-003";
      readonly parentCapabilityId: string;
      readonly adapterId: "personal-slides";
      readonly parentDispatchId: string;
      readonly parentActivationId: string;
    };

/**
 * Plan a root-owned composition action from a validated descriptor.
 * Workers never call this; root dispatch/apply paths only.
 */
export function planRootCompositionAction(
  desc: RootCompositionDescriptor,
):
  | { readonly ok: true; readonly action: RootCompositionAction }
  | {
      readonly ok: false;
      readonly code: string;
      readonly message: string;
    } {
  const validated = validateRootCompositionDescriptor(desc);
  if (!validated.ok) {
    return {
      ok: false,
      code: validated.code,
      message: validated.message,
    };
  }
  const edge = getFrozenCompositionEdge(desc.edgeId);
  if (edge === undefined) {
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
  if (edge.kind === "bounded-adapter") {
    return {
      ok: true,
      action: Object.freeze({
        kind: "invoke-bounded-adapter" as const,
        edgeId: "COMP-003" as const,
        parentCapabilityId: edge.parentCapabilityId,
        adapterId: "personal-slides" as const,
        parentDispatchId: desc.parentDispatchId,
        parentActivationId: desc.parentActivationId,
      }),
    };
  }
  return {
    ok: true,
    action: Object.freeze({
      kind: "create-child-dispatch" as const,
      edgeId: desc.edgeId as "COMP-001" | "COMP-002",
      parentCapabilityId: edge.parentCapabilityId,
      childCapabilityId: edge.childCapabilityOrAdapterId,
      parentDispatchId: desc.parentDispatchId,
      parentActivationId: desc.parentActivationId,
    }),
  };
}

export function listRootCompositionEdgeIds(): readonly string[] {
  return Object.freeze(FROZEN_COMPOSITION_EDGES.map((e) => e.id));
}
