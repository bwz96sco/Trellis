import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyWorkflowMigration,
  type WorkflowMigrationEvidence,
} from "../../src/commands/update.js";
import { computeHash } from "../../src/utils/template-hash.js";

const native = fs.readFileSync(
  path.join(import.meta.dirname, "../fixtures/workflows/native-v0.6.7.md"),
  "utf-8",
);
const research = "# Research\n";
const staleManaged = "# Older managed workflow\n";

function evidence(
  overrides: Partial<WorkflowMigrationEvidence> = {},
): WorkflowMigrationEvidence {
  return {
    selection: "missing",
    currentBytes: staleManaged,
    installedVersion: "0.6.7",
    pathKind: "regular",
    researchBytes: research,
    ...overrides,
  };
}

describe("classifyWorkflowMigration", () => {
  it.each([
    ["research", research, undefined, "current-research"],
    ["research", native, undefined, "pristine-research"],
    ["native", native, undefined, "pristine-native"],
    ["missing", native, undefined, "pristine-native"],
    ["missing", research, undefined, "current-research"],
  ] as const)(
    "classifies %s selection with exact bundled bytes",
    (selection, currentBytes, storedHash, expected) => {
      expect(
        classifyWorkflowMigration(
          evidence({ selection, currentBytes, storedHash }),
        ),
      ).toBe(expected);
    },
  );

  it("rejects a one-byte native mutation without ownership evidence", () => {
    expect(
      classifyWorkflowMigration(
        evidence({ currentBytes: `${native} `, selection: "missing" }),
      ),
    ).toBe("custom-user-owned");
  });

  it("trusts a matching hash for an explicit native selection", () => {
    expect(
      classifyWorkflowMigration(
        evidence({
          selection: "native",
          storedHash: computeHash(staleManaged),
        }),
      ),
    ).toBe("pristine-native");
  });

  it("trusts a matching hash for an explicit Research selection", () => {
    expect(
      classifyWorkflowMigration(
        evidence({
          selection: "research",
          storedHash: computeHash(staleManaged),
        }),
      ),
    ).toBe("pristine-research");
  });

  it("bounds hash-only missing-selection inference to versions before workflow switching", () => {
    const storedHash = computeHash(staleManaged);
    expect(
      classifyWorkflowMigration(
        evidence({ installedVersion: "0.6.0-beta.16", storedHash }),
      ),
    ).toBe("pristine-native");
    expect(
      classifyWorkflowMigration(
        evidence({ installedVersion: "0.6.0-beta.17", storedHash }),
      ),
    ).toBe("custom-user-owned");
    expect(
      classifyWorkflowMigration(
        evidence({ installedVersion: "unknown", storedHash }),
      ),
    ).toBe("custom-user-owned");
  });

  it.each([
    ["native", "modified-managed"],
    ["research", "modified-managed"],
    ["missing", "custom-user-owned"],
  ] as const)(
    "preserves unproven %s bytes as %s",
    (selection, expected) => {
      expect(classifyWorkflowMigration(evidence({ selection }))).toBe(expected);
    },
  );

  it("lets invalid metadata block automatic inference", () => {
    expect(
      classifyWorkflowMigration(
        evidence({ selection: "invalid", currentBytes: native }),
      ),
    ).toBe("invalid-metadata");
  });

  it.each(["missing", "unsafe"] as const)(
    "preserves a %s workflow path",
    (pathKind) => {
      expect(
        classifyWorkflowMigration(
          evidence({ pathKind, currentBytes: pathKind === "missing" ? null : native }),
        ),
      ).toBe("missing-or-unsafe");
    },
  );
});
