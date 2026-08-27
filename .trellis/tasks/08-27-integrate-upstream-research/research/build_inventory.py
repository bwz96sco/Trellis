from pathlib import Path
import subprocess

BASE = "51a5674ce6ce5a12cb585c5dcb21e7b76a51bdbc"
RESEARCH = "f2f4e5259dceeb2ae7ed1019024eca826eb52aaa"
UPSTREAM = "64e663694201005bc87766ef22de89b8da3d4d79"
out = Path(__file__).parent


def names(a: str, b: str, diff_filter: str | None = None) -> set[str]:
    command = ["git", "diff", "--name-only"]
    if diff_filter:
        command.append(f"--diff-filter={diff_filter}")
    command.extend([a, b])
    return {
        line
        for line in subprocess.check_output(command, text=True).splitlines()
        if line
    }


research = names(BASE, RESEARCH)
upstream = names(BASE, UPSTREAM)
overlap = research & upstream
upstream_only = upstream - research
research_only = research - upstream
upstream_additions = names(BASE, UPSTREAM, "A")
active_prefixes = (
    ".trellis/scripts/",
    ".trellis/spec/",
    "packages/cli/",
    "packages/core/",
    "package.json",
    "pnpm-lock.yaml",
    ".github/workflows/",
    ".gitmodules",
    "docs-site",
    "marketplace",
)
active_additions = {
    path for path in upstream_additions if path.startswith(active_prefixes)
}
active_upstream_only = {
    path for path in upstream_only if path.startswith(active_prefixes)
}
manual_review_paths = {
    ".pi/prompts/trellis-start.md",
    "packages/cli/test/fixtures/workflows/native-v0.6.7.md",
}


def classify(path: str) -> tuple[str, str]:
    generic_command = (
        "packages/cli/src/commands/channel/",
        "packages/cli/src/commands/mem.ts",
        "packages/cli/src/commands/workflow.ts",
        "packages/cli/src/commands/platforms.ts",
    )
    generic_tests = (
        "packages/cli/test/commands/channel",
        "packages/cli/test/commands/mem",
        "packages/cli/test/commands/workflow",
        "packages/cli/test/commands/platforms",
        "packages/cli/test/scripts/",
        "packages/cli/test/templates/dsh",
        "packages/cli/test/templates/kimi",
        "packages/cli/test/templates/omp",
        "packages/cli/test/templates/opencode",
        "packages/cli/test/templates/pi",
        "packages/cli/test/templates/snow",
        "packages/cli/test/templates/trae",
    )
    generic_configurators = {
        f"packages/cli/src/configurators/{name}.ts"
        for name in (
            "antigravity",
            "codebuddy",
            "copilot",
            "cursor",
            "devin",
            "droid",
            "dsh",
            "gemini",
            "grok",
            "kilo",
            "kimi",
            "kiro",
            "omp",
            "opencode",
            "pi",
            "qoder",
            "reasonix",
            "snow",
            "trae",
            "workflow",
            "zcode",
        )
    }
    generic_template_prefixes = (
        "packages/cli/src/templates/codebuddy/",
        "packages/cli/src/templates/copilot/",
        "packages/cli/src/templates/cursor/",
        "packages/cli/src/templates/droid/",
        "packages/cli/src/templates/dsh/",
        "packages/cli/src/templates/gemini/",
        "packages/cli/src/templates/grok/",
        "packages/cli/src/templates/kimi/",
        "packages/cli/src/templates/kiro/",
        "packages/cli/src/templates/omp/",
        "packages/cli/src/templates/opencode/",
        "packages/cli/src/templates/pi/",
        "packages/cli/src/templates/qoder/",
        "packages/cli/src/templates/reasonix/",
        "packages/cli/src/templates/snow/",
        "packages/cli/src/templates/trae/",
        "packages/cli/src/templates/zcode/",
        "packages/cli/src/templates/codex/skills/",
        "packages/cli/src/templates/common/commands/",
        "packages/cli/src/templates/common/skills/",
        "packages/cli/src/templates/common/bundled-skills/",
        "packages/cli/src/templates/trellis/agents/",
        "packages/cli/src/templates/trellis/scripts/",
        "packages/cli/src/templates/trellis/tasks/",
    )
    generic_exact = {
        "packages/cli/src/templates/trellis/workflow.md",
        "packages/cli/src/templates/codex/hooks/session-start.py",
        "packages/cli/src/templates/codex/agents/trellis-check.toml",
        "packages/cli/src/templates/codex/agents/trellis-implement.toml",
        "packages/cli/src/templates/codex/agents/trellis-research.toml",
        "packages/cli/src/templates/claude/agents/trellis-check.md",
        "packages/cli/src/templates/claude/agents/trellis-implement.md",
        "packages/cli/src/templates/claude/agents/trellis-research.md",
        "packages/cli/src/templates/template-utils.ts",
        "packages/cli/src/utils/template-fetcher.ts",
        "packages/cli/src/templates/trellis/gitattributes.txt",
        "packages/cli/src/templates/shared-hooks/inject-shell-session-context.py",
        "packages/cli/test/fixtures/workflows/native-v0.6.7.md",
        "packages/cli/test/regression.test.ts",
        ".pi/prompts/trellis-start.md",
    }
    inactive_specs = (
        ".trellis/spec/cli/backend/commands-channel.md",
        ".trellis/spec/cli/backend/commands-platforms.md",
        ".trellis/spec/cli/backend/commands-workflow.md",
    )
    if path.startswith(generic_command) or path.startswith(generic_tests):
        return (
            "preserve-research",
            "retired generic CLI/test surface must remain absent",
        )
    if (
        path in generic_configurators
        or path.startswith(generic_template_prefixes)
        or path in generic_exact
    ):
        return (
            "preserve-research",
            "retired host/template surface must remain absent from source and tarball",
        )
    if path.startswith(inactive_specs):
        return (
            "preserve-research",
            "Research fork must not document retired command as active",
        )
    if path in {
        "packages/cli/src/cli/index.ts",
        "packages/cli/src/types/ai-tools.ts",
        "packages/cli/src/templates/trellis/index.ts",
    }:
        return (
            "preserve-research",
            "exact five-command/two-host/reduced-template boundary",
        )
    if path.startswith(".trellis/spec/") or path in {
        ".github/workflows/publish.yml",
        ".trellis/scripts/common/cli_adapter.py",
        ".trellis/workflow.md",
        "packages/cli/src/templates/claude/hooks/statusline.py",
        "packages/cli/src/templates/codex/config.toml",
        "packages/cli/src/templates/codex/hooks.json",
        "packages/cli/src/templates/codex/index.ts",
        "packages/cli/src/templates/trellis/config.yaml",
        "packages/cli/test/templates/trellis.test.ts",
    }:
        return (
            "synthesize",
            "combine upstream contract or safety change with reduced Research surface",
        )
    synth_prefixes = (
        ".trellis/scripts/common/active_task.py",
        ".trellis/scripts/common/task_store.py",
        ".trellis/scripts/common/workflow_phase.py",
        "packages/cli/src/templates/trellis/scripts/common/active_task.py",
        "packages/cli/src/templates/trellis/scripts/common/task_store.py",
        "packages/cli/src/templates/trellis/scripts/common/workflow_phase.py",
        "packages/cli/src/templates/shared-hooks/",
        "packages/cli/src/commands/init.ts",
        "packages/cli/src/commands/update.ts",
        "packages/cli/src/commands/upgrade.ts",
        "packages/cli/src/commands/uninstall.ts",
        "packages/cli/src/configurators/claude.ts",
        "packages/cli/src/configurators/codex.ts",
        "packages/cli/src/configurators/index.ts",
        "packages/cli/src/configurators/shared.ts",
        "packages/cli/src/configurators/research-payload.ts",
        "packages/cli/src/migrations/",
        "packages/cli/src/legacy/",
        "packages/cli/src/utils/manifest-prune.ts",
        "packages/cli/src/utils/protected-paths.ts",
        "packages/cli/src/utils/safe-delete-path.ts",
        "packages/cli/scripts/packed-cli-audit.js",
        "packages/cli/scripts/release-preflight.js",
        "packages/cli/scripts/copy-templates.js",
        "package.json",
        "packages/cli/package.json",
        "packages/core/package.json",
        "pnpm-lock.yaml",
    )
    if path.startswith(synth_prefixes):
        return (
            "synthesize",
            "combine upstream fix with Research authority and distribution contract",
        )
    if path.startswith("packages/cli/test/") and any(
        token in path
        for token in (
            "init",
            "update",
            "uninstall",
            "configurator",
            "shared-hooks",
            "codex",
            "registry",
            "regression",
            "research",
        )
    ):
        return (
            "synthesize",
            "retain Research assertions while adding compatible upstream regression coverage",
        )
    return (
        "accept-upstream",
        "no active Research boundary match; verify during semantic review",
    )


