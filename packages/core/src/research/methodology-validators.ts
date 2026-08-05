/**
 * Trusted root-side methodology validators (Phase-2).
 * Support packs only declare IDs; implementations live here.
 */

export type MethodologyValidatorSeverity = "critical" | "warning";

export interface MethodologyValidatorDescriptor {
  readonly id: string;
  readonly version: string;
  readonly severity: MethodologyValidatorSeverity;
}

export interface MethodologyValidationContext {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly procedureDigest: string;
  readonly terminalState?: string;
  readonly artifactPaths: readonly string[];
  readonly declaredValidators: readonly MethodologyValidatorDescriptor[];
  /** Opaque facts supplied by root from Result/Proposal inspection */
  readonly facts: Readonly<Record<string, unknown>>;
  /**
   * Optional accepted v1.3 pack binding count / digest facts for A3 validators.
   * Never invents authority: only exact caller-supplied values are used.
   */
  readonly acceptedV13BindingCount?: number;
  readonly acceptedV13TrustedValidatorCount?: number;
  readonly acceptedV13ContractDigest?: string;
  readonly supportInventoryDigest?: string;
}

export interface MethodologyValidatorFinding {
  readonly validatorId: string;
  readonly severity: MethodologyValidatorSeverity;
  readonly code: string;
  readonly message: string;
}

export interface MethodologyValidationReport {
  readonly ok: boolean;
  readonly criticalFailure: boolean;
  readonly findings: readonly MethodologyValidatorFinding[];
}

type ValidatorFn = (
  ctx: MethodologyValidationContext,
) => readonly MethodologyValidatorFinding[];

const REGISTRY: Record<string, ValidatorFn> = {
  "missing-critical-evidence": (ctx) => {
    const missing = ctx.facts.missingCriticalEvidence === true;
    if (!missing) return [];
    return [
      {
        validatorId: "missing-critical-evidence",
        severity: "critical",
        code: "MISSING_CRITICAL_EVIDENCE",
        message: "Critical methodology evidence is missing",
      },
    ];
  },
  "provenance-stable-id-drift": (ctx) => {
    if (ctx.facts.provenanceDrift !== true && ctx.facts.idDrift !== true) {
      return [];
    }
    return [
      {
        validatorId: "provenance-stable-id-drift",
        severity: "critical",
        code: "PROVENANCE_OR_ID_DRIFT",
        message: "Provenance or stable-id drift detected",
      },
    ];
  },
  "forbidden-mutation": (ctx) => {
    if (ctx.facts.forbiddenMutation !== true) return [];
    return [
      {
        validatorId: "forbidden-mutation",
        severity: "critical",
        code: "FORBIDDEN_MUTATION",
        message: "Worker attempted forbidden mutation authority",
      },
    ];
  },
  "closure-exclusivity": (ctx) => {
    // Frozen selected XOR blocked: both true and both false are critical.
    const selectedPresent = "selected" in ctx.facts;
    const blockedPresent = "blocked" in ctx.facts;
    if (!selectedPresent || !blockedPresent) {
      return [
        {
          validatorId: "closure-exclusivity",
          severity: "critical",
          code: "INVALID_CLOSURE",
          message: "Closure requires explicit selected and blocked facts",
        },
      ];
    }
    const selected = ctx.facts.selected === true;
    const blocked = ctx.facts.blocked === true;
    if (selected === blocked) {
      return [
        {
          validatorId: "closure-exclusivity",
          severity: "critical",
          code: "INVALID_CLOSURE",
          message:
            selected && blocked
              ? "Selected and blocked closure cannot both be true"
              : "Selected and blocked closure cannot both be false",
        },
      ];
    }
    return [];
  },
};

/**
 * Derive validator facts from canonical Result/Proposal fields only.
 * Callers must not invent opaque authority booleans without this derivation.
 */
