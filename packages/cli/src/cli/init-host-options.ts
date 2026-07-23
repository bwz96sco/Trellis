import type { Command } from "commander";

/** Register the current host-selection options for `trellis init`. */
export function registerInitHostOptions(command: Command): Command {
  return command
    .option("--claude", "Include Claude Code commands")
    .option("--codex", "Include Codex skills")
    .option(
      "--with-statusline",
      "Install the Trellis statusLine for Claude Code (off by default)",
    );
}
