import { createHash } from "node:crypto";
import path from "node:path";

const PACKED_ROOT = "package/";

/** Historical stage Skill names — forbidden in packed payload after C09. */
export const RESEARCH_STAGE_SKILLS = [
  "trellis-research-audit",
  "trellis-research-computation",
  "trellis-research-experiment",
  "trellis-research-ideation",
  "trellis-research-literature",
  "trellis-research-quest",
  "trellis-research-setup",
  "trellis-research-theory",
  "trellis-research-writing",
];

/** Live + historical procedure package IDs (14 core + 3 optional visuals). */
export const RESEARCH_PROCEDURE_IDS = [
  "project-setup-v1",
  "quest-framing-v1",
  "quest-admin-v1",
  "literature-scan-v1",
  "literature-review-v1",
  "survey-v1",
  "idea-generation-v1",
  "idea-evaluation-v1",
  "experiment-round-v1",
  "experiment-campaign-v1",
  "computation-case-v1",
  "theory-case-v1",
  "review-case-v1",
  "review-campaign-v1",
  "writing-case-v1",
  "figure-v1",
  "slides-v1",
];

/** Versions that must ship for historical replay / candidate repair. */
export const RESEARCH_PROCEDURE_VERSIONS = [
  "1.0.0",
  "2.0.0",
  "2.0.1",
  "2.0.2",
  "2.0.3",
  "2.0.4",
  "2.0.5",
  "2.0.6",
  "2.0.7",
];

/** Optional procedures exist only from 2.0.0+ (no 1.0.0 fixture). */
export const RESEARCH_OPTIONAL_PROCEDURE_IDS = new Set([
  "survey-v1",
  "figure-v1",
  "slides-v1",
]);

/** Schema-v3 Skills that must ship as package-internal execution packages. */
export const BUNDLED_RESEARCH_SKILL_PACKAGES = Object.freeze([
  { id: "research-computation", version: "1.0.0", members: [] },
  { id: "research-experiment", version: "1.0.0", members: [] },
  { id: "research-figure", version: "1.0.0", members: [] },
  {
    id: "research-idea-evaluation",
    version: "1.0.0",
    members: ["templates/attack-template.md"],
  },
  {
    id: "research-ideation",
    version: "1.0.0",
    members: ["templates/opportunity-board-template.md"],
  },
  {
    id: "research-ideation",
    version: "1.1.0",
    members: ["templates/opportunity-board-template.md"],
  },
  {
    id: "research-literature",
    version: "1.0.0",
    members: ["templates/note-template.md"],
  },
  {
    id: "research-literature",
    version: "1.1.0",
    members: ["templates/note-template.md"],
  },
  {
    id: "research-opportunity-mining",
    version: "1.0.0",
    members: ["templates/opportunity-template.md"],
  },
  {
    id: "research-project-setup",
    version: "1.0.0",
    members: [
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
    ],
  },
  { id: "research-quest-admin", version: "1.0.0", members: [] },
  { id: "research-review-case", version: "1.0.0", members: [] },
  { id: "research-slides", version: "1.0.0", members: ["NOTICE.md"] },
  { id: "research-synthesis", version: "1.0.0", members: [] },
  { id: "research-theory", version: "1.0.0", members: [] },
  {
    id: "research-writing",
    version: "1.0.0",
    members: ["references/academic-phrasebank.md"],
  },
]);

export const PACKED_ACTIVE_RESEARCH_ENTRIES = {
  command: "package/dist/commands/research/index.js",
  context: "package/dist/commands/research/dispatch-context.js",
  recordResult: "package/dist/commands/research/dispatch-command.js",
  claudeWorker:
    "package/dist/templates/claude/agents/trellis-research-worker.md",
  codexWorker:
    "package/dist/templates/codex/agents/trellis-research-worker.toml",
  claudeHook:
    "package/dist/templates/shared-hooks/inject-subagent-context.py",
  workflow:
    "package/dist/templates/trellis/workflows/research/workflow.md",
};

