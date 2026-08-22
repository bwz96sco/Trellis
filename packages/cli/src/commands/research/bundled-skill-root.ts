import path from "node:path";
import { fileURLToPath } from "node:url";

export function getBundledResearchSkillRoot(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../templates/research/skills",
  );
}
