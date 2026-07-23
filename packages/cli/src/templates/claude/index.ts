/** Exact Claude Code templates for the active Research payload. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readTemplate(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), "utf-8");
}

export const settingsTemplate = readTemplate("settings.json");

export interface AgentTemplate {
  name: string;
  content: string;
}

export interface SettingsTemplate {
  targetPath: string;
  content: string;
}

/** Load the only Claude agent in the active Research payload. */
export function getResearchWorkerTemplate(): AgentTemplate {
  const name = "trellis-research-worker";
  try {
    return { name, content: readTemplate(`agents/${name}.md`) };
  } catch (cause) {
    throw new Error(
      `Missing required Claude Research worker template: agents/${name}.md`,
      { cause },
    );
  }
}

export function getSettingsTemplate(): SettingsTemplate {
  return {
    targetPath: "settings.json",
    content: settingsTemplate,
  };
}

/** Load the optional Claude-only Research status line hook. */
export function getStatuslineHook(): string {
  return readTemplate("hooks/statusline.py");
}