export const PACKED_ACTIVE_FORBIDDEN_MUTATIONS = [
  {
    id: "request-file-context",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.command,
    text: '.argument("<request-file>"',
  },
  {
    id: "skill-name-option",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.command,
    text: '.option("--skill-name <name>"',
  },
  {
    id: "record-result-file-option",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.command,
    text: '.requiredOption("--file <path>"',
  },
  {
    id: "selected-skill-routing",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.context,
    text: "selectedSkill",
  },
  {
    id: "claude-skill-tool",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.claudeWorker,
    text: "tools: Read, Write, Edit, Bash, Skill",
  },
  {
    id: "codex-skill-inventory",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.codexWorker,
    text: "Inspect .agents/skills inventory and load SKILL.md",
  },
  {
    id: "random-output-ids",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.codexWorker,
    text: "Generate fresh res_ and prp_ UUIDs",
  },
  {
    id: "hook-second-context-pass",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.claudeHook,
    text: "--skill-name",
  },
  {
    id: "workflow-legacy-record-result",
    entry: PACKED_ACTIVE_RESEARCH_ENTRIES.workflow,
    text: "record-result --file",
  },
];

const PACKED_ACTIVE_REQUIRED_TEXT = {
  [PACKED_ACTIVE_RESEARCH_ENTRIES.command]: [
    '.argument("<dispatch-id>"',
    '.requiredOption("--host <host>"',
    '.requiredOption("--approval <apr-id>"',
    '.requiredOption("--input <path|->"',
  ],
  [PACKED_ACTIVE_RESEARCH_ENTRIES.context]: [
    "resolveApprovedResearchDispatchContext",
    "now: new Date()",
  ],
  [PACKED_ACTIVE_RESEARCH_ENTRIES.recordResult]: [
    "recordApprovedResearchDispatchResult",
    "approvalId",
    "input",
  ],
  [PACKED_ACTIVE_RESEARCH_ENTRIES.claudeWorker]: [
    "tools: Read, Write, Edit, Bash",
    "procedure.instructions",
    "outputContract.resultId",
    "outputContract.proposalId",
    "nestedAgents",
    "recordResult",
  ],
  [PACKED_ACTIVE_RESEARCH_ENTRIES.codexWorker]: [
    'sandbox_mode = "workspace-write"',
    "trellis research dispatch context <dsp-id> --host codex --root . --json",
    "context.procedure.instructions",
    "context.outputContract.resultId",
    "multi_agent = false",
  ],
  [PACKED_ACTIVE_RESEARCH_ENTRIES.claudeHook]: [
    "Research dispatch: (dsp_",
    '"context",\n        dispatch_id,\n        "--host",\n        "claude"',
    "VALIDATED_DISPATCH_CONTEXT_START",
    "VALIDATED_DISPATCH_CONTEXT_END",
    '"nestedAgents": False',
    '"recordResult": False',
  ],
  [PACKED_ACTIVE_RESEARCH_ENTRIES.workflow]: [
    "dispatch context <dsp-id> --host <claude|codex> --root . --json",
    "Research dispatch: <dsp-id>",
    "embedded `procedure.instructions`",
    "--approval <apr-id> --input",
    "approval.consumed",
  ],
};

const PACKED_ACTIVE_FORBIDDEN_TEXT = [
  {
    id: "request-file-context",
    entries: [
      PACKED_ACTIVE_RESEARCH_ENTRIES.command,
      PACKED_ACTIVE_RESEARCH_ENTRIES.context,
      PACKED_ACTIVE_RESEARCH_ENTRIES.claudeHook,
      PACKED_ACTIVE_RESEARCH_ENTRIES.workflow,
    ],
    patterns: [/<request-file>/, /requestFile/, /request\.json\)\$/],
  },
  {
    id: "skill-name-option",
    entries: Object.values(PACKED_ACTIVE_RESEARCH_ENTRIES),
    patterns: [/--skill-name/],
  },
  {
    id: "record-result-file-option",
    entries: [
      PACKED_ACTIVE_RESEARCH_ENTRIES.command,
      PACKED_ACTIVE_RESEARCH_ENTRIES.workflow,
    ],
    patterns: [/record-result --file/, /\.option\("--file/, /\.requiredOption\("--file/],
  },
  {
    id: "selected-skill-routing",
    entries: Object.values(PACKED_ACTIVE_RESEARCH_ENTRIES),
    patterns: [/selectedSkill/, /optionalSkill/, /fallbackSkill/],
  },
  {
    id: "claude-skill-tool",
    entries: [PACKED_ACTIVE_RESEARCH_ENTRIES.claudeWorker],
    patterns: [/^tools:.*\bSkill\b/m, /\binvokes exactly .*\bSkill\b/i, /use the Skill tool/i],
  },
  {
    id: "codex-skill-inventory",
    entries: [PACKED_ACTIVE_RESEARCH_ENTRIES.codexWorker],
    patterns: [/\.claude\/skills/, /\.agents\/skills/, /SKILL\.md/],
  },
  {
    id: "random-output-ids",
    entries: [
      PACKED_ACTIVE_RESEARCH_ENTRIES.claudeWorker,
      PACKED_ACTIVE_RESEARCH_ENTRIES.codexWorker,
    ],
    patterns: [
      /randomUUID/,
      /uuidgen/,
      /generate fresh res_ and prp_/i,
      /generate (?:a |new )?(?:Result|Proposal|res_|prp_).*\bID/i,
    ],
  },
  {
    id: "hook-second-context-pass",
    entries: [PACKED_ACTIVE_RESEARCH_ENTRIES.claudeHook],
    patterns: [/--skill-name/, /selected_skill/, /second Context pass/i, /SKILL\.md/],
  },
  {
    id: "workflow-legacy-record-result",
    entries: [PACKED_ACTIVE_RESEARCH_ENTRIES.workflow],
    patterns: [/dispatches\/<dsp-id>\/request\.json/, /record-result --file/],
  },
];

