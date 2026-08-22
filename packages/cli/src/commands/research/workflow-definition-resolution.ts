import fs from "node:fs";
import path from "node:path";

import {
  ResearchWorkflowError,
  parseResearchWorkflowDefinitionV1,
  type ParsedResearchWorkflowDefinitionV1,
} from "@mindfoldhq/trellis-core/research";

const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXACT_SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const MAX_WORKFLOW_BYTES = 1024 * 1024;

function invalid(message: string, cause?: unknown): never {
  throw new ResearchWorkflowError(
    "RESEARCH_WORKFLOW_INVALID",
    message,
    cause === undefined ? undefined : { cause },
  );
}

function validateSelector(id: string, version: string): void {
  if (!SLUG.test(id)) invalid("Research Workflow ID must be a lowercase slug");
  const match = EXACT_SEMVER.exec(version);
  if (
    match === null ||
    version.includes("+") ||
    match[4]?.split(".").some((part) => /^\d+$/.test(part) && /^0\d/.test(part))
  ) {
    invalid(
      "Research Workflow version must be exact SemVer without build metadata",
    );
  }
}

function directory(root: string, segments: readonly string[]): string {
  let current = path.resolve(root);
  const canonicalRoot = fs.realpathSync(current);
  for (const segment of segments) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        invalid(
          `Research Workflow '${segments.at(-2)}@${segments.at(-1)}' was not found`,
        );
      }
      invalid("Research Workflow path cannot be inspected", error);
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      invalid(
        "Research Workflow path components must be non-symlink directories",
      );
    }
    const canonical = fs.realpathSync(current);
    const relative = path.relative(canonicalRoot, canonical);
    if (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      invalid("Research Workflow path escapes the selected root");
    }
  }
  return current;
}

export function resolveResearchWorkflowDefinition(input: {
  readonly root: string;
  readonly id: string;
  readonly version: string;
  readonly expectedDigest?: `sha256:${string}`;
}): ParsedResearchWorkflowDefinitionV1 {
  validateSelector(input.id, input.version);
  let selectedDirectory: string;
  try {
    selectedDirectory = directory(input.root, [
      ".trellis",
      "research",
      "workflows",
      input.id,
      input.version,
    ]);
  } catch (error) {
    if (error instanceof ResearchWorkflowError) throw error;
    invalid(
      `Research Workflow '${input.id}@${input.version}' cannot be resolved`,
      error,
    );
  }

  const file = path.join(selectedDirectory, "workflow.json");
  let before: fs.Stats;
  try {
    before = fs.lstatSync(file);
  } catch (error) {
    invalid(
      `Research Workflow '${input.id}@${input.version}' was not found`,
      error,
    );
  }
  if (before.isSymbolicLink() || !before.isFile()) {
    invalid("workflow.json must be a non-symlink regular file");
  }
  if (before.size === 0 || before.size > MAX_WORKFLOW_BYTES) {
    invalid(
      `workflow.json must contain between 1 and ${MAX_WORKFLOW_BYTES} bytes`,
    );
  }
  const canonicalDirectory = fs.realpathSync(selectedDirectory);
  const canonicalFile = fs.realpathSync(file);
  if (
    path.dirname(canonicalFile) !== canonicalDirectory ||
    path.basename(canonicalFile) !== "workflow.json"
  ) {
    invalid("workflow.json escapes its Research Workflow directory");
  }
  const bytes = new Uint8Array(fs.readFileSync(file));
  const after = fs.lstatSync(file);
  if (
    after.isSymbolicLink() ||
    !after.isFile() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.mode !== after.mode ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    before.ctimeMs !== after.ctimeMs ||
    fs.realpathSync(file) !== canonicalFile
  ) {
    invalid("workflow.json changed while it was being read");
  }

  const parsed = parseResearchWorkflowDefinitionV1(bytes);
  if (
    parsed.definition.id !== input.id ||
    parsed.definition.version !== input.version
  ) {
    invalid(
      `Research Workflow '${input.id}@${input.version}' identity does not match workflow.json`,
    );
  }
  if (
    input.expectedDigest !== undefined &&
    parsed.workflowDigest !== input.expectedDigest
  ) {
    invalid(
      `Research Workflow '${input.id}@${input.version}' digest does not match its binding`,
    );
  }
  return parsed;
}
