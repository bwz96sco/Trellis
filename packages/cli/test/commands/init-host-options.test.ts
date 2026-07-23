import { Command, CommanderError } from "commander";
import { describe, expect, it, vi } from "vitest";
import { registerInitHostOptions } from "../../src/cli/init-host-options.js";

function createInitCommand(action = vi.fn()): Command {
  const command = new Command()
    .name("init")
    .exitOverride()
    .configureOutput({
      writeErr: () => undefined,
      writeOut: () => undefined,
    });

  registerInitHostOptions(command).action(action);
  return command;
}

describe("init host options", () => {
  it("registers only Claude Code, Codex, and the Claude statusline option", () => {
    const command = createInitCommand();

    expect(command.options.map((option) => option.long)).toEqual([
      "--claude",
      "--codex",
      "--with-statusline",
    ]);

    const help = command.helpInformation();
    expect(help).toContain("--claude");
    expect(help).toContain("--codex");
    expect(help).toContain("--with-statusline");
    expect(help).not.toContain("--cursor");
    expect(help).not.toContain("--windsurf");
  });

  it.each(["--cursor", "--windsurf"])(
    "rejects retired option %s before running init",
    async (flag) => {
      const action = vi.fn();
      const command = createInitCommand(action);

      await expect(command.parseAsync([flag], { from: "user" })).rejects.toEqual(
        expect.objectContaining<Partial<CommanderError>>({
          code: "commander.unknownOption",
        }),
      );
      expect(action).not.toHaveBeenCalled();
    },
  );
});