const REQUIRED_RESEARCH_ENTRIES = [
  "package.json",
  "bin/trellis.js",
  "dist/index.js",
  "dist/cli/index.js",
  "dist/commands/init.js",
  "dist/commands/update.js",
  "dist/commands/upgrade.js",
  "dist/commands/uninstall.js",
  "dist/commands/research/command.js",
  "dist/commands/research/common.js",
  "dist/commands/research/dispatch-command.js",
  "dist/commands/research/dispatch-context.js",
  "dist/commands/research/errors.js",
  "dist/commands/research/index.js",
  "dist/commands/research/mutation.js",
  "dist/commands/research/repository.js",
  "dist/commands/research/session.js",
  "dist/templates/claude/agents/trellis-research-worker.md",
  "dist/templates/claude/hooks/statusline.py",
  "dist/templates/claude/settings.json",
  "dist/templates/codex/agents/trellis-research-worker.toml",
  "dist/templates/codex/config.toml",
  "dist/templates/codex/hooks.json",
  "dist/templates/shared-hooks/inject-subagent-context.py",
  "dist/templates/shared-hooks/inject-workflow-state.py",
  "dist/templates/shared-hooks/session-start.py",
  "dist/templates/trellis/config.yaml",
  "dist/templates/trellis/gitignore.txt",
  "dist/templates/trellis/workflows/research/workflow.md",
  "dist/templates/markdown/agents.md",
  "dist/legacy/current-host-generic-cleanup.js",
  "dist/legacy/current-host-generic-cleanup.json",
  "dist/legacy/native-workflow-digests.js",
  "dist/legacy/research-skill-retirement.js",
  "dist/legacy/research-skill-retirement.json",
  "dist/legacy/retired-host-cleanup.js",
  "dist/legacy/retired-host-generated-paths.json",
];

const FORBIDDEN_GENERIC_EXACT_ENTRIES = [
  "dist/templates/claude/agents/trellis-check.md",
  "dist/templates/claude/agents/trellis-implement.md",
  "dist/templates/claude/agents/trellis-research.md",
  "dist/templates/codex/agents/trellis-check.toml",
  "dist/templates/codex/agents/trellis-implement.toml",
  "dist/templates/codex/agents/trellis-research.toml",
  "dist/templates/codex/hooks/session-start.py",
  "dist/templates/markdown/gitignore.txt",
  "dist/templates/markdown/workspace-index.md",
  "dist/templates/markdown/worktree.yaml.txt",
  "dist/templates/trellis/workflow.md",
];

