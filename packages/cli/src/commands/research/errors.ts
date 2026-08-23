type LegacyResearchDispatchContextErrorCode =
  | "INVALID_HOST"
  | "INVALID_SKILL_NAME"
  | "INVALID_REQUEST_PATH"
  | "REQUEST_NOT_FOUND"
  | "INVALID_REQUEST"
  | "DISPATCH_NOT_FOUND"
  | "REQUEST_STATE_MISMATCH"
  | "DISPATCH_HIERARCHY_INVALID"
  | "QUEST_NOT_DISPATCHABLE"
  | "REPOSITORY_INVALID"
  | "ARTIFACT_INVALID"
  | "WRITE_SCOPE_INVALID"
  | "CONTEXT_LIMIT_EXCEEDED";

export type ResearchActivationErrorCode =
  | LegacyResearchDispatchContextErrorCode
  | "UNKNOWN_CAPABILITY"
  | "CAPABILITY_STAGE_MISMATCH"
  | "CAPABILITY_DISABLED"
  | "DUPLICATE_ACTIVATION"
  | "ACTIVATION_TOO_LATE"
  | "ACTIVATION_REQUIRED"
  | "EXPLICIT_APPROVAL_REQUIRED"
  | "AUTOMATIC_LIMIT_EXCEEDED"
  | "AUTOMATIC_AUTHORITY_FORBIDDEN"
  | "INTERACTIVE_APPROVAL_REQUIRED"
  | "APPROVAL_CHALLENGE_MISMATCH"
  | "INVALID_APPROVAL_INPUT"
  | "DUPLICATE_ACTIVE_APPROVAL"
  | "DISPATCH_ALREADY_COMPLETED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_HOST_MISMATCH"
  | "APPROVAL_REVOKED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_RELATION_MISMATCH"
  | "MATERIALIZATION_STATE_MISMATCH"
  | "OUTPUT_ID_CONFLICT"
  | "APPROVAL_NOT_FOUND"
  | "REVOCATION_REASON_REQUIRED"
  | "INVALID_APPROVAL_TRANSITION"
  | "IDEMPOTENCY_KEY_CONFLICT"
  | "PROCEDURE_DIGEST_MISMATCH"
  | "POLICY_DIGEST_MISMATCH"
  | "REQUEST_DIGEST_MISMATCH"
  | "SCOPE_HASH_MISMATCH"
  | "METHODOLOGY_VALIDATION_FAILED";

export type ResearchDispatchContextErrorCode = ResearchActivationErrorCode;

export class ResearchDispatchContextError extends Error {
  readonly code: ResearchDispatchContextErrorCode;

  constructor(code: ResearchDispatchContextErrorCode, message: string) {
    super(message);
    this.name = "ResearchDispatchContextError";
    this.code = code;
  }
}

export class ResearchActivationError extends Error {
  readonly code: ResearchActivationErrorCode;

  constructor(
    code: ResearchActivationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchActivationError";
    this.code = code;
  }
}

export type ResearchCliErrorCode =
  | "research_skill_not_found"
  | "research_skill_version_required"
  | "research_skill_invocation_forbidden"
  | "research_skill_member_forbidden"
  | "research_workflow_invalid"
  | "research_workflow_active_conflict"
  | "research_workflow_completion_invalid"
  | "research_workflow_transition_blocked"
  | "research_gate_invalid";

export class ResearchCliError extends Error {
  readonly code: ResearchCliErrorCode;

  constructor(
    code: ResearchCliErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchCliError";
    this.code = code;
  }
}

export class ResearchDispatchFileError extends Error {
  readonly committed = true;
  readonly headSeq: number;
  readonly target: string;
  readonly recovery: string;

  constructor(
    headSeq: number,
    target: string,
    recovery: string,
    cause: unknown,
  ) {
    super(
      `Research events committed through seq ${headSeq}, but '${target}' could not be written`,
      {
        cause,
      },
    );
    this.name = "ResearchDispatchFileError";
    this.headSeq = headSeq;
    this.target = target;
    this.recovery = recovery;
  }
}
