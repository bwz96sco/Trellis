import type { PlatformConfigureOptions } from "./shared.js";
import { writeResearchPlatformPayload } from "./research-payload.js";

/** Configure the exact current Claude Code Research payload. */
export async function configureClaude(
  cwd: string,
  options?: PlatformConfigureOptions,
): Promise<void> {
  await writeResearchPlatformPayload("claude-code", cwd, options);
}