const FORBIDDEN_GENERIC_PREFIXES = [
  "dist/commands/channel/",
  "dist/commands/mem.",
  "dist/commands/workflow.",
  "dist/commands/research/task.",
  "dist/utils/agent-refs.",
  "dist/utils/project-detector.",
  "dist/utils/task-json.",
  "dist/utils/template-fetcher.",
  "dist/templates/extract.",
  "dist/templates/template-utils.",
  "dist/templates/common/commands/",
  "dist/templates/common/skills/",
  "dist/templates/common/bundled-skills/trellis-channel/",
  "dist/templates/common/bundled-skills/trellis-meta/",
  "dist/templates/common/bundled-skills/trellis-research-",
  "dist/templates/common/bundled-skills/trellis-session-insight/",
  "dist/templates/common/bundled-skills/trellis-spec-bootstrap/",
  "dist/templates/codex/skills/",
  "dist/templates/trellis/agents/",
  "dist/templates/trellis/scripts/",
  "dist/templates/trellis/tasks/",
  "dist/templates/markdown/spec/",
  "dist/templates/codebuddy/",
  "dist/templates/copilot/",
  "dist/templates/cursor/",
  "dist/templates/droid/",
  "dist/templates/gemini/",
  "dist/templates/grok/",
  "dist/templates/kiro/",
  "dist/templates/omp/",
  "dist/templates/opencode/",
  "dist/templates/pi/",
  "dist/templates/qoder/",
  "dist/templates/reasonix/",
  "dist/templates/trae/",
  "dist/templates/zcode/",
];

function withPackedRoot(entry) {
  return `${PACKED_ROOT}${entry}`;
}

function procedureVersionRequired(procedureId, version) {
  if (RESEARCH_OPTIONAL_PROCEDURE_IDS.has(procedureId) && version === "1.0.0") {
    return false;
  }
  return true;
}

function methodologyPackEntries(procedureId, version) {
  // schema-v1 two-file packages; schema-v2 methodology support packs
  if (version === "1.0.0") return [];
  return [
    `dist/templates/research/procedures/${procedureId}/${version}/methodology/pack.json`,
    `dist/templates/research/procedures/${procedureId}/${version}/methodology/artifacts/artifact-contract.json`,
    `dist/templates/research/procedures/${procedureId}/${version}/methodology/instructions/checkpoints.md`,
    `dist/templates/research/procedures/${procedureId}/${version}/methodology/validators/validators.json`,
  ];
}

export function buildPackedCliInventory(migrationManifestNames) {
  const procedureEntries = RESEARCH_PROCEDURE_IDS.flatMap((procedureId) =>
    RESEARCH_PROCEDURE_VERSIONS.flatMap((version) => {
      if (!procedureVersionRequired(procedureId, version)) return [];
      const base = [
        `dist/templates/research/procedures/${procedureId}/${version}/procedure.json`,
        `dist/templates/research/procedures/${procedureId}/${version}/PROCEDURE.md`,
      ];
      return [...base, ...methodologyPackEntries(procedureId, version)].map(
        withPackedRoot,
      );
    }),
  );

  const skillEntries = BUNDLED_RESEARCH_SKILL_PACKAGES.flatMap(
    ({ id, version, members }) =>
      ["skill.json", "SKILL.md", ...members].map((member) =>
        withPackedRoot(
          `dist/templates/research/skills/${id}/${version}/${member}`,
        ),
      ),
  );

  const requiredEntries = [
    ...REQUIRED_RESEARCH_ENTRIES.map(withPackedRoot),
    ...procedureEntries,
    ...skillEntries,
    ...migrationManifestNames.map((name) =>
      withPackedRoot(`dist/migrations/manifests/${name}`),
    ),
  ];

  const forbiddenStageSkillEntries = RESEARCH_STAGE_SKILLS.map((skill) =>
    withPackedRoot(`dist/templates/common/bundled-skills/${skill}/SKILL.md`),
  );

  return {
    requiredEntries,
    forbiddenExactEntries: [
      ...FORBIDDEN_GENERIC_EXACT_ENTRIES.map(withPackedRoot),
      ...forbiddenStageSkillEntries,
    ],
    forbiddenPrefixes: FORBIDDEN_GENERIC_PREFIXES.map(withPackedRoot),
  };
}

export function normalizeTarEntry(rawEntry) {
  if (rawEntry === "") return "";

  const unsafe = () => {
    throw new Error(`Unsafe tar entry path: ${JSON.stringify(rawEntry)}`);
  };
  if (
    rawEntry !== rawEntry.trim() ||
    /[\0-\x1f\x7f]/.test(rawEntry) ||
    rawEntry.includes("\\") ||
    rawEntry.startsWith("/") ||
    /^[A-Za-z]:/.test(rawEntry)
  ) {
    unsafe();
  }

  const entry = rawEntry.endsWith("/") ? rawEntry.slice(0, -1) : rawEntry;
  const segments = entry.split("/");
  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    ) ||
    segments[0] !== "package"
  ) {
    unsafe();
  }
  return entry;
}