export function deriveMethodologyValidatorFacts(input: {
  readonly resultStatus?: string;
  readonly proposalStatus?: string;
  readonly proposalOperationCount?: number;
  readonly artifactPaths?: readonly string[];
  readonly selected?: boolean;
  readonly blocked?: boolean;
  readonly missingCriticalEvidence?: boolean;
  readonly provenanceDrift?: boolean;
  readonly forbiddenMutation?: boolean;
  /**
   * When true (evaluation-contract-v1.3.0 path), selected/blocked must be
   * explicit — Result.status is never used as closure authority.
   */
  readonly requireExplicitClosure?: boolean;
  readonly methodologyContractVersion?: string;
}): Readonly<Record<string, unknown>> {
  const resultStatus = input.resultStatus;
  const requireExplicit =
    input.requireExplicitClosure === true ||
    input.methodologyContractVersion === "evaluation-contract-v1.3.0";

  let selected: boolean | undefined;
  let blocked: boolean | undefined;
  if (requireExplicit) {
    // Fail closed: omit selected/blocked unless both provided explicitly.
    // Never invent from Result.status under v1.3.
    if (input.selected !== undefined && input.blocked !== undefined) {
      selected = input.selected;
      blocked = input.blocked;
    }
  } else {
    // Historical v1.2 / 2.0.2 path may derive from Result.status.
    blocked =
      input.blocked ??
      (resultStatus === "blocked" || resultStatus === "failed");
    selected =
      input.selected ??
      (resultStatus === "completed" ||
        resultStatus === "success" ||
        resultStatus === "partial");
  }

  // missingCriticalEvidence is never invented from empty paths alone.
  const facts: Record<string, unknown> = {
    resultStatus,
    proposalStatus: input.proposalStatus,
    proposalOperationCount: input.proposalOperationCount ?? 0,
    missingCriticalEvidence: input.missingCriticalEvidence === true,
    provenanceDrift: input.provenanceDrift === true,
    idDrift: false,
    forbiddenMutation: input.forbiddenMutation === true,
    artifactPathCount: input.artifactPaths?.length ?? 0,
    requireExplicitClosure: requireExplicit,
    methodologyContractVersion: input.methodologyContractVersion,
  };
  if (selected !== undefined) facts.selected = selected;
  if (blocked !== undefined) facts.blocked = blocked;
  return Object.freeze(facts);
}

/**
 * Accepted evaluation-contract-v1.3.0 (A3) trusted validators.
 * Implementations consume explicit facts + optional pack counters; they do not
 * invent lifecycle defaults or call into HIGH/CRITICAL shared primitives.
 */
