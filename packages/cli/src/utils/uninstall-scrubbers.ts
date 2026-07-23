/**
 * Scrubbers for structured config files during `trellis uninstall`.
 *
 * Each scrubber takes the file content (and any context it needs) and returns
 * `{ content, fullyEmpty, outcome }`:
 * - `content` is changed only when Trellis-owned values were scrubbed.
 * - `fullyEmpty` tells the caller whether a successful scrub left no user data.
 * - `outcome` distinguishes an actual scrub from unchanged or malformed input.
 *
 * Hook commands match only when their final path token equals a managed path
 * (or is its absolute-path form), avoiding broad substring-based deletion.
 */

export interface ScrubResult {
  content: string;
  fullyEmpty: boolean;
  outcome: "scrubbed" | "unchanged" | "malformed";
}

/**
 * Test whether a hook command string references any of the given manifest paths.
 *
 * Trellis-emitted hook commands always have the shape
 *   `<python-cmd> <manifest-path>`
 * so the trailing whitespace-delimited token is the script path. We compare
 * that last token (with surrounding quotes stripped) against the manifest
 * delete-set. This is intentionally stricter than substring matching: a
 * user-added hook whose body merely mentions a deleted path inside an `echo`
 * or comment argument (`echo "see .claude/hooks/session-start.py"`) does NOT
 * match, because the trailing token is `inspiration"` (or similar) — not the
 * path. We also accept absolute-path variants like
 * `/Users/me/proj/.claude/hooks/session-start.py` via `endsWith("/" + p)`.
 */