export function parseTarListing(output) {
  return output.split(/\r?\n/).map(normalizeTarEntry).filter(Boolean);
}

const PACKED_PROCEDURE_MANIFEST =
  /^package\/dist\/templates\/research\/procedures\/([^/]+)\/([^/]+)\/methodology\/pack\.json$/;
const PACKED_SKILL_MANIFEST =
  /^package\/dist\/templates\/research\/skills\/([^/]+)\/([^/]+)\/skill\.json$/;
const LOWER_SHA256 = /^[0-9a-f]{64}$/;
const SKILL_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXACT_SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const MAX_SKILL_MANIFEST_BYTES = 64 * 1024;
const MAX_SKILL_INSTRUCTION_BYTES = 256 * 1024;
const MAX_SKILL_MEMBER_COUNT = 256;
const MAX_SKILL_MEMBER_BYTES = 1024 * 1024;
const MAX_SKILL_AGGREGATE_MEMBER_BYTES = 8 * 1024 * 1024;
const STRICT_UTF8 = new TextDecoder("utf-8", { fatal: true });

function hasUtf8Bom(bytes) {
  return (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  );
}

function packedManifestObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value;
}

function packedRelativePath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value) ||
    value.split("/").some((segment) =>
      segment === "" || segment === "." || segment === ".."
    )
  ) {
    throw new Error(`${label} is unsafe: ${String(value)}`);
  }
  return value;
}

function packedEntryBytes(entry, normalizedEntries, readEntry) {
  if (!normalizedEntries.has(entry)) {
    throw new Error(`missing declared packed member ${entry}`);
  }
  const value = readEntry(entry);
  if (typeof value === "string") return Buffer.from(value, "utf8");
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new Error(`packed member reader returned no bytes for ${entry}`);
}

