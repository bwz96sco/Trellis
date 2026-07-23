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
