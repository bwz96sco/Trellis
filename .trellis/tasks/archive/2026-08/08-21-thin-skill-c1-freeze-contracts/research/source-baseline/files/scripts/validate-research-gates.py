#!/usr/bin/env python3
"""Validate lean H1/H2 human gates for a research idea workspace."""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


ID = re.compile(r"^[PBC][1-9][0-9]*$")
HEADING_ID = re.compile(r"(?m)^##\s+(C[1-9][0-9]*)\b")
O_ID = re.compile(
    r"O-[A-Za-z0-9][A-Za-z0-9._-]*-(?:SUB|MOD|INP|XFR|ENV|MET)-[0-9]{2}"
)
CP_ID = re.compile(r"^CP[1-9][0-9]*$")


@dataclass(frozen=True)
class BoardState:
    problems: set[str]
    bridges: set[str]
    problem_dispositions: dict[str, str]
    problem_cap: int | None
    structured: bool
    checkpoint_active: bool


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


def section_text(text: str, heading: str, label: str) -> str:
    match = re.search(rf"(?im)^##\s+{re.escape(heading)}\s*$", text)
    if not match:
        raise ValueError(f"{label}: missing {heading} section")
    tail = text[match.end() :]
    next_heading = re.search(r"(?m)^##\s+", tail)
    content = tail[: next_heading.start()] if next_heading else tail
    if not content.strip():
        raise ValueError(f"{label}: {heading} section is empty")
    return content.strip()


def resolve_source(root: Path, value: str, label: str) -> Path:
    path = Path(value)
    resolved = path.resolve() if path.is_absolute() else (root / path).resolve()
    if not resolved.is_file():
        raise ValueError(f"{label}: missing source {value}")
    return resolved


def positive_cap(value: str, label: str) -> int | None:
    if value == "none":
        return None
    if not re.fullmatch(r"[1-9][0-9]*", value):
        raise ValueError(f"{label}: expected a positive integer or none")
    return int(value)


def checkpoint_state(path: Path) -> tuple[str, int | None, dict[str, str]]:
    fields, body = frontmatter(path)
    missing = sorted({"target_question", "selection_cap"} - set(fields))
    if missing:
        raise ValueError(f"{path.name}: missing fields {missing}")
    rows = table_rows(body, "Current problems")
    header = [cell.lower() for cell in rows[0]]
    if header[:3] != ["checkpoint id", "problem", "disposition"]:
        raise ValueError(f"{path.name}: malformed Current problems header")
    dispositions: dict[str, str] = {}
    for row in rows[1:]:
        if len(row) < 3 or not CP_ID.fullmatch(row[0]):
            raise ValueError(f"{path.name}: malformed checkpoint row")
        if row[0] in dispositions or row[2] not in {"retain", "hold", "reject"}:
            raise ValueError(f"{path.name}: duplicate CP ID or invalid disposition")
        dispositions[row[0]] = row[2]
    return fields["target_question"], positive_cap(fields["selection_cap"], path.name), dispositions


