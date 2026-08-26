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
const PROJECT_SETUP_MEMBERS = [
  "assets/manifest.yaml",
  "assets/meta.gitignore",
  "assets/obsidian-vault/.graphifyignore",
  "assets/obsidian-vault/_references/citation-policy.md",
  "assets/obsidian-vault/_templates/experiment-note.md",
  "assets/obsidian-vault/_templates/intake-audit.md",
  "assets/obsidian-vault/_templates/paper-note.md",
  "assets/obsidian-vault/computation/.gitkeep",
  "assets/obsidian-vault/experiments/.gitkeep",
  "assets/obsidian-vault/figures/.gitkeep",
  "assets/obsidian-vault/ideas/questions.md",
  "assets/obsidian-vault/intake/.gitkeep",
  "assets/obsidian-vault/literature-index.md",
  "assets/obsidian-vault/literature/notes/.gitkeep",
  "assets/obsidian-vault/literature/pdfs/.gitkeep",
  "assets/obsidian-vault/literature/surveys/.gitkeep",
  "assets/obsidian-vault/references.bib",
  "assets/obsidian-vault/slides/.gitkeep",
  "assets/obsidian-vault/theory/.gitkeep",
  "assets/obsidian-vault/writing/.gitkeep",
  "assets/obsidian.gitignore",
  "references/graphify.md",
] as const;
const EXPECTED_PACKAGES = [
  {
    id: "research-computation",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.computation.case",
    members: [],
  },
  {
    id: "research-experiment",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.experiment.round",
    members: [],
  },
  {
    id: "research-figure",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight"],
    capabilityId: undefined,
    members: [],
  },
  {
    id: "research-idea-evaluation",
    version: VERSION,
    skillKind: "workflow",
    invocationSource: "operator-explicit",
    entrypointType: "model-context",
    allowedProfiles: ["managed"],
    capabilityId: "research.ideation.evaluate",
    members: [EVALUATION_TEMPLATE],
  },
  {
    id: "research-ideation",
    version: "1.0.0",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.ideation.generate",
    members: ["templates/opportunity-board-template.md"],
  },
  {
    id: "research-ideation",
    version: "1.1.0",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.ideation.generate",
    members: ["templates/opportunity-board-template.md"],
  },
  {
    id: "research-literature",
    version: "1.0.0",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.literature.review",
    members: [LITERATURE_TEMPLATE],
  },
  {
    id: "research-literature",
    version: "1.1.0",
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.literature.review",
    members: [LITERATURE_TEMPLATE],
  },
  {
    id: "research-opportunity-mining",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "operator-explicit",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight"],
    capabilityId: undefined,
    members: ["templates/opportunity-template.md"],
  },
  {
    id: "research-project-setup",
    version: VERSION,
    skillKind: "workflow",
    invocationSource: "operator-explicit",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.setup.project",
    members: PROJECT_SETUP_MEMBERS,
    referenceMembers: ["references/graphify.md"],
  },
  {
    id: "research-quest-admin",
    version: VERSION,
    skillKind: "admin",
    invocationSource: "operator-explicit",
    entrypointType: "root-command",
    allowedProfiles: [],
    capabilityId: undefined,
    members: [],
  },
  {
    id: "research-review-case",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.audit.case",
    members: [],
  },
  {
    id: "research-slides",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight"],
    capabilityId: undefined,
    members: ["NOTICE.md"],
    referenceMembers: ["NOTICE.md"],
    rootOnlyMembers: ["NOTICE.md"],
  },
  {
    id: "research-synthesis",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight"],
    capabilityId: undefined,
    members: [],
  },
  {
    id: "research-theory",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.theory.case",
    members: [],
  },
  {
    id: "research-writing",
    version: VERSION,
    skillKind: "bounded",
    invocationSource: "model",
    entrypointType: "model-context",
    allowedProfiles: ["lightweight", "managed"],
    capabilityId: "research.writing.case",
    members: ["references/academic-phrasebank.md"],
    referenceMembers: ["references/academic-phrasebank.md"],
  },
] as const;
const EXPECTED_LISTED_PACKAGES = EXPECTED_PACKAGES.map(
  ({ id, version }) => `${id}@${version}`,
);
const EXPECTED_IDENTITIES: Readonly<
  Record<
    string,
    {
      readonly packageDigest: `sha256:${string}`;
      readonly instructionDigest: `sha256:${string}`;
      readonly memberInventoryDigest: `sha256:${string}`;
    }
  >
