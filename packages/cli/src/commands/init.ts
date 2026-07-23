import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import figlet from "figlet";
import inquirer from "inquirer";
import { createWorkflowStructure } from "../configurators/workflow.js";
import { RESEARCH_PAYLOAD_PATHS } from "../configurators/research-payload.js";
import {
  getInitToolChoices,
  resolveCliFlag,
  configurePlatform,
  getConfiguredPlatforms,
  getPlatformsWithPythonHooks,
} from "../configurators/index.js";
import {
  getPythonCommandForPlatform,
  replacePythonCommandLiterals,
  setResolvedPythonCommand,
} from "../configurators/shared.js";
import { AI_TOOLS, type CliFlag } from "../types/ai-tools.js";
import { DIR_NAMES, FILE_NAMES, PATHS } from "../constants/paths.js";
import { VERSION } from "../constants/version.js";
import { agentsMdContent } from "../templates/markdown/index.js";
import {
  setWriteMode,
  startRecordingWrites,
  stopRecordingWrites,
  writeFile,
  type WriteMode,
} from "../utils/file-writer.js";
import {
  initializeHashes,
  loadHashes,
  removeHash,
  saveHashes,
  updateHashes,
} from "../utils/template-hash.js";
import {
  RESEARCH_WORKFLOW_ID,
  resolveBundledWorkflowTemplate,
} from "../utils/workflow-resolver.js";
import { saveBundledWorkflowSelection } from "../utils/workflow-selection.js";
import {
  isCwdHomedir,
  homedirGuardMessage,
  homedirBypassEnabled,
} from "../utils/cwd-guard.js";

const MIN_PYTHON_MAJOR = 3;
const MIN_PYTHON_MINOR = 9;
const PYTHON_VERSION_RE = /Python (\d+)\.(\d+)/;

export function isSupportedPythonVersion(versionOutput: string): boolean {
  const match = versionOutput.match(PYTHON_VERSION_RE);
  if (!match) return false;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (
    major > MIN_PYTHON_MAJOR ||
    (major === MIN_PYTHON_MAJOR && minor >= MIN_PYTHON_MINOR)
  );
}

// Sentinel returned when child_process spawn is blocked by a sandbox / kernel
// policy (e.g. seccomp inside Codex's Linux sandbox). EPERM/EACCES here mean
// "the kernel refused the spawn" — NOT "python3 isn't installed". The host
// usually has python3 on PATH; we just can't probe it from this Node process.
type PythonProbe = string | null | "sandbox-restricted";

function detectPythonVersion(command: string): PythonProbe {
  try {
    return execSync(`${command} --version`, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "EPERM" || code === "EACCES") {
      return "sandbox-restricted";
    }
    return null;
  }
}

export function requireSupportedPython(command: string): string {
  if (process.env.TRELLIS_SKIP_PYTHON_CHECK === "1") {
    return "version check skipped (TRELLIS_SKIP_PYTHON_CHECK=1)";
  }

  const versionOutput = detectPythonVersion(command);

  if (versionOutput === "sandbox-restricted") {
    console.warn(
      chalk.yellow(
        `⚠ Python version check skipped — sandboxed environment blocked ` +
          `child_process spawn (EPERM/EACCES). Assuming "${command}" is on ` +
          `PATH. If init fails later, re-run on the host or set ` +
          `TRELLIS_SKIP_PYTHON_CHECK=1.`,
      ),
    );
    return "version unknown (sandbox-restricted)";
  }

  if (!versionOutput) {
    throw new Error(
      `Python command "${command}" not found. Trellis init requires Python ≥ 3.9.`,
    );
  }

  if (!isSupportedPythonVersion(versionOutput)) {
    throw new Error(
      `${versionOutput} detected via "${command}", but Trellis init requires Python ≥ 3.9.`,
    );
  }

  return versionOutput;
}

/**
 * Candidate Python command list per platform.
 *
 * Windows: `python` is the usual python.org installer choice, but Microsoft
 * Store ships `python3`, and the `py` launcher is `py -3`. Non-Windows uses
 * `python3` first and falls back to `python`.
 */
const PYTHON_CANDIDATES: Record<"win32" | "other", readonly string[]> = {
  win32: ["python", "python3", "py -3"],
  other: ["python3", "python"],
};

