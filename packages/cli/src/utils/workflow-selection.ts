import fs from "node:fs";
import path from "node:path";

import { PATHS } from "../constants/paths.js";
import {
  isBundledWorkflowId,
  type BundledWorkflowId,
} from "./workflow-resolver.js";
import { writeFileAtomic } from "./atomic-write.js";

const WORKFLOW_SELECTION_SCHEMA_VERSION = 1;

interface StoredBundledWorkflowSelection {
  schemaVersion: 1;
  id: BundledWorkflowId;
  source: "bundled";
}

export type WorkflowSelectionResult =
  | { kind: "missing" }
  | { kind: "bundled"; id: BundledWorkflowId }
  | { kind: "invalid"; reason: string };

function selectionPath(cwd: string): string {
  return path.join(cwd, PATHS.WORKFLOW_SELECTION_FILE);
}

export function loadWorkflowSelection(cwd: string): WorkflowSelectionResult {
  const filePath = selectionPath(cwd);
  if (!fs.existsSync(filePath)) {
    return { kind: "missing" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  } catch (error) {
    return {
      kind: "invalid",
      reason: `could not parse ${PATHS.WORKFLOW_SELECTION_FILE}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "invalid", reason: "selection must be a JSON object" };
  }

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "id" ||
    keys[1] !== "schemaVersion" ||
    keys[2] !== "source"
  ) {
    return {
      kind: "invalid",
      reason: "selection must contain exactly schemaVersion, id, and source",
    };
  }
  if (record.schemaVersion !== WORKFLOW_SELECTION_SCHEMA_VERSION) {
    return {
      kind: "invalid",
      reason: `unsupported workflow selection schemaVersion ${String(record.schemaVersion)}`,
    };
  }
  if (record.source !== "bundled") {
    return {
      kind: "invalid",
      reason: 'workflow selection source must be "bundled"',
    };
  }
  if (typeof record.id !== "string" || !isBundledWorkflowId(record.id)) {
    return {
      kind: "invalid",
      reason: `unknown bundled workflow id ${JSON.stringify(record.id)}`,
    };
  }

  return { kind: "bundled", id: record.id };
}

export function saveBundledWorkflowSelection(
  cwd: string,
  id: BundledWorkflowId,
): void {
  const filePath = selectionPath(cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload: StoredBundledWorkflowSelection = {
    schemaVersion: WORKFLOW_SELECTION_SCHEMA_VERSION,
    id,
    source: "bundled",
  };
  writeFileAtomic(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function clearWorkflowSelection(cwd: string): void {
  fs.rmSync(selectionPath(cwd), { force: true });
}
