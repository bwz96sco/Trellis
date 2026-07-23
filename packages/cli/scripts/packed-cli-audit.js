const PACKED_ROOT = "package/";

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

export function buildPackedCliInventory(migrationManifestNames) {
  const requiredEntries = [
    ...REQUIRED_RESEARCH_ENTRIES.map(withPackedRoot),
    ...RESEARCH_STAGE_SKILLS.map((skill) =>
      withPackedRoot(`dist/templates/common/bundled-skills/${skill}/SKILL.md`),
    ),
    ...migrationManifestNames.map((name) =>
      withPackedRoot(`dist/migrations/manifests/${name}`),
    ),
  ];

  return {
    requiredEntries,
    forbiddenExactEntries: FORBIDDEN_GENERIC_EXACT_ENTRIES.map(withPackedRoot),
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
