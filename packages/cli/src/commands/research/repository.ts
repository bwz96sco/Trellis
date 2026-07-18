import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  createRepositoryId,
  normalizeRepositoryLocator,
  readResearchState,
  repositorySchema,
  stableResearchJson,
  type Repository,
  type RepositoryId,
  type RepositoryKind,
} from "@mindfoldhq/trellis-core/research";

import { writeFileAtomic } from "../../utils/atomic-write.js";
import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchMutationOptions,
  type ResearchMutationResult,
  type ResearchOutputOptions,
} from "./common.js";
import { executeRepositoryDispatchMutations } from "./mutation.js";

interface RepositoryBindingsFile {
  schemaVersion: 1;
  bindings: Record<string, string>;
}

export interface RepositoryObservation {
  path: string;
  gitRoot: string | null;
  revision: string | null;
  dirty: boolean;
  dirtySummary: string;
  remote: string | null;
}

interface RepositoryObservationsFile {
  schemaVersion: 1;
  repositories: Record<string, RepositoryObservation>;
}

const REPOSITORY_ID =
  /^rep_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AddResearchRepositoryOptions extends ResearchMutationOptions {
  id?: RepositoryId;
  name: string;
  kind: RepositoryKind;
  locator: string;
  expectedRemote?: string;
  defaultBranch?: string;
  hasTrellis?: boolean;
}

export interface AddResearchRepositoryResult extends ResearchMutationResult {
  repository: Repository;
}

export interface BindResearchRepositoryOptions extends ResearchOutputOptions {
  repositoryId: RepositoryId;
  path: string;
}

export interface BindResearchRepositoryResult {
  command: "research repo bind";
  repositoryId: RepositoryId;
  path: string;
}

export interface ListResearchRepositoriesResult {
  command: "research repo list";
  repositories: Repository[];
}

export interface ResolveResearchRepositoryOptions extends ResearchOutputOptions {
  repositoryId: RepositoryId;
}

export interface ResolveResearchRepositoryResult {
  command: "research repo resolve";
  repository: Repository;
  source: "binding" | "locator";
  observation: RepositoryObservation;
}

function bindingsPath(root: string): string {
  return path.join(
    root,
    ".trellis",
    ".runtime",
    "research",
    "repo-bindings.json",
  );
}

function observationsPath(root: string): string {
  return path.join(
    root,
    ".trellis",
    ".runtime",
    "research",
    "repo-observations.json",
  );
}

function parseStringRecord(
  value: unknown,
  label: string,
): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!REPOSITORY_ID.test(key)) {
      throw new Error(`${label}.${key} must use a rep_ prefixed UUID key`);
    }
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(`${label}.${key} must be a non-empty string`);
    }
    if (!path.isAbsolute(entry)) {
      throw new Error(`${label}.${key} must be an absolute path`);
    }
    out[key] = entry;
  }
  return out;
}

function readBindings(root: string): RepositoryBindingsFile {
  const file = bindingsPath(root);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: 1, bindings: {} };
    }
    throw new Error(
      `Invalid research repository bindings '${file}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Invalid research repository bindings '${file}': expected object`,
    );
  }
  const value = parsed as Record<string, unknown>;
  const keys = Object.keys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("schemaVersion") ||
    !keys.includes("bindings") ||
    value.schemaVersion !== 1
  ) {
    throw new Error(
      `Invalid research repository bindings '${file}': expected schemaVersion 1 and bindings`,
    );
  }
  return {
    schemaVersion: 1,
    bindings: parseStringRecord(value.bindings, "bindings"),
  };
}

function parseObservationRecord(
  value: unknown,
): Record<string, RepositoryObservation> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("repositories must be an object");
  }
  const observations: Record<string, RepositoryObservation> = {};
  for (const [repositoryId, entry] of Object.entries(value)) {
    if (!REPOSITORY_ID.test(repositoryId)) {
      throw new Error(
        `repositories.${repositoryId} must use a rep_ prefixed UUID key`,
      );
    }
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`repositories.${repositoryId} must be an object`);
    }
    const observation = entry as Record<string, unknown>;
    const keys = [
      "path",
      "gitRoot",
      "revision",
      "dirty",
      "dirtySummary",
      "remote",
    ];
    if (
      Object.keys(observation).length !== keys.length ||
      keys.some((key) => !(key in observation)) ||
      typeof observation.path !== "string" ||
      !path.isAbsolute(observation.path) ||
      (observation.gitRoot !== null &&
        (typeof observation.gitRoot !== "string" ||
          !path.isAbsolute(observation.gitRoot))) ||
      (observation.revision !== null &&
        (typeof observation.revision !== "string" ||
          observation.revision.length === 0)) ||
      typeof observation.dirty !== "boolean" ||
      typeof observation.dirtySummary !== "string" ||
      (observation.remote !== null &&
        (typeof observation.remote !== "string" ||
          observation.remote.length === 0))
    ) {
      throw new Error(
        `repositories.${repositoryId} has an invalid observation`,
      );
    }
    observations[repositoryId] =
      observation as unknown as RepositoryObservation;
  }
  return observations;
}

