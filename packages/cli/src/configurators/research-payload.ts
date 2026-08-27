import fs from "node:fs";
import path from "node:path";

import type { AITool } from "../types/ai-tools.js";
import {
  getResearchWorkerTemplate as getClaudeResearchWorkerTemplate,
  getSettingsTemplate as getClaudeSettingsTemplate,
  getStatuslineHook,
} from "../templates/claude/index.js";
import {
  getConfigTemplate as getCodexConfigTemplate,
  getHooksConfig as getCodexHooksConfig,
  getResearchWorkerTemplate as getCodexResearchWorkerTemplate,
} from "../templates/codex/index.js";
import { getSharedHookScriptsForPlatform } from "../templates/shared-hooks/index.js";
import { ensureDir, writeFile } from "../utils/file-writer.js";
import {
  replacePythonCommandLiterals,
  resolvePlaceholders,
  type PlatformConfigureOptions,
} from "./shared.js";

export const RESEARCH_WORKER_NAME = "trellis-research-worker";

export const RESEARCH_PAYLOAD_PATHS = {
  claude: {
    worker: `.claude/agents/${RESEARCH_WORKER_NAME}.md`,
    hooks: [
      ".claude/hooks/session-start.py",
      ".claude/hooks/inject-workflow-state.py",
      ".claude/hooks/inject-subagent-context.py",
    ],
    config: ".claude/settings.json",
    statusline: ".claude/hooks/statusline.py",
  },
  codex: {
    worker: `.codex/agents/${RESEARCH_WORKER_NAME}.toml`,
    hooks: [".codex/hooks/inject-workflow-state.py"],
    config: [".codex/hooks.json", ".codex/config.toml"],
  },
} as const;

/** User-set top-level model overrides preserved on the generated Codex worker. */
export interface CodexWorkerModelKeys {
  model?: string;
  model_reasoning_effort?: string;
}

function tomlUnescape(value: string): string | null {
  let result = "";
  for (let index = 0; index < value.length; index++) {
    const char = value[index] ?? "";
    if (char !== "\\") {
      const code = char.codePointAt(0) ?? 0;
      if (code <= 0x1f || code === 0x7f) return null;
      result += char;
      continue;
    }

    const escape = value[++index];
    if (escape === undefined) return null;
    const simpleEscapes: Record<string, string> = {
      b: "\b",
      t: "\t",
      n: "\n",
      f: "\f",
      r: "\r",
      '"': '"',
      "\\": "\\",
    };
    if (escape in simpleEscapes) {
      result += simpleEscapes[escape];
      continue;
    }

    if (escape !== "u" && escape !== "U") return null;
    const length = escape === "u" ? 4 : 8;
    const hex = value.slice(index + 1, index + 1 + length);
    if (hex.length !== length || !/^[0-9A-Fa-f]+$/.test(hex)) return null;
    const codePoint = Number.parseInt(hex, 16);
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      return null;
    }
    result += String.fromCodePoint(codePoint);
    index += length;
  }
  return result;
}

function tomlEscape(value: string): string {
  let result = "";
  for (const char of value) {
    const escapes: Record<string, string> = {
      "\b": "\\b",
      "\t": "\\t",
      "\n": "\\n",
      "\f": "\\f",
      "\r": "\\r",
      '"': '\\"',
      "\\": "\\\\",
    };
    if (char in escapes) {
      result += escapes[char];
      continue;
    }
    const codePoint = char.codePointAt(0) ?? 0;
    result +=
      codePoint <= 0x1f || codePoint === 0x7f
        ? `\\u${codePoint.toString(16).padStart(4, "0")}`
        : char;
  }
  return result;
}

/** Extract only top-level model overrides, never table or instruction text. */
export function extractCodexWorkerModelKeys(
  existingContent: string,
): CodexWorkerModelKeys {
  const result: CodexWorkerModelKeys = {};
  let multilineDelimiter: '"""' | "'''" | null = null;
  let insideTable = false;

  for (const rawLine of existingContent.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (multilineDelimiter) {
      if (trimmed.includes(multilineDelimiter)) multilineDelimiter = null;
      continue;
    }
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("[")) {
      insideTable = true;
      continue;
    }

    const multilineMatch = trimmed.match(
      /^[A-Za-z_][A-Za-z0-9_-]*\s*=\s*("""|''')/,
    );
    if (multilineMatch) {
      const delimiter = multilineMatch[1] as '"""' | "'''";
      const openingIndex = trimmed.indexOf(delimiter);
      if (trimmed.indexOf(delimiter, openingIndex + delimiter.length) < 0) {
        multilineDelimiter = delimiter;
      }
      continue;
    }
    if (insideTable) continue;

    const match = trimmed.match(
      /^(model|model_reasoning_effort)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)')\s*(?:#.*)?$/,
    );
    if (!match) continue;

    const basicValue = match[2];
    const literalValue = match[3];
    const value =
      basicValue !== undefined
        ? tomlUnescape(basicValue)
        : (literalValue ?? "");
    const literalHasControl = [...(literalValue ?? "")].some((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    });
    if (value === null || literalHasControl) {
      continue;
    }

    const key = match[1] as keyof CodexWorkerModelKeys;
    result[key] = value;
  }
  return result;
}

