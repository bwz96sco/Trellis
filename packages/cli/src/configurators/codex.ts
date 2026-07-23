import { writeResearchPlatformPayload } from "./research-payload.js";

/** Configure the exact current Codex Research payload. */
export async function configureCodex(cwd: string): Promise<void> {
  await writeResearchPlatformPayload("codex", cwd);

  if (!process.env.VITEST && !process.env.TRELLIS_QUIET) {
    process.stderr.write(
      "Warning: Codex hooks require `features.hooks = true` in your " +
        "~/.codex/config.toml (Codex 0.129+; older versions: `codex_hooks = true`). " +
        "On Codex 0.129+ also run `/hooks` once to approve the Trellis " +
        "UserPromptSubmit hook.\n",
    );
  }
}
