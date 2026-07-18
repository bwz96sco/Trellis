import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { writeFileAtomic } from "../../utils/atomic-write.js";

const SESSION_POINTERS = new Set(["current_task", "current_run"]);

function contextKey(): string | null {
  const raw = process.env.TRELLIS_CONTEXT_ID?.trim();
  if (!raw) return null;
  const safe = raw
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 160);
  if (safe) return safe;
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

function sessionFile(root: string, key: string): string {
  return path.join(root, ".trellis", ".runtime", "sessions", `${key}.json`);
}

function readSessionObject(
  file: string,
  missingAsEmpty: boolean,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && missingAsEmpty) {
      return {};
    }
    throw new Error(
      `Invalid research session state '${file}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    Object.getPrototypeOf(parsed) !== Object.prototype
  ) {
    throw new Error(
      `Invalid research session state '${file}': expected object`,
    );
  }
  return parsed as Record<string, unknown>;
}

function hasMeaningfulState(
  context: Readonly<Record<string, unknown>>,
): boolean {
  return Object.entries(context).some(([key, value]) => {
    if (!SESSION_POINTERS.has(key)) return true;
    return typeof value === "string" && value.trim().length > 0;
  });
}

function writeSession(file: string, context: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeFileAtomic(file, `${JSON.stringify(context, null, 2)}\n`);
}

export function setResearchSessionRun(root: string, runId: string): void {
  const key = contextKey();
  if (!key) return;
  const file = sessionFile(root, key);
  const context = readSessionObject(file, true);
  context.current_run = runId;
  writeSession(file, context);
}

export function clearResearchSessionRun(
  root: string,
  expectedRunId: string,
): void {
  const key = contextKey();
  if (!key) return;
  const file = sessionFile(root, key);
  if (!fs.existsSync(file)) return;
  const context = readSessionObject(file, false);
  if (context.current_run !== expectedRunId) return;

  delete context.current_run;
  if (hasMeaningfulState(context)) {
    writeSession(file, context);
  } else {
    fs.rmSync(file);
  }
}
