import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ResearchExecutionPackageError,
  serializeResearchSkillManifestV3,
  type ResearchSkillManifestV3,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bundled = vi.hoisted(() => ({ root: "" }));
vi.mock("../../src/commands/research/bundled-skill-root.js", () => ({
  getBundledResearchSkillRoot: () => bundled.root,
}));

import {
  ResearchSkillResolutionError,
  resolveResearchExecutionPackage,
  resolveResearchProcedure,
  resolveResearchSkillExecutionPackage,
} from "../../src/commands/research/procedure-resolution.js";

const SKILL_ID = "research-literature";
const VERSION = "1.0.0";
const INSTRUCTIONS = "# Literature\r\nKeep exact bytes.\n";
const MEMBERS = {
  "references/default.md": "# Default reference\n",
  "templates/note.md": "{{ title }}\r\n",
  "validators/root.txt": "root-only-validator\n",
} as const;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function manifest(
  overrides: Partial<ResearchSkillManifestV3> = {},
): ResearchSkillManifestV3 {
  return {
    schemaVersion: 3,
    packageKind: "skill",
    id: SKILL_ID,
    version: VERSION,
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
        sha256: sha256(MEMBERS["references/default.md"]),
        maxBytes: 1_024,
      },
      {
        path: "templates/note.md",
        role: "template",
        load: "on-demand",
        visibility: "worker-visible",
        sha256: sha256(MEMBERS["templates/note.md"]),
        maxBytes: 1_024,
      },
      {
        path: "validators/root.txt",
        role: "validator",
        load: "on-demand",
        visibility: "root-only",
        sha256: sha256(MEMBERS["validators/root.txt"]),
        maxBytes: 1_024,
      },
    ],
    ...overrides,
  };
}

function packageDirectory(
  source: "project" | "bundled",
  root: string,
  id = SKILL_ID,
  version = VERSION,
): string {
  return source === "project"
    ? path.join(root, ".trellis", "research", "skills", id, version)
    : path.join(bundled.root, id, version);
}

