import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createWorkspaceId,
  type ResearchMutation,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, describe, expect, it } from "vitest";

import { executeResearchMutations } from "../../src/commands/research/common.js";
import { executeResearchLifecycleMutations } from "../../src/commands/research/dispatch-activation-command.js";
import { executeRepositoryDispatchMutations } from "../../src/commands/research/mutation.js";

function snapshotTree(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        snapshot.set(`${relative}/`, "directory");
        walk(absolute);
      } else {
        snapshot.set(relative, fs.readFileSync(absolute).toString("base64"));
      }
    }
  };
  walk(root);
  return snapshot;
}

describe("research dry-run executors", () => {
  const sandboxes: string[] = [];

  afterEach(() => {
    for (const sandbox of sandboxes.splice(0)) {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  function setup(name: string): {
    sandbox: string;
    root: string;
    mutation: ResearchMutation;
  } {
    const sandbox = fs.mkdtempSync(
      path.join(os.tmpdir(), `trellis-dry-run-${name}-`),
    );
    sandboxes.push(sandbox);
    const root = path.join(sandbox, "control");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    return {
      sandbox,
      root,
      mutation: {
        kind: "workspace.create",
        workspace: {
          id: createWorkspaceId(),
          name: "Dry run",
          description: "",
        },
      },
    };
  }

  it("keeps common mutation dry-run fully zero-write", async () => {
    const fixture = setup("common");
    const before = snapshotTree(fixture.sandbox);

    const result = await executeResearchMutations(
      "quest create",
      {
        root: fixture.root,
        dryRun: true,
        idempotencyKey: "dry-run-common",
      },
      [fixture.mutation],
    );

    expect(result).toMatchObject({ dryRun: true, replayed: false, headSeq: 1 });
    expect(snapshotTree(fixture.sandbox)).toEqual(before);
  });

  it("keeps repository mutation dry-run fully zero-write", async () => {
    const fixture = setup("repository");
    const before = snapshotTree(fixture.sandbox);

    const result = await executeRepositoryDispatchMutations(
      "repo add",
      {
        root: fixture.root,
        dryRun: true,
        idempotencyKey: "dry-run-repository",
      },
      [fixture.mutation],
    );

    expect(result).toMatchObject({ dryRun: true, replayed: false, headSeq: 1 });
    expect(snapshotTree(fixture.sandbox)).toEqual(before);
  });

  it("keeps lifecycle mutation dry-run fully zero-write", async () => {
    const fixture = setup("lifecycle");
    const before = snapshotTree(fixture.sandbox);

    const result = await executeResearchLifecycleMutations({
      command: "prepare",
      root: fixture.root,
      options: {
        dryRun: true,
        idempotencyKey: "dry-run-lifecycle",
      },
      mutations: [fixture.mutation],
      timestamp: "2026-07-25T00:00:00.000Z",
      classify: () => undefined,
    });

    expect(result).toMatchObject({ dryRun: true, replayed: false, headSeq: 1 });
    expect(snapshotTree(fixture.sandbox)).toEqual(before);
  });
});
