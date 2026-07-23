import fs from "node:fs";
import path from "node:path";

import { DIR_NAMES } from "../constants/paths.js";

export interface SpecRegistryConfig {
  source: string;
  template?: string;
}

function configPath(cwd: string): string {
  return path.join(cwd, DIR_NAMES.WORKFLOW, "config.yaml");
}

function stripYamlScalar(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/** Read historical registry ownership metadata for manifest compatibility. */
export function loadSpecRegistryConfig(cwd: string): SpecRegistryConfig | null {
  const filePath = configPath(cwd);
  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  let inRegistry = false;
  let inSpec = false;
  let source: string | null = null;
  let template: string | undefined;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (/^registry:\s*$/.test(trimmed)) {
      inRegistry = true;
      inSpec = false;
      continue;
    }

    if (inRegistry && /^\s{2}spec:\s*$/.test(trimmed)) {
      inSpec = true;
      continue;
    }

    if (inRegistry && trimmed !== "" && !trimmed.startsWith(" ")) {
      if (source) return { source, ...(template ? { template } : {}) };
      inRegistry = false;
      inSpec = false;
      continue;
    }

    if (inSpec) {
      const sourceMatch = trimmed.match(/^\s{4}source:\s+(.+)$/);
      if (sourceMatch) {
        source = stripYamlScalar(sourceMatch[1]);
        continue;
      }
      const templateMatch = trimmed.match(/^\s{4}template:\s+(.+)$/);
      if (templateMatch) {
        template = stripYamlScalar(templateMatch[1]);
        continue;
      }
      if (trimmed !== "" && !trimmed.startsWith("    ")) {
        if (source) return { source, ...(template ? { template } : {}) };
        inSpec = false;
      }
    }
  }

  if (source) return { source, ...(template ? { template } : {}) };
  return null;
}
