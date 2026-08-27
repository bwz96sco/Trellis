from pathlib import Path
import csv
import subprocess

root = Path.cwd().resolve()
task_research = root / ".trellis/tasks/08-27-integrate-upstream-research/research"
decisions = task_research / "merge-path-decisions.tsv"
actions: list[str] = []

with decisions.open(encoding="utf-8", newline="") as handle:
    rows = list(csv.DictReader(handle, delimiter="\t"))

for row in rows:
    if row["disposition"] != "preserve-research":
        continue
    path = row["path"]
    target = (root / path).resolve()
    if not target.is_relative_to(root):
        raise RuntimeError(f"unsafe decision path: {path}")
    exists_in_research = (
        subprocess.run(
            ["git", "cat-file", "-e", f"HEAD:{path}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        ).returncode
        == 0
    )
    if exists_in_research:
        subprocess.run(["git", "checkout", "HEAD", "--", path], check=True)
        subprocess.run(["git", "add", "--", path], check=True)
        actions.append(f"restore\t{path}")
    else:
        subprocess.run(
            ["git", "rm", "-f", "--ignore-unmatch", "--", path], check=True
        )
        actions.append(f"delete\t{path}")

(task_research / "preserve-actions.tsv").write_text(
    "action\tpath\n" + "\n".join(actions) + "\n", encoding="utf-8"
)
print(f"applied={len(actions)}")
