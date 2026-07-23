import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Command, InvalidArgumentError } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseCampaignIdArgument,
  parseCampaignStatusArgument,
  parseClaimIdArgument,
  parseClaimStatusArgument,
  parseEvidenceIdArgument,
  parseEvidenceStatusArgument,
  parseQuestIdArgument,
  parseQuestStageArgument,
  parseQuestStatusArgument,
  parseRunIdArgument,
  parseRunStatusArgument,
  renderResearchResult,
  resolveResearchRoot,
} from "../../src/commands/research/common.js";
import { registerResearchCommand } from "../../src/commands/research/index.js";
import { shouldCheckForUpdates } from "../../src/utils/update-notice.js";

const noop = (): void => undefined;
const UUID = "123e4567-e89b-42d3-a456-426614174000";

function childNames(command: Command): string[] {
  return command.commands.map((child) => child.name());
}

function commandAt(root: Command, ...names: string[]): Command {
  let current = root;
  for (const name of names) {
    const child = current.commands.find((candidate) => candidate.name() === name);
    if (!child) throw new Error(`Missing command ${names.join(" ")}`);
    current = child;
  }
  return current;
}

describe("research command helpers", () => {
  let tmpDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-unit-"));
    cwd = path.join(tmpDir, "control");
    fs.mkdirSync(path.join(cwd, ".trellis"), { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("resolves exact cwd without walking to a parent control plane", () => {
    expect(resolveResearchRoot({})).toBe(cwd);

    const nested = path.join(cwd, "repositories", "child");
    fs.mkdirSync(nested, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(nested);

    expect(() => resolveResearchRoot({})).toThrow(
      `Research root '${nested}' must contain a .trellis directory`,
    );
  });

  it("resolves explicit relative and absolute roots from cwd", () => {
    const relativeRoot = path.join(cwd, "..", "relative-control");
    fs.mkdirSync(path.join(relativeRoot, ".trellis"), { recursive: true });
    expect(resolveResearchRoot({ root: "../relative-control" })).toBe(
      path.resolve(relativeRoot),
    );

    const absoluteRoot = path.join(tmpDir, "absolute-control");
    fs.mkdirSync(path.join(absoluteRoot, ".trellis"), { recursive: true });
    expect(resolveResearchRoot({ root: absoluteRoot })).toBe(absoluteRoot);
  });

  it("rejects missing or non-directory .trellis roots", () => {
    const missing = path.join(tmpDir, "missing");
    fs.mkdirSync(missing);
    expect(() => resolveResearchRoot({ root: missing })).toThrow(
      /must contain a \.trellis directory/,
    );

    const fileRoot = path.join(tmpDir, "file-root");
    fs.mkdirSync(fileRoot);
    fs.writeFileSync(path.join(fileRoot, ".trellis"), "not a directory");
    expect(() => resolveResearchRoot({ root: fileRoot })).toThrow(
      /must contain a \.trellis directory/,
    );
  });

  it("registers the complete lifecycle command tree", () => {
    const program = new Command();
    registerResearchCommand(program);

    const research = commandAt(program, "research");
    expect(childNames(research)).toEqual([
      "init",
      "status",
      "validate",
      "rebuild",
      "repo",
      "quest",
      "campaign",
      "run",
      "evidence",
      "claim",
      "dispatch",
    ]);
    expect(childNames(commandAt(research, "repo"))).toEqual([
      "add",
      "bind",
      "list",
      "resolve",
    ]);
    expect(childNames(commandAt(research, "dispatch"))).toEqual([
      "context",
      "prepare",
      "record-result",
      "apply",
      "reject",
    ]);
    const context = commandAt(research, "dispatch", "context");
    expect(context.registeredArguments.map((argument) => argument.name())).toEqual([
      "request-file",
    ]);
    expect(context.options.map((option) => option.long)).toEqual([
      "--host",
      "--skill-name",
      "--root",
      "--json",
    ]);
    expect(childNames(commandAt(research, "quest"))).toEqual([
      "create",
      "status",
      "stage",
    ]);
    expect(childNames(commandAt(research, "campaign"))).toEqual([
      "create",
      "protocol",
      "freeze",
      "status",
    ]);
    expect(childNames(commandAt(research, "run"))).toEqual([
      "create",
      "status",
      "invalidate",
    ]);
    expect(childNames(commandAt(research, "evidence"))).toEqual([
      "create",
      "status",
    ]);
    expect(childNames(commandAt(research, "claim"))).toEqual([
      "create",
      "status",
    ]);
  });

  it("validates IDs, statuses, and stages through Commander parsers", () => {
    expect(parseQuestIdArgument(`qst_${UUID}`)).toBe(`qst_${UUID}`);
    expect(parseCampaignIdArgument(`cmp_${UUID}`)).toBe(`cmp_${UUID}`);
    expect(parseRunIdArgument(`run_${UUID}`)).toBe(`run_${UUID}`);
    expect(parseEvidenceIdArgument(`evd_${UUID}`)).toBe(`evd_${UUID}`);
    expect(parseClaimIdArgument(`clm_${UUID}`)).toBe(`clm_${UUID}`);
    expect(parseQuestStatusArgument("paused")).toBe("paused");
    expect(parseQuestStageArgument("literature")).toBe("literature");
    expect(parseCampaignStatusArgument("blocked")).toBe("blocked");
    expect(parseRunStatusArgument("succeeded")).toBe("succeeded");
    expect(parseEvidenceStatusArgument("retracted")).toBe("retracted");
    expect(parseClaimStatusArgument("contested")).toBe("contested");

    for (const invalid of [
      () => parseQuestIdArgument(`cmp_${UUID}`),
      () => parseCampaignStatusArgument("unknown"),
      () => parseQuestStageArgument("unknown"),
      () => parseRunStatusArgument("invalidated-by-user"),
    ]) {
      expect(invalid).toThrow(InvalidArgumentError);
    }
  });

  it("emits one JSON document and suppresses update checks only for JSON argv", () => {
    const log = vi.spyOn(console, "log").mockImplementation(noop);
    const result = {
      command: "research status",
      initialized: false,
      workspace: null,
      headSeq: 0,
      eventCount: 0,
      projectedThroughSeq: 0,
      projectionStale: false,
      counts: {
        repositories: 0,
        quests: 0,
        campaigns: 0,
        runs: 0,
        evidence: 0,
        claims: 0,
        dispatches: 0,
        results: 0,
        proposals: 0,
        decisions: 0,
      },
    } as const;

    renderResearchResult(result, true);

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual(result);
    expect(shouldCheckForUpdates(["node", "trellis", "research", "status"])).toBe(
      true,
    );
    expect(
      shouldCheckForUpdates([
        "node",
        "trellis",
        "research",
        "status",
        "--json",
      ]),
    ).toBe(false);
  });
});