> = {
  "research-computation@1.0.0": {
    packageDigest:
      "sha256:9a5ee9f8b29c861fe667666c90685f6f3c61c4b75f69c9210f9626d2520d3ef8",
    instructionDigest:
      "sha256:ebb019b9f9db82c70e90a62791b69d1771ccbca12c56f5aa53320473c7dca768",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-experiment@1.0.0": {
    packageDigest:
      "sha256:a4b5ad95fe50c6ab3d480ec82962d81b5a201710cc2167b51dc8bd300ddcb3ee",
    instructionDigest:
      "sha256:9bb59232a14853f7b61339f8e202f865bfd2c39c25255fc28555376a742ce745",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-figure@1.0.0": {
    packageDigest:
      "sha256:37e8643300c992f3f4bfd74afa4720e91c5594967fbc41366d25224550aa2993",
    instructionDigest:
      "sha256:ab5796964a67a611a40dfe6f9c92ed8de41f925a6a78f5a3a03b611b7895ba82",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-idea-evaluation@1.0.0": {
    packageDigest:
      "sha256:dc58cc3abc0993956a4fc5b0fb873ff09b560af6468b9bb2bb4bc3db8891454a",
    instructionDigest:
      "sha256:4294c16a649778a1e763c143ee82893a1b7d370b3513fdd3ce5a9b97aaf8a03a",
    memberInventoryDigest:
      "sha256:880ef7179d8245730322dcc78c178425fbe56f8d6dc06597487b43f0069ef436",
  },
  "research-ideation@1.0.0": {
    packageDigest:
      "sha256:f4f309dc92ef8c9ef8b91dab2183272ea805e019914731d8c4e38aaa41c62da0",
    instructionDigest:
      "sha256:166e1ca4bd472d1813d3678259e47a235df0de263b8694b9424753226c228d34",
    memberInventoryDigest:
      "sha256:d9dfaec07f25eacdb91364c78fca2947786ce4d281631cff9f8695969ce7544c",
  },
  "research-ideation@1.1.0": {
    packageDigest:
      "sha256:ece95cbc55dcd51fb28c6e4d729b873a067a938967b8c25a79fded7fbe3ed3d9",
    instructionDigest:
      "sha256:7f569076fced3487d81957a73b597893e878bf79eb49b51d20e5e9b2bce9346a",
    memberInventoryDigest:
      "sha256:d9dfaec07f25eacdb91364c78fca2947786ce4d281631cff9f8695969ce7544c",
  },
  "research-literature@1.0.0": {
    packageDigest:
      "sha256:66d1ecd38b80ba983e7a783098cd0781c66952027ac7b1e679d23081c1cb5670",
    instructionDigest:
      "sha256:ead2668d93ce0c8ae40435435356af6dad3482b0dccbae91a45bbf95192a19c4",
    memberInventoryDigest:
      "sha256:0528e9227f1c17f75f36ddf5a7fce03c05aa698301e78510e1aff712dfc494ed",
  },
  "research-literature@1.1.0": {
    packageDigest:
      "sha256:620aa58ae0f9f7d837e92dbcf5d30892e4a9fb67bd49365ad56a9ef7d98093ce",
    instructionDigest:
      "sha256:2bd56e1e71f9710aad654b3658a630da9ace9c9c97b1f4d5e3c128e59da6c92a",
    memberInventoryDigest:
      "sha256:0528e9227f1c17f75f36ddf5a7fce03c05aa698301e78510e1aff712dfc494ed",
  },
  "research-opportunity-mining@1.0.0": {
    packageDigest:
      "sha256:86971ab3bc30c23cb1534362a6b08e007644abc0ae3c3660da10ed2ce709e610",
    instructionDigest:
      "sha256:aa4267992bfc2e8cc1f5c2c122e85d0d83ebb78e94efaeae52eac3e22e8be33c",
    memberInventoryDigest:
      "sha256:b4be3e552ef767d6017a8426f745e9c5d1833ab1576d12b46baed38df703333f",
  },
  "research-project-setup@1.0.0": {
    packageDigest:
      "sha256:34c628556b95612b1280654660293d56875201a3186d72bd654c43bdf4a2d5f5",
    instructionDigest:
      "sha256:f50460477432616bd2f775dea3c2d49314c675579e20bf850dc8fb3357445ede",
    memberInventoryDigest:
      "sha256:4c2398878d365fa8eae9962bd3d3f40f0fcd0d0fbc7a02a7a69c4af9ea2a48b8",
  },
  "research-quest-admin@1.0.0": {
    packageDigest:
      "sha256:97e2a3dd3e1731b8899c502131c6d1017482f6c24737f39c8b7c45257fb9c37d",
    instructionDigest:
      "sha256:cf0ea546c6d2d2b9dfde7f00c7578705c993fb30d76df194cfe19569596593e5",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-review-case@1.0.0": {
    packageDigest:
      "sha256:7c601139d5a9554aa48e063b5bb70aa3b615e6b6583db95970c5c3511a08815e",
    instructionDigest:
      "sha256:d5bc71eb26b76af9fa502ce3384f6824890ee6574b3fe23014b60f1b1fda5aba",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-slides@1.0.0": {
    packageDigest:
      "sha256:03aa9d90a10fec21aab30479eb33bfc5e6c68da25d62b67f2833f3d7b8bcd78e",
    instructionDigest:
      "sha256:a71ca14ca335d8ccfa562b9bcfb0e9ebf6336f37442971bb996ed72ed3177837",
    memberInventoryDigest:
      "sha256:ab93d87a5451c5b1d87d54486395c167b1bc2fde51ed7bd860caeb9f311cef51",
  },
  "research-synthesis@1.0.0": {
    packageDigest:
      "sha256:797552c10366de903c7c4ce3484bfd4ce07a74bb1d5121940fbacce8c27a4099",
    instructionDigest:
      "sha256:9fb65ae3bcaaa37028455c3bb9fe4bbc240aef4659681ffa1ec45722368462e6",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-theory@1.0.0": {
    packageDigest:
      "sha256:acd67568c23562616c910a6632f2a31a1f283e75adc68554ff29cb0825779561",
    instructionDigest:
      "sha256:72504145464a7411145b6c622f05939a9168d460de60668934e6893856c870ca",
    memberInventoryDigest:
      "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
  },
  "research-writing@1.0.0": {
    packageDigest:
      "sha256:8a780a02f0ff611f1c4211b3d29e64d5a7eb4127ee413b38609ebb059342aeb8",
    instructionDigest:
      "sha256:9e2670113ecd542be4db0e022e05834ac8df9b2e84bfa4f3a531988c6f24b768",
    memberInventoryDigest:
      "sha256:f13eccb9df31aed9df65afefdbf336266312226ede6593bd7f38e4b95082469e",
  },
};
const EXPECTED_HANDOFFS: Readonly<
  Record<string, readonly string[] | null>
