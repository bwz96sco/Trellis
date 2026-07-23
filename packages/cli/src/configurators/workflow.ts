import path from "node:path";

import { DIR_NAMES, PATHS } from "../constants/paths.js";
import {
  configYamlTemplate,
  gitignoreTemplate,
} from "../templates/trellis/index.js";
import { ensureDir, writeFile } from "../utils/file-writer.js";
import { replacePythonCommandLiterals } from "./shared.js";

/**
 * Create the minimal Research control-plane structure.
 *
 * The caller owns workflow selection and hash state. Canonical Research state is
 * lazy runtime data and is never created or modified here.
 */
export async function createWorkflowStructure(
  cwd: string,
  workflowMd: string,
): Promise<void> {
  ensureDir(path.join(cwd, DIR_NAMES.WORKFLOW));

  await writeFile(
    path.join(cwd, PATHS.WORKFLOW_GUIDE_FILE),
    replacePythonCommandLiterals(workflowMd),
  );
  await writeFile(
    path.join(cwd, DIR_NAMES.WORKFLOW, ".gitignore"),
    gitignoreTemplate,
  );
  await writeFile(
    path.join(cwd, DIR_NAMES.WORKFLOW, "config.yaml"),
    configYamlTemplate,
  );
}
