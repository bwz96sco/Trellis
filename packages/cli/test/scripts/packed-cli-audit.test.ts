import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  auditPackedActiveContent,
  auditPackedEntries,
  auditPackedExecutionPackageManifests,
  buildPackedCliInventory,
  normalizeTarEntry,
  PACKED_ACTIVE_FORBIDDEN_MUTATIONS,
  PACKED_ACTIVE_RESEARCH_ENTRIES,
  parseTarListing,
  RESEARCH_PILOT_SKILL_PACKAGES,
  RESEARCH_PROCEDURE_IDS,
  RESEARCH_PROCEDURE_VERSIONS,
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
const REQUIRED_PILOT_SKILL_ASSETS = RESEARCH_PILOT_SKILL_PACKAGES.flatMap(
  ({ id, version, members }) => {
    const base = `package/dist/templates/research/skills/${id}/${version}`;
    return ["skill.json", "SKILL.md", ...members].map(
      (member) => `${base}/${member}`,
    );
  },
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

  const packedProcedureRoot = path.join(
    packageRoot,
    "dist",
    "templates",
    "research",
    "procedures",
  );
  fs.cpSync(
    path.join(CLI_DIR, "src", "templates", "research", "procedures"),
    packedProcedureRoot,
    { recursive: true },
  );
  fs.cpSync(
    path.join(CLI_DIR, "src", "templates", "research", "skills"),
    path.join(packageRoot, "dist", "templates", "research", "skills"),
    { recursive: true },
  );
  for (const packedEntry of inventory.requiredEntries) {
    const target = path.join(root, ...packedEntry.split("/"));
    if (fs.existsSync(target)) continue;
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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function auditManifestContents(
  contents: ReadonlyMap<string, string | Uint8Array>,
) {
  return auditPackedExecutionPackageManifests(
    [...contents.keys()],
    (entry: string) => {
      const value = contents.get(entry);
      if (value === undefined) throw new Error(`missing test entry ${entry}`);
      return value;
    },
  );
}

function supportPackContents(): Map<string, string> {
  const base =
    "package/dist/templates/research/procedures/example-v1/2.0.0/methodology";
  const memberPath = "instructions/checkpoints.md";
  const member = "# Checkpoints\n";
  return new Map([
    [
      `${base}/pack.json`,
      JSON.stringify({
        schemaVersion: 1,
        procedureId: "example-v1",
        procedureVersion: "2.0.0",
        entries: [
          {
            path: memberPath,
            role: "instructions",
            mediaType: "text/markdown",
            contractVersion: "example-v1",
            provenanceId: "example",
            sha256: sha256(member),
            maxBytes: 1_024,
          },
        ],
      }),
    ],
    [`${base}/${memberPath}`, member],
  ]);
}

function skillContents(): Map<string, string> {
  const base =
    "package/dist/templates/research/skills/research-example/1.0.0";
  const memberPath = "references/default.md";
  const member = "# Reference\n";
  return new Map([
    [
      `${base}/skill.json`,
      JSON.stringify({
        schemaVersion: 3,
        packageKind: "skill",
        id: "research-example",
        version: "1.0.0",
        skillKind: "bounded",
        invocationSource: "model",
        entrypointType: "model-context",
        instructionFile: "SKILL.md",
        allowedProfiles: ["lightweight"],
        members: [
          {
            path: memberPath,
            role: "reference",
            load: "default",
            visibility: "worker-visible",
            sha256: sha256(member),
            maxBytes: 1_024,
          },
        ],
      }),
    ],
    [`${base}/SKILL.md`, "# Example Skill\n"],
    [`${base}/${memberPath}`, member],
  ]);
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

  it.each(REQUIRED_PILOT_SKILL_ASSETS)(
    "reports a missing required pilot Skill asset at %s",
    (missingEntry) => {
      const inventory = buildPackedCliInventory([]);
      expect(() =>
        auditPackedEntries(
          inventory.requiredEntries.filter((entry) => entry !== missingEntry),
          inventory,
        ),
      ).toThrow(`  - ${missingEntry}`);
    },
  );

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

  it("authenticates every manifest-declared Procedure support member", () => {
    const contents = supportPackContents();
    expect(auditManifestContents(contents)).toEqual({
      procedureManifestCount: 1,
      procedureMemberCount: 1,
      skillManifestCount: 0,
      skillMemberCount: 0,
    });

    const memberEntry = [...contents.keys()].find((entry) =>
      entry.endsWith("instructions/checkpoints.md"),
    );
    if (memberEntry === undefined) throw new Error("Missing support member fixture");
    contents.delete(memberEntry);
    expect(() => auditManifestContents(contents)).toThrow(
      `missing declared packed member ${memberEntry}`,
    );
  });

  it("rejects packed support-member digest drift and unsafe paths", () => {
    const drifted = supportPackContents();
    const memberEntry = [...drifted.keys()].find((entry) =>
      entry.endsWith("instructions/checkpoints.md"),
    );
    if (memberEntry === undefined) throw new Error("Missing support member fixture");
    drifted.set(memberEntry, "tampered\n");
    expect(() => auditManifestContents(drifted)).toThrow("sha256 mismatch");

    const unsafe = supportPackContents();
    const manifestEntry = [...unsafe.keys()].find((entry) =>
      entry.endsWith("methodology/pack.json"),
    );
    if (manifestEntry === undefined) throw new Error("Missing support manifest fixture");
    const manifest = JSON.parse(unsafe.get(manifestEntry) ?? "") as {
      entries: { path: string }[];
    };
    const firstEntry = manifest.entries[0];
    if (firstEntry === undefined) throw new Error("Missing support member manifest entry");
    firstEntry.path = "../outside.md";
    unsafe.set(manifestEntry, JSON.stringify(manifest));
    expect(() => auditManifestContents(unsafe)).toThrow(
      ".entries[0].path is unsafe: ../outside.md",
    );
  });

  it("uses future bundled Skill manifests without requiring a production Skill", () => {
    const contents = skillContents();
    expect(auditManifestContents(contents)).toEqual({
      procedureManifestCount: 0,
      procedureMemberCount: 0,
      skillManifestCount: 1,
      skillMemberCount: 1,
    });

    const instructionEntry = [...contents.keys()].find((entry) =>
      entry.endsWith("/SKILL.md"),
    );
    if (instructionEntry === undefined) throw new Error("Missing Skill instructions fixture");
    contents.set(instructionEntry, "﻿# Example Skill\n");
    expect(() => auditManifestContents(contents)).toThrow("contains a BOM or NUL");

    contents.delete(instructionEntry);
    expect(() => auditManifestContents(contents)).toThrow(
      `missing declared packed member ${instructionEntry}`,
    );
  });

  it("authenticates all six bundled Skill package versions from a real tarball", () => {
    const fixture = createPackedCliFixture();
    try {
      const result = spawnSync(
        process.execPath,
        [RELEASE_PREFLIGHT, "verify-packed-cli"],
        {
          cwd: CLI_DIR,
          encoding: "utf8",
          env: {
            ...process.env,
            NODE_OPTIONS: "",
            VITEST: "true",
            TRELLIS_TEST_PACKED_CLI_TARBALL: fixture.archive,
          },
        },
      );

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(
        "6 Skill manifests with 5 authenticated members",
      );
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }, 300_000);

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

  it("builds the Research inventory with Procedures, pilot Skills, and retirement evidence", () => {
    const inventory = buildPackedCliInventory([
      "0.6.7.json",
      "0.7.0-beta.0.json",
      "0.7.0-beta.1.json",
    ]);

    for (const skill of RESEARCH_STAGE_SKILLS) {
      expect(inventory.requiredEntries).not.toContain(
        `package/dist/templates/common/bundled-skills/${skill}/SKILL.md`,
      );
      expect(inventory.forbiddenExactEntries).toContain(
        `package/dist/templates/common/bundled-skills/${skill}/SKILL.md`,
      );
    }
    expect(inventory.requiredEntries).toContain(
      "package/dist/legacy/research-skill-retirement.json",
    );
    expect(inventory.requiredEntries).toContain(
      "package/dist/legacy/research-skill-retirement.js",
    );
    expect(
      inventory.forbiddenPrefixes.some((prefix) =>
        prefix.includes("bundled-skills/trellis-research-"),
      ),
    ).toBe(true);
    for (const procedureId of RESEARCH_PROCEDURE_IDS) {
      const optional =
        procedureId === "survey-v1" ||
        procedureId === "figure-v1" ||
        procedureId === "slides-v1";
      if (!optional) {
        expect(inventory.requiredEntries).toContain(
          `package/dist/templates/research/procedures/${procedureId}/1.0.0/procedure.json`,
        );
        expect(inventory.requiredEntries).toContain(
          `package/dist/templates/research/procedures/${procedureId}/1.0.0/PROCEDURE.md`,
        );
      }
      for (const version of RESEARCH_PROCEDURE_VERSIONS.filter(
        (candidate) => candidate !== "1.0.0",
      )) {
        expect(inventory.requiredEntries).toContain(
          `package/dist/templates/research/procedures/${procedureId}/${version}/procedure.json`,
        );
        expect(inventory.requiredEntries).toContain(
          `package/dist/templates/research/procedures/${procedureId}/${version}/methodology/pack.json`,
        );
      }
    }
    expect(RESEARCH_PROCEDURE_VERSIONS).toEqual([
      "1.0.0",
      "2.0.0",
      "2.0.1",
      "2.0.2",
      "2.0.3",
      "2.0.4",
      "2.0.5",
      "2.0.6",
      "2.0.7",
    ]);
    for (const { id, version, members } of RESEARCH_PILOT_SKILL_PACKAGES) {
      const base = `package/dist/templates/research/skills/${id}/${version}`;
      expect(inventory.requiredEntries).toContain(`${base}/skill.json`);
      expect(inventory.requiredEntries).toContain(`${base}/SKILL.md`);
      for (const member of members) {
        expect(inventory.requiredEntries).toContain(`${base}/${member}`);
      }
    }
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.6.7.json",
    );
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.7.0-beta.0.json",
    );
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.7.0-beta.1.json",
    );
  });
});