/** Detect a working Python ≥ 3.9 command and cache it for template rendering. */
export function resolveSupportedPython(): {
  command: string;
  version: string;
} {
  const override = process.env.TRELLIS_PYTHON_CMD?.trim();
  if (override) {
    setResolvedPythonCommand(override);
    return { command: override, version: "set via TRELLIS_PYTHON_CMD" };
  }

  if (process.env.TRELLIS_SKIP_PYTHON_CHECK === "1") {
    const fallback = getPythonCommandForPlatform();
    setResolvedPythonCommand(fallback);
    return {
      command: fallback,
      version: "version check skipped (TRELLIS_SKIP_PYTHON_CHECK=1)",
    };
  }

  const candidates =
    process.platform === "win32"
      ? PYTHON_CANDIDATES.win32
      : PYTHON_CANDIDATES.other;

  const probeFailures: string[] = [];
  for (const candidate of candidates) {
    const probe = detectPythonVersion(candidate);
    if (probe === "sandbox-restricted") {
      console.warn(
        chalk.yellow(
          `⚠ Python version check skipped — sandboxed environment blocked ` +
            `child_process spawn (EPERM/EACCES). Assuming "${candidate}" is ` +
            `on PATH. If init fails later, re-run on the host or set ` +
            `TRELLIS_SKIP_PYTHON_CHECK=1.`,
        ),
      );
      setResolvedPythonCommand(candidate);
      return {
        command: candidate,
        version: "version unknown (sandbox-restricted)",
      };
    }
    if (!probe) {
      probeFailures.push(`${candidate}: not found`);
      continue;
    }
    if (!isSupportedPythonVersion(probe)) {
      probeFailures.push(`${candidate}: ${probe} (< 3.9)`);
      continue;
    }
    setResolvedPythonCommand(candidate);
    return { command: candidate, version: probe };
  }

  const isWindows = process.platform === "win32";
  const installHint = isWindows
    ? `Install Python ≥ 3.9 from https://www.python.org/downloads/windows/ — make sure ` +
      `"Add Python to PATH" is checked in the installer. Or, if Python is ` +
      `installed under a different name, set TRELLIS_PYTHON_CMD=<your-cmd> ` +
      `before re-running init (e.g. \`set TRELLIS_PYTHON_CMD=py -3\`).`
    : `Install Python ≥ 3.9 from https://www.python.org/downloads/ or via your ` +
      `package manager. Or set TRELLIS_PYTHON_CMD=<your-cmd> before re-running.`;

  throw new Error(
    `No supported Python command found. Tried: ${candidates.join(", ")}.\n` +
      `Probe results:\n  ${probeFailures.join("\n  ")}\n\n` +
      `Trellis init requires Python ≥ 3.9. ${installHint}\n` +
      `Last-resort escape hatch: set TRELLIS_SKIP_PYTHON_CHECK=1 to skip the probe entirely.`,
  );
}

function getOsDisplayName(
  platform: NodeJS.Platform = process.platform,
): string {
  switch (platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return platform;
  }
}

function logPythonAdaptationNotice(command: string): void {
  const osName = getOsDisplayName();
  console.log(
    chalk.blue(
      `📌 ${osName} detected: Trellis rendered Python commands as "${command}" in generated hooks, settings, and help text`,
    ),
  );
}

/** Current public and programmatic options for Research initialization. */
export interface InitOptions {
  claude?: boolean;
  codex?: boolean;
  yes?: boolean;
  force?: boolean;
  skipExisting?: boolean;
  /** Claude Code only: install the opt-in Research statusLine. */
  withStatusline?: boolean;
}

// Compile-time check: every CliFlag must be a key of InitOptions.
type _AssertCliFlagsInOptions = [CliFlag] extends [keyof InitOptions]
  ? true
  : "ERROR: CliFlag has values not present in InitOptions";
const _cliFlagCheck: _AssertCliFlagsInOptions = true;

interface InitAnswers {
  tools: CliFlag[];
}

/**
 * Interactive opt-in for the Claude Code statusLine when `--with-statusline`
 * was not passed. Mutates the per-run options so configure and output agree.
 */
