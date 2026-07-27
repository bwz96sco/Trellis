import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  auditPackedActiveContent,
  auditPackedEntries,
  buildPackedCliInventory,
  normalizeTarEntry,
  PACKED_ACTIVE_FORBIDDEN_MUTATIONS,
  PACKED_ACTIVE_RESEARCH_ENTRIES,
  parseTarListing,
  RESEARCH_PROCEDURE_IDS,
  RESEARCH_STAGE_SKILLS,
} from "../../scripts/packed-cli-audit.js";

const CLI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RELEASE_PREFLIGHT = path.join(CLI_DIR, "scripts", "release-preflight.js");
const MIGRATION_MANIFEST_DIR = path.join(
  CLI_DIR,
  "src",
  "migrations",
  "manifests",
);

function validActiveContents(): Map<string, string> {
  return new Map([
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.command,
      [
        '.argument("<dispatch-id>"',
        '.requiredOption("--host <host>"',
        '.requiredOption("--approval <apr-id>"',
        '.requiredOption("--input <path|->"',
      ].join("\n"),
    ],
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.context,
      "resolveApprovedResearchDispatchContext now: new Date()",
    ],
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.recordResult,
      "recordApprovedResearchDispatchResult approvalId input",
    ],
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.claudeWorker,
      [
        "tools: Read, Write, Edit, Bash",
        "procedure.instructions",
        "outputContract.resultId",
        "outputContract.proposalId",
        "nestedAgents",
        "recordResult",
      ].join("\n"),
    ],
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.codexWorker,
      [
        'sandbox_mode = "workspace-write"',
        "trellis research dispatch context <dsp-id> --host codex --root . --json",
        "context.procedure.instructions",
        "context.outputContract.resultId",
        "multi_agent = false",
      ].join("\n"),
    ],
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.claudeHook,
      [
        "Research dispatch: (dsp_",
        '"context",\n        dispatch_id,\n        "--host",\n        "claude"',
        "VALIDATED_DISPATCH_CONTEXT_START",
        "VALIDATED_DISPATCH_CONTEXT_END",
        '"nestedAgents": False',
        '"recordResult": False',
      ].join("\n"),
    ],
    [
      PACKED_ACTIVE_RESEARCH_ENTRIES.workflow,
      [
        "dispatch context <dsp-id> --host <claude|codex> --root . --json",
        "Research dispatch: <dsp-id>",
        "embedded `procedure.instructions`",
        "--approval <apr-id> --input",
        "approval.consumed",
      ].join("\n"),
    ],
  ]);
}

function createPackedCliFixture(mutation?: {
  readonly entry: string;
  readonly text: string;
}): { readonly archive: string; readonly root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-packed-cli-audit-"));
  const packageRoot = path.join(root, "package");
  const migrationManifestNames = fs
    .readdirSync(MIGRATION_MANIFEST_DIR)
    .filter((entry) => entry.endsWith(".json"))
    .sort();
  const inventory = buildPackedCliInventory(migrationManifestNames);

  for (const packedEntry of inventory.requiredEntries) {
    const target = path.join(root, ...packedEntry.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "fixture\n");
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(CLI_DIR, "package.json"), "utf8"),
  ) as { version: string };
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify({
      name: "@mindfoldhq/trellis",
      version: packageJson.version,
      dependencies: { "@mindfoldhq/trellis-core": packageJson.version },
    }),
  );

  for (const [entry, content] of validActiveContents()) {
    const target = path.join(root, ...entry.split("/"));
    fs.writeFileSync(
      target,
      mutation?.entry === entry ? `${content}\n${mutation.text}\n` : content,
    );
  }

  const archive = path.join(root, "trellis-packed-fixture.tgz");
  execFileSync("tar", ["-czf", archive, "-C", root, "package"]);
  return { archive, root };
}

