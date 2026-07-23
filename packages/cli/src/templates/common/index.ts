/**
 * Exact shared templates for the active Research payload.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CommonBundledSkillFile {
  /** POSIX path relative to the skill directory, e.g. "references/core.md" */
  relativePath: string;
  /** Raw content with {{placeholders}} — must be resolved before writing */
  content: string;
}

export interface CommonBundledSkill {
  /** Skill directory name, e.g. "trellis-research-literature" */
  name: string;
  /** Files that must be written under the skill directory */
  files: CommonBundledSkillFile[];
}

export const RESEARCH_STAGE_SKILL_NAMES = [
  "trellis-research-audit",
  "trellis-research-computation",
  "trellis-research-experiment",
  "trellis-research-ideation",
  "trellis-research-literature",
  "trellis-research-quest",
  "trellis-research-setup",
  "trellis-research-theory",
  "trellis-research-writing",
] as const;

let cachedResearchStageSkills: CommonBundledSkill[] | undefined;

function toPosixRelativePath(root: string, filePath: string): string {
  return relative(root, filePath).split(sep).join("/");
}

function listBundledSkillFiles(skillDir: string): CommonBundledSkillFile[] {
  const root = join(__dirname, "bundled-skills", skillDir);
  const files: CommonBundledSkillFile[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        files.push({
          relativePath: toPosixRelativePath(root, fullPath),
          content: readFileSync(fullPath, "utf-8"),
        });
      }
    }
  }

  walk(root);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/** Load exactly the nine required Research stage skill bundles. */
export function getResearchStageSkillTemplates(): CommonBundledSkill[] {
  cachedResearchStageSkills ??= RESEARCH_STAGE_SKILL_NAMES.map((name) => {
    try {
      const files = listBundledSkillFiles(name);
      if (!files.some((file) => file.relativePath === "SKILL.md")) {
        throw new Error("required SKILL.md is missing");
      }
      return { name, files };
    } catch (cause) {
      throw new Error(
        `Missing required Research stage skill template: bundled-skills/${name}/SKILL.md`,
        { cause },
      );
    }
  });
  return cachedResearchStageSkills;
}