function packedManifestJson(entry, normalizedEntries, readEntry, maximumBytes) {
  const bytes = packedEntryBytes(entry, normalizedEntries, readEntry);
  if (maximumBytes !== undefined && bytes.byteLength > maximumBytes) {
    throw new Error(
      `${entry} exceeds ${maximumBytes} bytes (${bytes.byteLength})`,
    );
  }
  let text;
  try {
    text = STRICT_UTF8.decode(bytes);
  } catch (error) {
    throw new Error(`${entry} is not valid UTF-8`, { cause: error });
  }
  if (hasUtf8Bom(bytes) || text.includes("\0")) {
    throw new Error(`${entry} contains a BOM or NUL`);
  }
  try {
    return packedManifestObject(JSON.parse(text), entry);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${entry} is not valid JSON`, { cause: error });
    }
    throw error;
  }
}

function auditDeclaredPackedMember(input) {
  const memberPath = packedRelativePath(input.member.path, `${input.label}.path`);
  if (
    typeof input.member.sha256 !== "string" ||
    !LOWER_SHA256.test(input.member.sha256)
  ) {
    throw new Error(`${input.label}.sha256 must be 64 lowercase hexadecimal characters`);
  }
  if (
    typeof input.member.maxBytes !== "number" ||
    !Number.isInteger(input.member.maxBytes) ||
    input.member.maxBytes <= 0 ||
    (input.maximumMemberBytes !== undefined &&
      input.member.maxBytes > input.maximumMemberBytes)
  ) {
    throw new Error(`${input.label}.maxBytes is invalid`);
  }
  const packedPath = path.posix.join(input.base, memberPath);
  const bytes = packedEntryBytes(
    packedPath,
    input.normalizedEntries,
    input.readEntry,
  );
  if (bytes.byteLength > input.member.maxBytes) {
    throw new Error(
      `${packedPath} exceeds maxBytes (${bytes.byteLength} > ${input.member.maxBytes})`,
    );
  }
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== input.member.sha256) {
    throw new Error(
      `${packedPath} sha256 mismatch (declared ${input.member.sha256}, actual ${actual})`,
    );
  }
  if (input.requireText) {
    let text;
    try {
      text = STRICT_UTF8.decode(bytes);
    } catch (error) {
      throw new Error(`${packedPath} is not valid UTF-8`, { cause: error });
    }
    if (hasUtf8Bom(bytes) || text.includes("\0")) {
      throw new Error(`${packedPath} contains a BOM or NUL`);
    }
  }
  return bytes.byteLength;
}

/**
 * Discover execution-package manifests from the packed tarball and authenticate
 * every member they declare. The callback must return the exact bytes for a
 * normalized tar entry (for example via `tar -xOf`).
 */
export function auditPackedExecutionPackageManifests(entries, readEntry) {
  const normalizedEntries = new Set(
    entries.map(normalizeTarEntry).filter(Boolean),
  );
  const procedureManifests = [...normalizedEntries]
    .filter((entry) => PACKED_PROCEDURE_MANIFEST.test(entry))
    .sort();
  const skillManifests = [...normalizedEntries]
    .filter((entry) => PACKED_SKILL_MANIFEST.test(entry))
    .sort();
  const failures = [];
  let procedureMemberCount = 0;
  let skillMemberCount = 0;

  for (const manifestEntry of procedureManifests) {
    try {
      const match = PACKED_PROCEDURE_MANIFEST.exec(manifestEntry);
      if (match === null) continue;
      const [, procedureId, version] = match;
      const manifest = packedManifestJson(
        manifestEntry,
        normalizedEntries,
        readEntry,
      );
      if (
        manifest.schemaVersion !== 1 ||
        manifest.procedureId !== procedureId ||
        manifest.procedureVersion !== version ||
        !Array.isArray(manifest.entries)
      ) {
        throw new Error(
          `${manifestEntry} does not match its Procedure directory identity`,
        );
      }
      const seen = new Set();
      const base = path.posix.dirname(manifestEntry);
      for (const [index, rawMember] of manifest.entries.entries()) {
        const member = packedManifestObject(
          rawMember,
          `${manifestEntry}.entries[${index}]`,
        );
        if (seen.has(member.path)) {
          throw new Error(`${manifestEntry} declares duplicate member ${member.path}`);
        }
        seen.add(member.path);
        auditDeclaredPackedMember({
          member,
          label: `${manifestEntry}.entries[${index}]`,
          base,
          normalizedEntries,
          readEntry,
          requireText: false,
        });
        procedureMemberCount += 1;
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const manifestEntry of skillManifests) {
    try {
      const match = PACKED_SKILL_MANIFEST.exec(manifestEntry);
      if (match === null) continue;
      const [, skillId, version] = match;
      const manifest = packedManifestJson(
        manifestEntry,
        normalizedEntries,
        readEntry,
        MAX_SKILL_MANIFEST_BYTES,
      );
      if (
        manifest.schemaVersion !== 3 ||
        manifest.packageKind !== "skill" ||
        manifest.id !== skillId ||
        manifest.version !== version ||
        !SKILL_ID.test(skillId) ||
        !EXACT_SEMVER.test(version) ||
        version.includes("+") ||
        manifest.instructionFile !== "SKILL.md" ||
        !Array.isArray(manifest.members) ||
        manifest.members.length > MAX_SKILL_MEMBER_COUNT
      ) {
        throw new Error(
          `${manifestEntry} does not match its schema-v3 Skill directory identity`,
        );
      }
      const base = path.posix.dirname(manifestEntry);
      const instructionPath = path.posix.join(base, "SKILL.md");
      const instructionBytes = packedEntryBytes(
        instructionPath,
        normalizedEntries,
        readEntry,
      );
      if (
        instructionBytes.byteLength === 0 ||
        instructionBytes.byteLength > MAX_SKILL_INSTRUCTION_BYTES
      ) {
        throw new Error(`${instructionPath} has an invalid byte length`);
      }
      let instructions;
      try {
        instructions = STRICT_UTF8.decode(instructionBytes);
      } catch (error) {
        throw new Error(`${instructionPath} is not valid UTF-8`, { cause: error });
      }
      if (hasUtf8Bom(instructionBytes) || instructions.includes("\0")) {
        throw new Error(`${instructionPath} contains a BOM or NUL`);
      }

      const seen = new Set();
      let aggregateBytes = 0;
      for (const [index, rawMember] of manifest.members.entries()) {
        const member = packedManifestObject(
          rawMember,
          `${manifestEntry}.members[${index}]`,
        );
        if (member.path === "skill.json" || member.path === "SKILL.md") {
          throw new Error(`${manifestEntry} declares reserved member ${member.path}`);
        }
        if (seen.has(member.path)) {
          throw new Error(`${manifestEntry} declares duplicate member ${member.path}`);
        }
        seen.add(member.path);
        aggregateBytes += auditDeclaredPackedMember({
          member,
          label: `${manifestEntry}.members[${index}]`,
          base,
          normalizedEntries,
          readEntry,
          maximumMemberBytes: MAX_SKILL_MEMBER_BYTES,
          requireText: true,
        });
        skillMemberCount += 1;
      }
      if (aggregateBytes > MAX_SKILL_AGGREGATE_MEMBER_BYTES) {
        throw new Error(
          `${manifestEntry} member bytes exceed ${MAX_SKILL_AGGREGATE_MEMBER_BYTES}`,
        );
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Packed CLI execution-package manifests failed audit:\n${failures
        .sort()
        .map((failure) => `  - ${failure}`)
        .join("\n")}`,
    );
  }

  return {
    procedureManifestCount: procedureManifests.length,
    procedureMemberCount,
    skillManifestCount: skillManifests.length,
    skillMemberCount,
  };
}