const A3_REGISTRY: Record<string, ValidatorFn> = {
  "trellis.closure.xor@1.0.0": (ctx) => REGISTRY["closure-exclusivity"]!(ctx),
  "trellis.closure.status-inference@1.0.0": (ctx) => {
    if (ctx.facts.requireExplicitClosure === true && "selected" in ctx.facts) {
      // selected/blocked present only via explicit fields under requireExplicitClosure.
      return [];
    }
    if (
      ctx.facts.requireExplicitClosure === true &&
      !("selected" in ctx.facts)
    ) {
      return [
        {
          validatorId: "trellis.closure.status-inference",
          severity: "critical",
          code: "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN",
          message: "Closure must not be inferred from Result.status on v1.3",
        },
      ];
    }
    return [];
  },
  "trellis.closure.schema@1.0.0": (ctx) => {
    if (ctx.facts.closureSchemaInvalid === true) {
      return [
        {
          validatorId: "trellis.closure.schema",
          severity: "critical",
          code: "V13_CLOSURE_SCHEMA_INVALID",
          message: "Canonical closure schema invalid",
        },
      ];
    }
    return [];
  },
  "trellis.closure.evidence@1.0.0": (ctx) => {
    if (ctx.facts.closureEvidenceInvalid === true) {
      return [
        {
          validatorId: "trellis.closure.evidence",
          severity: "critical",
          code: "V13_CLOSURE_EVIDENCE_INVALID",
          message: "Canonical closure evidence bindings invalid",
        },
      ];
    }
    return [];
  },
  "trellis.artifact.requiredness@1.0.0": (ctx) =>
    ctx.facts.missingCriticalEvidence === true
      ? [
          {
            validatorId: "trellis.artifact.requiredness",
            severity: "critical",
            code: "V13_ARTIFACT_REQUIRED_MISSING",
            message: "Required methodology artifact missing",
          },
        ]
      : [],
  "trellis.artifact.cardinality@1.0.0": (ctx) =>
    ctx.facts.artifactCardinalityInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.cardinality",
            severity: "critical",
            code: "V13_ARTIFACT_CARDINALITY_INVALID",
            message: "Artifact cardinality violated",
          },
        ]
      : [],
  "trellis.artifact.media-type@1.0.0": (ctx) =>
    ctx.facts.artifactMediaTypeInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.media-type",
            severity: "critical",
            code: "V13_ARTIFACT_MEDIA_TYPE_INVALID",
            message: "Artifact media type violated",
          },
        ]
      : [],
  "trellis.artifact.authority@1.0.0": (ctx) =>
    ctx.facts.forbiddenMutation === true
      ? [
          {
            validatorId: "trellis.artifact.authority",
            severity: "critical",
            code: "V13_ARTIFACT_AUTHORITY_INVALID",
            message: "Artifact producer/consumer authority violated",
          },
        ]
      : [],
  "trellis.artifact.ref-binding@1.0.0": (ctx) =>
    ctx.facts.artifactRefBindingInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.ref-binding",
            severity: "critical",
            code: "V13_ARTIFACT_REF_BINDING_INVALID",
            message: "Artifact ref binding violated",
          },
        ]
      : [],
  "trellis.artifact.stable-id@1.0.0": (ctx) =>
    ctx.facts.idDrift === true || ctx.facts.provenanceDrift === true
      ? [
          {
            validatorId: "trellis.artifact.stable-id",
            severity: "critical",
            code: "V13_ARTIFACT_STABLE_ID_INVALID",
            message: "Artifact stable id drift",
          },
        ]
      : [],
  "trellis.artifact.provenance@1.0.0": (ctx) =>
    ctx.facts.provenanceDrift === true
      ? [
          {
            validatorId: "trellis.artifact.provenance",
            severity: "critical",
            code: "V13_ARTIFACT_PROVENANCE_INVALID",
            message: "Artifact provenance drift",
          },
        ]
      : [],
  "trellis.artifact.dependencies@1.0.0": (ctx) =>
    ctx.facts.artifactDependenciesInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.dependencies",
            severity: "critical",
            code: "V13_ARTIFACT_DEPENDENCIES_INVALID",
            message: "Artifact dependencies violated",
          },
        ]
      : [],
  "trellis.artifact.immutability@1.0.0": (ctx) =>
    ctx.facts.artifactImmutabilityInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.immutability",
            severity: "critical",
            code: "V13_ARTIFACT_IMMUTABILITY_INVALID",
            message: "Artifact immutability violated",
          },
        ]
      : [],
  "trellis.artifact.transitions@1.0.0": (ctx) =>
    ctx.facts.artifactTransitionsInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.transitions",
            severity: "critical",
            code: "V13_ARTIFACT_TRANSITIONS_INVALID",
            message: "Artifact transitions violated",
          },
        ]
      : [],
  "trellis.artifact.terminal-applicability@1.0.0": (ctx) =>
    ctx.facts.artifactTerminalApplicabilityInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.terminal-applicability",
            severity: "critical",
            code: "V13_ARTIFACT_TERMINAL_APPLICABILITY_INVALID",
            message: "Artifact terminal applicability violated",
          },
        ]
      : [],
  "trellis.artifact.cross-consistency@1.0.0": (ctx) =>
    ctx.facts.artifactCrossConsistencyInvalid === true
      ? [
          {
            validatorId: "trellis.artifact.cross-consistency",
            severity: "critical",
            code: "V13_ARTIFACT_CROSS_CONSISTENCY_INVALID",
            message: "Artifact cross-consistency violated",
          },
        ]
      : [],
  "trellis.authority.worker-boundary@1.0.0": (ctx) =>
    ctx.facts.forbiddenMutation === true
      ? [
          {
            validatorId: "trellis.authority.worker-boundary",
            severity: "critical",
            code: "V13_WORKER_AUTHORITY_WIDENING",
            message: "Worker authority boundary violated",
          },
        ]
      : [],
  "trellis.validator.binding-integrity@1.0.0": (ctx) => {
    if (
      typeof ctx.acceptedV13BindingCount === "number" &&
      ctx.acceptedV13BindingCount !== 876
    ) {
      return [
        {
          validatorId: "trellis.validator.binding-integrity",
          severity: "critical",
          code: "V13_VALIDATOR_BINDING_INVALID",
          message: `Expected 876 bindings, got ${ctx.acceptedV13BindingCount}`,
        },
      ];
    }
    if (
      typeof ctx.acceptedV13TrustedValidatorCount === "number" &&
      ctx.acceptedV13TrustedValidatorCount !== 20
    ) {
      return [
        {
          validatorId: "trellis.validator.binding-integrity",
          severity: "critical",
          code: "V13_VALIDATOR_BINDING_INVALID",
          message: `Expected 20 trusted validators, got ${ctx.acceptedV13TrustedValidatorCount}`,
        },
      ];
    }
    return [];
  },
  "trellis.report.v2-binding@1.0.0": (ctx) => {
    if (
      typeof ctx.acceptedV13ContractDigest === "string" &&
      ctx.acceptedV13ContractDigest.length > 0 &&
      ctx.facts.reportV2DigestMismatch === true
    ) {
      return [
        {
          validatorId: "trellis.report.v2-binding",
          severity: "critical",
          code: "V13_REPORT_V2_BINDING_INVALID",
          message: "Report-v2 authority binding invalid",
        },
      ];
    }
    return [];
  },
  "trellis.contract.integrity@1.0.0": (ctx) => {
    if (ctx.facts.contractIntegrityInvalid === true) {
      return [
        {
          validatorId: "trellis.contract.integrity",
          severity: "critical",
          code: "V13_CONTRACT_INTEGRITY_INVALID",
          message: "Accepted contract integrity violated",
        },
      ];
    }
    return [];
  },
};

/** Trusted implementations are keyed by exact (id, version). Unknown pairs are always critical. */
const VERSIONED_REGISTRY: Record<string, ValidatorFn> = {
  ...Object.fromEntries(
    Object.entries(REGISTRY).map(([id, fn]) => [`${id}@1`, fn]),
  ),
  ...A3_REGISTRY,
};

export function runMethodologyValidators(
  ctx: MethodologyValidationContext,
): MethodologyValidationReport {
  const findings: MethodologyValidatorFinding[] = [];
  for (const d of ctx.declaredValidators) {
    const key = `${d.id}@${d.version}`;
    const fn = VERSIONED_REGISTRY[key];
    if (!fn) {
      findings.push({
        validatorId: d.id,
        severity: "critical",
        code: "UNKNOWN_VALIDATOR",
        message: `No trusted implementation for validator '${d.id}' version '${d.version}'`,
      });
      continue;
    }
    findings.push(...fn(ctx));
  }
  const criticalFailure = findings.some((f) => f.severity === "critical");
  return {
    ok: !criticalFailure,
    criticalFailure,
    findings: Object.freeze(findings),
  };
}

export function listTrustedMethodologyValidatorIds(): readonly string[] {
  return Object.freeze(Object.keys(REGISTRY));
}
