/**
 * Methodology artifact contracts (Phase-2). Separate from core ArtifactRef.
 */

export type MethodologyRequiredness = "required" | "optional";
export type MethodologyCardinality = "0..1" | "1" | "0..*" | "1..*";

export interface MethodologyArtifactContract {
  readonly id: string;
  readonly version: string;
  readonly requiredness: MethodologyRequiredness;
  readonly cardinality: MethodologyCardinality;
  readonly pathPattern: string;
  readonly mediaType: string;
  readonly producer: string;
  readonly consumers: readonly string[];
  readonly dependsOn?: readonly string[];
  readonly stableIdField?: string;
  readonly terminalApplicability: readonly string[];
  readonly validatorIds: readonly string[];
}

export interface MethodologyArtifactInstance {
  readonly contractId: string;
  readonly path: string;
  readonly mediaType?: string;
  readonly sha256?: string;
  readonly stableId?: string;
  readonly present: boolean;
}

export type MethodologyArtifactErrorCode =
  | "MISSING_REQUIRED_ARTIFACT"
  | "CARDINALITY_VIOLATION"
  | "UNEXPECTED_ARTIFACT"
  | "ARTIFACT_PROVENANCE_MISSING"
  | "STABLE_ID_DRIFT"
  | "MEDIA_TYPE_MISMATCH"
  | "PATH_PATTERN_MISMATCH"
  | "DEPENDENCY_MISSING"
  | "TERMINAL_NOT_APPLICABLE"
  | "CROSS_ARTIFACT_INCONSISTENCY";

export interface MethodologyArtifactValidationResult {
  readonly ok: boolean;
  readonly errors: readonly {
    readonly code: MethodologyArtifactErrorCode;
    readonly message: string;
    readonly contractId?: string;
    readonly path?: string;
  }[];
}

/**
 * Exact pathPattern match for methodology artifact contracts.
 * Limited glob only: * = one path segment, ** = any suffix.
 * No substring / includes authority.
 */
export function matchesMethodologyPathPattern(
  path: string,
  pattern: string,
): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§§")
    .replace(/\*/g, "[^/]+")
    .replace(/§§/g, ".*");
  return new RegExp(`^${escaped}$`).test(path);
}

/**
 * Bind an artifact path to exactly one contract via pathPattern.
 * Ambiguous or zero matches return undefined — never invent contract ids.
 */
export function bindMethodologyArtifactPath(
  path: string,
  contracts: readonly MethodologyArtifactContract[],
): MethodologyArtifactContract | undefined {
  const matches = contracts.filter((c) =>
    matchesMethodologyPathPattern(path, c.pathPattern),
  );
  if (matches.length === 1) {
    return matches[0];
  }
  return undefined;
}

function cardinalityOk(
  count: number,
  cardinality: MethodologyCardinality,
): boolean {
  switch (cardinality) {
    case "0..1":
      return count <= 1;
    case "1":
      return count === 1;
    case "0..*":
      return count >= 0;
    case "1..*":
      return count >= 1;
    default:
      return false;
  }
}

/**
 * Validate methodology artifacts with grouped instances per contract.
 * Enforces requiredness, cardinality, path/media, dependencies, terminal
 * applicability, provenance, and rejects unexpected contract IDs.
 */
export function validateMethodologyArtifacts(input: {
  readonly contracts: readonly MethodologyArtifactContract[];
  readonly instances: readonly MethodologyArtifactInstance[];
  readonly terminalState?: string;
  readonly knownStableIds?: Readonly<Record<string, string>>;
}): MethodologyArtifactValidationResult {
  const errors: {
    code: MethodologyArtifactErrorCode;
    message: string;
    contractId?: string;
    path?: string;
  }[] = [];

  const contractsById = new Map(input.contracts.map((c) => [c.id, c] as const));
  const grouped = new Map<string, MethodologyArtifactInstance[]>();
  for (const inst of input.instances) {
    const list = grouped.get(inst.contractId) ?? [];
    list.push(inst);
    grouped.set(inst.contractId, list);
  }

  for (const contractId of grouped.keys()) {
    if (!contractsById.has(contractId)) {
      errors.push({
        code: "UNEXPECTED_ARTIFACT",
        message: `Unexpected methodology artifact contract '${contractId}'`,
        contractId,
      });
    }
  }

  for (const c of input.contracts) {
    if (
      input.terminalState !== undefined &&
      c.terminalApplicability.length > 0 &&
      !c.terminalApplicability.includes(input.terminalState)
    ) {
      // Contract not applicable for this terminal — skip presence checks.
      continue;
    }

    const present = (grouped.get(c.id) ?? []).filter((i) => i.present);
    const count = present.length;

    if (c.requiredness === "required" && count === 0) {
      errors.push({
        code: "MISSING_REQUIRED_ARTIFACT",
        message: `Required methodology artifact missing: ${c.id}`,
        contractId: c.id,
      });
    }
    if (!cardinalityOk(count, c.cardinality)) {
      errors.push({
        code: "CARDINALITY_VIOLATION",
        message: `Cardinality ${c.cardinality} violated for ${c.id} (count=${count})`,
        contractId: c.id,
      });
    }

    for (const inst of present) {
      if (!matchesMethodologyPathPattern(inst.path, c.pathPattern)) {
        errors.push({
          code: "PATH_PATTERN_MISMATCH",
          message: `Path '${inst.path}' does not match pattern '${c.pathPattern}'`,
          contractId: c.id,
          path: inst.path,
        });
      }
      if (
        inst.mediaType !== undefined &&
        inst.mediaType !== c.mediaType
      ) {
        errors.push({
          code: "MEDIA_TYPE_MISMATCH",
          message: `Media type '${inst.mediaType}' does not match contract '${c.mediaType}'`,
          contractId: c.id,
          path: inst.path,
        });
      }
      if (c.stableIdField) {
        const knownStableId = input.knownStableIds?.[c.id];
        if (!inst.stableId) {
          errors.push({
            code: "ARTIFACT_PROVENANCE_MISSING",
            message: `Stable id required for ${c.id}`,
            contractId: c.id,
            path: inst.path,
          });
        } else if (
          knownStableId !== undefined &&
          knownStableId !== inst.stableId
        ) {
          errors.push({
            code: "STABLE_ID_DRIFT",
            message: `Stable id drift for ${c.id}`,
            contractId: c.id,
            path: inst.path,
          });
        }
      }
      if (!inst.sha256) {
        errors.push({
          code: "ARTIFACT_PROVENANCE_MISSING",
          message: `SHA-256 required for present artifact ${c.id}`,
          contractId: c.id,
          path: inst.path,
        });
      }
    }

    for (const dep of c.dependsOn ?? []) {
      const depPresent = (grouped.get(dep) ?? []).some((i) => i.present);
      if (count > 0 && !depPresent) {
        errors.push({
          code: "DEPENDENCY_MISSING",
          message: `Artifact ${c.id} depends on missing ${dep}`,
          contractId: c.id,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  };
}
