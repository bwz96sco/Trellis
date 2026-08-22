import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ResearchExecutionPackageError,
  assertResearchExecutionPackageIdentity,
  computeResearchExecutionPackageInstructionDigest,
  computeResearchExecutionPackageMemberInventoryDigest,
  computeResearchSkillPackageDigest,
  parseResearchSkillExecutionPackage,
  selectResearchSkillMembers,
  serializeResearchSkillManifestV3,
  validateResearchSkillInvocation,
  type ResearchSkillManifestV3,
} from "../../src/research/index.js";

const encoder = new TextEncoder();

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const instructionBytes = encoder.encode("# Literature\r\nKeep exact bytes.\n");
const defaultMemberBytes = encoder.encode("# Default reference\n");
const onDemandMemberBytes = encoder.encode("{{ title }}\r\n");
const rootMemberBytes = encoder.encode("root-only-validator\n");

function manifest(): ResearchSkillManifestV3 {
  return {
    schemaVersion: 3,
    packageKind: "skill",
    id: "research-literature",
    version: "1.0.0",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    instructionFile: "SKILL.md",
    allowedProfiles: ["lightweight", "managed"],
    managedBinding: { capabilityId: "research.literature.scan" },
    members: [
      {
        path: "references/default.md",
        role: "reference",
        load: "default",
        visibility: "worker-visible",
        sha256: sha256(defaultMemberBytes),
        maxBytes: 1_024,
      },
      {
        path: "templates/note.md",
        role: "template",
        load: "on-demand",
        visibility: "worker-visible",
        sha256: sha256(onDemandMemberBytes),
        maxBytes: 1_024,
      },
      {
        path: "validators/root.txt",
        role: "validator",
        load: "on-demand",
        visibility: "root-only",
        sha256: sha256(rootMemberBytes),
        maxBytes: 1_024,
      },
    ],
    outputs: {
      primary: ["paper-note", "register"],
      defaultPersistence: "request-dependent",
    },
    handoff: {
      suggestedSkillIds: ["research-ideation"],
      autoInvoke: false,
    },
  };
}

function parse(overrides: {
  readonly manifest?: ResearchSkillManifestV3;
  readonly manifestText?: string;
  readonly instructions?: Uint8Array;
  readonly members?: Readonly<Record<string, Uint8Array>>;
} = {}) {
  const value = overrides.manifest ?? manifest();
  return parseResearchSkillExecutionPackage({
    source: "project",
    manifestBytes: encoder.encode(
      overrides.manifestText ?? serializeResearchSkillManifestV3(value),
    ),
    instructionBytes: overrides.instructions ?? instructionBytes,
    memberBytes:
      overrides.members ??
      {
        "references/default.md": defaultMemberBytes,
        "templates/note.md": onDemandMemberBytes,
        "validators/root.txt": rootMemberBytes,
      },
  });
}