for name, values in (
    ("research-changed-paths.txt", research),
    ("upstream-changed-paths.txt", upstream),
    ("changed-on-both-paths.txt", overlap),
    ("upstream-only-paths.txt", upstream_only),
    ("research-only-paths.txt", research_only),
    ("upstream-active-additions.txt", active_additions),
    ("upstream-active-only-paths.txt", active_upstream_only),
):
    (out / name).write_text(
        "".join(f"{path}\n" for path in sorted(values)), encoding="utf-8"
    )

rows = []
for path in sorted(overlap | active_upstream_only | manual_review_paths):
    if path in overlap:
        source = "overlap"
    elif path in upstream_additions:
        source = "upstream-addition"
    else:
        source = "upstream-only"
    disposition, reason = classify(path)
    rows.append((source, disposition, path, reason))
(out / "merge-path-decisions.tsv").write_text(
    "source\tdisposition\tpath\treason\n"
    + "".join("\t".join(row) + "\n" for row in rows),
    encoding="utf-8",
)
summary = {
    "research_changed": len(research),
    "upstream_changed": len(upstream),
    "overlap": len(overlap),
    "upstream_only": len(upstream_only),
    "research_only": len(research_only),
    "upstream_additions": len(upstream_additions),
    "active_additions": len(active_additions),
    "active_upstream_only": len(active_upstream_only),
    "review_rows": len(rows),
}
counts: dict[str, int] = {}
for _, disposition, _, _ in rows:
    counts[disposition] = counts.get(disposition, 0) + 1
(out / "inventory-summary.txt").write_text(
    "\n".join(f"{key}={value}" for key, value in summary.items())
    + "\n"
    + "\n".join(
        f"decision_{key}={value}" for key, value in sorted(counts.items())
    )
    + "\n",
    encoding="utf-8",
)
print(summary)
print(counts)