export function auditPackedActiveContent(contents) {
  const contentByEntry =
    contents instanceof Map ? contents : new Map(Object.entries(contents));
  const failures = [];

  for (const [entry, requiredTexts] of Object.entries(
    PACKED_ACTIVE_REQUIRED_TEXT,
  )) {
    const content = contentByEntry.get(entry);
    if (typeof content !== "string") {
      failures.push(`${entry}: active content was not extracted from the tarball`);
      continue;
    }
    for (const requiredText of requiredTexts) {
      if (!content.includes(requiredText)) {
        failures.push(
          `${entry}: missing required successor text ${JSON.stringify(requiredText)}`,
        );
      }
    }
  }

  for (const rule of PACKED_ACTIVE_FORBIDDEN_TEXT) {
    for (const entry of rule.entries) {
      const content = contentByEntry.get(entry);
      if (typeof content !== "string") continue;
      for (const pattern of rule.patterns) {
        if (pattern.test(content)) {
          failures.push(
            `${entry}: contains forbidden active content [${rule.id}] ${pattern}`,
          );
        }
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Packed CLI active Research content failed audit:\n${failures
        .sort()
        .map((failure) => `  - ${failure}`)
        .join("\n")}`,
    );
  }

  return { activeEntryCount: contentByEntry.size };
}

export function auditPackedEntries(entries, inventory) {
  const normalizedEntries = new Set(
    entries.map(normalizeTarEntry).filter(Boolean),
  );
  const missingEntries = inventory.requiredEntries
    .map(normalizeTarEntry)
    .filter((entry) => !normalizedEntries.has(entry));
  const forbiddenExact = new Set(
    inventory.forbiddenExactEntries.map(normalizeTarEntry),
  );
  const forbiddenPrefixes = inventory.forbiddenPrefixes.map((rawPrefix) => {
    const normalized = normalizeTarEntry(rawPrefix);
    return rawPrefix.trim().replaceAll("\\", "/").endsWith("/")
      ? `${normalized}/`
      : normalized;
  });
  const forbiddenEntries = [...normalizedEntries]
    .filter(
      (entry) =>
        forbiddenExact.has(entry) ||
        forbiddenPrefixes.some((prefix) => entry.startsWith(prefix)),
    )
    .sort();

  if (missingEntries.length > 0 || forbiddenEntries.length > 0) {
    const sections = [];
    if (missingEntries.length > 0) {
      sections.push(
        `Packed CLI is missing required Research/compatibility entries:\n${missingEntries
          .sort()
          .map((entry) => `  - ${entry}`)
          .join("\n")}`,
      );
    }
    if (forbiddenEntries.length > 0) {
      sections.push(
        `Packed CLI contains forbidden generic entries:\n${forbiddenEntries
          .map((entry) => `  - ${entry}`)
          .join("\n")}`,
      );
    }
    throw new Error(sections.join("\n"));
  }

  return {
    entryCount: normalizedEntries.size,
    requiredEntryCount: inventory.requiredEntries.length,
  };
}
