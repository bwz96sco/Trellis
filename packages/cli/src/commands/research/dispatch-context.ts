import {
  type ArtifactRef,
  type Dispatch,
  type DispatchId,
  type ResearchExecutionHost,
} from "@mindfoldhq/trellis-core/research";

import type { ResearchRootOptions } from "./common.js";
import {
  resolveApprovedResearchDispatchContext,
  type ApprovedResearchDispatchContextResult,
} from "./dispatch-approved-context.js";
import {
  ResearchActivationError,
  ResearchDispatchContextError,
} from "./errors.js";

export type ResearchDispatchContextWarningCode =
  | "LEGACY_OWNER_SKILL_IGNORED"
  | "OWNER_SKILL_STAGE_MISMATCH"
  | "PROVIDER_HINT_MISMATCH"
  | "TASK_REF_IGNORED";

export interface ResearchDispatchContextWarning {
  readonly code: ResearchDispatchContextWarningCode;
  readonly message: string;
}

export interface GetResearchDispatchContextOptions extends ResearchRootOptions {
  readonly dispatchId: DispatchId;
  readonly host: ResearchExecutionHost;
}

export type ResearchDispatchContextResult =
  ApprovedResearchDispatchContextResult;

const MAX_CONTEXT_ENTRIES = 128;
const MAX_LIST_ENTRIES = 128;
const MAX_STRING_LENGTH = 16_384;

function fail(
  code: ConstructorParameters<typeof ResearchActivationError>[0],
  message: string,
): never {
  throw new ResearchActivationError(code, message);
}

function assertStringBound(value: string, label: string): void {
  if (value.length > MAX_STRING_LENGTH) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `${label} must contain at most ${MAX_STRING_LENGTH} characters`,
    );
  }
}

function assertStringListBound(values: readonly string[], label: string): void {
  if (values.length > MAX_LIST_ENTRIES) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `${label} must contain at most ${MAX_LIST_ENTRIES} entries`,
    );
  }
  for (const [index, value] of values.entries()) {
    assertStringBound(value, `${label}[${index}]`);
  }
}

function assertArtifactBounds(artifact: ArtifactRef, label: string): void {
  for (const [name, value] of Object.entries(artifact)) {
    if (typeof value === "string") assertStringBound(value, `${label}.${name}`);
  }
}

function assertDispatchBounds(dispatch: Dispatch): void {
  assertStringBound(dispatch.ownerSkill, "dispatch.ownerSkill");
  assertStringBound(dispatch.objective, "dispatch.objective");
  assertStringBound(dispatch.createdAt, "dispatch.createdAt");
  if (dispatch.provider !== undefined) {
    assertStringBound(dispatch.provider, "dispatch.provider");
  }
  if (dispatch.taskRef !== undefined) {
    assertStringBound(dispatch.taskRef, "dispatch.taskRef");
  }
  assertStringListBound(
    dispatch.acceptanceCriteria,
    "dispatch.acceptanceCriteria",
  );
  assertStringListBound(
    dispatch.allowedWritePaths,
    "dispatch.allowedWritePaths",
  );
  assertStringListBound(dispatch.expectedOutputs, "dispatch.expectedOutputs");
  assertStringListBound(dispatch.checks, "dispatch.checks");
  if (dispatch.context.length > MAX_CONTEXT_ENTRIES) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `dispatch.context must contain at most ${MAX_CONTEXT_ENTRIES} entries`,
    );
  }
  for (const [index, entry] of dispatch.context.entries()) {
    if (entry.text !== undefined) {
      assertStringBound(entry.text, `dispatch.context[${index}].text`);
    } else if (entry.artifact !== undefined) {
      assertArtifactBounds(
        entry.artifact,
        `dispatch.context[${index}].artifact`,
      );
    }
  }
}

export async function getResearchDispatchContext(
  options: GetResearchDispatchContextOptions,
): Promise<ResearchDispatchContextResult> {
  try {
    const result = await resolveApprovedResearchDispatchContext({
      ...options,
      now: new Date(),
    });
    assertDispatchBounds(result.context.dispatch);
    return result;
  } catch (error) {
    if (error instanceof ResearchActivationError) {
      throw new ResearchDispatchContextError(error.code, error.message);
    }
    throw error;
  }
}