def opportunity_ids(
    root: Path,
    opportunity_index_override: Path | None = None,
    checkpoint_override: Path | None = None,
    checkpoint_cap_override: int | None = None,
) -> BoardState:
    path = root / "opportunity_board.md"
    if not path.is_file():
        raise ValueError("missing opportunity_board.md")
    text = path.read_text(encoding="utf-8")
    structured = text.startswith("---\n")
    fields: dict[str, str] = {}
    body = text
    if structured:
        fields, body = frontmatter(path)
        required = {
            "target_question",
            "source_opportunity_index",
            "active_checkpoint",
            "checkpoint_problem_cap",
        }
        missing = sorted(required - set(fields))
        if missing:
            raise ValueError(f"opportunity_board.md: missing fields {missing}")
    rows = table_rows(body, "Opportunity Board")
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
    problems = {item for item in found if item.startswith("P")}
    bridges = {item for item in found if item.startswith("B")}

    board_o_ids = set(O_ID.findall(body))
    index_path: Path | None = opportunity_index_override.resolve() if opportunity_index_override else None
    if structured and fields["source_opportunity_index"] != "none":
        index_path = resolve_source(root, fields["source_opportunity_index"], "opportunity_board.md")
    if board_o_ids and index_path is None:
        raise ValueError("opportunity_board.md: O references require source_opportunity_index")

    index_fields: dict[str, str] = {}
    if index_path is not None:
        raw_index = index_path.read_text(encoding="utf-8")
        if raw_index.startswith("---\n"):
            index_fields, index_body = frontmatter(index_path)
        else:
            index_body = raw_index
        index_ids = set(O_ID.findall(index_body))
        dangling = sorted(board_o_ids - index_ids)
        if dangling:
            raise ValueError(f"opportunity_board.md: unknown O IDs {dangling}")
        if structured and index_fields.get("target_question") != fields["target_question"]:
            raise ValueError("opportunity_board.md: target disagrees with opportunity index")

    checkpoint_path: Path | None = checkpoint_override.resolve() if checkpoint_override else None
    checkpoint_ref = fields.get("active_checkpoint", "none")
    if structured and checkpoint_ref != "none":
        checkpoint_path = resolve_source(root, checkpoint_ref, "opportunity_board.md")

    cap = checkpoint_cap_override
    checkpoint_dispositions: dict[str, str] = {}
    checkpoint_active = checkpoint_path is not None
    if checkpoint_path is not None and structured:
        checkpoint_target, checkpoint_cap, checkpoint_dispositions = checkpoint_state(checkpoint_path)
        if checkpoint_target != fields["target_question"]:
            raise ValueError("opportunity_board.md: target disagrees with active checkpoint")
        cap = checkpoint_cap
        if index_fields:
            if index_fields.get("active_checkpoint") != fields["active_checkpoint"]:
                raise ValueError("opportunity_board.md: checkpoint disagrees with opportunity index")
            expected_cap = "none" if cap is None else str(cap)
            if index_fields.get("checkpoint_selection_cap") != expected_cap:
                raise ValueError("opportunity_board.md: cap disagrees with opportunity index")
    if structured:
        board_cap = positive_cap(fields["checkpoint_problem_cap"], "opportunity_board.md")
        if board_cap != cap:
            raise ValueError("opportunity_board.md: cap disagrees with active checkpoint")
        if checkpoint_path is None and board_cap is not None:
            raise ValueError("opportunity_board.md: cap requires an active checkpoint")

    problem_dispositions: dict[str, str] = {}
    if structured:
        required_columns = {"id", "checkpoint item", "checkpoint disposition"}
        positions = {name: header.index(name) for name in required_columns if name in header}
        if set(positions) != required_columns:
            raise ValueError("opportunity_board.md: missing checkpoint columns")
        for row in rows[1:]:
            if not row or row[0] not in problems:
                continue
            if max(positions.values()) >= len(row):
                raise ValueError("opportunity_board.md: malformed problem checkpoint fields")
            cp_item = row[positions["checkpoint item"]]
            disposition = row[positions["checkpoint disposition"]]
            if checkpoint_active:
                if cp_item == "new":
                    if disposition != "new":
                        raise ValueError("opportunity_board.md: new problem must use new disposition")
                elif cp_item not in checkpoint_dispositions or disposition != checkpoint_dispositions[cp_item]:
                    raise ValueError("opportunity_board.md: problem disposition disagrees with checkpoint")
            elif cp_item != "new" or disposition != "new":
                raise ValueError("opportunity_board.md: no-checkpoint problems must use new/new")
            problem_dispositions[row[0]] = disposition

        if checkpoint_active:
            reconciliation = table_rows(body, "Checkpoint reconciliation")
            if [cell.lower() for cell in reconciliation[0]][:2] != ["checkpoint item", "prior disposition"]:
                raise ValueError("opportunity_board.md: malformed checkpoint reconciliation")
            reconciled = {
                row[0]: row[1]
                for row in reconciliation[1:]
                if len(row) >= 2 and CP_ID.fullmatch(row[0])
            }
            if reconciled != checkpoint_dispositions:
                raise ValueError("opportunity_board.md: checkpoint reconciliation is incomplete")

    return BoardState(
        problems=problems,
        bridges=bridges,
        problem_dispositions=problem_dispositions,
        problem_cap=cap,
        structured=structured,
        checkpoint_active=checkpoint_active,
    )


def approved_h1(
    root: Path,
    opportunity_index_override: Path | None = None,
    checkpoint_override: Path | None = None,
    checkpoint_cap_override: int | None = None,
) -> set[str]:
    board = opportunity_ids(
        root,
        opportunity_index_override=opportunity_index_override,
        checkpoint_override=checkpoint_override,
        checkpoint_cap_override=checkpoint_cap_override,
    )
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
    unknown = (approved_problems - board.problems) | (approved_bridges - board.bridges)
    if unknown:
        raise ValueError(f"h1_decision.md: unknown opportunity IDs {sorted(unknown)}")
    require_section_text(body, "Human Decision", "h1_decision.md")

    if board.structured:
        extra = {
            "decision_basis",
            "checkpoint_override",
            "checkpoint_override_reason",
        }
        missing_extra = sorted(extra - set(fields))
        if missing_extra:
            raise ValueError(f"h1_decision.md: missing fields {missing_extra}")
        if fields["decision_basis"] != "opportunity_board.md":
            raise ValueError("h1_decision.md: decision_basis must be opportunity_board.md")
        override = fields["checkpoint_override"]
        if override not in {"none", "cap", "disposition", "both"}:
            raise ValueError("h1_decision.md: invalid checkpoint_override")
        cap_conflict = board.problem_cap is not None and len(approved_problems) > board.problem_cap
        disposition_conflict = any(
            board.problem_dispositions.get(problem) in {"hold", "reject"}
            for problem in approved_problems
        )
        if cap_conflict and override not in {"cap", "both"}:
            raise ValueError("h1_decision.md: approved problems exceed checkpoint cap without override")
        if disposition_conflict and override not in {"disposition", "both"}:
            raise ValueError("h1_decision.md: held/rejected problem approved without override")
        if override == "none":
            if fields["checkpoint_override_reason"] != "none":
                raise ValueError("h1_decision.md: none override requires none reason")
        else:
            reason = fields["checkpoint_override_reason"]
            if not reason or reason == "none":
                raise ValueError("h1_decision.md: override requires verbatim human reason")
            rationale = section_text(body, "Override Rationale", "h1_decision.md")
            if reason not in rationale:
                raise ValueError("h1_decision.md: override reason must appear in Override Rationale")
    elif board.problem_cap is not None and len(approved_problems) > board.problem_cap:
        raise ValueError(
            "h1_decision.md: legacy approval exceeds supplied checkpoint cap; "
            "reconcile it into the structured board and record an explicit human override"
        )
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
    parser.add_argument("--opportunity-index", type=Path)
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument("--checkpoint-cap", type=int)
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        if args.gate == "h1":
            approved_h1(
                root,
                opportunity_index_override=args.opportunity_index,
                checkpoint_override=args.checkpoint,
                checkpoint_cap_override=args.checkpoint_cap,
            )
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
