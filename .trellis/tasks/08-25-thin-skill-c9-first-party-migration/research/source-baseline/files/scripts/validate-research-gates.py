#!/usr/bin/env python3
"""Validate lean H1/H2 human gates for a research idea workspace."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


ID = re.compile(r"^[PBC][1-9][0-9]*$")
HEADING_ID = re.compile(r"(?m)^##\s+(C[1-9][0-9]*)\b")


def frontmatter(path: Path) -> tuple[dict[str, str], str]:
    if not path.is_file():
        raise ValueError(f"missing {path.name}")
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{path.name}: missing frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ValueError(f"{path.name}: unterminated frontmatter")
    fields: dict[str, str] = {}
    for number, raw in enumerate(text[4:end].splitlines(), start=2):
        if not raw.strip():
            continue
        if ":" not in raw:
            raise ValueError(f"{path.name}:{number}: malformed frontmatter")
        key, value = raw.split(":", 1)
        key = key.strip()
        if not key or key in fields:
            raise ValueError(f"{path.name}:{number}: duplicate or empty field")
        fields[key] = value.strip().strip('"\'')
    return fields, text[end + 5 :]


def id_list(value: str, prefix: str, label: str) -> set[str]:
    if value.strip().lower() == "none":
        return set()
    values = {item.strip() for item in value.split(",") if item.strip()}
    if not values or any(not ID.fullmatch(item) or not item.startswith(prefix) for item in values):
        raise ValueError(f"{label}: expected comma-separated {prefix} IDs or none")
    return values


def table_rows(text: str, heading: str) -> list[list[str]]:
    match = re.search(rf"(?im)^##\s+{re.escape(heading)}\s*$", text)
    if not match:
        raise ValueError(f"missing section: {heading}")
    tail = text[match.end() :]
    next_heading = re.search(r"(?m)^##\s+", tail)
    section = tail[: next_heading.start()] if next_heading else tail
    rows: list[list[str]] = []
    for raw in section.splitlines():
        if not raw.strip().startswith("|"):
            continue
        cells = [cell.strip() for cell in raw.strip().strip("|").split("|")]
        if cells and not all(re.fullmatch(r":?-+:?", cell) for cell in cells):
            rows.append(cells)
    if len(rows) < 2:
        raise ValueError(f"{heading}: missing table rows")
    return rows


def require_section_text(text: str, heading: str, label: str) -> None:
    match = re.search(rf"(?im)^##\s+{re.escape(heading)}\s*$", text)
    if not match:
        raise ValueError(f"{label}: missing {heading} section")
    tail = text[match.end() :]
    next_heading = re.search(r"(?m)^##\s+", tail)
    content = tail[: next_heading.start()] if next_heading else tail
    if not content.strip():
        raise ValueError(f"{label}: {heading} section is empty")


def opportunity_ids(root: Path) -> tuple[set[str], set[str]]:
    path = root / "opportunity_board.md"
    if not path.is_file():
        raise ValueError("missing opportunity_board.md")
    text = path.read_text(encoding="utf-8")
    rows = table_rows(text, "Opportunity Board")
    header = [cell.lower() for cell in rows[0]]
    if not header or header[0] != "id":
        raise ValueError("opportunity_board.md: first table column must be ID")
    found: list[str] = []
    for row in rows[1:]:
        if row and ID.fullmatch(row[0]) and row[0][0] in {"P", "B"}:
            found.append(row[0])
    if not found:
        raise ValueError("opportunity_board.md: no P/B opportunity IDs")
    if len(found) != len(set(found)):
        raise ValueError("opportunity_board.md: duplicate opportunity ID")
    return ({item for item in found if item.startswith("P")}, {item for item in found if item.startswith("B")})


def approved_h1(root: Path) -> set[str]:
    problems, bridges = opportunity_ids(root)
    fields, body = frontmatter(root / "h1_decision.md")
    required = {
        "decision_status",
        "decision_recorded_by",
        "approved_problem_ids",
        "approved_bridge_ids",
    }
    missing = sorted(required - set(fields))
    if missing:
        raise ValueError(f"h1_decision.md: missing fields {missing}")
    if fields["decision_status"] != "approved":
        raise ValueError("h1_decision.md: decision_status is not approved")
    if fields["decision_recorded_by"] != "human_confirmed":
        raise ValueError("h1_decision.md: decision_recorded_by must be human_confirmed")
    approved_problems = id_list(fields["approved_problem_ids"], "P", "approved_problem_ids")
    approved_bridges = id_list(fields["approved_bridge_ids"], "B", "approved_bridge_ids")
    approved = approved_problems | approved_bridges
    if not approved:
        raise ValueError("h1_decision.md: approved decision needs at least one approved ID")
    unknown = (approved_problems - problems) | (approved_bridges - bridges)
    if unknown:
        raise ValueError(f"h1_decision.md: unknown opportunity IDs {sorted(unknown)}")
    require_section_text(body, "Human Decision", "h1_decision.md")
    return approved


def candidate_coverage(root: Path, approved: set[str]) -> set[str]:
    path = root / "ideas.md"
    if not path.is_file():
        raise ValueError("missing ideas.md")
    text = path.read_text(encoding="utf-8")
    heading_ids = HEADING_ID.findall(text)
    if not heading_ids or len(heading_ids) != len(set(heading_ids)):
        raise ValueError("ideas.md: candidate headings must use unique C IDs")
    rows = table_rows(text, "Approved Opportunity Coverage")
    if [cell.lower() for cell in rows[0]][:2] != ["candidate id", "approved ids"]:
        raise ValueError("ideas.md: coverage columns must be Candidate ID and Approved IDs")
    coverage: dict[str, set[str]] = {}
    for row in rows[1:]:
        if len(row) < 2 or not re.fullmatch(r"C[1-9][0-9]*", row[0]):
            raise ValueError("ideas.md: malformed candidate coverage row")
        if row[0] in coverage:
            raise ValueError(f"ideas.md: duplicate coverage for {row[0]}")
        values = {item.strip() for item in row[1].split(",") if item.strip()}
        if not values:
            raise ValueError(f"ideas.md: {row[0]} has no approved opportunity")
        unknown = values - approved
        if unknown:
            raise ValueError(f"ideas.md: {row[0]} cites unapproved IDs {sorted(unknown)}")
        coverage[row[0]] = values
    if set(heading_ids) != set(coverage):
        raise ValueError("ideas.md: candidate headings and coverage IDs disagree")
    return set(coverage)


def approved_h2(root: Path) -> set[str]:
    candidates = candidate_coverage(root, approved_h1(root))
    fields, body = frontmatter(root / "h2_decision.md")
    required = {"decision_status", "decision_recorded_by", "approved_candidate_ids"}
    missing = sorted(required - set(fields))
    if missing:
        raise ValueError(f"h2_decision.md: missing fields {missing}")
    if fields["decision_status"] != "approved":
        raise ValueError("h2_decision.md: decision_status is not approved")
    if fields["decision_recorded_by"] != "human_confirmed":
        raise ValueError("h2_decision.md: decision_recorded_by must be human_confirmed")
    approved = id_list(fields["approved_candidate_ids"], "C", "approved_candidate_ids")
    if not approved:
        raise ValueError("h2_decision.md: approved decision needs at least one candidate")
    unknown = approved - candidates
    if unknown:
        raise ValueError(f"h2_decision.md: unknown candidate IDs {sorted(unknown)}")
    require_section_text(body, "Human Decision", "h2_decision.md")
    return approved


def validate_closure(root: Path) -> None:
    approved = approved_h2(root)
    attacks_root = root / "attacks"
    attacks = {path.stem for path in attacks_root.glob("*.md")} if attacks_root.is_dir() else set()
    if attacks != approved:
        raise ValueError(
            f"attacks: expected exactly {sorted(approved)}, found {sorted(attacks)}"
        )
    fields, body = frontmatter(root / "decision.md")
    required = {"decision_status", "selected_candidate_id"}
    missing = sorted(required - set(fields))
    if missing:
        raise ValueError(f"decision.md: missing fields {missing}")
    status = fields["decision_status"]
    selected_raw = fields["selected_candidate_id"]
    selected = None if selected_raw == "none" else selected_raw
    if status not in {"selected", "blocked"}:
        raise ValueError("decision.md: decision_status must be selected or blocked")
    if selected is not None and selected not in approved:
        raise ValueError("decision.md: selected candidate was not H2-approved")
    rows = table_rows(body, "Candidate Dispositions")
    if [cell.lower() for cell in rows[0]][:3] != ["candidate id", "disposition", "reason"]:
        raise ValueError("decision.md: disposition columns must be Candidate ID, Disposition, Reason")
    dispositions: dict[str, str] = {}
    for row in rows[1:]:
        if len(row) < 3 or row[0] not in approved or not row[2]:
            raise ValueError("decision.md: malformed or out-of-scope disposition row")
        if row[0] in dispositions or row[1] not in {"selected", "rejected", "fatal", "blocked"}:
            raise ValueError("decision.md: duplicate candidate or invalid disposition")
        dispositions[row[0]] = row[1]
    if set(dispositions) != approved:
        raise ValueError("decision.md: every approved candidate needs one disposition")
    selected_rows = {candidate for candidate, value in dispositions.items() if value == "selected"}
    if status == "selected" and (selected is None or selected_rows != {selected}):
        raise ValueError("decision.md: selected status needs one matching selected row")
    if status == "blocked" and (selected is not None or selected_rows):
        raise ValueError("decision.md: blocked status cannot select a candidate")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("--gate", choices=("h1", "h2", "closure"), required=True)
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        if args.gate == "h1":
            approved_h1(root)
        elif args.gate == "h2":
            approved_h2(root)
        else:
            validate_closure(root)
    except (OSError, ValueError) as exc:
        print(f"FAIL {exc}")
        return 1
    print(f"OK research gate {args.gate}: {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