> = {
  "research-computation@1.0.0": [
    "research-experiment",
    "research-literature",
  ],
  "research-experiment@1.0.0": ["research-computation"],
  "research-figure@1.0.0": ["research-experiment", "research-writing"],
  "research-idea-evaluation@1.0.0": ["research-experiment"],
  "research-ideation@1.0.0": ["research-idea-evaluation"],
  "research-ideation@1.1.0": ["research-idea-evaluation"],
  "research-literature@1.0.0": ["research-ideation"],
  "research-literature@1.1.0": ["research-opportunity-mining"],
  "research-opportunity-mining@1.0.0": [
    "research-ideation",
    "research-literature",
  ],
  "research-project-setup@1.0.0": ["research-quest-admin"],
  "research-quest-admin@1.0.0": null,
  "research-review-case@1.0.0": [],
  "research-slides@1.0.0": [
    "research-experiment",
    "research-figure",
    "research-literature",
    "research-writing",
  ],
  "research-synthesis@1.0.0": ["research-opportunity-mining"],
  "research-theory@1.0.0": [
    "research-experiment",
    "research-literature",
    "research-writing",
  ],
  "research-writing@1.0.0": ["research-review-case"],
};
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

function packageDirectory(id: string, version = VERSION): string {
  return path.join(getBundledResearchSkillRoot(), id, version);
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

describe("bundled Research production Skill packages", { timeout: 30_000 }, () => {
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

  it("lists and authenticates all sixteen production package versions", async () => {
    const listed = await listResearchSkills({ root });

    expect(listed.skills.map(({ id, version }) => `${id}@${version}`)).toEqual(
      EXPECTED_LISTED_PACKAGES,
    );
    expect(EXPECTED_PACKAGES).toHaveLength(16);
    expect(
      EXPECTED_PACKAGES.reduce(
        (count, { members }) => count + members.length,
        0,
      ),
    ).toBe(30);

    for (const expected of EXPECTED_PACKAGES) {
      const packageKey = `${expected.id}@${expected.version}`;
      const expectedIdentity = EXPECTED_IDENTITIES[packageKey];
      const expectedHandoff = EXPECTED_HANDOFFS[packageKey];
      if (expectedIdentity === undefined || expectedHandoff === undefined) {
        throw new Error(`Missing production package oracle for ${packageKey}`);
      }
      const referenceMembers = new Set<string>(
        "referenceMembers" in expected ? expected.referenceMembers : [],
      );
      const rootOnlyMembers = new Set<string>(
        "rootOnlyMembers" in expected ? expected.rootOnlyMembers : [],
      );
      const inspected = await showResearchSkill({
        root,
        skill: expected.id,
        version: expected.version,
      });
      expect(inspected.source).toBe("bundled");
      expect(inspected.manifest).toMatchObject({
        schemaVersion: 3,
        packageKind: "skill",
        id: expected.id,
        version: expected.version,
        skillKind: expected.skillKind,
        invocationSource: expected.invocationSource,
        entrypointType: expected.entrypointType,
        allowedProfiles: [...expected.allowedProfiles],
        members: expected.members.map((memberPath) => ({
          path: memberPath,
          role: referenceMembers.has(memberPath) ? "reference" : "template",
          load: "on-demand",
          visibility: rootOnlyMembers.has(memberPath)
            ? "root-only"
            : "worker-visible",
        })),
      });
      if (expectedHandoff === null) {
        expect(inspected.manifest.handoff).toBeUndefined();
      } else {
        expect(inspected.manifest.handoff).toEqual({
          suggestedSkillIds: expectedHandoff,
          autoInvoke: false,
        });
      }
      expect(inspected.manifest.managedBinding?.capabilityId).toBe(
        expected.capabilityId,
      );
      expect(inspected.members.map(({ path: memberPath }) => memberPath)).toEqual(
        [...expected.members],
      );
      expect(
        fs.readFileSync(
          path.join(
            packageDirectory(expected.id, expected.version),
            "skill.json",
          ),
          "utf8",
        ),
      ).toBe(serializeResearchSkillManifestV3(inspected.manifest));
      for (const member of inspected.manifest.members) {
        const bytes = fs.readFileSync(
          path.join(
            packageDirectory(expected.id, expected.version),
            member.path,
          ),
        );
        expect(sha256(bytes)).toBe(member.sha256);
        expect(bytes.byteLength).toBeLessThanOrEqual(member.maxBytes);
      }
      expect(inspected.identity).toEqual({
        id: expected.id,
        version: expected.version,
        schemaVersion: 3,
        packageKind: "skill",
        ...expectedIdentity,
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

  it("enforces every production profile, member projection, and capability binding", async () => {
    for (const expected of EXPECTED_PACKAGES) {
      if (expected.entrypointType === "root-command") continue;

      const rootOnlyMembers = new Set<string>(
        "rootOnlyMembers" in expected ? expected.rootOnlyMembers : [],
      );
      const workerVisibleMembers = expected.members.filter(
        (memberPath) => !rootOnlyMembers.has(memberPath),
      );
      const identities = [];
      for (const profile of expected.allowedProfiles) {
        const omitted = await resolveResearchSkillExecutionPackage({
          root,
          id: expected.id,
          version: expected.version,
          invocationSource: expected.invocationSource,
          profile,
          audience: "worker",
        });
        const resolved = await resolveResearchSkillExecutionPackage({
          root,
          id: expected.id,
          version: expected.version,
          invocationSource: expected.invocationSource,
          profile,
          audience: "worker",
          requestedMemberPaths: workerVisibleMembers,
        });
        identities.push(resolved.identity);
        expect(omitted.identity).toEqual(resolved.identity);
        expect(omitted.members).toEqual([]);
        expect(resolved.members.map(({ path: memberPath }) => memberPath)).toEqual(
          workerVisibleMembers,
        );
        for (const member of resolved.members) {
          expect(Buffer.from(member.content)).toEqual(
            fs.readFileSync(
              path.join(
                packageDirectory(expected.id, expected.version),
                member.path,
              ),
            ),
          );
        }
        expect(resolved.manifest.managedBinding?.capabilityId).toBe(
          expected.capabilityId,
        );
      }
      expect(identities).toEqual(identities.map(() => identities[0]));

      if (!new Set<string>(expected.allowedProfiles).has("managed")) {
        await expect(
          resolveResearchSkillExecutionPackage({
            root,
            id: expected.id,
            version: expected.version,
            invocationSource: expected.invocationSource,
            profile: "managed",
            audience: "worker",
          }),
        ).rejects.toMatchObject({ code: "RESEARCH_SKILL_INVOCATION_FORBIDDEN" });
      }
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

  it("keeps the slides NOTICE root-only", async () => {
    const rootProjection = await resolveResearchSkillExecutionPackage({
      root,
      id: "research-slides",
      version: VERSION,
      invocationSource: "model",
      profile: "lightweight",
      audience: "root",
      requestedMemberPaths: ["NOTICE.md"],
    });
    expect(rootProjection.members.map(({ path: memberPath }) => memberPath)).toEqual([
      "NOTICE.md",
    ]);

    await expect(
      resolveResearchSkillExecutionPackage({
        root,
        id: "research-slides",
        version: VERSION,
        invocationSource: "model",
        profile: "lightweight",
        audience: "worker",
        requestedMemberPaths: ["NOTICE.md"],
      }),
    ).rejects.toMatchObject({ code: "RESEARCH_SKILL_MEMBER_FORBIDDEN" });
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