/** Insert preserved model overrides after the worker sandbox declaration. */
export function applyCodexWorkerModelKeys(
  freshContent: string,
  preserved: CodexWorkerModelKeys,
): string {
  const lines: string[] = [];
  if (preserved.model) {
    lines.push(`model = "${tomlEscape(preserved.model)}"`);
  }
  if (preserved.model_reasoning_effort) {
    lines.push(
      `model_reasoning_effort = "${tomlEscape(preserved.model_reasoning_effort)}"`,
    );
  }
  if (lines.length === 0) return freshContent;
  return freshContent.replace(
    /^(sandbox_mode\s*=\s*".*"\n)/m,
    (matched) => `${matched}${lines.join("\n")}\n`,
  );
}

function mergeCodexWorker(template: string, existing: string | null): string {
  if (!existing) return template;
  return applyCodexWorkerModelKeys(
    template,
    extractCodexWorkerModelKeys(existing),
  );
}

function readExisting(
  cwd: string | undefined,
  relativePath: string,
): string | null {
  if (!cwd) return null;
  try {
    return fs.readFileSync(path.join(cwd, relativePath), "utf-8");
  } catch {
    return null;
  }
}

function warnMalformed(relativePath: string): void {
  if (!process.env.VITEST && !process.env.TRELLIS_QUIET) {
    process.stderr.write(
      `Warning: preserving malformed ${relativePath}; Trellis Research entries were not merged.\n`,
    );
  }
}

function isManagedClaudeHookEntry(value: unknown): boolean {
  const text = JSON.stringify(value);
  return [
    ".claude/hooks/session-start.py",
    ".claude/hooks/inject-workflow-state.py",
    ".claude/hooks/inject-subagent-context.py",
  ].some((managedPath) => text.includes(managedPath));
}

function mergeClaudeSettings(
  template: string,
  existing: string | null,
  withStatusline: boolean,
): string {
  const desired = JSON.parse(template) as Record<string, unknown>;
  if (!existing) {
    if (withStatusline) {
      desired.statusLine = {
        type: "command",
        command: "{{PYTHON_CMD}} .claude/hooks/statusline.py",
      };
    }
    return resolvePlaceholders(`${JSON.stringify(desired, null, 2)}\n`);
  }

  let current: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(existing);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new TypeError("Claude settings must be a JSON object");
    }
    current = parsed as Record<string, unknown>;
  } catch {
    warnMalformed(RESEARCH_PAYLOAD_PATHS.claude.config);
    return existing;
  }

  const desiredEnv = (desired.env ?? {}) as Record<string, unknown>;
  const currentEnv =
    current.env &&
    typeof current.env === "object" &&
    !Array.isArray(current.env)
      ? (current.env as Record<string, unknown>)
      : {};
  current.env = { ...currentEnv, ...desiredEnv };

  const desiredHooks = desired.hooks as Record<string, unknown[]>;
  const currentHooks =
    current.hooks &&
    typeof current.hooks === "object" &&
    !Array.isArray(current.hooks)
      ? (current.hooks as Record<string, unknown[]>)
      : {};
  for (const [event, entries] of Object.entries(desiredHooks)) {
    const existingEntries = Array.isArray(currentHooks[event])
      ? currentHooks[event].filter((entry) => !isManagedClaudeHookEntry(entry))
      : [];
    currentHooks[event] = [...existingEntries, ...entries];
  }
  current.hooks = currentHooks;

  if (!("enabledPlugins" in current)) {
    current.enabledPlugins = {};
  }
  if (withStatusline) {
    current.statusLine = {
      type: "command",
      command: "{{PYTHON_CMD}} .claude/hooks/statusline.py",
    };
  }

  return resolvePlaceholders(`${JSON.stringify(current, null, 2)}\n`);
}

function isManagedCodexHookEntry(value: unknown): boolean {
  return JSON.stringify(value).includes(
    ".codex/hooks/inject-workflow-state.py",
  );
}