async function maybePromptStatuslineOptIn(
  options: InitOptions,
  toolKeys: string[],
): Promise<void> {
  if (options.yes || options.withStatusline !== undefined) return;
  if (!toolKeys.includes(AI_TOOLS["claude-code"].cliFlag)) return;

  const answer = await inquirer.prompt<{ withStatusline: boolean }>([
    {
      type: "confirm",
      name: "withStatusline",
      message:
        "Install Trellis Research statusLine for Claude Code? (Research state and repository context)",
      default: false,
    },
  ]);
  options.withStatusline = answer.withStatusline;
}

/**
 * Handle re-init when `.trellis/` already exists.
 * Returns true when handled, or false when the user selected full re-init.
 */
async function handleReinit(
  cwd: string,
  options: InitOptions,
): Promise<boolean> {
  const tools = getInitToolChoices();
  const configuredPlatforms = getConfiguredPlatforms(cwd);
  const configuredNames = [...configuredPlatforms]
    .map((id) => AI_TOOLS[id].name)
    .join(", ");
  const explicitTools = tools
    .filter((tool) => options[tool.key as keyof InitOptions])
    .map((tool) => tool.key);

  let platformsToAdd = explicitTools;
  let shouldAddPlatforms = explicitTools.length > 0;

  if (!shouldAddPlatforms) {
    if (options.yes) {
      console.log(chalk.gray(`Already initialized with: ${configuredNames}`));
      console.log(
        chalk.gray("Use a platform flag (e.g., --codex) to add a host."),
      );
      return true;
    }

    console.log(
      chalk.gray(`\n   Already initialized with: ${configuredNames}\n`),
    );
    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: "list",
        name: "action",
        message: "Trellis is already initialized. What would you like to do?",
        choices: [
          { name: "Add AI platform(s)", value: "add-platform" },
          { name: "Full re-initialize", value: "full" },
        ],
      },
    ]);

    if (action === "full") return false;
    shouldAddPlatforms = action === "add-platform";
  }

  if (!shouldAddPlatforms) return true;

  if (platformsToAdd.length === 0) {
    const unconfigured = tools.filter((tool) => {
      const platformId = resolveCliFlag(tool.key);
      return platformId && !configuredPlatforms.has(platformId);
    });

    if (unconfigured.length === 0) {
      console.log(
        chalk.green("✓ All available platforms are already configured."),
      );
      return true;
    }

    const answers = await inquirer.prompt<{ tools: CliFlag[] }>([
      {
        type: "checkbox",
        name: "tools",
        message: "Select platforms to add:",
        choices: unconfigured.map((tool) => ({
          name: tool.name,
          value: tool.key,
        })),
      },
    ]);
    platformsToAdd = answers.tools;
  }

  await maybePromptStatuslineOptIn(
    options,
    platformsToAdd.filter((tool) => {
      const platformId = resolveCliFlag(tool as CliFlag);
      return !!platformId && !configuredPlatforms.has(platformId);
    }),
  );

  const previousWorkflowHash = loadHashes(cwd)[PATHS.WORKFLOW_GUIDE_FILE];
  const reinitWritten = startRecordingWrites(cwd);
  try {
    for (const tool of platformsToAdd) {
      const platformId = resolveCliFlag(tool as CliFlag);
      if (!platformId) continue;

      if (configuredPlatforms.has(platformId)) {
        console.log(
          chalk.gray(
            `  ○ ${AI_TOOLS[platformId].name} already configured, skipping`,
          ),
        );
        continue;
      }

      console.log(chalk.blue(`📝 Configuring ${AI_TOOLS[platformId].name}...`));
      await configurePlatform(platformId, cwd, {
        withStatusline: options.withStatusline,
      });
      if (platformId === "claude-code" && options.withStatusline) {
        console.log(chalk.gray("   ↳ Trellis Research statusLine installed"));
      }
    }
  } finally {
    stopRecordingWrites();
  }

  const hashedCount = initializeHashes(cwd, {
    trackedPaths: reinitWritten,
    merge: true,
  });

  // Adding a host must not change workflow ownership. The `.trellis` walk in
  // initializeHashes observes the active file, so restore the exact prior hash.
  if (previousWorkflowHash === undefined) {
    removeHash(cwd, PATHS.WORKFLOW_GUIDE_FILE);
  } else {
    const hashes = loadHashes(cwd);
    hashes[PATHS.WORKFLOW_GUIDE_FILE] = previousWorkflowHash;
    saveHashes(cwd, hashes);
  }

  if (hashedCount > 0) {
    console.log(
      chalk.gray(`📋 Tracking ${hashedCount} template files for updates`),
    );
  }
  return true;
}

