"""CLI adapter for the current Claude Code and Codex integrations."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal, cast

Platform = Literal["claude", "codex"]


@dataclass
class CLIAdapter:
    """Adapter for a current AI coding CLI tool."""

    platform: Platform

    def get_agent_name(self, agent: str) -> str:
        """Return the current platform's agent name."""
        return agent

    @property
    def config_dir_name(self) -> str:
        """Return the platform-specific config directory name."""
        if self.platform == "codex":
            return ".codex"
        return ".claude"

    def get_config_dir(self, project_root: Path) -> Path:
        """Return the platform-specific config directory."""
        return project_root / self.config_dir_name

    def get_agent_path(self, agent: str, project_root: Path) -> Path:
        """Return the platform-specific agent definition path."""
        extension = ".toml" if self.platform == "codex" else ".md"
        return self.get_config_dir(project_root) / "agents" / f"{agent}{extension}"

    def get_commands_path(self, project_root: Path, *parts: str) -> Path:
        """Return a Claude command path or Codex shared-skill path."""
        if self.platform == "codex":
            root = project_root / ".agents" / "skills"
            if not parts:
                return root
            if len(parts) >= 2 and parts[0] == "trellis":
                name = parts[-1].removesuffix(".md")
                return root / f"trellis-{name}" / "SKILL.md"
            return root / Path(*parts)

        root = self.get_config_dir(project_root) / "commands"
        return root if not parts else root / Path(*parts)

    def get_trellis_command_path(self, name: str) -> str:
        """Return a current platform command/skill path."""
        if self.platform == "codex":
            return f".agents/skills/trellis-{name}/SKILL.md"
        return f".claude/commands/trellis/{name}.md"

    def get_non_interactive_env(self) -> dict[str, str]:
        """Return environment variables for non-interactive mode."""
        if self.platform == "codex":
            return {"CODEX_NON_INTERACTIVE": "1"}
        return {"CLAUDE_NON_INTERACTIVE": "1"}

    def build_run_command(
        self,
        agent: str,
        prompt: str,
        session_id: str | None = None,
        skip_permissions: bool = True,
        verbose: bool = True,
        json_output: bool = True,
    ) -> list[str]:
        """Build a non-interactive current-platform agent command."""
        if self.platform == "codex":
            return ["codex", "exec", prompt]

        cmd = ["claude", "-p", "--agent", agent]
        if session_id:
            cmd.extend(["--session-id", session_id])
        if skip_permissions:
            cmd.append("--dangerously-skip-permissions")
        if json_output:
            cmd.extend(["--output-format", "stream-json"])
        if verbose:
            cmd.append("--verbose")
        cmd.append(prompt)
        return cmd

    def build_resume_command(self, session_id: str) -> list[str]:
        """Build a current-platform resume command."""
        if self.platform == "codex":
            return ["codex", "resume", session_id]
        return ["claude", "--resume", session_id]

    def get_resume_command_str(self, session_id: str, cwd: str | None = None) -> str:
        """Return a human-readable resume command."""
        command = " ".join(self.build_resume_command(session_id))
        return f"cd {cwd} && {command}" if cwd else command

    @property
    def is_claude(self) -> bool:
        return self.platform == "claude"

    @property
    def cli_name(self) -> str:
        return "codex" if self.platform == "codex" else "claude"

    @property
    def supports_cli_agents(self) -> bool:
        return True

    @property
    def requires_agent_definition_file(self) -> bool:
        return self.platform == "claude"

    @property
    def supports_session_id_on_create(self) -> bool:
        return self.platform == "claude"

    def extract_session_id_from_log(self, log_content: str) -> str | None:
        """Current integrations do not recover session IDs from logs."""
        return None


def get_cli_adapter(platform: str = "claude") -> CLIAdapter:
    """Return an adapter for Claude Code or Codex."""
    if platform not in ("claude", "codex"):
        raise ValueError(
            f"Unsupported platform: {platform} (must be 'claude' or 'codex')"
        )
    return CLIAdapter(platform=cast(Platform, platform))


_ALL_PLATFORM_CONFIG_DIRS = (".claude", ".codex")


def detect_platform(project_root: Path) -> Platform:
    """Detect Claude Code or Codex from explicit environment/current roots.

    ``.agents/skills`` is a shared Codex output and is intentionally not a
    platform signal. Claude keeps deterministic priority when both roots exist.
    """
    import os

    env_platform = os.environ.get("TRELLIS_PLATFORM", "").strip().lower()
    if env_platform:
        normalized = "claude" if env_platform == "claude-code" else env_platform
        if normalized not in ("claude", "codex"):
            raise ValueError(
                f"Unsupported TRELLIS_PLATFORM: {env_platform} "
                "(must be 'claude', 'claude-code', or 'codex')"
            )
        return cast(Platform, normalized)
    if (project_root / ".claude").is_dir():
        return "claude"
    if (project_root / ".codex").is_dir():
        return "codex"
    return "claude"


def get_cli_adapter_auto(project_root: Path) -> CLIAdapter:
    """Return an adapter for the detected current platform."""
    return CLIAdapter(platform=detect_platform(project_root))
