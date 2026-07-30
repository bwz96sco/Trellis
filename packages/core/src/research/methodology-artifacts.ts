/**
 * Methodology artifact contracts (Phase-2). Separate from core ArtifactRef.
 */

export type MethodologyRequiredness = "required" | "optional";

export interface MethodologyArtifactContract {
  readonly id: string;
  readonly version: string;
  readonly requiredness: MethodologyRequiredness;
  readonly cardinality: "0..1" | "1" | "0..*" | "1..*";
  readonly pathPattern: string;
  readonly mediaType: string;
  readonly producer: string;
  readonly consumers: readonly string[];
  readonly stableIdField?: string;
  readonly terminalApplicability: readonly string[];
  readonly validatorIds: readonly string[];
}

export interface MethodologyArtifactInstance {
  readonly contractId: string;
  readonly path: string;
  readonly sha256?: string;
  readonly stableId?: string;
  readonly present: boolean;
}

export type MethodologyArtifactErrorCode =
  | "MISSING_REQUIRED_ARTIFACT"
  | "UNEXPECTED_ARTIFACT"
  | "ARTIFACT_PROVENANCE_MISSING"
  | "STABLE_ID_DRIFT";

export interface MethodologyArtifactValidationResult {
  readonly ok: boolean;
  readonly errors: readonly {
    readonly code: MethodologyArtifactErrorCode;
    readonly message: string;
    readonly contractId?: string;
    readonly path?: string;
  }[];
}

export function validateMethodologyArtifacts(input: {
  readonly contracts: readonly MethodologyArtifactContract[];
  readonly instances: readonly MethodologyArtifactInstance[];
}): MethodologyArtifactValidationResult {
  const errors: {
    code: MethodologyArtifactErrorCode;
    message: string;
    contractId?: string;
    path?: string;
  }[] = [];
  const byContract = new Map(
    input.instances.map((i) => [i.contractId, i] as const),
  );
  for (const c of input.contracts) {
    const inst = byContract.get(c.id);
    if (c.requiredness === "required" && (!inst || !inst.present)) {
      errors.push({
        code: "MISSING_REQUIRED_ARTIFACT",
        message: `Required methodology artifact missing: ${c.id}`,
        contractId: c.id,
      });
      continue;
    }
    if (inst?.present && c.stableIdField && !inst.stableId) {
      errors.push({
        code: "ARTIFACT_PROVENANCE_MISSING",
        message: `Stable id required for ${c.id}`,
        contractId: c.id,
        path: inst.path,
      });
    }
  }
  return { ok: errors.length === 0, errors };
}