describe("packed CLI inventory audit", () => {
  it("normalizes directory markers without depending on listing order", () => {
    expect(normalizeTarEntry("package/dist/cli/")).toBe(
      "package/dist/cli",
    );
    expect(
      parseTarListing(
        "package/dist/commands/research/index.js\r\npackage/package.json\n",
      ),
    ).toEqual([
      "package/dist/commands/research/index.js",
      "package/package.json",
    ]);
  });

  it.each([
    "package/../outside.txt",
    "/package/package.json",
    "C:/package/package.json",
    "C:package/package.json",
    "package\\package.json",
    "package/./package.json",
    "./package/package.json",
    "package//package.json",
    "package/package.json\0ignored",
    "package/package.json ",
    "outside/package.json",
  ])("rejects unsafe or non-canonical tar entry %j", (entry) => {
    expect(() => normalizeTarEntry(entry)).toThrow(
      `Unsafe tar entry path: ${JSON.stringify(entry)}`,
    );
  });

  it("reports every missing required entry with its packed path", () => {
    expect(() =>
      auditPackedEntries(["package/package.json"], {
        requiredEntries: [
          "package/package.json",
          "package/dist/templates/trellis/workflows/research/workflow.md",
        ],
        forbiddenExactEntries: [],
        forbiddenPrefixes: [],
      }),
    ).toThrow(
      "Packed CLI is missing required Research/compatibility entries:\n" +
        "  - package/dist/templates/trellis/workflows/research/workflow.md",
    );
  });

  it("reports forbidden exact files and directory-prefix matches", () => {
    const inventory = {
      requiredEntries: ["package/package.json"],
      forbiddenExactEntries: ["package/dist/commands/mem.js"],
      forbiddenPrefixes: ["package/dist/commands/channel/"],
    };

    expect(() =>
      auditPackedEntries(
        [
          "package/package.json",
          "package/dist/commands/mem.js",
          "package/dist/commands/channel/index.js",
        ],
        inventory,
      ),
    ).toThrow(
      "Packed CLI contains forbidden generic entries:\n" +
        "  - package/dist/commands/channel/index.js\n" +
        "  - package/dist/commands/mem.js",
    );

    expect(
      auditPackedEntries(
        ["package/package.json", "package/dist/commands/channel-v2.js"],
        inventory,
      ),
    ).toEqual({ entryCount: 2, requiredEntryCount: 1 });
  });

  it("accepts successor active command, worker, hook, and workflow content", () => {
    expect(auditPackedActiveContent(validActiveContents())).toEqual({
      activeEntryCount: 7,
    });
  });

  it.each(PACKED_ACTIVE_FORBIDDEN_MUTATIONS)(
    "rejects packed active-content mutation $id",
    (mutation) => {
      const contents = validActiveContents();
      contents.set(
        mutation.entry,
        `${contents.get(mutation.entry) ?? ""}\n${mutation.text}`,
      );

      expect(() => auditPackedActiveContent(contents)).toThrow(
        `[${mutation.id}]`,
      );
    },
  );

  it.each(PACKED_ACTIVE_FORBIDDEN_MUTATIONS)(
    "rejects real verify-packed-cli tarball mutation $id",
    (mutation) => {
      const fixture = createPackedCliFixture(mutation);
      try {
        const result = spawnSync(
          process.execPath,
          [RELEASE_PREFLIGHT, "verify-packed-cli"],
          {
            cwd: CLI_DIR,
            encoding: "utf8",
            env: {
              ...process.env,
              VITEST: "true",
              TRELLIS_TEST_PACKED_CLI_TARBALL: fixture.archive,
            },
          },
        );

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain(`[${mutation.id}]`);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    },
  );

  it("builds the Research inventory with all stage skills and migration manifests", () => {
    const inventory = buildPackedCliInventory([
      "0.6.7.json",
      "0.7.0-beta.0.json",
    ]);

    for (const skill of RESEARCH_STAGE_SKILLS) {
      expect(inventory.requiredEntries).toContain(
        `package/dist/templates/common/bundled-skills/${skill}/SKILL.md`,
      );
    }
    for (const procedureId of RESEARCH_PROCEDURE_IDS) {
      expect(inventory.requiredEntries).toContain(
        `package/dist/templates/research/procedures/${procedureId}/1.0.0/procedure.json`,
      );
      expect(inventory.requiredEntries).toContain(
        `package/dist/templates/research/procedures/${procedureId}/1.0.0/PROCEDURE.md`,
      );
    }
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.6.7.json",
    );
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.7.0-beta.0.json",
    );
  });
});
