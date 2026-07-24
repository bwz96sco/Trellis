import { createHash } from "node:crypto";
import path from "node:path";

import {
  digestDispatchRequest,
  hashDispatchScope,
  stableResearchJson,
  type Dispatch,
  type NormalizedDispatchScopeV1,
} from "../../src/research/index.js";
import { describe, expect, it } from "vitest";

const dispatch: Dispatch = {
  id: "dsp_00000000-0000-4000-8000-000000000001",
  questId: "qst_00000000-0000-4000-8000-000000000002",
  campaignId: "cmp_00000000-0000-4000-8000-000000000003",
  runId: "run_00000000-0000-4000-8000-000000000004",
  repositoryId: "rep_00000000-0000-4000-8000-000000000005",
  ownerSkill: "research-literature",
  objective: "Find prior work",
  acceptanceCriteria: ["Sources are cited"],
  allowedWritePaths: ["notes/review.md"],
  expectedOutputs: ["Review"],
  context: [{ text: "Preserve bytes exactly" }],
  checks: ["pnpm test"],
  provider: "opaque-provider-hint",
  taskRef: "opaque-task-reference",
  createdAt: "2026-07-17T12:00:00.000Z",
};

function scope(): NormalizedDispatchScopeV1 {
  const root = path.resolve("/tmp/research-repository");
  return {
    schemaVersion: 1,
    dispatchId: dispatch.id,
    repository: {
      id: dispatch.repositoryId,
      resolvedRoot: root,
      locator: "repositories/research",
      expectedRemote: "git@example.test:research.git",
      observedRemote: "git@example.test:research.git",
      headRevision: "abc123",
    },
    artifacts: [
      {
        id: "art_00000000-0000-4000-8000-000000000006",
        repositoryId: dispatch.repositoryId,
        path: "input/paper.pdf",
        resolvedPath: path.join(root, "input/paper.pdf"),
      },
    ],
    allowedWritePaths: [
      {
        declaredPath: "notes/review.md",
        resolvedPath: path.join(root, "notes/review.md"),
      },
      {
        declaredPath: "results/output.json",
        resolvedPath: path.join(root, "results/output.json"),
      },
    ],
  };
}

describe("Research Dispatch authority bindings", () => {
  it("produces deterministic domain-separated Dispatch request digests", () => {
    const digest = digestDispatchRequest(dispatch);
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(digestDispatchRequest({ ...dispatch })).toBe(digest);
    expect(digestDispatchRequest({ ...dispatch, objective: "Different" })).not.toBe(
      digest,
    );
  });

  it("deduplicates and sorts write pairs before hashing a strict scope", () => {
    const original = scope();
    const [firstWrite, secondWrite] = original.allowedWritePaths;
    if (!firstWrite || !secondWrite) throw new Error("Expected two write paths");
    expect(
      hashDispatchScope({
        ...original,
        allowedWritePaths: [
          secondWrite,
          firstWrite,
          {
            ...firstWrite,
            declaredPath: "notes/./review.md",
          },
        ],
      }),
    ).toBe(hashDispatchScope(original));
  });

  it("normalizes Windows drive letters, separators, dot segments, and trailing slashes", () => {
    const original = scope();
    expect(
      hashDispatchScope({
        ...original,
        repository: {
          ...original.repository,
          resolvedRoot: "C:\\Research\\.\\Repository\\",
        },
        artifacts: [],
        allowedWritePaths: [],
      }),
    ).toBe(
      hashDispatchScope({
        ...original,
        repository: {
          ...original.repository,
          resolvedRoot: "c:/Research/Repository",
        },
        artifacts: [],
        allowedWritePaths: [],
      }),
    );
  });

  it("rejects duplicate artifact IDs, relative machine paths, and extra keys", () => {
    const [artifact] = scope().artifacts;
    if (!artifact) throw new Error("Expected one artifact");
    expect(() =>
      hashDispatchScope({
        ...scope(),
        artifacts: [artifact, artifact],
      }),
    ).toThrow("duplicate IDs");
    expect(() =>
      hashDispatchScope({
        ...scope(),
        repository: { ...scope().repository, resolvedRoot: "relative" },
      }),
    ).toThrow("absolute");
    expect(() => hashDispatchScope({ ...scope(), extra: true } as never)).toThrow(
      "not supported",
    );
  });

  it("rejects malformed scope IDs and artifact digests", () => {
    const original = scope();
    const [artifact] = original.artifacts;
    if (!artifact) throw new Error("Expected one artifact");
    expect(() =>
      hashDispatchScope({ ...original, dispatchId: "dsp_invalid" } as never),
    ).toThrow("dsp_ prefixed UUID");
    expect(() =>
      hashDispatchScope({
        ...original,
        repository: { ...original.repository, id: "rep_invalid" },
      } as never),
    ).toThrow("rep_ prefixed UUID");
    expect(() =>
      hashDispatchScope({
        ...original,
        artifacts: [{ ...artifact, id: "art_invalid" }],
      } as never),
    ).toThrow("art_ prefixed UUID");
    expect(() =>
      hashDispatchScope({
        ...original,
        artifacts: [{ ...artifact, repositoryId: "rep_invalid" }],
      } as never),
    ).toThrow("rep_ prefixed UUID");
    for (const sha256 of ["abc", "A".repeat(64), "g".repeat(64)]) {
      expect(() =>
        hashDispatchScope({
          ...original,
          artifacts: [{ ...artifact, sha256 }],
        }),
      ).toThrow("64 lowercase hexadecimal characters");
    }
  });

  it("orders write pairs by Unicode code point rather than locale", () => {
    const original = scope();
    const lowerCodePoint = {
      declaredPath: "notes/.md",
      resolvedPath: "/repository/notes/.md",
    };
    const higherCodePoint = {
      declaredPath: "notes/\u{10000}.md",
      resolvedPath: "/repository/notes/\u{10000}.md",
    };
    const normalized = {
      ...original,
      repository: {
        ...original.repository,
        resolvedRoot: "/repository",
      },
      artifacts: [],
      allowedWritePaths: [lowerCodePoint, higherCodePoint],
    };
    const expected = `sha256:${createHash("sha256")
      .update("trellis-research-dispatch-scope-hash-v1\0", "utf8")
      .update(stableResearchJson(normalized), "utf8")
      .digest("hex")}`;
    expect(
      hashDispatchScope({
        ...normalized,
        allowedWritePaths: [higherCodePoint, lowerCodePoint],
      }),
    ).toBe(expected);
  });
});
