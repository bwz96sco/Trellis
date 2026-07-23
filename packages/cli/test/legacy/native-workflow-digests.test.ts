import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isReleasedNativeWorkflow,
  RELEASED_NATIVE_WORKFLOW_DIGESTS,
} from "../../src/legacy/native-workflow-digests.js";

const releasedNative = fs.readFileSync(
  path.join(import.meta.dirname, "../fixtures/workflows/native-v0.6.7.md"),
  "utf-8",
);

describe("released native workflow digest evidence", () => {
  it("recognizes the exact v0.6.6/v0.6.7 released bytes", () => {
    expect(isReleasedNativeWorkflow(releasedNative)).toBe(true);
  });

  it("rejects a one-byte mutation", () => {
    expect(isReleasedNativeWorkflow(`${releasedNative} `)).toBe(false);
  });

  it("pins immutable release and source-path provenance", () => {
    expect(RELEASED_NATIVE_WORKFLOW_DIGESTS).toHaveLength(28);
    expect(
      RELEASED_NATIVE_WORKFLOW_DIGESTS.flatMap(
        (evidence) => evidence.releaseTags,
      ),
    ).toHaveLength(97);
    expect(
      RELEASED_NATIVE_WORKFLOW_DIGESTS.find((evidence) =>
        evidence.releaseTags.includes("v0.6.7"),
      ),
    ).toEqual({
      sha256:
        "9eb806e50767409b26dba4a63f34bc8cf58a8affcc18fe83e47568b5aca23510",
      releaseTags: ["v0.6.6", "v0.6.7"],
      sourcePath: "packages/cli/src/templates/trellis/workflow.md",
    });
    expect(
      new Set(RELEASED_NATIVE_WORKFLOW_DIGESTS.map(({ sha256 }) => sha256)).size,
    ).toBe(28);
    expect(Object.isFrozen(RELEASED_NATIVE_WORKFLOW_DIGESTS)).toBe(true);
    for (const evidence of RELEASED_NATIVE_WORKFLOW_DIGESTS) {
      expect(evidence.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(evidence.sourcePath).toBe(
        "packages/cli/src/templates/trellis/workflow.md",
      );
      expect(Object.isFrozen(evidence)).toBe(true);
      expect(Object.isFrozen(evidence.releaseTags)).toBe(true);
    }
  });
});
