import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commitResearchBatch,
  createQuestId,
  createWorkflowInstanceId,
  createWorkspaceId,
  parseResearchWorkflowDefinitionV1,
  serializeResearchSkillManifestV3,
  type ResearchSkillManifestV3,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bundled = vi.hoisted(() => ({ root: "" }));
vi.mock("../../src/commands/research/bundled-skill-root.js", () => ({
  getBundledResearchSkillRoot: () => bundled.root,
}));

import { ResearchCliError } from "../../src/commands/research/errors.js";
import {
  getResearchSkillContext,
  listResearchSkills,
  showResearchSkill,
} from "../../src/commands/research/skill-command.js";

const ID = "research-review";
const VERSION = "1.0.0";
const INSTRUCTIONS = "# Review\nInspect one bounded subject.\n";
const DEFAULT = "default reference\n";
const OPTIONAL = "optional template\n";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function manifest(version = VERSION): ResearchSkillManifestV3 {
  return {
    schemaVersion: 3,
    packageKind: "skill",
    id: ID,
    version,
    skillKind: "bounded",
    invocationSource: "operator-explicit",
    entrypointType: "model-context",
    instructionFile: "SKILL.md",
    allowedProfiles: ["lightweight"],
    members: [
      {
        path: "references/default.md",
        role: "reference",
        load: "default",
        visibility: "worker-visible",
        sha256: sha256(DEFAULT),
        maxBytes: 1024,
      },
      {
        path: "templates/optional.md",
        role: "template",
        load: "on-demand",
        visibility: "worker-visible",
        sha256: sha256(OPTIONAL),
        maxBytes: 1024,
      },
    ],
  };
}

function writeSkill(root: string, version = VERSION): void {
  const directory = path.join(
    root,
    ".trellis",
    "research",
    "skills",
    ID,
    version,
  );
  fs.mkdirSync(path.join(directory, "references"), { recursive: true });
  fs.mkdirSync(path.join(directory, "templates"), { recursive: true });
  fs.writeFileSync(
    path.join(directory, "skill.json"),
    serializeResearchSkillManifestV3(manifest(version)),
  );
  fs.writeFileSync(path.join(directory, "SKILL.md"), INSTRUCTIONS);
  fs.writeFileSync(path.join(directory, "references", "default.md"), DEFAULT);
  fs.writeFileSync(path.join(directory, "templates", "optional.md"), OPTIONAL);
}

function snapshot(root: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else files.set(path.relative(root, target), fs.readFileSync(target));
    }
  };
  walk(root);
  return files;
}