function writeSkill(input: {
  source: "project" | "bundled";
  root: string;
  manifest?: ResearchSkillManifestV3;
  instructions?: string;
}): string {
  const value = input.manifest ?? manifest();
  const directory = packageDirectory(
    input.source,
    input.root,
    value.id,
    value.version,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "skill.json"),
    serializeResearchSkillManifestV3(value),
  );
  fs.writeFileSync(
    path.join(directory, "SKILL.md"),
    input.instructions ?? INSTRUCTIONS,
  );
  for (const member of value.members) {
    const content = MEMBERS[member.path as keyof typeof MEMBERS] ?? "fixture\n";
    const target = path.join(directory, ...member.path.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return directory;
}

function resolveSkill(
  root: string,
  overrides: Partial<{
    invocationSource: "model" | "operator-explicit";
    profile: "lightweight" | "managed";
    audience: "worker" | "root";
    requestedMemberPaths: readonly string[];
  }> = {},
) {
  return resolveResearchSkillExecutionPackage({
    root,
    id: SKILL_ID,
    version: VERSION,
    invocationSource: overrides.invocationSource ?? "model",
    profile: overrides.profile ?? "lightweight",
    audience: overrides.audience ?? "worker",
    ...(overrides.requestedMemberPaths === undefined
      ? {}
      : { requestedMemberPaths: overrides.requestedMemberPaths }),
  });
}

describe("Research execution-package filesystem resolution", () => {
  let root: string;
  let temp: string;

  beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-execution-package-"));
    root = path.join(temp, "project");
    bundled.root = path.join(temp, "bundled-skills");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    fs.mkdirSync(bundled.root, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it("resolves project-only Skills through the shared boundary", async () => {
    writeSkill({ source: "project", root });

    const resolved = await resolveResearchExecutionPackage({
      root,
      selector: {
        packageKind: "skill",
        mode: "exact",
        id: SKILL_ID,
        version: VERSION,
      },
      invocationSource: "model",
      profile: "lightweight",
      audience: "worker",
    });

    expect(resolved.identity.packageKind).toBe("skill");
    expect(resolved).toMatchObject({
      source: "project",
      instructions: INSTRUCTIONS,
      manifest: { id: SKILL_ID, version: VERSION },
    });
  });

  it("uses an exact project package and falls back only when it is absent", async () => {
    writeSkill({ source: "bundled", root, instructions: "# Bundled\n" });
    expect((await resolveSkill(root)).source).toBe("bundled");

    writeSkill({ source: "project", root, instructions: "# Project\n" });
    const project = await resolveSkill(root);
    expect(project.source).toBe("project");
    expect(project.instructions).toBe("# Project\n");
  });

  it("blocks bundled fallback when the exact project package is invalid", async () => {
    writeSkill({ source: "bundled", root });
    const directory = writeSkill({ source: "project", root });
    fs.writeFileSync(path.join(directory, "SKILL.md"), "");

    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });
  });

  it("returns a stable not-found error without host or source discovery", async () => {
    await expect(resolveSkill(root)).rejects.toEqual(
      expect.objectContaining<Partial<ResearchSkillResolutionError>>({
        code: "RESEARCH_SKILL_NOT_FOUND",
        message: `Research Skill '${SKILL_ID}@${VERSION}' was not found`,
      }),
    );
  });

  it("rejects symlinked package components, member parents, and non-files", async () => {
    const bundledDirectory = writeSkill({ source: "bundled", root });
    const versionParent = path.dirname(packageDirectory("project", root));
    fs.mkdirSync(versionParent, { recursive: true });
    fs.symlinkSync(bundledDirectory, packageDirectory("project", root));
    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });

    fs.rmSync(packageDirectory("project", root), { force: true });
    const projectDirectory = writeSkill({ source: "project", root });
    const external = path.join(temp, "external");
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(external, "default.md"), MEMBERS["references/default.md"]);
    fs.rmSync(path.join(projectDirectory, "references"), { recursive: true });
    fs.symlinkSync(external, path.join(projectDirectory, "references"));
    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });

    fs.rmSync(path.join(projectDirectory, "references"), { force: true });
    fs.mkdirSync(path.join(projectDirectory, "references", "default.md"), {
      recursive: true,
    });
    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });
  });

  it("detects file replacement during a stable read", async () => {
    const directory = writeSkill({ source: "project", root });
    const instructionPath = path.join(directory, "SKILL.md");
    const originalRead = fs.readFileSync.bind(fs);
    let mutated = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((target: fs.PathOrFileDescriptor) => {
      const value = originalRead(target);
      if (
        !mutated &&
        typeof target === "string" &&
        path.resolve(target) === instructionPath
      ) {
        mutated = true;
        fs.appendFileSync(instructionPath, "changed");
      }
      return value;
    }) as typeof fs.readFileSync);

    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });
  });

  it.each([
    ["SKILL.md", 256 * 1024 + 1],
    ["references/default.md", 1024 * 1024 + 1],
  ] as const)("rejects oversized %s before reading its contents", async (relativePath, size) => {
    const directory = writeSkill({ source: "project", root });
    const target = path.join(directory, ...relativePath.split("/"));
    fs.writeFileSync(target, Buffer.alloc(size, 0x61));
    const read = vi.spyOn(fs, "readFileSync");

    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });
    expect(
      read.mock.calls.some(
        ([candidate]) =>
          typeof candidate === "string" && path.resolve(candidate) === target,
      ),
    ).toBe(false);
  });

  it("authenticates the full inventory before audience projection", async () => {
    writeSkill({ source: "project", root });
    const defaults = await resolveSkill(root);
    expect(defaults.members.map((member) => member.path)).toEqual([
      "references/default.md",
    ]);

    const worker = await resolveSkill(root, {
      requestedMemberPaths: ["templates/note.md"],
    });
    expect(worker.members.map((member) => member.path)).toEqual([
      "references/default.md",
      "templates/note.md",
    ]);

    const rootProjection = await resolveSkill(root, {
      audience: "root",
      requestedMemberPaths: ["validators/root.txt"],
    });
    expect(rootProjection.members.map((member) => member.path)).toEqual([
      "references/default.md",
      "validators/root.txt",
    ]);
    await expect(
      resolveSkill(root, {
        requestedMemberPaths: ["validators/root.txt"],
      }),
    ).rejects.toMatchObject({ code: "RESEARCH_SKILL_MEMBER_FORBIDDEN" });

    fs.writeFileSync(
      path.join(packageDirectory("project", root), "validators", "root.txt"),
      "tampered\n",
    );
    await expect(resolveSkill(root)).rejects.toMatchObject({
      code: "INVALID_PROJECT_SKILL",
    });
  });

  it("validates identity, invocation source, entrypoint, and profile independently", async () => {
    writeSkill({ source: "project", root });
    const resolved = await resolveSkill(root);
    await expect(
      resolveResearchSkillExecutionPackage({
        root,
        id: SKILL_ID,
        version: VERSION,
        invocationSource: "model",
        profile: "lightweight",
        audience: "worker",
        expectedIdentity: {
          ...resolved.identity,
          packageDigest: `sha256:${"f".repeat(64)}`,
        },
      }),
    ).rejects.toBeInstanceOf(ResearchExecutionPackageError);

    fs.rmSync(packageDirectory("project", root), { recursive: true });
    writeSkill({
      source: "project",
      root,
      manifest: manifest({
        allowedProfiles: ["lightweight"],
        managedBinding: undefined,
      }),
    });
    await expect(
      resolveSkill(root, { profile: "managed" }),
    ).rejects.toMatchObject({ code: "RESEARCH_SKILL_INVOCATION_FORBIDDEN" });

    fs.rmSync(packageDirectory("project", root), { recursive: true });
    const rootMember = {
      path: "validators/root.txt",
      role: "validator" as const,
      load: "default" as const,
      visibility: "root-only" as const,
      sha256: sha256(MEMBERS["validators/root.txt"]),
      maxBytes: 1_024,
    };
    writeSkill({
      source: "project",
      root,
      manifest: manifest({
        skillKind: "admin",
        invocationSource: "operator-explicit",
        entrypointType: "root-command",
        allowedProfiles: [],
        managedBinding: undefined,
        members: [rootMember],
      }),
    });
    await expect(
      resolveResearchSkillExecutionPackage({
        root,
        id: SKILL_ID,
        version: VERSION,
        invocationSource: "model",
        audience: "root",
      }),
    ).rejects.toMatchObject({ code: "RESEARCH_SKILL_INVOCATION_FORBIDDEN" });
    const rootCommand = await resolveResearchSkillExecutionPackage({
      root,
      id: SKILL_ID,
      version: VERSION,
      invocationSource: "operator-explicit",
      audience: "root",
    });
    expect(rootCommand.members.map((member) => member.path)).toEqual([
      "validators/root.txt",
    ]);
  });

  it("keeps lightweight and managed identity and instructions identical while selecting exact managed members", async () => {
    writeSkill({ source: "project", root });
    const lightweight = await resolveSkill(root, { profile: "lightweight" });
    const managed = await resolveSkill(root, {
      profile: "managed",
      invocationSource: "operator-explicit",
      requestedMemberPaths: ["templates/note.md"],
    });
    expect(managed.identity).toEqual(lightweight.identity);
    expect(managed.instructions).toBe(lightweight.instructions);
    expect(managed.members.map((member) => member.path)).toEqual([
      "templates/note.md",
    ]);
    expect(
      (
        await resolveSkill(root, {
          profile: "managed",
          invocationSource: "operator-explicit",
          requestedMemberPaths: [],
        })
      ).members,
    ).toEqual([]);
  });

  it("keeps the Procedure compatibility wrapper on the shared boundary", async () => {
    const legacy = await resolveResearchProcedure({
      root,
      capabilityId: "research.computation.case",
    });
    const shared = await resolveResearchExecutionPackage({
      root,
      selector: {
        packageKind: "procedure",
        mode: "registry-current",
        capabilityId: "research.computation.case",
      },
    });
    expect(shared).toEqual(legacy);
    expect(shared.identity.packageKind).toBe("procedure");
  });
});
