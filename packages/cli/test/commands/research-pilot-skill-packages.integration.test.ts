import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createRunId,
  serializeResearchSkillManifestV3,
  type WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getBundledResearchSkillRoot } from "../../src/commands/research/bundled-skill-root.js";
import { createResearchRun } from "../../src/commands/research/command.js";
import { approveResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import { resolveApprovedResearchDispatchContext } from "../../src/commands/research/dispatch-approved-context.js";
import { prepareResearchDispatch } from "../../src/commands/research/dispatch-command.js";
import { resolveResearchSkillExecutionPackage } from "../../src/commands/research/procedure-resolution.js";
import {
  getResearchSkillContext,
  listResearchSkills,
  showResearchSkill,
} from "../../src/commands/research/skill-command.js";
import { bindResearchWorkflow } from "../../src/commands/research/workflow-command.js";
import { createResearchDispatchFixture } from "../fixtures/research-dispatch.js";

const VERSION = "1.0.0";
const LITERATURE_TEMPLATE = "templates/note-template.md";
const EVALUATION_TEMPLATE = "templates/attack-template.md";
const EXPECTED_PACKAGES = [
  {
    id: "research-idea-evaluation",
    skillKind: "workflow",
    invocationSource: "operator-explicit",
    entrypointType: "model-context",
    allowedProfiles: ["managed"],
    capabilityId: "research.ideation.evaluate",
    members: [EVALUATION_TEMPLATE],
  },
  {
    id: "research-ideation",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.ideation.generate",
    members: ["templates/opportunity-board-template.md"],
  },
  {
    id: "research-literature",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.literature.review",
    members: [LITERATURE_TEMPLATE],
  },
  {
    id: "research-quest-admin",
    skillKind: "admin",
    invocationSource: "operator-explicit",
    entrypointType: "root-command",
    allowedProfiles: [],
    capabilityId: undefined,
    members: [],
  },
] as const;
const EXPECTED_LISTED_PACKAGES = [
  "research-idea-evaluation@1.0.0",
  "research-ideation@1.0.0",
  "research-ideation@1.1.0",
  "research-literature@1.0.0",
  "research-literature@1.1.0",
  "research-quest-admin@1.0.0",
] as const;
const EXPECTED_TEMPLATE_AUTHENTICATION = {
  "research-idea-evaluation": {
    path: EVALUATION_TEMPLATE,
    bytes: 1_293,
    sha256: "ee43247517a2652cf9240261e6142e3b163db596fd29c80a75f08479916a4b15",
  },
  "research-ideation": {
    path: "templates/opportunity-board-template.md",
    bytes: 1_661,
    sha256: "4bdb5a549fe58b02cad078f76cc9f04f1e32dc9533211d7a85e36f28c883582b",
  },
  "research-literature": {
    path: LITERATURE_TEMPLATE,
    bytes: 2_499,
    sha256: "3e01c5ec149958590ef3d3ab6751fb1db3203b978b5a698c22e7eef33894ed71",
  },
} as const;

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function packageDirectory(id: string): string {
  return path.join(getBundledResearchSkillRoot(), id, VERSION);
}

function writeEvaluationWorkflow(
  root: string,
  identity: Awaited<
    ReturnType<typeof resolveResearchSkillExecutionPackage>
  >["identity"],
): void {
  const directory = path.join(
    root,
    ".trellis",
    "research",
    "workflows",
    "pilot-evaluation",
    VERSION,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "workflow.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      id: "pilot-evaluation",
      version: VERSION,
      startNodeIds: ["attack"],
      nodes: [
        {
          id: "attack",
          executionPackage: identity,
          allowedProfiles: ["managed"],
          stop: true,
        },
        {
          id: "closure",
          executionPackage: identity,
          allowedProfiles: ["managed"],
          stop: true,
        },
      ],
      transitions: [
        {
          id: "close-attack",
          fromNodeId: "attack",
          toNodeId: "closure",
          requiredRefs: [],
          requiredGateIds: [],
        },
      ],
    })}\n`,
  );
}

describe("bundled Research pilot Skill packages", { timeout: 30_000 }, () => {
  let sandbox: string;
  let root: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-pilot-skills-"));
    root = path.join(sandbox, "project");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("lists all six versions and authenticates the four original production packages", async () => {
    const listed = await listResearchSkills({ root });

    expect(listed.skills.map(({ id, version }) => `${id}@${version}`)).toEqual(
      EXPECTED_LISTED_PACKAGES,
    );

    for (const expected of EXPECTED_PACKAGES) {
      const inspected = await showResearchSkill({
        root,
        skill: expected.id,
        version: VERSION,
      });
      expect(inspected.source).toBe("bundled");
      expect(inspected.manifest).toMatchObject({
        schemaVersion: 3,
        packageKind: "skill",
        id: expected.id,
        version: VERSION,
        skillKind: expected.skillKind,
        invocationSource: expected.invocationSource,
        entrypointType: expected.entrypointType,
        allowedProfiles: [...expected.allowedProfiles],
        members: expected.members.map((memberPath) => ({
          path: memberPath,
          role: "template",
          load: "on-demand",
          visibility: "worker-visible",
        })),
      });
      expect(inspected.manifest.managedBinding?.capabilityId).toBe(
        expected.capabilityId,
      );
      expect(inspected.members.map(({ path: memberPath }) => memberPath)).toEqual(
        [...expected.members],
      );
      expect(
        fs.readFileSync(path.join(packageDirectory(expected.id), "skill.json"), "utf8"),
      ).toBe(serializeResearchSkillManifestV3(inspected.manifest));
      expect(inspected.identity).toMatchObject({
        schemaVersion: 3,
        packageKind: "skill",
        id: expected.id,
        version: VERSION,
        packageDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        instructionDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        memberInventoryDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      });
    }

    for (const [id, expected] of Object.entries(
      EXPECTED_TEMPLATE_AUTHENTICATION,
    )) {
      const bytes = fs.readFileSync(path.join(packageDirectory(id), expected.path));
      expect(bytes.byteLength).toBe(expected.bytes);
      expect(sha256(bytes)).toBe(expected.sha256);
    }
  });

  it("keeps literature identity stable across profiles and fails closed on an invalid project override", async () => {
    const lightweight = await resolveResearchSkillExecutionPackage({
      root,
      id: "research-literature",
      version: VERSION,
      invocationSource: "model",
      profile: "lightweight",
      audience: "worker",
    });
    const managed = await resolveResearchSkillExecutionPackage({
      root,
      id: "research-literature",
      version: VERSION,
      invocationSource: "operator-explicit",
      profile: "managed",
      audience: "worker",
      requestedMemberPaths: [LITERATURE_TEMPLATE],
    });

    expect(lightweight.members).toEqual([]);
    expect(managed.identity).toEqual(lightweight.identity);
    expect(managed.instructions).toBe(lightweight.instructions);
    expect(managed.members).toHaveLength(1);
    expect(managed.members[0]).toMatchObject({
      path: LITERATURE_TEMPLATE,
      sha256: EXPECTED_TEMPLATE_AUTHENTICATION["research-literature"].sha256,
    });
    expect(Buffer.from(managed.members[0]?.content ?? [])).toEqual(
      fs.readFileSync(path.join(packageDirectory("research-literature"), LITERATURE_TEMPLATE)),
    );

    const projectPackage = path.join(
      root,
      ".trellis",
      "research",
      "skills",
      "research-literature",
      VERSION,
    );
    fs.cpSync(packageDirectory("research-literature"), projectPackage, {
      recursive: true,
    });
    fs.appendFileSync(path.join(projectPackage, "SKILL.md"), "\nProject override.\n");
    const overridden = await resolveResearchSkillExecutionPackage({
      root,
      id: "research-literature",
      version: VERSION,
      invocationSource: "model",
      profile: "lightweight",
      audience: "worker",
    });
    expect(overridden.source).toBe("project");
    expect(overridden.instructions).toContain("Project override.");
    expect(overridden.identity).not.toEqual(lightweight.identity);

    fs.rmSync(path.join(projectPackage, LITERATURE_TEMPLATE));
    await expect(
      resolveResearchSkillExecutionPackage({
        root,
        id: "research-literature",
        version: VERSION,
        invocationSource: "model",
        profile: "lightweight",
        audience: "worker",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PROJECT_SKILL" });
  });

  it("projects the exact attack template through the approved managed Context", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
      stage: "ideation",
    });
    const evaluation = await resolveResearchSkillExecutionPackage({
      root: fixture.root,
      id: "research-idea-evaluation",
      version: VERSION,
      invocationSource: "operator-explicit",
      profile: "managed",
      audience: "worker",
      requestedMemberPaths: [EVALUATION_TEMPLATE],
    });
    writeEvaluationWorkflow(fixture.root, evaluation.identity);
    const bound = await bindResearchWorkflow({
      root: fixture.root,
      quest: fixture.ids.questId,
      workflow: "pilot-evaluation",
      version: VERSION,
      startNode: "attack",
      write: true,
      idempotencyKey: "pilot-evaluation-bind",
    });
    const workflowInstanceId = bound.events[0]?.aggregate.id as WorkflowInstanceId;
    const runId = createRunId();
    await createResearchRun({
      root: fixture.root,
      id: runId,
      campaignId: fixture.ids.campaignId,
      title: "Pilot evaluation run",
    });
    const prepared = await prepareResearchDispatch({
      root: fixture.root,
      runId,
      questId: fixture.ids.questId,
      campaignId: fixture.ids.campaignId,
      repositoryId: fixture.ids.repositoryId,
      ownerSkill: "compatibility-metadata-only",
      capabilityId: "research.ideation.evaluate",
      skillId: "research-idea-evaluation",
      skillVersion: VERSION,
      memberPaths: [EVALUATION_TEMPLATE],
      workflowInstanceId,
      workflowNodeId: "attack",
      objective: "Attack one candidate",
      acceptanceCriteria: ["Return one bounded attack verdict"],
      allowedWritePaths: [],
      expectedOutputs: ["attack verdict"],
      checks: [],
      idempotencyKey: "pilot-evaluation-prepare",
    });
    const grant = await approveResearchDispatch(
      {
        root: fixture.root,
        dispatchId: prepared.dispatch.id,
        host: "claude",
        idempotencyKey: "pilot-evaluation-approve",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async (prompt) => {
          if (prompt === "Operator label: ") return "pilot-package-test";
          if (prompt === "Rationale: ") return "Approve one evaluation attack";
          return prompt.match(/^Type '([^']+)': $/)?.[1] ?? "";
        },
        close: () => undefined,
      },
    );
    const resolved = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: prepared.dispatch.id,
      host: "claude",
      now: new Date(Date.parse(grant.approval.grant.grantedAt) + 1),
    });

    expect(resolved.context).toMatchObject({
      schemaVersion: 3,
      executionPackage: {
        identity: {
          id: "research-idea-evaluation",
          version: VERSION,
          packageDigest: evaluation.identity.packageDigest,
        },
        executionProfile: "managed",
        invocationSource: "operator-explicit",
        entrypointType: "model-context",
        approvedMembers: [
          {
            path: EVALUATION_TEMPLATE,
            role: "template",
            digest: `sha256:${EXPECTED_TEMPLATE_AUTHENTICATION["research-idea-evaluation"].sha256}`,
          },
        ],
      },
      workflow: { workflowInstanceId, nodeId: "attack" },
    });
    if (resolved.context.schemaVersion !== 3) {
      throw new Error("Expected schema-v3 managed Context");
    }
    expect(resolved.context.executionPackage.approvedMembers[0]?.content).toBe(
      fs.readFileSync(
        path.join(packageDirectory("research-idea-evaluation"), EVALUATION_TEMPLATE),
        "utf8",
      ),
    );
  });

  it("keeps quest administration root-only and rejects model or managed projection", async () => {
    await expect(
      getResearchSkillContext({
        root,
        skill: "research-quest-admin",
        profile: "lightweight",
      }),
    ).rejects.toMatchObject({ code: "research_skill_invocation_forbidden" });
    await expect(
      getResearchSkillContext({
        root,
        skill: "research-quest-admin",
        profile: "managed",
      }),
    ).rejects.toMatchObject({ code: "research_skill_invocation_forbidden" });

    const rootCommand = await resolveResearchSkillExecutionPackage({
      root,
      id: "research-quest-admin",
      version: VERSION,
      invocationSource: "operator-explicit",
      audience: "root",
    });
    expect(rootCommand).toMatchObject({
      source: "bundled",
      manifest: {
        skillKind: "admin",
        entrypointType: "root-command",
        allowedProfiles: [],
        members: [],
      },
      members: [],
    });
  });
});