describe("research skill read-only commands", () => {
  let root: string;
  let temp: string;

  beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-skill-command-"));
    root = path.join(temp, "project");
    bundled.root = path.join(temp, "bundled");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    fs.mkdirSync(bundled.root, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it("lists and shows authenticated metadata without returning package content or writing bytes", async () => {
    writeSkill(root);
    const before = snapshot(root);
    const listed = await listResearchSkills({ root });
    expect(listed.skills).toHaveLength(1);
    expect(listed.skills[0]).toMatchObject({
      id: ID,
      version: VERSION,
      source: "project",
      invocationSource: "operator-explicit",
    });
    expect(JSON.stringify(listed)).not.toContain(INSTRUCTIONS.trim());

    const shown = await showResearchSkill({ root, skill: ID });
    expect(shown.manifest).toMatchObject({ id: ID, version: VERSION });
    expect(shown.instructions).toMatchObject({
      byteLength: Buffer.byteLength(INSTRUCTIONS),
    });
    expect(shown.members).toEqual([
      expect.not.objectContaining({ content: expect.anything() }),
      expect.not.objectContaining({ content: expect.anything() }),
    ]);
    expect(snapshot(root)).toEqual(before);
  });

  it("returns exactly one Skill, default members, and explicitly requested permitted members", async () => {
    writeSkill(root);
    const before = snapshot(root);
    const context = await getResearchSkillContext({
      root,
      skill: ID,
      profile: "lightweight",
      member: ["templates/optional.md"],
    });
    expect(context).toMatchObject({
      profile: "lightweight",
      instructions: INSTRUCTIONS,
      workflow: null,
      quest: null,
      stop: { after: "one-skill", autoInvoke: false },
    });
    expect(context.members.map((member) => member.path)).toEqual([
      "references/default.md",
      "templates/optional.md",
    ]);
    expect(snapshot(root)).toEqual(before);
  });

  it("requires an exact version when discovery finds multiple valid versions", async () => {
    writeSkill(root, "1.0.0");
    writeSkill(root, "2.0.0");
    await expect(showResearchSkill({ root, skill: ID })).rejects.toMatchObject({
      code: "research_skill_version_required",
    });
    const shown = await showResearchSkill({ root, skill: ID, version: "2.0.0" });
    expect(shown.manifest.version).toBe("2.0.0");
  });

  it("fails the whole discovery when a project Skill candidate is invalid", async () => {
    writeSkill(root);
    const projectSkills = path.join(root, ".trellis", "research", "skills");
    const invalidTarget = path.join(temp, "invalid-skill");
    fs.mkdirSync(invalidTarget);
    fs.symlinkSync(invalidTarget, path.join(projectSkills, "invalid-skill"), "dir");

    await expect(listResearchSkills({ root })).rejects.toMatchObject({
      code: "research_skill_not_found",
    });
  });

  it("maps active Workflow package identity drift to invocation forbidden", async () => {
    writeSkill(root);
    const questId = createQuestId();
    const workflowInstanceId = createWorkflowInstanceId();
    const workflowValue = {
      schemaVersion: 1,
      id: "review-flow",
      version: "1.0.0",
      startNodeIds: ["review"],
      nodes: [
        {
          id: "review",
          executionPackage: {
            id: ID,
            version: VERSION,
            schemaVersion: 3,
            packageKind: "skill",
            packageDigest: `sha256:${"1".repeat(64)}`,
            instructionDigest: `sha256:${"2".repeat(64)}`,
            memberInventoryDigest: `sha256:${"3".repeat(64)}`,
          },
          allowedProfiles: ["lightweight"],
          stop: true,
        },
      ],
      transitions: [],
    };
    const workflowBytes = new TextEncoder().encode(JSON.stringify(workflowValue));
    const workflow = parseResearchWorkflowDefinitionV1(workflowBytes);
    const workflowDirectory = path.join(
      root,
      ".trellis",
      "research",
      "workflows",
      "review-flow",
      "1.0.0",
    );
    fs.mkdirSync(workflowDirectory, { recursive: true });
    fs.writeFileSync(path.join(workflowDirectory, "workflow.json"), workflowBytes);
    await commitResearchBatch({
      root,
      actor: { type: "agent", id: "test" },
      provenance: { source: "test" },
      idempotencyKey: "setup-workflow-context",
      timestamp: "2026-08-21T00:00:00.000Z",
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: createWorkspaceId(),
            name: "Research",
            description: "",
          },
        },
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
        {
          kind: "workflow.bind",
          workflowInstanceId,
          questId,
          startNodeId: "review",
          workflow,
        },
      ],
    });

    await expect(
      getResearchSkillContext({
        root,
        skill: ID,
        profile: "lightweight",
        quest: questId,
      }),
    ).rejects.toMatchObject({ code: "research_skill_invocation_forbidden" });
  });

  it("fails managed Context before returning bytes and maps forbidden members", async () => {
    writeSkill(root);
    await expect(
      getResearchSkillContext({ root, skill: ID, profile: "managed" }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ResearchCliError>>({
        code: "research_skill_invocation_forbidden",
      }),
    );
    await expect(
      getResearchSkillContext({
        root,
        skill: ID,
        profile: "lightweight",
        member: ["undeclared.md"],
      }),
    ).rejects.toMatchObject({ code: "research_skill_member_forbidden" });
  });
});