function mergeCodexHooks(template: string, existing: string | null): string {
  const desired = JSON.parse(template) as Record<string, unknown>;
  if (!existing)
    return resolvePlaceholders(`${JSON.stringify(desired, null, 2)}\n`);

  let current: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(existing);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new TypeError("Codex hooks must be a JSON object");
    }
    current = parsed as Record<string, unknown>;
  } catch {
    warnMalformed(".codex/hooks.json");
    return existing;
  }

  const desiredHooks = desired.hooks as Record<string, unknown[]>;
  const currentHooks =
    current.hooks &&
    typeof current.hooks === "object" &&
    !Array.isArray(current.hooks)
      ? (current.hooks as Record<string, unknown[]>)
      : {};
  for (const [event, entries] of Object.entries(desiredHooks)) {
    const existingEntries = Array.isArray(currentHooks[event])
      ? currentHooks[event].filter((entry) => !isManagedCodexHookEntry(entry))
      : [];
    currentHooks[event] = [...existingEntries, ...entries];
  }
  current.hooks = currentHooks;
  return resolvePlaceholders(`${JSON.stringify(current, null, 2)}\n`);
}

function isLikelyToml(content: string): boolean {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[")) {
      if (!/^\[\[?[^\]]+\]\]?$/.test(line)) return false;
      continue;
    }
    if (!/^[A-Za-z0-9_.-]+\s*=/.test(line)) return false;
  }
  return true;
}

function mergeCodexConfig(template: string, existing: string | null): string {
  if (!existing) return template;
  if (!isLikelyToml(existing)) {
    warnMalformed(".codex/config.toml");
    return existing;
  }

  const managedLine = 'project_doc_fallback_filenames = ["AGENTS.md"]';
  const lines = existing.split(/\r?\n/);
  const managedIndex = lines.findIndex((line) =>
    /^\s*project_doc_fallback_filenames\s*=/.test(line),
  );
  if (managedIndex >= 0) {
    lines[managedIndex] = managedLine;
    return lines.join("\n");
  }
  return `${template.trimEnd()}\n\n${existing}`;
}

/**
 * C08/C09: Research stage Skills are not generated and no longer ship as
 * package source/payload. Historical installed files may only be retired via
 * immutable evidence.
 */
function collectClaudePayload(
  cwd: string | undefined,
  options: PlatformConfigureOptions | undefined,
): Map<string, string> {
  const files = new Map<string, string>();
  const worker = getClaudeResearchWorkerTemplate();
  files.set(RESEARCH_PAYLOAD_PATHS.claude.worker, worker.content);

  for (const hook of getSharedHookScriptsForPlatform("claude")) {
    files.set(`.claude/hooks/${hook.name}`, hook.content);
  }

  const existingSettings = readExisting(
    cwd,
    RESEARCH_PAYLOAD_PATHS.claude.config,
  );
  const withStatusline = options?.withStatusline === true;
  const settings = getClaudeSettingsTemplate();
  files.set(
    `.claude/${settings.targetPath}`,
    mergeClaudeSettings(settings.content, existingSettings, withStatusline),
  );
  if (withStatusline) {
    files.set(RESEARCH_PAYLOAD_PATHS.claude.statusline, getStatuslineHook());
  }
  return files;
}

function collectCodexPayload(cwd: string | undefined): Map<string, string> {
  const files = new Map<string, string>();
  const worker = getCodexResearchWorkerTemplate();
  files.set(
    RESEARCH_PAYLOAD_PATHS.codex.worker,
    mergeCodexWorker(
      worker.content,
      readExisting(cwd, RESEARCH_PAYLOAD_PATHS.codex.worker),
    ),
  );

  for (const hook of getSharedHookScriptsForPlatform("codex")) {
    files.set(`.codex/hooks/${hook.name}`, hook.content);
  }
  files.set(
    ".codex/hooks.json",
    mergeCodexHooks(
      getCodexHooksConfig(),
      readExisting(cwd, ".codex/hooks.json"),
    ),
  );
  const config = getCodexConfigTemplate();
  files.set(
    `.codex/${config.targetPath}`,
    mergeCodexConfig(
      config.content,
      readExisting(cwd, `.codex/${config.targetPath}`),
    ),
  );
  return files;
}

export function collectResearchPlatformPayload(
  platformId: AITool,
  cwd?: string,
  options?: PlatformConfigureOptions,
): Map<string, string> {
  const files =
    platformId === "claude-code"
      ? collectClaudePayload(cwd, options)
      : collectCodexPayload(cwd);
  const rendered = new Map<string, string>();
  for (const [relativePath, content] of files) {
    rendered.set(relativePath, replacePythonCommandLiterals(content));
  }
  return rendered;
}

export async function writeResearchPlatformPayload(
  platformId: AITool,
  cwd: string,
  options?: PlatformConfigureOptions,
): Promise<void> {
  for (const [relativePath, content] of collectResearchPlatformPayload(
    platformId,
    cwd,
    options,
  )) {
    const targetPath = path.join(cwd, relativePath);
    ensureDir(path.dirname(targetPath));
    await writeFile(targetPath, content);
  }
}