function commandMatchesDeletedPath(
  command: string,
  deletedPaths: readonly string[],
): boolean {
  const trimmed = command.trim();
  if (trimmed.length === 0) return false;

  const tokens = trimmed.split(/\s+/);
  const lastToken = tokens[tokens.length - 1].replace(/^["']|["']$/g, "");
  if (lastToken.length === 0) return false;

  for (const p of deletedPaths) {
    if (lastToken === p || lastToken.endsWith("/" + p)) {
      return true;
    }
  }
  return false;
}

/**
 * Match any supported command field on a hook entry. Copilot may emit both
 * `bash` and `powershell`; either one identifying a Trellis path is sufficient.
 */
function entryMatchesDeletedPath(
  entry: Record<string, unknown>,
  deletedPaths: readonly string[],
): boolean {
  return [entry.command, entry.bash, entry.powershell].some(
    (value) =>
      typeof value === "string" &&
      commandMatchesDeletedPath(value, deletedPaths),
  );
}

/**
 * Scrub a hooks-shaped settings JSON file.
 *
 * `mode = "nested"` → `hooks.{Event}.[ {matcher?, hooks: [ {command,...} ]} ]`
 * `mode = "flat"`   → `hooks.{Event}.[ {command,...} ]`
 *
 * Strips every entry whose command references a path in `deletedPaths`,
 * then bottom-up cleans empty containers (matcher block, event array, hooks
 * object). Any user-defined keys outside `hooks` (e.g. `env`, `model`,
 * `permissions`, `version`) are preserved verbatim.
 */
export function scrubHooksJson(
  content: string,
  deletedPaths: readonly string[],
  mode: "nested" | "flat",
): ScrubResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const root = parsed as Record<string, unknown>;
  const hooks = root.hooks;

  if (hooks === undefined) {
    return {
      content,
      fullyEmpty: Object.keys(root).length === 0,
      outcome: "unchanged",
    };
  }

  if (hooks === null || typeof hooks !== "object" || Array.isArray(hooks)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const hooksObj = hooks as Record<string, unknown>;
  let changed = false;

  for (const eventName of Object.keys(hooksObj)) {
    const eventArr = hooksObj[eventName];
    if (!Array.isArray(eventArr)) {
      return { content, fullyEmpty: false, outcome: "malformed" };
    }

    const filteredEvent: unknown[] = [];

    for (const entry of eventArr) {
      if (mode === "flat") {
        if (
          entry === null ||
          typeof entry !== "object" ||
          Array.isArray(entry)
        ) {
          return { content, fullyEmpty: false, outcome: "malformed" };
        }
        if (
          entryMatchesDeletedPath(
            entry as Record<string, unknown>,
            deletedPaths,
          )
        ) {
          changed = true;
          continue;
        }
        filteredEvent.push(entry);
      } else {
        if (
          entry === null ||
          typeof entry !== "object" ||
          Array.isArray(entry)
        ) {
          return { content, fullyEmpty: false, outcome: "malformed" };
        }
        const matcherBlock = entry as Record<string, unknown>;
        const inner = matcherBlock.hooks;
        if (!Array.isArray(inner)) {
          return { content, fullyEmpty: false, outcome: "malformed" };
        }

        const filteredInner: unknown[] = [];
        for (const sub of inner) {
          if (sub === null || typeof sub !== "object" || Array.isArray(sub)) {
            return { content, fullyEmpty: false, outcome: "malformed" };
          }
          if (
            entryMatchesDeletedPath(
              sub as Record<string, unknown>,
              deletedPaths,
            )
          ) {
            changed = true;
          } else {
            filteredInner.push(sub);
          }
        }

        if (filteredInner.length === 0) {
          if (inner.length === 0) {
            filteredEvent.push(entry);
          }
          continue;
        }

        const rebuilt: Record<string, unknown> = { ...matcherBlock };
        rebuilt.hooks = filteredInner;
        filteredEvent.push(rebuilt);
      }
    }

    if (filteredEvent.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete hooksObj[eventName];
    } else {
      hooksObj[eventName] = filteredEvent;
    }
  }

  if (!changed) {
    return { content, fullyEmpty: false, outcome: "unchanged" };
  }

  if (Object.keys(hooksObj).length === 0) {
    delete root.hooks;
  } else {
    root.hooks = hooksObj;
  }

  const fullyEmpty = Object.keys(root).length === 0;
  return {
    content: JSON.stringify(root, null, 2) + "\n",
    fullyEmpty,
    outcome: "scrubbed",
  };
}

/**
 * Scrub `.zcode/config.json` without recursively searching arbitrary JSON.
 * Supports the current `hooks.events` matcher-block schema and the frozen
 * direct-event compatibility schema.
 */
export function scrubZcodeConfigJson(
  content: string,
  ownedHookPaths: readonly string[],
): ScrubResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const root = parsed as Record<string, unknown>;
  const hooks = root.hooks;
  if (hooks === undefined) {
    return {
      content,
      fullyEmpty: Object.keys(root).length === 0,
      outcome: "unchanged",
    };
  }
  if (hooks === null || typeof hooks !== "object" || Array.isArray(hooks)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const hooksObj = hooks as Record<string, unknown>;
  let changed = false;
  const events = hooksObj.events;

  // Current ZCode schema: hooks.events.<event>[] contains matcher blocks whose
  // `hooks` arrays contain command registrations.
  if (events !== undefined) {
    if (
      events === null ||
      typeof events !== "object" ||
      Array.isArray(events)
    ) {
      return { content, fullyEmpty: false, outcome: "malformed" };
    }
    const eventsObj = events as Record<string, unknown>;
    for (const eventName of Object.keys(eventsObj)) {
      const eventValue = eventsObj[eventName];
      if (!Array.isArray(eventValue)) {
        return { content, fullyEmpty: false, outcome: "malformed" };
      }

      const filteredEvent: unknown[] = [];
      for (const registration of eventValue) {
        if (
          registration === null ||
          typeof registration !== "object" ||
          Array.isArray(registration)
        ) {
          return { content, fullyEmpty: false, outcome: "malformed" };
        }
        const matcherBlock = registration as Record<string, unknown>;
        if (!Array.isArray(matcherBlock.hooks)) {
          return { content, fullyEmpty: false, outcome: "malformed" };
        }

        const filteredHooks: unknown[] = [];
        for (const hook of matcherBlock.hooks) {
          if (
            hook === null ||
            typeof hook !== "object" ||
            Array.isArray(hook)
          ) {
            return { content, fullyEmpty: false, outcome: "malformed" };
          }
          if (
            entryMatchesDeletedPath(
              hook as Record<string, unknown>,
              ownedHookPaths,
            )
          ) {
            changed = true;
          } else {
            filteredHooks.push(hook);
          }
        }

        if (filteredHooks.length === 0) {
          if (matcherBlock.hooks.length === 0) {
            filteredEvent.push(registration);
          }
          continue;
        }
        filteredEvent.push({ ...matcherBlock, hooks: filteredHooks });
      }

      if (filteredEvent.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete eventsObj[eventName];
      } else {
        eventsObj[eventName] = filteredEvent;
      }
    }

    if (changed && Object.keys(eventsObj).length === 0) {
      delete hooksObj.events;
    } else {
      hooksObj.events = eventsObj;
    }
  }

  // Frozen 0.6.7 compatibility schema: hooks.<event>[] contains direct command
  // registrations. Only array-valued keys are recognized as legacy events;
  // scalar hook settings remain user content.
  for (const eventName of Object.keys(hooksObj)) {
    if (eventName === "events" || eventName === "enabled") continue;
    const eventValue = hooksObj[eventName];
    if (!Array.isArray(eventValue)) continue;

    const filteredEvent: unknown[] = [];
    for (const registration of eventValue) {
      if (
        registration === null ||
        typeof registration !== "object" ||
        Array.isArray(registration)
      ) {
        return { content, fullyEmpty: false, outcome: "malformed" };
      }
      if (
        entryMatchesDeletedPath(
          registration as Record<string, unknown>,
          ownedHookPaths,
        )
      ) {
        changed = true;
      } else {
        filteredEvent.push(registration);
      }
    }

    if (filteredEvent.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete hooksObj[eventName];
    } else {
      hooksObj[eventName] = filteredEvent;
    }
  }

  if (!changed) {
    return { content, fullyEmpty: false, outcome: "unchanged" };
  }

  if (Object.keys(hooksObj).length === 0) {
    delete root.hooks;
  } else {
    root.hooks = hooksObj;
  }
  return {
    content: JSON.stringify(root, null, 2) + "\n",
    fullyEmpty: Object.keys(root).length === 0,
    outcome: "scrubbed",
  };
}

/**
 * Scrub `.opencode/package.json`:
 * - remove `dependencies["@opencode-ai/plugin"]`
 * - if `dependencies` ends up empty → drop the field
 * - fully empty when nothing is left in the object
 */
export function scrubOpencodePackageJson(content: string): ScrubResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const root = parsed as Record<string, unknown>;
  const deps = root.dependencies;
  if (deps === undefined) {
    return {
      content,
      fullyEmpty: Object.keys(root).length === 0,
      outcome: "unchanged",
    };
  }
  if (deps === null || typeof deps !== "object" || Array.isArray(deps)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const depsObj = deps as Record<string, unknown>;
  if (!("@opencode-ai/plugin" in depsObj)) {
    return { content, fullyEmpty: false, outcome: "unchanged" };
  }

  delete depsObj["@opencode-ai/plugin"];
  if (Object.keys(depsObj).length === 0) {
    delete root.dependencies;
  } else {
    root.dependencies = depsObj;
  }

  const fullyEmpty = Object.keys(root).length === 0;
  return {
    content: JSON.stringify(root, null, 2) + "\n",
    fullyEmpty,
    outcome: "scrubbed",
  };
}

/**
 * Trellis-specific values written by the Pi configurator.
 *
 * The `extensions`/`skills`/`prompts` arrays are paths relative to `.pi/`. We
 * remove the exact entries that the Pi configurator emits.
 */
const PI_TRELLIS_EXTENSION = "./extensions/trellis/index.ts";
const PI_TRELLIS_SKILLS = "./skills";
const PI_TRELLIS_PROMPTS = "./prompts";
const PI_SUBAGENTS_PACKAGE = "npm:pi-subagents";

function isTrellisPiEntry(value: unknown, target: string): boolean {
  return typeof value === "string" && value === target;
}

/**
 * Scrub `.pi/settings.json`:
 * - drop `enableSkillCommands` (trellis-flagged)
 * - remove trellis entries from `extensions`/`skills`/`prompts` arrays
 * - remove trellis-managed `packages["npm:pi-subagents"]` isolation override
 * - drop arrays that become empty
 */
export function scrubPiSettings(content: string): ScrubResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const root = parsed as Record<string, unknown>;
  let changed = false;

  if ("enableSkillCommands" in root) {
    delete root.enableSkillCommands;
    changed = true;
  }

  const arrayCleanups: [string, string][] = [
    ["extensions", PI_TRELLIS_EXTENSION],
    ["skills", PI_TRELLIS_SKILLS],
    ["prompts", PI_TRELLIS_PROMPTS],
  ];
  for (const [key, target] of arrayCleanups) {
    const arr = root[key];
    if (arr === undefined) continue;
    if (!Array.isArray(arr)) {
      return { content, fullyEmpty: false, outcome: "malformed" };
    }
    const filtered = arr.filter((v) => !isTrellisPiEntry(v, target));
    if (filtered.length === arr.length) continue;
    changed = true;
    if (filtered.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete root[key];
    } else {
      root[key] = filtered;
    }
  }

  const packagesValue = root.packages;
  if (packagesValue !== undefined) {
    if (!Array.isArray(packagesValue)) {
      return { content, fullyEmpty: false, outcome: "malformed" };
    }
    const filtered = packagesValue.filter((entry) => {
      if (
        entry !== null &&
        typeof entry === "object" &&
        !Array.isArray(entry)
      ) {
        const obj = entry as Record<string, unknown>;
        return obj.source !== PI_SUBAGENTS_PACKAGE;
      }
      return entry !== PI_SUBAGENTS_PACKAGE;
    });
    if (filtered.length !== packagesValue.length) {
      changed = true;
      if (filtered.length === 0) {
        delete root.packages;
      } else {
        root.packages = filtered;
      }
    }
  }

  if (!changed) {
    return {
      content,
      fullyEmpty: Object.keys(root).length === 0,
      outcome: "unchanged",
    };
  }

  const fullyEmpty = Object.keys(root).length === 0;
  return {
    content: JSON.stringify(root, null, 2) + "\n",
    fullyEmpty,
    outcome: "scrubbed",
  };
}

/**
 * Scrub `.codex/config.toml`.
 *
 * The current trellis-emitted file has two distinct chunks:
 * 1. The line `project_doc_fallback_filenames = ["AGENTS.md"]`
 * 2. A multi-line comment block that begins with the marker
 *    `# NOTE: Trellis's SessionStart + UserPromptSubmit hooks require opt-in.`
 *    and continues through `# be injected into Codex sessions.`
 *
 * Plus the leading "Project-scoped Codex defaults" header comments.
 *
 * Strategy: line-based removal. We strip:
 *  - the `project_doc_fallback_filenames = ...` line
 *  - any line that is *only* a comment introduced by trellis (the entire file
 *    as shipped is comments + that one assignment)
 *  - blank lines that surrounded those removals
 *
 * If the user added their own non-trellis lines, they are preserved as-is.
 * "Fully empty" = post-scrub content has no non-whitespace characters.
 */
export function scrubCodexConfigToml(content: string): ScrubResult {
  const trellisCommentMarkers = [
    "Project-scoped Codex defaults for Trellis workflows.",
    "Codex loads this after ~/.codex/config.toml when you work in this project.",
    "Keep AGENTS.md as the primary project instruction file.",
    "NOTE: Trellis's SessionStart + UserPromptSubmit hooks require opt-in.",
    "Add the following to your USER-level config at ~/.codex/config.toml",
    "(not this project file — features.* must be enabled globally):",
    "[features]",
    "hooks = true",
    "codex_hooks = true",
    "Without this flag, hooks.json is ignored and Trellis context won't",
    "be injected into Codex sessions.",
  ];

  // A comment line is "trellis-known" if its content (after `#` and spaces)
  // matches one of the known marker strings exactly OR is an empty `#` line.
  function isTrellisCommentLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#")) return false;
    const inner = trimmed.replace(/^#+\s?/, "").trim();
    if (inner.length === 0) return true; // bare `#` line inside trellis block
    return trellisCommentMarkers.some((m) => inner === m);
  }

  function isTrellisAssignment(line: string): boolean {
    return /^\s*project_doc_fallback_filenames\s*=/.test(line);
  }

  const out: string[] = [];
  let prevWasBlank = true; // start-of-file counts as blank for collapsing
  let changed = false;

  for (const rawLine of content.split(/\r?\n/)) {
    if (isTrellisAssignment(rawLine) || isTrellisCommentLine(rawLine)) {
      changed = true;
      continue; // drop
    }
    const isBlank = rawLine.trim().length === 0;
    if (isBlank && prevWasBlank) {
      continue; // collapse runs of blanks created by removals
    }
    out.push(rawLine);
    prevWasBlank = isBlank;
  }

  // Trim trailing blank lines.
  while (out.length > 0 && out[out.length - 1].trim().length === 0) {
    out.pop();
  }

  if (!changed) {
    return {
      content,
      fullyEmpty: content.trim().length === 0,
      outcome: "unchanged",
    };
  }

  const result = out.length > 0 ? out.join("\n") + "\n" : "";
  const fullyEmpty = result.trim().length === 0;
  return { content: result, fullyEmpty, outcome: "scrubbed" };
}

export function scrubManagedMarkdownBlock(
  content: string,
  startMarker: string,
  endMarker: string,
): ScrubResult {
  const start = content.indexOf(startMarker);
  if (start === -1) {
    return {
      content,
      fullyEmpty: content.trim().length === 0,
      outcome: "unchanged",
    };
  }

  const end = content.indexOf(endMarker, start);
  if (end === -1) {
    return { content, fullyEmpty: false, outcome: "malformed" };
  }

  const blockEnd = end + endMarker.length;
  const result = (content.slice(0, start) + content.slice(blockEnd))
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  const normalized = result.length > 0 ? `${result}\n` : "";

  return {
    content: normalized,
    fullyEmpty: normalized.trim().length === 0,
    outcome: "scrubbed",
  };
}