function readObservations(root: string): RepositoryObservationsFile {
  const file = observationsPath(root);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("expected object");
    }
    const value = parsed as Record<string, unknown>;
    if (
      Object.keys(value).length !== 2 ||
      !("schemaVersion" in value) ||
      !("repositories" in value) ||
      value.schemaVersion !== 1 ||
      typeof value.repositories !== "object" ||
      value.repositories === null ||
      Array.isArray(value.repositories)
    ) {
      throw new Error("expected schemaVersion 1 and repositories object");
    }
    return {
      schemaVersion: 1,
      repositories: parseObservationRecord(value.repositories),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: 1, repositories: {} };
    }
    throw new Error(
      `Invalid research repository observations '${file}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function writeRuntimeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileAtomic(file, stableResearchJson(value));
}

function gitValue(repositoryPath: string, args: string[]): string | null {
  try {
    const value = execFileSync("git", ["-C", repositoryPath, ...args], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return value.length === 0 ? null : value;
  } catch {
    return null;
  }
}

function observeRepository(repositoryPath: string): RepositoryObservation {
  const gitRoot = gitValue(repositoryPath, ["rev-parse", "--show-toplevel"]);
  const revision = gitValue(repositoryPath, ["rev-parse", "HEAD"]);
  const dirtySummary = gitValue(repositoryPath, ["status", "--short"]) ?? "";
  const remote = gitValue(repositoryPath, [
    "config",
    "--get",
    "remote.origin.url",
  ]);
  return {
    path: repositoryPath,
    gitRoot: gitRoot === null ? null : fs.realpathSync(gitRoot),
    revision,
    dirty: dirtySummary.length > 0,
    dirtySummary,
    remote,
  };
}

export async function addResearchRepository(
  options: AddResearchRepositoryOptions,
): Promise<AddResearchRepositoryResult> {
  const id = options.id ?? createRepositoryId();
  const result = await executeRepositoryDispatchMutations("repo add", options, [
    {
      kind: "repository.register",
      repository: {
        id,
        name: requireResearchText(options.name, "repository name"),
        kind: options.kind,
        locator: normalizeRepositoryLocator(options.locator),
        ...(options.expectedRemote === undefined
          ? {}
          : {
              expectedRemote: requireResearchText(
                options.expectedRemote,
                "expected Git remote",
              ),
            }),
        ...(options.defaultBranch === undefined
          ? {}
          : {
              defaultBranch: requireResearchText(
                options.defaultBranch,
                "default branch",
              ),
            }),
        capabilities: { hasTrellis: options.hasTrellis === true },
      },
    },
  ]);
  return {
    ...result,
    repository: repositorySchema.parse(result.events[0]?.payload.repository),
  };
}

export async function bindResearchRepository(
  options: BindResearchRepositoryOptions,
): Promise<BindResearchRepositoryResult> {
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  if (!state.repositories[options.repositoryId]) {
    throw new Error(`Unknown research repository '${options.repositoryId}'`);
  }
  if (!path.isAbsolute(options.path)) {
    throw new Error("Repository binding path must be absolute");
  }
  const repositoryPath = fs.realpathSync(options.path);
  if (!fs.statSync(repositoryPath).isDirectory()) {
    throw new Error(
      `Repository binding '${repositoryPath}' must be a directory`,
    );
  }
  const bindings = readBindings(root);
  bindings.bindings[options.repositoryId] = repositoryPath;
  writeRuntimeJson(bindingsPath(root), bindings);
  return {
    command: "research repo bind",
    repositoryId: options.repositoryId,
    path: repositoryPath,
  };
}

export async function listResearchRepositories(
  options: ResearchOutputOptions,
): Promise<ListResearchRepositoriesResult> {
  const state = await readResearchState(resolveResearchRoot(options));
  return {
    command: "research repo list",
    repositories: Object.values(state.repositories).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  };
}

export async function resolveRepositoryForUse(
  root: string,
  repositoryId: RepositoryId,
  persistObservation = true,
): Promise<ResolveResearchRepositoryResult> {
  const state = await readResearchState(root);
  const repository = state.repositories[repositoryId];
  if (!repository) {
    throw new Error(`Unknown research repository '${repositoryId}'`);
  }
  const bindings = readBindings(root);
  const binding = bindings.bindings[repository.id];
  const candidate =
    binding ?? path.resolve(root, ...repository.locator.split("/"));
  let repositoryPath: string;
  try {
    repositoryPath = fs.realpathSync(candidate);
    if (!fs.statSync(repositoryPath).isDirectory())
      throw new Error("not a directory");
  } catch {
    throw new Error(
      `Repository '${repository.id}' could not be resolved from '${repository.locator}'. Run 'trellis research repo bind ${repository.id} --path <absolute-path>'.`,
    );
  }
  const observation = observeRepository(repositoryPath);
  if (
    repository.expectedRemote !== undefined &&
    observation.remote !== repository.expectedRemote
  ) {
    throw new Error(
      `Repository '${repository.id}' expected remote '${repository.expectedRemote}', received '${observation.remote ?? "none"}'`,
    );
  }
  const observations = readObservations(root);
  if (persistObservation) {
    observations.repositories[repository.id] = observation;
    writeRuntimeJson(observationsPath(root), observations);
  }
  return {
    command: "research repo resolve",
    repository,
    source: binding === undefined ? "locator" : "binding",
    observation,
  };
}

export async function resolveResearchRepository(
  options: ResolveResearchRepositoryOptions,
): Promise<ResolveResearchRepositoryResult> {
  return resolveRepositoryForUse(
    resolveResearchRoot(options),
    options.repositoryId,
  );
}