export async function init(options: InitOptions): Promise<void> {
  if (isCwdHomedir() && !homedirBypassEnabled()) {
    console.error(chalk.red(homedirGuardMessage("init")));
    process.exit(1);
  }

  const cwd = process.cwd();
  const isFirstInit = !fs.existsSync(path.join(cwd, DIR_NAMES.WORKFLOW));
  const retainManagedClaudeStatusline =
    loadHashes(cwd)[RESEARCH_PAYLOAD_PATHS.claude.statusline] !== undefined;

  const banner = figlet.textSync("Trellis", { font: "Rebel" });
  console.log(chalk.cyan(`\n${banner.trimEnd()}`));
  console.log(
    chalk.gray("\n   Research control plane for Claude Code and Codex\n"),
  );

  let writeMode: WriteMode = "ask";
  if (options.force) {
    writeMode = "force";
    console.log(chalk.gray("Mode: Force overwrite existing files\n"));
  } else if (options.skipExisting) {
    writeMode = "skip";
    console.log(chalk.gray("Mode: Skip existing files\n"));
  } else if (options.yes) {
    writeMode = "skip";
    console.log(chalk.gray("Mode: Non-interactive (skip existing files)\n"));
  }
  setWriteMode(writeMode);

  const { command: pythonCmd } = resolveSupportedPython();
  let fullReinitRequested = false;

  if (!isFirstInit && !options.force && !options.skipExisting) {
    const reinitDone = await handleReinit(cwd, options);
    if (reinitDone) return;
    fullReinitRequested = true;
  }

  const toolChoices = getInitToolChoices();
  const explicitTools = toolChoices
    .filter((tool) => options[tool.key as keyof InitOptions])
    .map((tool) => tool.key);

  let tools: CliFlag[];
  if (explicitTools.length > 0) {
    tools = explicitTools;
  } else if (options.yes) {
    tools = toolChoices
      .filter((tool) => tool.defaultChecked)
      .map((tool) => tool.key);
  } else {
    const answers = await inquirer.prompt<InitAnswers>([
      {
        type: "checkbox",
        name: "tools",
        message: "Select AI tools to configure:",
        choices: toolChoices.map((tool) => ({
          name: tool.name,
          value: tool.key,
          checked: tool.defaultChecked,
        })),
      },
    ]);
    tools = answers.tools;
  }

  if (tools.length === 0) {
    console.log(
      chalk.yellow("No tools selected. At least one tool is required."),
    );
    return;
  }

  await maybePromptStatuslineOptIn(options, tools);

  const resolvedWorkflow = resolveBundledWorkflowTemplate(RESEARCH_WORKFLOW_ID);
  console.log(
    chalk.blue(
      `🧭 Using workflow template: ${chalk.cyan(RESEARCH_WORKFLOW_ID)}`,
    ),
  );

  const writtenPaths = startRecordingWrites(cwd);
  try {
    console.log(chalk.blue("📁 Creating Research workflow structure..."));
    await createWorkflowStructure(cwd, resolvedWorkflow.content);

    const versionPath = path.join(cwd, DIR_NAMES.WORKFLOW, ".version");
    fs.writeFileSync(versionPath, VERSION);

    for (const tool of tools) {
      const platformId = resolveCliFlag(tool);
      if (!platformId) continue;

      console.log(chalk.blue(`📝 Configuring ${AI_TOOLS[platformId].name}...`));
      await configurePlatform(platformId, cwd, {
        withStatusline:
          platformId === "claude-code" &&
          (options.withStatusline === true || retainManagedClaudeStatusline),
      });
      if (platformId === "claude-code" && options.withStatusline) {
        console.log(chalk.gray("   ↳ Trellis Research statusLine installed"));
      }
    }

    const pythonPlatforms = getPlatformsWithPythonHooks();
    const hasSelectedPythonPlatform = pythonPlatforms.some((id) =>
      tools.includes(AI_TOOLS[id].cliFlag),
    );
    if (hasSelectedPythonPlatform) {
      logPythonAdaptationNotice(pythonCmd);
    }

    await createRootFiles(cwd);
  } finally {
    stopRecordingWrites();
  }

  // Preserve the prior workflow ownership signal in case skip mode left the
  // active workflow unchanged.
  const previousWorkflowHash = loadHashes(cwd)[PATHS.WORKFLOW_GUIDE_FILE];
  const restorePreviousWorkflowHash = (): void => {
    if (previousWorkflowHash === undefined) {
      removeHash(cwd, PATHS.WORKFLOW_GUIDE_FILE);
    } else {
      const hashes = loadHashes(cwd);
      hashes[PATHS.WORKFLOW_GUIDE_FILE] = previousWorkflowHash;
      saveHashes(cwd, hashes);
    }
  };

  const nonWorkflowWrittenPaths = new Set(writtenPaths);
  nonWorkflowWrittenPaths.delete(PATHS.WORKFLOW_GUIDE_FILE);
  const hashedCount = initializeHashes(cwd, {
    trackedPaths: nonWorkflowWrittenPaths,
    merge: true,
  });
  if (hashedCount > 0) {
    console.log(
      chalk.gray(`📋 Tracking ${hashedCount} template files for updates`),
    );
  }

  const activeWorkflowPath = path.join(cwd, PATHS.WORKFLOW_GUIDE_FILE);
  const expectedWorkflowContent = replacePythonCommandLiterals(
    resolvedWorkflow.content,
  );
  const activeWorkflowContent = fs.existsSync(activeWorkflowPath)
    ? fs.readFileSync(activeWorkflowPath, "utf-8")
    : undefined;
  const activeWorkflowMatchesResolved =
    activeWorkflowContent === expectedWorkflowContent;
  const activeWorkflowWasWritten = writtenPaths.has(PATHS.WORKFLOW_GUIDE_FILE);
  const fullInitMayClaimMatchingWorkflow =
    isFirstInit || options.force === true || fullReinitRequested;
  const shouldTransferWorkflowOwnership =
    activeWorkflowMatchesResolved &&
    (activeWorkflowWasWritten || fullInitMayClaimMatchingWorkflow);

  if (shouldTransferWorkflowOwnership) {
    updateHashes(
      cwd,
      new Map([[PATHS.WORKFLOW_GUIDE_FILE, expectedWorkflowContent]]),
    );
    const activeBeforeSelection = fs.readFileSync(activeWorkflowPath, "utf-8");
    if (activeBeforeSelection === expectedWorkflowContent) {
      try {
        saveBundledWorkflowSelection(cwd, RESEARCH_WORKFLOW_ID);
      } catch (error) {
        restorePreviousWorkflowHash();
        throw error;
      }
    } else {
      restorePreviousWorkflowHash();
    }
  } else {
    restorePreviousWorkflowHash();
  }
}

