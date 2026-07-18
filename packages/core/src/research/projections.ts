import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { ResearchPaths } from "./paths.js";
import {
  RESEARCH_SCHEMA_VERSION,
  type Projected,
  type ResearchEvent,
  type ResearchState,
} from "./types.js";

interface ProjectionCache {
  schemaVersion: typeof RESEARCH_SCHEMA_VERSION;
  projectedThroughSeq: number;
  files: string[];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stableValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function stableResearchJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function atomicWrite(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    fs.writeFileSync(temp, content, { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

function timestampAt(events: readonly ResearchEvent[], seq: number): string {
  if (seq === 0) return "1970-01-01T00:00:00.000Z";
  const event = events[seq - 1];
  if (event?.seq !== seq) {
    throw new Error(`Cannot resolve projection timestamp for seq ${seq}`);
  }
  return event.timestamp;
}

function projected<T>(
  data: T,
  projectedThroughSeq: number,
  updatedAt: string,
): Projected<T> {
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    projectedThroughSeq,
    updatedAt,
    data,
  };
}

function sortedValues<T>(values: Readonly<Record<string, T>>): T[] {
  return Object.keys(values)
    .sort()
    .map((key) => values[key])
    .filter((value): value is T => value !== undefined);
}

export function writeResearchProjections(
  paths: ResearchPaths,
  state: ResearchState,
  events: readonly ResearchEvent[],
): string[] {
  const files: string[] = [];
  const headSeq = state.projectedThroughSeq;
  if (state.workspace) {
    atomicWrite(
      paths.workspaceFile,
      stableResearchJson(
        projected(state.workspace, headSeq, state.workspace.updatedAt),
      ),
    );
    files.push(paths.workspaceFile);
  }

  const repositoriesSeq =
    state.entitySeq.repositories ?? state.entitySeq.workspace ?? 0;
  if (state.workspace && repositoriesSeq > 0) {
    atomicWrite(
      paths.repositoriesFile,
      stableResearchJson(
        projected(
          {
            repositories: sortedValues(state.repositories),
            artifacts: sortedValues(state.artifacts),
          },
          headSeq,
          timestampAt(events, repositoriesSeq),
        ),
      ),
    );
    files.push(paths.repositoriesFile);
  }

  const groups: {
    dir: string;
    fileName: string;
    values: Readonly<Record<string, { id: string; updatedAt: string }>>;
  }[] = [
    { dir: paths.questsDir, fileName: "quest.json", values: state.quests },
    {
      dir: paths.campaignsDir,
      fileName: "campaign.json",
      values: state.campaigns,
    },
    { dir: paths.runsDir, fileName: "run.json", values: state.runs },
    {
      dir: paths.evidenceDir,
      fileName: "evidence.json",
      values: state.evidence,
    },
    { dir: paths.claimsDir, fileName: "claim.json", values: state.claims },
  ];
  for (const group of groups) {
    for (const entity of sortedValues(group.values)) {
      if (state.entitySeq[entity.id] === undefined) {
        throw new Error(`Missing projection sequence for entity '${entity.id}'`);
      }
      const file = path.join(group.dir, entity.id, group.fileName);
      atomicWrite(
        file,
        stableResearchJson(projected(entity, headSeq, entity.updatedAt)),
      );
      files.push(file);
    }
  }
  return files.sort();
}

export function writeProjectionCache(
  paths: ResearchPaths,
  projectedThroughSeq: number,
  files: readonly string[],
): void {
  const cache: ProjectionCache = {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    projectedThroughSeq,
    files: [...files].map((file) => path.relative(paths.root, file)).sort(),
  };
  atomicWrite(paths.cacheFile, stableResearchJson(cache));
}

export function readProjectionCache(
  paths: ResearchPaths,
): ProjectionCache | null {
  let text: string;
  try {
    text = fs.readFileSync(paths.cacheFile, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return null;
  }
  const value = parsed as Record<string, unknown>;
  if (
    value.schemaVersion !== RESEARCH_SCHEMA_VERSION ||
    typeof value.projectedThroughSeq !== "number" ||
    !Number.isInteger(value.projectedThroughSeq) ||
    !Array.isArray(value.files) ||
    value.files.some((file) => typeof file !== "string")
  ) {
    return null;
  }
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    projectedThroughSeq: value.projectedThroughSeq,
    files: value.files as string[],
  };
}
