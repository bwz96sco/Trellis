#!/usr/bin/env python3
"""Validate the canonical research-skill set."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
TASKS = ROOT / "evals" / "research-skills" / "tasks.yaml"

CANONICAL = {
    "research-computation",
    "research-experiment",
    "research-figure",
    "research-ideation",
    "research-literature",
    "research-project-setup",
    "research-quest",
    "research-review-case",
    "research-slides",
    "research-theory",
    "research-writing",
}
ADDITIONAL_RESEARCH = {
    "research-idea-evaluation",
    "research-opportunity-mining",
    "research-quest-admin",
    "research-synthesis",
}
RESEARCH_SKILLS = CANONICAL | ADDITIONAL_RESEARCH
EXPLICIT_ONLY = {"research-idea-evaluation", "research-opportunity-mining", "research-quest-admin"}

QUEST_EVENT_PRODUCERS = {
    "research-computation",
    "research-figure",
    "research-idea-evaluation",
    "research-literature",
    "research-opportunity-mining",
    "research-project-setup",
    "research-slides",
    "research-synthesis",
    "research-theory",
    "research-writing",
}
COMPOSITION_CONTRACTS = {
    "research-slides": (
        "personal-slides",
        "../personal-slides/references/research-handoff-contract.md",
    ),
}

EXPERIMENT_STOP_PATTERN = "\\b(?:stop|kill|relaunch|fallback)\\b"
EXPERIMENT_REQUIRED_RESULT = [
    "(?is)(?:cross-seed aggregation|aggregate-claim decision rule).{0,160}"
    "(?:unspecified|unresolved|not specified|not supplied)",
    "(?is)(?:seed-level|per-seed).{0,80}(?:observation|description|report|result|evidence)",
    "(?is)\\b(?:overall|aggregate)[^.\\n]{0,60}\\bclaim\\b[^.\\n]{0,40}"
    "\\b(?:is|remains?|must remain)\\b(?:\\s|[*_]){1,12}\\binconclusive\\b",
]
EXPERIMENT_KNOWN_UNSAFE = "(?i)\\ba value above 71\\.2 permits that bounded improvement claim\\b"
PROJECT_RESULT_REQUIRED = [
    "(?ms)^```(?:text|markdown)?[ \\t]*\\n[ \\t]*\\S[^\\n]*\\n.*?^```[ \\t]*$",
    "(?i)code", "(?i)paper", "(?i)notes", "(?i)git",
    "(?i)40\\s*GB", "(?i)stable claim IDs", "(?i)checkpoint", "(?i)generated PDF",
]
PROJECT_STEP_CONTRACT = {"field": "result", "count": 6, "single_sentence": True}
PROJECT_EXACT_FIELDS = {"evidence": [], "risks": [], "next_action": None, "artifacts": []}
PROJECT_READ_COMMAND = "^\\s*(?:sed|cat|head|tail|rg|grep|awk)\\b[^\\n]*\\bSTATE\\.md\\b"

EXPECTED_CANDIDATE_ACTIVATION = {
    "literature-one-paper": None,
    "ideation-shortlist": None,
    "experiment-plan": "research-experiment",
    "writing-micro-edit": None,
    "theory-proof-audit": None,
    "quest-resume": "research-quest",
    "computation-bounded": None,
    "figure-fixed-csv": "research-figure",
    "slides-compact-route": "research-slides",
    "project-setup-diagnosis": "research-project-setup",
    "review-multidimension": "research-review-case",
    "citation-support-audit": "research-review-case",
    "computation-convergence-audit": "research-computation",
    "ideation-generate-falsifiable": "research-ideation",
    "literature-prior-map": "research-literature",
    "theory-research-proof-audit": "research-theory",
    "writing-evidence-revision": "research-writing",
}

EXPECTED_V4_PORTFOLIO = {
    "research-computation": ("computation-convergence-audit", "computation-bounded"),
    "research-experiment": ("experiment-plan", "boundary-experiment-reformat"),
    "research-figure": ("figure-fixed-csv", "boundary-figure-spec-format"),
    "research-ideation": ("ideation-generate-falsifiable", "ideation-shortlist"),
    "research-literature": ("literature-prior-map", "literature-one-paper"),
    "research-project-setup": ("project-setup-diagnosis", "boundary-project-tree-format"),
    "research-quest": ("quest-resume", "boundary-generic-status-extract"),
    "research-review-case": ("review-multidimension", "boundary-code-review"),
    "research-slides": ("slides-compact-route", "boundary-slides-outline-format"),
    "research-theory": ("theory-research-proof-audit", "theory-proof-audit"),
    "research-writing": ("writing-evidence-revision", "writing-micro-edit"),
}

EXPECTED_BASELINE_REF = "bd16a3846ccb2f0b903f85faaf461fc303f0d5b5"
EXPECTED_BASELINE_SKILLS = [
    "research-computation",
    "research-experiment",
    "research-figure",
    "research-harness",
    "research-ideation",
    "research-innovation-explorer",
    "research-literature",
    "research-project-setup",
    "research-quest",
    "research-review-case",
    "research-slides",
    "research-theory",
    "research-writing",
]
EXPECTED_CAMPAIGN_SEED = 56013
EXPECTED_CAMPAIGN_TIMEOUT = 180
EXPECTED_TASK_MANIFEST_VERSION = 4
EXPECTED_V3_SEED = 56031
EXPECTED_V4_SEED = 56041
EXPECTED_V4_CALL_BUDGET = {
    "absolute_cap": 68,
    "preflight_probes": 6,
    "task_cells": 55,
    "reviewers": 2,
    "reviewer_replacements_max": 2,
    "adjudicator_max": 1,
    "integrity_auditors": 2,
}
EXPECTED_V5_CALL_TIMEOUTS = {
    "preflight_probes": 180,
    "task_cells": 180,
    "reviewers": 600,
    "reviewer_replacements": 600,
    "adjudicator": 300,
    "integrity_auditors": 300,
}
EXPECTED_V3_LINEAGE = {
    "prior_candidate_commit": "e0ba4e1946a6570a3147750142e46f6af1c20535",
    "prior_run_manifest_fingerprint": "af3c685247fd12936e1332c4a77958c070bcf052856396741e831bbdae6f4ae0",
    "prior_summary_fingerprint": "66c1255d9901ca631159cdc22c3ee7f488587bd9193bb433a0d00bbdcca8464d",
}
EXPECTED_V3_STAGE_POLICIES = {
    "routing": {
        "review_mode": "automatic",
        "blind_reviewers": 0,
        "adjudication": False,
        "fail_fast": True,
        "promotion_to": "pilot",
        "acceptance": {"execution_semantic_side_effect_task_contract_activation": "8/8"},
    },
    "pilot": {
        "review_mode": "blind",
        "blind_reviewers": 2,
        "adjudication": "on_disagreement",
        "fail_fast": False,
        "promotion_to": "confirmatory",
        "acceptance": {
            "slim_benchmark_hard": "4/4",
            "slim_activation": "8/8",
            "slim_noninferior_current_min": "3/4",
            "slim_mean_vs_current_floor": -0.10,
            "slim_noninferior_none": "2/2",
            "slim_strict_wins_vs_none_min": 1,
            "slim_critical_regressions_max": 0,
            "slim_unsupported_claims_max": 0,
            "comparable_pairs_min": 3,
            "comparable_token_reduction_min": 0.20,
            "comparable_wall_reduction_alternative_min": 0.15,
            "raw_paired_wall_regression_max": 0.10,
            "comparable_per_task_token_regression_max": 0.25,
        },
    },
    "confirmatory": {
        "review_mode": "blind",
        "blind_reviewers": 2,
        "adjudication": "on_disagreement",
        "fail_fast": False,
        "promotion_to": None,
        "acceptance": {
            "slim_benchmark_hard": "12/12",
            "slim_activation": "18/18",
            "slim_noninferior_current_min": "10/12",
            "slim_noninferior_none_min": "10/12",
            "slim_mean_vs_current_floor": -0.10,
            "slim_mean_vs_none_floor": 0.0,
            "skill_positive_noninferior_none_min": "6/7",
            "high_value_strict_wins_vs_none_min": 2,
            "comparable_pairs_min": 10,
            "comparable_token_reduction_min": 0.25,
            "comparable_wall_reduction_alternative_min": 0.20,
            "raw_paired_wall_regression_max": 0.10,
            "comparable_per_task_token_regression_max": 0.25,
            "expected_bypass_aggregate_overhead_max": 0.20,
            "expected_bypass_individual_overhead_max": 0.30,
            "slim_critical_regressions_max": 0,
            "slim_unsupported_claims_max": 0,
        },
    },
}

EXPECTED_V4_STAGE_POLICIES = {
    "activation": {
        "review_mode": "automatic",
        "blind_reviewers": 0,
        "adjudication": False,
        "fail_fast": False,
        "promotion_to": "comparison",
        "acceptance": {
            "execution_semantic_side_effect_task_contract": "22/22",
            "positive_owner_activation": "11/11",
            "bypass_candidate_activation": "0/11",
        },
    },
    "comparison": {
        "review_mode": "blind",
        "blind_reviewers": 2,
        "blind_review_role": "positive",
        "adjudication": "on_disagreement",
        "fail_fast": False,
        "promotion_to": None,
        "acceptance": {
            "positive_slim_hard": "11/11",
            "positive_slim_quality_floor": 4,
            "positive_slim_noninferior_current_min": "10/11",
            "positive_slim_mean_vs_current_floor": -0.10,
            "positive_slim_noninferior_none_min": "11/11",
            "positive_slim_mean_vs_none_floor": 0.25,
            "positive_slim_strict_wins_vs_none_min": 5,
            "slim_critical_regressions_max": 0,
            "slim_unsupported_claims_max": 0,
            "comparable_positive_pairs_min": 9,
            "comparable_token_reduction_min": 0.25,
            "comparable_wall_reduction_alternative_min": 0.20,
            "raw_paired_wall_regression_max": 0.10,
            "comparable_per_task_token_regression_max": 0.25,
            "expected_bypass_aggregate_overhead_max": 0.20,
            "expected_bypass_individual_overhead_max": 0.30,
        },
    },
}


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)
    print(f"FAIL {message}")


def load_json_yaml(path: Path) -> object:
    # JSON is a strict YAML 1.2 subset. Keeping registry manifests in this subset
    # gives deterministic validation without another project dependency.
    return json.loads(path.read_text(encoding="utf-8"))


def frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}
    result: dict[str, str] = {}
    for raw in text[4:end].splitlines():
        if ":" not in raw:
            continue
        key, value = raw.split(":", 1)
        result[key.strip()] = value.strip().strip('"')
    return result


def validate_metadata(name: str, disable_model: bool, failures: list[str]) -> None:
    path = SKILLS / name / "agents" / "openai.yaml"
    if not path.is_file():
        fail(f"{name}: missing agents/openai.yaml", failures)
        return
    text = path.read_text(encoding="utf-8")
    required = ("interface:\n", "  display_name:", "  short_description:", "  default_prompt:", "policy:\n")
    for marker in required:
        if marker not in text:
            fail(f"{name}: openai.yaml missing {marker.strip()}", failures)
    policy = re.search(r"(?m)^  allow_implicit_invocation:\s*(true|false)\s*$", text)
    if not policy:
        fail(f"{name}: missing native implicit-invocation policy", failures)
    elif (policy.group(1) == "true") is disable_model:
        fail(f"{name}: Claude and OpenAI invocation controls disagree", failures)
    values: dict[str, str] = {}
    for field in ("display_name", "short_description", "default_prompt"):
        match = re.search(rf"(?m)^  {field}:\s*(.+?)\s*$", text)
        if not match or not match.group(1).strip().strip('"\''):
            fail(f"{name}: interface.{field} must be a nonempty string", failures)
            continue
        values[field] = match.group(1).strip().strip('"\'')
    short = values.get("short_description")
    if short and not 25 <= len(short) <= 64:
        fail(f"{name}: short_description must be 25-64 characters", failures)
    prompt = values.get("default_prompt", "")
    if f"${name}" not in prompt:
        fail(f"{name}: default_prompt must mention ${name}", failures)


def validate_reference_graph(name: str, failures: list[str]) -> None:
    """Require every runtime reference to be reachable within two disclosure hops."""
    skill_root = SKILLS / name
    skill_path = skill_root / "SKILL.md"
    reference_root = skill_root / "references"
    references = sorted(reference_root.glob("*.md")) if reference_root.is_dir() else []
    by_name = {path.name: path for path in references}
    explicit_pattern = re.compile(r"(?<![a-z0-9_./-])((?:\.\./|references/)[a-z0-9_./-]+\.md)", re.I)

    def mentioned(path: Path, *, check_broken: bool = False) -> set[Path]:
        text = path.read_text(encoding="utf-8")
        if check_broken:
            for target in explicit_pattern.findall(text):
                target_path = Path(target)
                if target.startswith("references/"):
                    resolved = (skill_root / target_path).resolve()
                else:
                    resolved = (path.parent / target_path).resolve()
                try:
                    resolved.relative_to(ROOT)
                except ValueError:
                    fail(f"{name}: reference path escapes repository: {target} in {path.name}", failures)
                    continue
                if not resolved.is_file():
                    fail(f"{name}: broken reference path {target} in {path.name}", failures)
        return {
            target_path
            for target_name, target_path in by_name.items()
            if re.search(rf"(?<![a-z0-9-]){re.escape(target_name)}(?![a-z0-9-])", text, re.I)
        }

    first_hop = mentioned(skill_path, check_broken=True)
    second_hop = set(first_hop)
    for path in first_hop:
        second_hop.update(mentioned(path, check_broken=True))
    unreachable = set(references) - second_hop
    if unreachable:
        fail(
            f"{name}: references unreachable within two hops: "
            f"{[path.name for path in sorted(unreachable)]}",
            failures,
        )
    for path in references:
        lines = path.read_text(encoding="utf-8").splitlines()
        if len(lines) > 100 and not any(
            re.match(r"^##\s+(?:Table of Contents|Contents)\s*$", line, re.I)
            for line in lines[:40]
        ):
            fail(f"{name}: {path.name} exceeds 100 lines without an early TOC", failures)


def validate_workflow_contract(name: str, text: str, failures: list[str]) -> None:
    """Require one active workflow; legacy artifact nouns may remain in compatibility text."""
    lowered = text.lower()
    active_mode_patterns = (
        r"(?m)^##\s+(?:direct|pack|deep|campaign)(?:\s|$)",
        r"\*\*(?:direct|pack|deep|campaign)(?:\s*\([^)]*\))?:\*\*",
        r"(?i)choose\s+(?:a\s+)?(?:direct|pack|deep|campaign)\s+mode",
    )
    for pattern in active_mode_patterns:
        if re.search(pattern, text, flags=re.I):
            fail(f"{name}: active reasoning-depth mode declaration remains: {pattern}", failures)
    if name == "research-quest":
        for marker in ("read-only", "research-quest-admin", "next owner"):
            if marker not in lowered:
                fail(f"research-quest: bounded status contract missing {marker!r}", failures)
        return
    if not re.search(r"(?im)^##\s+.*(?:workflow|operations|preflight)", text):
        fail(f"{name}: missing an ordered workflow or operations section", failures)
    if not any(marker in lowered for marker in ("complete when", "complete only when", "completion", "close only when")):
        fail(f"{name}: workflow lacks a visible completion criterion", failures)


def validate_legacy_configs() -> None:
    for config_name, key in (("custom-skills.json", "skills"), ("custom-workflows.json", "workflows")):
        path = ROOT / "config" / config_name
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        missing = [item["path"] for item in data.get(key, []) if not (ROOT / item["path"]).exists()]
        if missing:
            print(f"WARN {config_name}: {len(missing)} legacy entries have missing targets; excluded from native routing audit")


def main() -> int:
    failures: list[str] = []
    registry = {
        line.strip()
        for line in (ROOT / "registry" / "skills.txt").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }
    research_dirs = {path.name for path in SKILLS.glob("research-*") if path.is_dir()}
    expected = RESEARCH_SKILLS
    if research_dirs != expected:
        fail(f"research skill set mismatch: missing={sorted(expected-research_dirs)} extra={sorted(research_dirs-expected)}", failures)
    if not expected <= registry:
        fail(f"unregistered research skills: {sorted(expected-registry)}", failures)

    for name in sorted(expected):
        skill = SKILLS / name / "SKILL.md"
        if not skill.is_file():
            fail(f"{name}: missing SKILL.md", failures)
            continue
        fm = frontmatter(skill)
        if fm.get("name") != name:
            fail(f"{name}: frontmatter name mismatch", failures)
        text = skill.read_text(encoding="utf-8")
        validate_workflow_contract(name, text, failures)
        validate_reference_graph(name, failures)
        disable_model = fm.get("disable-model-invocation", "false").lower() == "true"
        validate_metadata(name, disable_model, failures)
        if disable_model != (name in EXPLICIT_ONLY):
            expected = "explicit-only" if name in EXPLICIT_ONLY else "model-invocable"
            fail(f"{name}: invocation policy must be {expected}", failures)

    ideation_root = SKILLS / "research-ideation"
    evaluation_root = SKILLS / "research-idea-evaluation"
    ideation_skill_text = (ideation_root / "SKILL.md").read_text(encoding="utf-8")
    for marker in (
        "$research-idea-evaluation",
        "opportunity_board.md",
        "h1_decision.md",
        "kill condition",
        "Do not run novelty verdicts",
    ):
        if marker.lower() not in ideation_skill_text.lower():
            fail(f"research-ideation: lean generation contract missing {marker!r}", failures)
    evaluation_skill_text = (evaluation_root / "SKILL.md").read_text(encoding="utf-8")
    for marker in (
        "attack-template.md",
        "one clean subagent per candidate",
        "h2_decision.md",
        "selected route",
        "blocked",
        "$research-experiment",
    ):
        if marker.lower() not in evaluation_skill_text.lower():
            fail(f"research-idea-evaluation: lean evaluation contract missing {marker!r}", failures)
    if not (evaluation_root / "attack-template.md").is_file():
        fail("research-idea-evaluation: missing attack-template.md", failures)
    gate_validator = ROOT / "scripts" / "validate-research-gates.py"
    if not gate_validator.is_file():
        fail("research human gates: missing scripts/validate-research-gates.py", failures)
    for owner, owner_text in (
        ("research-ideation", ideation_skill_text),
        ("research-idea-evaluation", evaluation_skill_text),
    ):
        if "scripts/validate-research-gates.py" not in owner_text:
            fail(f"{owner}: missing lean human-gate validator command", failures)

    literature_root = SKILLS / "research-literature"
    literature_skill_text = (literature_root / "SKILL.md").read_text(encoding="utf-8")
    for marker in (
        "register.md",
        "note-template.md",
        "paper-search-cli",
        "one clean subagent per paper",
    ):
        if marker.lower() not in literature_skill_text.lower():
            fail(f"research-literature: lean register contract missing {marker!r}", failures)
    if not (literature_root / "note-template.md").is_file():
        fail("research-literature: missing note-template.md", failures)

    opportunity_root = SKILLS / "research-opportunity-mining"
    opportunity_skill_text = (opportunity_root / "SKILL.md").read_text(encoding="utf-8")
    for marker in (
        "opportunity-template.md",
        "O-<paper-id>-<lens>-NN",
        "SUB",
        "MOD",
        "INP",
        "XFR",
        "ENV",
        "MET",
        "unknown — requires literature search",
        "$research-ideation",
    ):
        if marker.lower() not in opportunity_skill_text.lower():
            fail(f"research-opportunity-mining: contract missing {marker!r}", failures)
    if not (opportunity_root / "opportunity-template.md").is_file():
        fail("research-opportunity-mining: missing opportunity-template.md", failures)

    experiment_text = (SKILLS / "research-experiment" / "SKILL.md").read_text(encoding="utf-8").lower()
    for marker in (
        "multiple seeds without a frozen aggregation or claim rule",
        "seed-level observations only",
        "aggregate claim remains inconclusive",
        "one compact run matrix",
        "no more than six stop/kill/relaunch/fallback rules",
        "one bounded claim contract",
        "preserve a supplied total budget",
        "fixed-wording mechanical transformation",
        "adds no experimental judgment",
        "minimum trust-bearing evidence",
    ):
        if marker not in experiment_text:
            fail(f"research-experiment: missing response or claim guard {marker!r}", failures)

    for producer in sorted(QUEST_EVENT_PRODUCERS):
        producer_text = (SKILLS / producer / "SKILL.md").read_text(encoding="utf-8").lower()
        for marker in (
            "$research-quest-admin",
            "prepare one event",
            "invoke `$research-quest-admin` explicitly",
            "never writes quest state",
        ):
            if marker not in producer_text:
                fail(f"{producer}: quest-admin handoff missing {marker!r}", failures)
        if re.search(r"(?:append|initialize|regenerate|mutate)[^.\n]{0,100}(?:through|via)\s+`?research-quest`?", producer_text):
            fail(f"{producer}: live quest mutation still routes through read-only research-quest", failures)

    for parent, (child, contract_ref) in COMPOSITION_CONTRACTS.items():
        parent_root = SKILLS / parent
        parent_text = (parent_root / "SKILL.md").read_text(encoding="utf-8").lower()
        contract_path = (parent_root / contract_ref).resolve()
        for marker in (contract_ref.lower(), "bounded internal", "owner"):
            if marker not in parent_text:
                fail(f"{parent}: parent-owned composition missing {marker!r}", failures)
        if not contract_path.is_file():
            fail(f"{parent}: frozen child contract missing at {contract_ref}", failures)
            continue
        contract_text = contract_path.read_text(encoding="utf-8").lower()
        for marker in ("contract reuse does not transfer", "standalone", "authorization gates"):
            if marker not in contract_text:
                fail(f"{parent}: frozen child contract missing {marker!r}", failures)
        child_text = (SKILLS / child / "SKILL.md").read_text(encoding="utf-8").lower()
        if contract_path.name.lower() not in child_text or "standalone" not in child_text:
            fail(f"{child}: standalone/internal composition boundary is incomplete", failures)

    smart_root = SKILLS / "smart-search-cli"
    smart_skill_text = (smart_root / "SKILL.md").read_text(encoding="utf-8")
    smart_map_text = (smart_root / "references" / "cli-contract.md").read_text(encoding="utf-8")
    release_ref = smart_root / "references" / "regression-release.md"
    if not release_ref.is_file():
        fail("smart-search-cli: missing regression-release.md", failures)
    for source_name, source_text in (("SKILL.md", smart_skill_text), ("cli-contract.md", smart_map_text)):
        if "regression-release.md" not in source_text:
            fail(f"smart-search-cli: regression-release.md unreachable from {source_name}", failures)

    project_text = (SKILLS / "research-project-setup" / "SKILL.md").read_text(encoding="utf-8").lower()
    for marker in (
        "read it with this skill.md in one initial read-only call",
        "exactly six single-sentence migration steps",
        "state only decision-changing assumptions",
    ):
        if marker not in project_text:
            fail(f"research-project-setup: missing compact supplied-inventory guard {marker!r}", failures)

    task_data = load_json_yaml(TASKS)
    assert isinstance(task_data, dict)
    if task_data.get("version") != EXPECTED_TASK_MANIFEST_VERSION:
        fail(f"evaluation manifest version must be {EXPECTED_TASK_MANIFEST_VERSION}", failures)
    response_schema_path = ROOT / "evals" / "research-skills" / "response.schema.json"
    try:
        response_schema = json.loads(response_schema_path.read_text(encoding="utf-8"))
        response_fields = set(response_schema["properties"])
    except (OSError, json.JSONDecodeError, KeyError, TypeError):
        fail("evaluation response schema is missing or invalid JSON", failures)
        response_fields = set()
    tasks = task_data.get("tasks", [])
    pilot = [task for task in tasks if task.get("phase") == "pilot"]
    expansion = [task for task in tasks if task.get("phase") == "expansion"]
    portfolio_v4_tasks = [task for task in tasks if task.get("phase") == "portfolio-v4"]
    if len(tasks) != 17 or len(pilot) != 6 or len(expansion) != 6 or len(portfolio_v4_tasks) != 5:
        fail("evaluation manifest must preserve 6 pilot + 6 expansion tasks and add 5 v4 positives", failures)
    if task_data.get("model") != "gpt-5.6-sol" or task_data.get("reasoning_effort") != "medium":
        fail("evaluation model must be gpt-5.6-sol with medium reasoning", failures)
    if task_data.get("baseline_ref") != EXPECTED_BASELINE_REF:
        fail(f"evaluation baseline_ref must remain {EXPECTED_BASELINE_REF}", failures)
    if task_data.get("installed_baseline_skills") != EXPECTED_BASELINE_SKILLS:
        fail("evaluation baseline must contain the exact ordered 13-skill owner-complete profile", failures)
    if set(task_data.get("candidate_skills", [])) != CANONICAL or len(task_data.get("candidate_skills", [])) != 11:
        fail("evaluation candidate must contain exactly the 11 canonical research skills", failures)
    task_ids = [task.get("id") for task in tasks]
    if len(task_ids) != len(set(task_ids)):
        fail("evaluation task ids must be unique", failures)
    activation = {task.get("id"): task.get("expected_candidate_skill") for task in tasks}
    if activation != EXPECTED_CANDIDATE_ACTIVATION:
        fail("evaluation candidate activation expectations changed", failures)
    if any(task.get("group") != "benchmark" for task in tasks):
        fail("evaluation tasks must use group=benchmark", failures)
    probes = task_data.get("activation_probes", [])
    probe_ids = [probe.get("id") for probe in probes]
    expected_probe_ids = {
        "boundary-code-review",
        "boundary-blog-copyedit",
        "boundary-api-docs",
        "boundary-risk-gate",
        "boundary-experiment-reformat",
        "boundary-project-tree-format",
        "boundary-figure-spec-format",
        "boundary-generic-status-extract",
        "boundary-slides-outline-format",
    }
    simplification_probe_ids = {
        "ideation-generate-portfolio-v1",
        "synthesis-cross-paper",
        "explicit-idea-evaluation",
        "explicit-opportunity-mining",
        "explicit-quest-admin",
        "implicit-idea-evaluation-bypass",
        "implicit-opportunity-mining-bypass",
        "implicit-quest-admin-bypass",
        "synthesis-one-paper-bypass",
    }
    if (
        len(probes) != 18
        or set(probe_ids) != expected_probe_ids | simplification_probe_ids
        or len(probe_ids) != len(set(probe_ids))
        or set(probe_ids) & set(task_ids)
    ):
        fail("evaluation manifest must contain the legacy and simplification routing probes", failures)
    for probe in probes:
        if probe.get("id") in expected_probe_ids:
            if probe.get("group") != "activation-probe" or probe.get("expected_candidate_skill", "missing") is not None:
                fail(f"activation probe {probe.get('id')}: must expect no candidate skill", failures)
            if probe.get("blind_review") is not False:
                fail(f"activation probe {probe.get('id')}: blind_review must be false", failures)
        elif probe.get("group") != "simplification-routing":
            fail(f"simplification probe {probe.get('id')}: wrong group", failures)

    cases_by_id = {task["id"]: task for task in [*tasks, *probes]}
    portfolio_ids: set[str] = set()
    for skill, (positive_id, bypass_id) in EXPECTED_V4_PORTFOLIO.items():
        portfolio_ids.update((positive_id, bypass_id))
        positive = cases_by_id.get(positive_id, {})
        bypass = cases_by_id.get(bypass_id, {})
        if (
            positive.get("evaluation_role") != "positive"
            or positive.get("portfolio_skill") != skill
            or positive.get("expected_candidate_skill") != skill
        ):
            fail(f"v4 positive {positive_id}: owner/role contract mismatch", failures)
        if (
            bypass.get("evaluation_role") != "bypass"
            or bypass.get("portfolio_skill") != skill
            or bypass.get("expected_candidate_skill", "missing") is not None
            or bypass.get("blind_review") is not False
        ):
            fail(f"v4 bypass {bypass_id}: owner/role/blind contract mismatch", failures)
    for task in [*tasks, *probes]:
        if task.get("id") in portfolio_ids or task.get("id") in simplification_probe_ids:
            continue
        if "evaluation_role" in task or "portfolio_skill" in task:
            fail(f"non-v4 case {task.get('id')}: unexpected portfolio metadata", failures)

    for task in [*tasks, *probes]:
        checks = task.get("checks", {})
        if not isinstance(checks, dict):
            fail(f"evaluation task {task.get('id')}: checks must be a mapping", failures)
            continue
        for key in ("required_regex", "forbidden_regex", "required_command_regex"):
            patterns = checks.get(key, [])
            if not isinstance(patterns, list) or not all(isinstance(pattern, str) for pattern in patterns):
                fail(f"evaluation task {task.get('id')}: {key} must be a list of regex strings", failures)
                continue
            for pattern in patterns:
                try:
                    re.compile(pattern)
                except re.error as exc:
                    fail(f"evaluation task {task.get('id')}: invalid {key} regex {pattern!r}: {exc}", failures)
        for key in ("required_field_regex", "forbidden_field_regex"):
            field_patterns = checks.get(key, {})
            if not isinstance(field_patterns, dict):
                fail(f"evaluation task {task.get('id')}: {key} must be a field-to-regex-list mapping", failures)
                continue
            unknown_fields = set(field_patterns) - response_fields
            if unknown_fields:
                fail(f"evaluation task {task.get('id')}: {key} names unknown response fields {sorted(unknown_fields)}", failures)
            for field, patterns in field_patterns.items():
                if not isinstance(patterns, list) or not all(isinstance(pattern, str) for pattern in patterns):
                    fail(f"evaluation task {task.get('id')}: {key}.{field} must be a list of regex strings", failures)
                    continue
                for pattern in patterns:
                    try:
                        re.compile(pattern)
                    except re.error as exc:
                        fail(f"evaluation task {task.get('id')}: invalid {key}.{field} regex {pattern!r}: {exc}", failures)
        exact_fields = checks.get("exact_field_values", {})
        if not isinstance(exact_fields, dict):
            fail(f"evaluation task {task.get('id')}: exact_field_values must be a mapping", failures)
        elif set(exact_fields) - response_fields:
            fail(
                f"evaluation task {task.get('id')}: exact_field_values names unknown response fields "
                f"{sorted(set(exact_fields) - response_fields)}",
                failures,
            )
        step_contract = checks.get("numbered_step_contract")
        if step_contract is not None and (
            not isinstance(step_contract, dict)
            or set(step_contract) != {"field", "count", "single_sentence"}
            or step_contract.get("field") not in response_fields
            or not isinstance(step_contract.get("count"), int)
            or step_contract.get("count", 0) < 1
            or not isinstance(step_contract.get("single_sentence"), bool)
        ):
            fail(f"evaluation task {task.get('id')}: invalid numbered_step_contract", failures)

    task_by_id = {task["id"]: task for task in tasks}
    experiment_checks = task_by_id["experiment-plan"]["checks"]
    if (
        experiment_checks.get("required_field_regex", {}).get("result") != EXPERIMENT_REQUIRED_RESULT
        or experiment_checks.get("forbidden_field_regex", {}).get("result") != [EXPERIMENT_KNOWN_UNSAFE]
        or EXPERIMENT_STOP_PATTERN not in experiment_checks.get("required_regex", [])
        or experiment_checks.get("forbidden_regex")
    ):
        fail("experiment-plan must require the bounded unresolved conclusion and reject the known unsafe claim", failures)
    citation_checks = task_by_id["citation-support-audit"]["checks"]
    if citation_checks.get("required_field_regex", {}).get("result") != [
        "(?<!\\w)C1 support_grade=limiting(?!\\w)", "C1", "S1", "Gaussian", "0\\.2",
    ]:
        fail("citation-support-audit must require the exact result-field marker and bounded source facts", failures)
    if citation_checks.get("forbidden_field_regex", {}).get("result") != [
        "(?m)^C1 support_grade=contradicting$",
        "(?im)^\\s*(?:paper\\s+)?verdict\\s*[:=]\\s*(?:accept|reject)\\b",
        "(?im)^\\s*recommend(?:ation)?\\s*[:=]\\s*(?:accept|reject)\\b",
    ] or citation_checks.get("forbidden_regex"):
        fail("citation-support-audit must reject only exact result-field assignments and explicit verdicts", failures)
    quest_checks = task_by_id["quest-resume"]["checks"]
    if quest_checks.get("required_command_regex") or quest_checks.get("max_tool_calls") != 2:
        fail("quest-resume must allow direct state reads with at most two tool calls", failures)
    if set(quest_checks.get("required_field_regex", {})) != {"result", "next_action"}:
        fail("quest-resume must scope blocker, owner, and action checks to their response fields", failures)
    project_checks = task_by_id["project-setup-diagnosis"]["checks"]
    if (
        project_checks.get("required_field_regex", {}).get("result") != PROJECT_RESULT_REQUIRED
        or project_checks.get("required_regex")
        or project_checks.get("forbidden_field_regex")
        or project_checks.get("numbered_step_contract") != PROJECT_STEP_CONTRACT
        or project_checks.get("exact_field_values") != PROJECT_EXACT_FIELDS
        or project_checks.get("required_command_regex") != [PROJECT_READ_COMMAND]
        or project_checks.get("max_tool_calls") != 1
    ):
        fail("project-setup-diagnosis must require one inventory read, result-only facts, exact fields, and six compact steps", failures)
    experiment_contract = (ROOT / "evals/research-skills/fixtures/experiment-plan/PROJECT.md").read_text(encoding="utf-8")
    experiment_prompt = (ROOT / "evals/research-skills/fixtures/experiment-plan/PROMPT.md").read_text(encoding="utf-8")
    if "Cross-seed aggregation and aggregate-claim decision rule: unspecified." not in experiment_contract:
        fail("experiment-plan fixture must expose the missing cross-seed rule as a raw fact", failures)
    if "invent" not in experiment_prompt or "aggregate-claim decision rule" not in experiment_prompt:
        fail("experiment-plan prompt must forbid inventing the missing aggregate-claim rule", failures)
    project_prompt = (ROOT / "evals/research-skills/fixtures/project-setup-diagnosis/PROMPT.md").read_text(encoding="utf-8")
    for marker in ("one initial read-only call", "exactly six numbered, single-sentence migration steps"):
        if marker not in project_prompt:
            fail(f"project-setup-diagnosis prompt missing visible compact-route contract {marker!r}", failures)
    probes_by_id = {probe["id"]: probe for probe in probes}
    for probe_id in ("boundary-experiment-reformat", "boundary-project-tree-format"):
        probe_checks = probes_by_id.get(probe_id, {}).get("checks", {})
        if probe_checks.get("max_tool_calls") != 1:
            fail(f"activation probe {probe_id}: mechanical bypass must allow at most one tool call", failures)
        exact_result_patterns = probe_checks.get("required_field_regex", {}).get("result", [])
        if len(exact_result_patterns) != 1 or not exact_result_patterns[0].startswith("\\A") or not exact_result_patterns[0].endswith("\\Z"):
            fail(f"activation probe {probe_id}: result must exactly match all supplied content", failures)

    campaigns = task_data.get("campaigns", {})
    v2_campaign = campaigns.get("refinement-v2", {})
    if v2_campaign.get("status") != "closed":
        fail("refinement-v2 must be closed to new paid runs", failures)
    if v2_campaign.get("seed") != EXPECTED_CAMPAIGN_SEED or v2_campaign.get("timeout") != EXPECTED_CAMPAIGN_TIMEOUT:
        fail(
            f"refinement-v2 must use seed {EXPECTED_CAMPAIGN_SEED} and timeout {EXPECTED_CAMPAIGN_TIMEOUT}",
            failures,
        )
    v3_campaign = campaigns.get("refinement-v3", {})
    if v3_campaign.get("status") != "closed":
        fail("refinement-v3 must be closed as historical no-go evidence", failures)
    if v3_campaign.get("seed") != EXPECTED_V3_SEED or v3_campaign.get("timeout") != EXPECTED_CAMPAIGN_TIMEOUT:
        fail(f"refinement-v3 must use seed {EXPECTED_V3_SEED} and timeout {EXPECTED_CAMPAIGN_TIMEOUT}", failures)
    if v3_campaign.get("budget") != {"core_calls": 42}:
        fail("refinement-v3 core budget must remain 42 paid calls", failures)
    if v3_campaign.get("scope") != {"heldout_stability": "out_of_scope"}:
        fail("refinement-v3 heldout stability work must remain out of scope", failures)
    if v3_campaign.get("lineage") != EXPECTED_V3_LINEAGE:
        fail("refinement-v3 lineage changed", failures)
    if v3_campaign.get("stage_policies") != EXPECTED_V3_STAGE_POLICIES:
        fail("refinement-v3 stage policies changed", failures)
    v4_campaign = campaigns.get("refinement-v4", {})
    if v4_campaign.get("status") != "closed":
        fail("refinement-v4 must be closed after its sealed terminal outcome", failures)
    if v4_campaign.get("closure") != {
        "candidate_ref": "3b94c6c23b48f8bcb9af9db360fbab804531223f",
        "sealer_fix_ref": "b3eddf7bf2ba34aac0cfcb509bebe2a69f4c7acf",
        "result_root": "results/refinement-v4-20260714-3b94c6c",
        "terminal_outcome": "blocked_preflight",
        "attempted_calls": 8,
        "task_cells": 0,
        "seal_fingerprint": "594cbf40cdadc28ba719676d85231d28e87797ea53fccc9ee621be224a9a1030",
    }:
        fail("refinement-v4 closure must bind the sealed evidence root", failures)
    if v4_campaign.get("seed") != EXPECTED_V4_SEED or v4_campaign.get("timeout") != EXPECTED_CAMPAIGN_TIMEOUT:
        fail(f"refinement-v4 must use seed {EXPECTED_V4_SEED} and timeout {EXPECTED_CAMPAIGN_TIMEOUT}", failures)
    if v4_campaign.get("call_budget") != EXPECTED_V4_CALL_BUDGET:
        fail("refinement-v4 call budget must freeze the exact 68-call allocation", failures)
    if v4_campaign.get("stage_policies") != EXPECTED_V4_STAGE_POLICIES:
        fail("refinement-v4 stage policies changed", failures)
    if v4_campaign.get("lineage") != {
        "prior_candidate_commit": "c80aba4389bdabcb90e65e20cf8ae251f929649a",
        "supersedes_campaign": "refinement-v3",
        "prior_campaign_disposition": "historical_no_go",
    }:
        fail("refinement-v4 lineage must supersede c80/v3 no-go evidence", failures)
    if v4_campaign.get("terminal_outcomes") != [
        "accepted", "rejected_behavior", "rejected_efficiency",
        "inconclusive_infrastructure", "inconclusive_review",
        "blocked_preflight", "budget_exhausted",
    ]:
        fail("refinement-v4 terminal outcomes changed", failures)
    if v4_campaign.get("root_policy") != {
        "roots": 1,
        "immutable_cells": True,
        "resume_for_comparison": True,
        "failed_cell_replacement": False,
        "same_commit_rerun": False,
        "seed_change_after_launch": False,
        "fixture_change_after_launch": False,
    }:
        fail("refinement-v4 one-root immutability policy changed", failures)
    preflight_probes = v4_campaign.get("preflight_probes", [])
    expected_probe_pairs = {
        (skill, role)
        for skill in ("research-literature", "research-theory", "research-writing")
        for role in ("positive", "bypass")
    }
    actual_probe_pairs = {
        (probe.get("portfolio_skill"), probe.get("evaluation_role"))
        for probe in preflight_probes
        if isinstance(probe, dict)
    }
    if (
        len(preflight_probes) != 6
        or actual_probe_pairs != expected_probe_pairs
        or len({probe.get("id") for probe in preflight_probes}) != 6
    ):
        fail("refinement-v4 must freeze six balanced literature/theory/writing context probes", failures)
    for probe in preflight_probes:
        role = probe.get("evaluation_role")
        owner = probe.get("portfolio_skill")
        expected_skill = probe.get("expected_candidate_skill", "missing")
        if not isinstance(probe.get("prompt"), str) or not probe["prompt"].strip():
            fail(f"preflight probe {probe.get('id')}: prompt must be frozen inline", failures)
        if role == "positive" and expected_skill != owner:
            fail(f"preflight probe {probe.get('id')}: positive owner mismatch", failures)
        if role == "bypass" and (
            expected_skill is not None or probe.get("forbidden_candidate_skill") != owner
        ):
            fail(f"preflight probe {probe.get('id')}: bypass owner mismatch", failures)
    v5_campaign = campaigns.get("refinement-v5", {})
    if v5_campaign.get("status") not in {"open", "closed"}:
        fail("refinement-v5 status must be open during its one campaign or closed after sealing", failures)
    if v5_campaign.get("run_manifest_schema_version") != 5:
        fail("refinement-v5 must use run-manifest schema 5", failures)
    if v5_campaign.get("seed") != EXPECTED_V4_SEED or v5_campaign.get("timeout") != EXPECTED_CAMPAIGN_TIMEOUT:
        fail("refinement-v5 must preserve V4 seed and task timeout", failures)
    if v5_campaign.get("call_budget") != EXPECTED_V4_CALL_BUDGET:
        fail("refinement-v5 call budget must freeze the exact 68-call allocation", failures)
    if v5_campaign.get("call_timeouts") != EXPECTED_V5_CALL_TIMEOUTS:
        fail("refinement-v5 category timeouts changed", failures)
    if v5_campaign.get("stage_policies") != EXPECTED_V4_STAGE_POLICIES:
        fail("refinement-v5 must preserve V4 stage policies", failures)
    if v5_campaign.get("required_candidate_fingerprint") != "af06724cd8a4f0440b69a7dc53859469d00f38004c701551b72f2f0f0d1460f2":
        fail("refinement-v5 candidate fingerprint lock changed", failures)
    if v5_campaign.get("required_slim_profile_fingerprint") != "ed290962716e35deab2b94b039166bbcc2b6e2d7741ee5d715c34295325b0155":
        fail("refinement-v5 slim-profile fingerprint lock changed", failures)
    v5_probes = v5_campaign.get("preflight_probes", [])
    if len(v5_probes) != 6 or any(
        "required_response_regex" in probe or not isinstance(probe.get("semantic_contract"), dict)
        for probe in v5_probes
    ):
        fail("refinement-v5 must contain six structured probes and no prose regex", failures)
    routing_campaign = campaigns.get("simplification-routing-v1", {})
    if routing_campaign.get("status") != "open":
        fail("simplification-routing-v1 must remain open until its paid run is authorized and completed", failures)
    if set(routing_campaign.get("candidate_skills", [])) != RESEARCH_SKILLS or len(
        routing_campaign.get("candidate_skills", [])
    ) != 15:
        fail("simplification routing campaign must install all 15 research skills", failures)
    open_campaigns = [name for name, value in campaigns.items() if value.get("status", "open") == "open"]
    if open_campaigns != ["simplification-routing-v1"]:
        fail(f"only simplification-routing-v1 may be open, got {open_campaigns}", failures)
    known_cases = set(task_ids) | set(probe_ids)

    def expand_stage(campaign: dict[str, object], campaign_id: str, stage: str) -> set[tuple[str, str]]:
        cells: list[tuple[str, str]] = []
        for group in campaign.get("stages", {}).get(stage, []):
            ids = group.get("task_ids")
            if ids is None:
                selected_group = group.get("task_group")
                if selected_group not in {"benchmark", "activation-probe"}:
                    fail(f"campaign {campaign_id}/{stage}: unknown task group {selected_group}", failures)
                source = tasks if selected_group == "benchmark" else probes
                ids = [item.get("id") for item in source]
            cells.extend((task_id, condition) for task_id in ids for condition in group.get("conditions", []))
        if any(task_id not in known_cases or condition not in {"current", "slim", "none"} for task_id, condition in cells):
            fail(f"campaign {campaign_id}/{stage}: unknown task or condition", failures)
        if len(cells) != len(set(cells)):
            fail(f"campaign {campaign_id}/{stage}: duplicate cells", failures)
        return set(cells)

    v2_pilot_cells = expand_stage(v2_campaign, "refinement-v2", "pilot")
    v2_confirmatory_cells = expand_stage(v2_campaign, "refinement-v2", "confirmatory")
    v2_core = {"quest-resume", "project-setup-diagnosis", "experiment-plan", "citation-support-audit"}
    v2_probes = {"boundary-code-review", "boundary-blog-copyedit", "boundary-api-docs", "boundary-risk-gate"}
    expected_v2_pilot = {(task_id, condition) for task_id in v2_core for condition in ("current", "slim")}
    expected_v2_pilot |= {(task_id, "slim") for task_id in v2_probes}
    legacy_task_ids = {
        "literature-one-paper", "ideation-shortlist", "experiment-plan", "writing-micro-edit",
        "theory-proof-audit", "quest-resume", "computation-bounded", "figure-fixed-csv",
        "slides-compact-route", "project-setup-diagnosis", "review-multidimension",
        "citation-support-audit",
    }
    legacy_probe_ids = {
        "boundary-code-review", "boundary-blog-copyedit", "boundary-api-docs",
        "boundary-risk-gate", "boundary-experiment-reformat", "boundary-project-tree-format",
    }
    expected_v2_confirmatory = {
        (task_id, condition) for task_id in legacy_task_ids for condition in ("current", "slim", "none")
    }
    expected_v2_confirmatory |= {(task_id, "slim") for task_id in v2_probes}
    if v2_pilot_cells != expected_v2_pilot or v2_confirmatory_cells != expected_v2_confirmatory:
        fail("refinement-v2 campaign must contain reusable 12-cell pilot and 40-cell confirmation", failures)

    v3_stage_names = list(v3_campaign.get("stages", {}))
    if v3_stage_names != ["routing", "pilot", "confirmatory"]:
        fail("refinement-v3 stages must be ordered routing, pilot, confirmatory", failures)
    v3_routing_cells = expand_stage(v3_campaign, "refinement-v3", "routing")
    v3_pilot_cells = expand_stage(v3_campaign, "refinement-v3", "pilot")
    v3_confirmatory_cells = expand_stage(v3_campaign, "refinement-v3", "confirmatory")
    v3_routing_ids = {
        "experiment-plan", "project-setup-diagnosis", "citation-support-audit", "quest-resume",
        "boundary-experiment-reformat", "boundary-project-tree-format", "boundary-code-review", "boundary-risk-gate",
    }
    expected_v3_routing = {(task_id, "slim") for task_id in v3_routing_ids}
    expected_v3_pilot = expected_v3_routing | {
        ("experiment-plan", "current"), ("experiment-plan", "none"),
        ("project-setup-diagnosis", "current"), ("project-setup-diagnosis", "none"),
        ("citation-support-audit", "current"), ("quest-resume", "current"),
    }
    expected_v3_confirmatory = {
        (task_id, condition) for task_id in legacy_task_ids for condition in ("current", "slim", "none")
    } | {(task_id, "slim") for task_id in legacy_probe_ids}
    if (
        v3_routing_cells != expected_v3_routing
        or v3_pilot_cells != expected_v3_pilot
        or v3_confirmatory_cells != expected_v3_confirmatory
        or not v3_routing_cells <= v3_pilot_cells <= v3_confirmatory_cells
    ):
        fail("refinement-v3 campaign must contain exact nested 8/14/42-cell stages", failures)
    v4_stage_names = list(v4_campaign.get("stages", {}))
    if v4_stage_names != ["activation", "comparison"]:
        fail("refinement-v4 stages must be ordered activation, comparison", failures)
    v4_activation_cells = expand_stage(v4_campaign, "refinement-v4", "activation")
    v4_comparison_cells = expand_stage(v4_campaign, "refinement-v4", "comparison")
    positive_ids = {pair[0] for pair in EXPECTED_V4_PORTFOLIO.values()}
    bypass_ids = {pair[1] for pair in EXPECTED_V4_PORTFOLIO.values()}
    expected_v4_activation = {(task_id, "slim") for task_id in positive_ids | bypass_ids}
    expected_v4_comparison = {
        (task_id, condition)
        for task_id in positive_ids
        for condition in ("current", "slim", "none")
    } | {
        (task_id, condition)
        for task_id in bypass_ids
        for condition in ("slim", "none")
    }
    if (
        v4_activation_cells != expected_v4_activation
        or v4_comparison_cells != expected_v4_comparison
        or len(v4_activation_cells) != 22
        or len(v4_comparison_cells) != 55
        or not v4_activation_cells <= v4_comparison_cells
    ):
        fail("refinement-v4 campaign must contain exact nested 22/55-cell portfolio stages", failures)

    routing_cells = expand_stage(routing_campaign, "simplification-routing-v1", "routing")
    expected_routing_ids = {
        "computation-convergence-audit", "experiment-plan", "figure-fixed-csv",
        "ideation-generate-portfolio-v1", "literature-prior-map",
        "project-setup-diagnosis", "quest-resume", "review-multidimension",
        "slides-compact-route", "theory-research-proof-audit",
        "writing-evidence-revision", "synthesis-cross-paper",
        "explicit-idea-evaluation", "explicit-opportunity-mining", "explicit-quest-admin",
        "implicit-idea-evaluation-bypass", "implicit-quest-admin-bypass",
        "implicit-opportunity-mining-bypass", "synthesis-one-paper-bypass",
    }
    if list(routing_campaign.get("stages", {})) != ["routing"] or routing_cells != {
        (task_id, "slim") for task_id in expected_routing_ids
    }:
        fail("simplification routing campaign must contain exactly 19 slim-only cells", failures)
    routing_cases = [cases_by_id.get(task_id, {}) for task_id in expected_routing_ids]
    positives = [case for case in routing_cases if case.get("evaluation_role") == "positive"]
    bypasses = [case for case in routing_cases if case.get("evaluation_role") == "bypass"]
    if (
        len(positives) != 15
        or {case.get("expected_candidate_skill") for case in positives} != RESEARCH_SKILLS
        or len(bypasses) != 4
        or any(case.get("expected_candidate_skill", "missing") is not None for case in bypasses)
    ):
        fail("simplification routing campaign must cover 15 positive and 4 bypass routes", failures)
    v5_stage_names = list(v5_campaign.get("stages", {}))
    if v5_stage_names != ["activation", "comparison"]:
        fail("refinement-v5 stages must be ordered activation, comparison", failures)
    v5_activation_cells = expand_stage(v5_campaign, "refinement-v5", "activation")
    v5_comparison_cells = expand_stage(v5_campaign, "refinement-v5", "comparison")
    if v5_activation_cells != expected_v4_activation or v5_comparison_cells != expected_v4_comparison:
        fail("refinement-v5 must preserve the exact V4 22/55 portfolio matrix", failures)
    for task in [*tasks, *probes]:
        fixture = ROOT / "evals" / "research-skills" / task.get("fixture", "")
        if not fixture.is_dir() or not (fixture / "PROMPT.md").is_file():
            fail(f"evaluation task {task.get('id')}: missing fixture or PROMPT.md", failures)

    validate_legacy_configs()
    if failures:
        print(f"FAILED {len(failures)} research-skill checks")
        return 1
    print(
        f"OK {len(RESEARCH_SKILLS)} research skills "
        f"({len(CANONICAL)} historical evaluation owners), "
        f"{len(tasks)} historical eval tasks, {len(routing_cells)} current routing cells"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
