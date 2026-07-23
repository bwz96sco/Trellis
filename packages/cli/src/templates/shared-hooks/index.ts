/** Shared Python hook templates used by current platforms. */

import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readTemplate(relativePath: string): string {
  return fs.readFileSync(join(__dirname, relativePath), "utf-8");
}

export type SharedHookName =
  | "session-start.py"
  | "inject-workflow-state.py"
  | "inject-subagent-context.py";

export interface HookScript {
  name: SharedHookName;
  content: string;
}

export type SharedHookPlatform = "claude" | "codex";

/** Shared hooks actually registered by each current platform. */
export const SHARED_HOOKS_BY_PLATFORM: Record<
  SharedHookPlatform,
  readonly SharedHookName[]
> = {
  claude: [
    "session-start.py",
    "inject-workflow-state.py",
    "inject-subagent-context.py",
  ],
  codex: ["inject-workflow-state.py"],
};

export function getSharedHookScriptsForPlatform(
  platform: SharedHookPlatform,
): HookScript[] {
  return SHARED_HOOKS_BY_PLATFORM[platform].map((name) => {
    try {
      return { name, content: readTemplate(name) };
    } catch (cause) {
      throw new Error(
        `Missing required ${platform} Research hook template: ${name}`,
        {
          cause,
        },
      );
    }
  });
}
