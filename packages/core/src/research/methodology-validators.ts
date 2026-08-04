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

/** Trusted implementations are keyed by exact (id, version). Unknown pairs are always critical. */
const VERSIONED_REGISTRY: Record<string, ValidatorFn> = Object.fromEntries(
  Object.entries(REGISTRY).map(([id, fn]) => [`${id}@1`, fn]),
);

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
