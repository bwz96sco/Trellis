/** Exact Codex templates for the active Research payload. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readTemplate(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), "utf-8");
}

export interface AgentTemplate {
  name: string;
  content: string;
}

export interface ConfigTemplate {
  targetPath: string;
  content: string;
}

/** Load the only Codex agent in the active Research payload. */
export function getResearchWorkerTemplate(): AgentTemplate {
  const name = "trellis-research-worker";
  try {
    return { name, content: readTemplate(`agents/${name}.toml`) };
  } catch (cause) {
    throw new Error(
      `Missing required Codex Research worker template: agents/${name}.toml`,
      { cause },
    );
  }
}

export function getHooksConfig(): string {
  return readTemplate("hooks.json");
}

export function getConfigTemplate(): ConfigTemplate {
  return {
    targetPath: "config.toml",
    content: readTemplate("config.toml"),
  };
}
