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
