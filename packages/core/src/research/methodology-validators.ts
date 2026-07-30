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
    const selected = ctx.facts.selected === true;
    const blocked = ctx.facts.blocked === true;
    if (selected && blocked) {
      return [
        {
          validatorId: "closure-exclusivity",
          severity: "critical",
          code: "INVALID_CLOSURE",
          message: "Selected and blocked closure cannot both be true",
        },
      ];
    }
    return [];
  },
};

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
