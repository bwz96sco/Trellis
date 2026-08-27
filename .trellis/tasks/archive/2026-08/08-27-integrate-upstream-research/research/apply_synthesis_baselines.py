from pathlib import Path
import csv
import subprocess

root = Path.cwd().resolve()
task_research = root / ".trellis/tasks/08-27-integrate-upstream-research/research"
with (task_research / "merge-path-decisions.tsv").open(
    encoding="utf-8", newline=""
) as handle:
    decisions = {
        row["path"]: row for row in csv.DictReader(handle, delimiter="\t")
    }

unmerged = {
    line
    for line in subprocess.check_output(
        ["git", "diff", "--name-only", "--diff-filter=U"], text=True
    ).splitlines()
    if line
}
actions: list[str] = []
for path in sorted(unmerged):
    row = decisions.get(path)
    if row is None:
        raise RuntimeError(f"unclassified conflict: {path}")
    disposition = row["disposition"]
    if disposition == "synthesize":
        source = "HEAD"
        action = "research-baseline-for-synthesis"
    elif disposition == "accept-upstream":
        source = "MERGE_HEAD"
        action = "upstream-baseline"
    else:
        raise RuntimeError(
            f"unexpected unresolved disposition {disposition}: {path}"
        )
    exists = (
        subprocess.run(
            ["git", "cat-file", "-e", f"{source}:{path}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        ).returncode
        == 0
    )
    if exists:
        subprocess.run(["git", "checkout", source, "--", path], check=True)
        subprocess.run(["git", "add", "--", path], check=True)
    else:
        subprocess.run(
            ["git", "rm", "-f", "--ignore-unmatch", "--", path], check=True
        )
    actions.append(f"{action}\t{path}")

(task_research / "synthesis-baseline-actions.tsv").write_text(
    "action\tpath\n" + "\n".join(actions) + "\n", encoding="utf-8"
)
print(f"applied={len(actions)}")
