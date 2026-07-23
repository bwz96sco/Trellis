/**
 * AI Tool Types and Registry
 *
 * Defines the currently supported AI coding tools and their template metadata.
 */

/** Supported AI coding tools. */
export type AITool = "claude-code" | "codex";

/** Template directory categories used by current hosts. */
export type TemplateDir = "common" | "claude" | "codex";

/** CLI flag names for current platform selection. */
export type CliFlag = "claude" | "codex";

/**
 * Template context for placeholder resolution.
 * Controls how common templates are rendered per platform.
 */
export interface TemplateContext {
  /** Prefix for cross-referencing other commands/skills */
  cmdRefPrefix: "/trellis:" | "/trellis-" | "$" | "/" | "/skill trellis-";
  /** Description of AI executor actions shown in role tables */
  executorAI:
    | "Bash scripts or Task calls"
    | "Bash scripts or tool calls"
    | "Bash scripts or Agent calls"
    | "Bash scripts or file reads";
  /** Label for user-invocable actions */
  userActionLabel:
    | "Slash commands"
    | "Skills"
    | "Workflows"
    | "Prompts"
    | "Commands";
  /** Platform supports spawning sub-agents with isolated context */
  agentCapable: boolean;
  /** Platform has hook system (SessionStart, PreToolUse) */
  hasHooks: boolean;
  /** CLI flag value substituted into rendered templates. */
  cliFlag: CliFlag;
}

/** Configuration for a current AI tool. */
export interface AIToolConfig {
  /** Display name of the tool */
  name: string;
  /** Command template directory names to include */
  templateDirs: TemplateDir[];
  /** Platform-specific config directory in the project root */
  configDir: string;
  /** Whether the platform owns the shared `.agents/skills/` layer */
  supportsAgentSkills?: boolean;
  /** Additional current managed paths beyond configDir */
  extraManagedPaths?: string[];
  /** CLI flag name for platform selection */
  cliFlag: CliFlag;
  /** Whether this tool is checked by default during init */
  defaultChecked: boolean;
  /** Whether this tool uses Python hooks */
  hasPythonHooks: boolean;
  /** Placeholder-resolution context */
  templateContext: TemplateContext;
}

/** Registry of current AI tools. */
export const AI_TOOLS: Record<AITool, AIToolConfig> = {
  "claude-code": {
    name: "Claude Code",
    templateDirs: ["common", "claude"],
    configDir: ".claude",
    cliFlag: "claude",
    defaultChecked: true,
    hasPythonHooks: true,
    templateContext: {
      cmdRefPrefix: "/trellis:",
      executorAI: "Bash scripts or Task calls",
      userActionLabel: "Slash commands",
      agentCapable: true,
      hasHooks: true,
      cliFlag: "claude",
    },
  },
  codex: {
    name: "Codex",
    templateDirs: ["common", "codex"],
    configDir: ".codex",
    supportsAgentSkills: true,
    cliFlag: "codex",
    defaultChecked: false,
    hasPythonHooks: true,
    templateContext: {
      cmdRefPrefix: "$",
      executorAI: "Bash scripts or tool calls",
      userActionLabel: "Skills",
      agentCapable: true,
      hasHooks: false,
      cliFlag: "codex",
    },
  },
};

/** Get the configuration for a specific AI tool. */
export function getToolConfig(tool: AITool): AIToolConfig {
  return AI_TOOLS[tool];
}

/** Get all managed paths for a specific current tool. */
export function getManagedPaths(tool: AITool): string[] {
  const config = AI_TOOLS[tool];
  const paths = [config.configDir];
  if (config.supportsAgentSkills) {
    paths.push(".agents/skills");
  }
  if (config.extraManagedPaths) {
    paths.push(...config.extraManagedPaths);
  }
  return paths;
}

/** Get template directories for a specific current tool. */
export function getTemplateDirs(tool: AITool): TemplateDir[] {
  return AI_TOOLS[tool].templateDirs;
}