function independentDigest(domain: string, parts: readonly Uint8Array[]): string {
  const hash = createHash("sha256");
  hash.update(encoder.encode(`${domain}\0`));
  for (const bytes of parts) {
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(length);
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

describe("Research Skill execution-package schema v3", () => {
  it("parses canonical exact bytes into a deeply frozen normalized package", () => {
    const parsed = parse();

    expect(parsed.source).toBe("project");
    expect(parsed.manifest).toEqual(manifest());
    expect(parsed.instructions).toBe("# Literature\r\nKeep exact bytes.\n");
    expect(parsed.identity).toEqual({
      id: "research-literature",
      version: "1.0.0",
      schemaVersion: 3,
      packageKind: "skill",
      packageDigest: "sha256:cc723eee5f74cf80b71bd890624e42006bb83ea8a0141329cbf709e9c42b1ce0",
      instructionDigest:
        "sha256:bfbcfdadd40032c1119acb6fa5b03c8a401cfba088badc65a10f245c0658d682",
      memberInventoryDigest:
        "sha256:4c752b7f7a6048cf2ad162a3f3a7f4accae3b1fb44a996582f54ebe4e5033574",
    });
    expect(parsed.members.map((member) => member.path)).toEqual([
      "references/default.md",
      "templates/note.md",
      "validators/root.txt",
    ]);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.identity)).toBe(true);
    expect(Object.isFrozen(parsed.manifest)).toBe(true);
    expect(Object.isFrozen(parsed.manifest.members)).toBe(true);
    expect(Object.isFrozen(parsed.members)).toBe(true);
    expect(Object.isFrozen(parsed.members[0])).toBe(true);
  });

  it("matches independently framed instruction, inventory, and package vectors", () => {
    const parsed = parse();
    const canonicalManifestBytes = encoder.encode(parsed.canonicalManifestJson);
    const inventoryBytes = encoder.encode(
      `${JSON.stringify(
        parsed.members.map((member) => ({
          path: member.path,
          role: member.role,
          load: member.load,
          visibility: member.visibility,
          sha256: member.sha256,
          maxBytes: member.maxBytes,
          byteLength: member.byteLength,
        })),
      )}\n`,
    );

    expect(
      computeResearchExecutionPackageInstructionDigest(instructionBytes),
    ).toBe(
      independentDigest(
        "trellis-research-execution-package-instruction-v1",
        [instructionBytes],
      ),
    );
    expect(
      computeResearchExecutionPackageMemberInventoryDigest({
        adapter: "skill-v3",
        canonicalInventoryBytes: inventoryBytes,
      }),
    ).toBe(
      independentDigest(
        "trellis-research-execution-package-member-inventory-v1",
        [encoder.encode("skill-v3"), inventoryBytes],
      ),
    );
    expect(
      computeResearchSkillPackageDigest({
        canonicalManifestBytes,
        instructionBytes,
        canonicalInventoryBytes: inventoryBytes,
        members: [
          { path: "references/default.md", bytes: defaultMemberBytes },
          { path: "templates/note.md", bytes: onDemandMemberBytes },
          { path: "validators/root.txt", bytes: rootMemberBytes },
        ],
      }),
    ).toBe(
      independentDigest(
        "trellis-research-execution-package-digest-v3",
        [
          canonicalManifestBytes,
          instructionBytes,
          inventoryBytes,
          encoder.encode("references/default.md"),
          defaultMemberBytes,
          encoder.encode("templates/note.md"),
          onDemandMemberBytes,
          encoder.encode("validators/root.txt"),
          rootMemberBytes,
        ],
      ),
    );
  });

  it.each([
    ["pretty JSON", () => `${JSON.stringify(manifest(), null, 2)}\n`],
    ["missing final LF", () => serializeResearchSkillManifestV3(manifest()).slice(0, -1)],
    ["extra final LF", () => `${serializeResearchSkillManifestV3(manifest())}\n`],
    ["unknown key", () => `${JSON.stringify({ ...manifest(), extra: true })}\n`],
  ])("rejects noncanonical or open %s manifests", (_label, text) => {
    expect(() => parse({ manifestText: text() })).toThrow(
      ResearchExecutionPackageError,
    );
  });

  it.each([
    ["absolute", "/escape.md"],
    ["backslash", "templates\\note.md"],
    ["parent", "../note.md"],
    ["reserved manifest", "skill.json"],
    ["reserved instructions", "SKILL.md"],
  ])("rejects %s member path", (_label, memberPath) => {
    const value = manifest();
    const firstMember = value.members[0];
    if (firstMember === undefined) throw new Error("Missing first member fixture");
    const invalid = {
      ...value,
      members: [{ ...firstMember, path: memberPath }, ...value.members.slice(1)],
    } as ResearchSkillManifestV3;
    expect(() => parse({ manifest: invalid })).toThrow(/unsafe/);
  });

  it("rejects missing, undeclared, digest-mismatched, oversized, and invalid UTF-8 members", () => {
    expect(() =>
      parse({
        members: {
          "references/default.md": defaultMemberBytes,
          "templates/note.md": onDemandMemberBytes,
        },
      }),
    ).toThrow(/exactly match/);
    expect(() =>
      parse({
        members: {
          "references/default.md": defaultMemberBytes,
          "templates/note.md": onDemandMemberBytes,
          "validators/root.txt": rootMemberBytes,
          "undeclared.txt": encoder.encode("no"),
        },
      }),
    ).toThrow(/exactly match/);
    expect(() =>
      parse({
        members: {
          "references/default.md": encoder.encode("changed"),
          "templates/note.md": onDemandMemberBytes,
          "validators/root.txt": rootMemberBytes,
        },
      }),
    ).toThrow(/digest/);

    const value = manifest();
    const firstMember = value.members[0];
    if (firstMember === undefined) throw new Error("Missing first member fixture");
    const limited = {
      ...value,
      members: [{ ...firstMember, maxBytes: 1 }, ...value.members.slice(1)],
    } as ResearchSkillManifestV3;
    expect(() => parse({ manifest: limited })).toThrow(/byte limit/);
    expect(() =>
      parse({
        members: {
          "references/default.md": defaultMemberBytes,
          "templates/note.md": onDemandMemberBytes,
          "validators/root.txt": Uint8Array.of(0xff),
        },
      }),
    ).toThrow(/digest/);
  });

  it("accepts an empty digest-bound member without weakening instruction rules", () => {
    const value = manifest();
    const firstMember = value.members[0];
    if (firstMember === undefined) throw new Error("Missing first member fixture");
    const emptyMember = new Uint8Array();
    const parsed = parse({
      manifest: {
        ...value,
        members: [
          { ...firstMember, sha256: sha256(emptyMember) },
          ...value.members.slice(1),
        ],
      },
      members: {
        "references/default.md": emptyMember,
        "templates/note.md": onDemandMemberBytes,
        "validators/root.txt": rootMemberBytes,
      },
    });

    expect(parsed.members[0]?.content).toBe("");
    expect(parsed.members[0]?.byteLength).toBe(0);
  });

  it("keeps exact instruction bytes and rejects empty, BOM, NUL, and oversized instructions", () => {
    expect(parse().identity.instructionDigest).not.toBe(
      parse({ instructions: encoder.encode("# Literature\nKeep exact bytes.\n") })
        .identity.instructionDigest,
    );
    expect(() => parse({ instructions: new Uint8Array() })).toThrow(/between 1/);
    expect(() =>
      parse({ instructions: Uint8Array.of(0xef, 0xbb, 0xbf, 0x61) }),
    ).toThrow(/without BOM/);
    expect(() => parse({ instructions: encoder.encode("a\0b") })).toThrow(/NUL/);
    expect(() =>
      parse({ instructions: new Uint8Array(256 * 1024 + 1).fill(0x61) }),
    ).toThrow(/between 1/);
  });

  it("enforces independent invocation source, entrypoint, profile, and binding rules", () => {
    const parsed = parse();
    expect(() =>
      validateResearchSkillInvocation({
        skill: parsed,
        invocationSource: "model",
        profile: "lightweight",
      }),
    ).not.toThrow();
    expect(() =>
      validateResearchSkillInvocation({
        skill: parsed,
        invocationSource: "model",
        profile: "managed",
      }),
    ).not.toThrow();

    const explicitManifest = {
      ...manifest(),
      invocationSource: "operator-explicit" as const,
    };
    const explicit = parse({ manifest: explicitManifest });
    expect(() =>
      validateResearchSkillInvocation({
        skill: explicit,
        invocationSource: "model",
        profile: "managed",
      }),
    ).toThrow(/operator-explicit/);
    expect(() =>
      validateResearchSkillInvocation({
        skill: explicit,
        invocationSource: "operator-explicit",
        profile: "managed",
      }),
    ).not.toThrow();

    const rootCommandManifest: ResearchSkillManifestV3 = {
      schemaVersion: 3,
      packageKind: "skill",
      id: "research-quest-admin",
      version: "1.0.0",
      skillKind: "admin",
      invocationSource: "operator-explicit",
      entrypointType: "root-command",
      instructionFile: "SKILL.md",
      allowedProfiles: [],
      members: [
        {
          path: "validators/root.txt",
          role: "validator",
          load: "on-demand",
          visibility: "root-only",
          sha256: sha256(rootMemberBytes),
          maxBytes: 1_024,
        },
      ],
    };
    const rootCommand = parse({
      manifest: rootCommandManifest,
      members: { "validators/root.txt": rootMemberBytes },
    });
    expect(() =>
      validateResearchSkillInvocation({
        skill: rootCommand,
        invocationSource: "operator-explicit",
        profile: "lightweight",
      }),
    ).toThrow(/root command/);
  });

  it("authenticates the full inventory before selecting default and requested members", () => {
    const parsed = parse();
    expect(
      selectResearchSkillMembers({ skill: parsed, audience: "worker" }).map(
        (member) => member.path,
      ),
    ).toEqual(["references/default.md"]);
    expect(
      selectResearchSkillMembers({
        skill: parsed,
        audience: "worker",
        requestedPaths: ["templates/note.md"],
      }).map((member) => member.path),
    ).toEqual(["references/default.md", "templates/note.md"]);
    expect(() =>
      selectResearchSkillMembers({
        skill: parsed,
        audience: "worker",
        requestedPaths: ["validators/root.txt"],
      }),
    ).toThrow(/forbidden/);
    expect(
      selectResearchSkillMembers({
        skill: parsed,
        audience: "root",
        requestedPaths: ["validators/root.txt"],
      }).map((member) => member.path),
    ).toEqual(["references/default.md", "validators/root.txt"]);
    expect(() =>
      selectResearchSkillMembers({
        skill: parsed,
        audience: "root",
        requestedPaths: ["undeclared.txt"],
      }),
    ).toThrow(/forbidden/);
  });

  it("asserts exact normalized identity without case folding or aliases", () => {
    const identity = parse().identity;
    expect(() =>
      assertResearchExecutionPackageIdentity(identity, {
        id: identity.id,
        version: identity.version,
        packageKind: "skill",
        packageDigest: identity.packageDigest,
      }),
    ).not.toThrow();
    expect(() =>
      assertResearchExecutionPackageIdentity(identity, {
        id: "Research-literature",
        version: identity.version,
        packageKind: "skill",
      }),
    ).toThrow(/identity mismatch/);
  });
});