async function createRootFiles(cwd: string): Promise<void> {
  const agentsPath = path.join(cwd, FILE_NAMES.AGENTS);
  let content = agentsMdContent;

  if (fs.existsSync(agentsPath)) {
    const existing = fs.readFileSync(agentsPath, "utf-8");
    const startMarker = "<!-- TRELLIS:START -->";
    const endMarker = "<!-- TRELLIS:END -->";
    const existingStart = existing.indexOf(startMarker);
    const existingEnd = existing.indexOf(endMarker, Math.max(existingStart, 0));
    const templateStart = agentsMdContent.indexOf(startMarker);
    const templateEnd = agentsMdContent.indexOf(endMarker, templateStart);

    if ((existingStart === -1) !== (existingEnd === -1)) {
      console.warn(
        "Warning: preserving AGENTS.md because its Trellis managed block is malformed.",
      );
      return;
    }
    const templateBlock = agentsMdContent.slice(
      templateStart,
      templateEnd + endMarker.length,
    );
    if (existingStart >= 0 && existingEnd >= 0) {
      content =
        existing.slice(0, existingStart) +
        templateBlock +
        existing.slice(existingEnd + endMarker.length);
    } else {
      content = `${existing.replace(/\s+$/, "")}\n\n${templateBlock}\n`;
    }
  }

  const agentsWritten = await writeFile(agentsPath, content);
  if (agentsWritten) {
    console.log(chalk.blue("📄 Created AGENTS.md"));
  }
}
