export type ResearchDispatchContextErrorCode =
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

export class ResearchDispatchContextError extends Error {
  readonly code: ResearchDispatchContextErrorCode;

  constructor(code: ResearchDispatchContextErrorCode, message: string) {
    super(message);
    this.name = "ResearchDispatchContextError";
    this.code = code;
  }
}

export type ResearchActivationErrorCode =
  | ResearchDispatchContextErrorCode
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
  | "APPROVAL_NOT_FOUND"
  | "REVOCATION_REASON_REQUIRED"
  | "INVALID_APPROVAL_TRANSITION"
  | "IDEMPOTENCY_KEY_CONFLICT"
  | "PROCEDURE_DIGEST_MISMATCH"
  | "POLICY_DIGEST_MISMATCH"
  | "REQUEST_DIGEST_MISMATCH"
  | "SCOPE_HASH_MISMATCH";

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
