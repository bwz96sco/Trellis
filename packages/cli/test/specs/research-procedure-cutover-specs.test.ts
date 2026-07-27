import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SPEC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
  ".trellis",
  "spec",
);
const SCENARIO_HEADING = "## Scenario: Research Procedure dispatch cutover";
const ORDERED_SECTIONS = [
  "### 1. Scope / Trigger",
  "### 2. Signatures",
  "### 3. Contracts",
  "### 4. Validation & Error Matrix",
  "### 5. Good / Base / Bad Cases",
  "### 6. Tests Required",
  "### 7. Wrong vs Correct",
] as const;
const SCENARIO_FILES = [
  "cli/backend/commands-research.md",
  "cli/backend/research-worker-hooks.md",
  "cli/backend/platform-integration.md",
  "cli/backend/filesystem-safety.md",
  "cli/unit-test/integration-patterns.md",
] as const;

function readSpec(relativePath: string): string {
  return fs.readFileSync(path.join(SPEC_ROOT, relativePath), "utf8");
}

function extractScenario(spec: string): string {
  const start = spec.indexOf(SCENARIO_HEADING);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(spec.indexOf(SCENARIO_HEADING, start + SCENARIO_HEADING.length)).toBe(
    -1,
  );
  const nextHeading = spec.indexOf("\n## ", start + SCENARIO_HEADING.length);
  return spec.slice(start, nextHeading === -1 ? undefined : nextHeading);
}

function assertOrderedSevenSections(scenario: string): void {
  let previous = -1;
  for (const heading of ORDERED_SECTIONS) {
    const index = scenario.indexOf(heading);
    expect(index).toBeGreaterThan(previous);
    expect(scenario.indexOf(heading, index + heading.length)).toBe(-1);
    previous = index;
  }
  expect(scenario.match(/^### /gm)).toHaveLength(ORDERED_SECTIONS.length);
}

function findScenarioFiles(directory: string, prefix = ""): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.posix.join(prefix, entry.name);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return findScenarioFiles(absolute, relative);
      if (!entry.isFile() || !entry.name.endsWith(".md")) return [];
      return fs.readFileSync(absolute, "utf8").includes(SCENARIO_HEADING)
        ? [relative]
        : [];
    })
    .sort();
}

describe("Research Procedure dispatch cutover executable specs", () => {
  it("indexes all five scenario contracts without becoming a scenario file", () => {
    const index = readSpec("cli/backend/index.md");
    expect(index).not.toContain(SCENARIO_HEADING);
    expect(index).toContain(
      "./commands-research.md#scenario-research-procedure-dispatch-cutover",
    );
    expect(index).toContain(
      "./research-worker-hooks.md#scenario-research-procedure-dispatch-cutover",
    );
    expect(index).toContain(
      "./platform-integration.md#scenario-research-procedure-dispatch-cutover",
    );
    expect(index).toContain(
      "./filesystem-safety.md#scenario-research-procedure-dispatch-cutover",
    );
    expect(index).toContain(
      "../unit-test/integration-patterns.md#scenario-research-procedure-dispatch-cutover",
    );
  });

  it.each(SCENARIO_FILES)(
    "contains one ordered seven-section scenario in %s",
    (file) => {
      assertOrderedSevenSections(extractScenario(readSpec(file)));
    },
  );

  it("keeps the scenario heading in exactly the five approved spec files", () => {
    expect(findScenarioFiles(SPEC_ROOT)).toEqual([...SCENARIO_FILES].sort());
  });

  it("locks the Task #63 remediation contract into all five scenarios", () => {
    const commands = extractScenario(readSpec(SCENARIO_FILES[0]));
    const workers = extractScenario(readSpec(SCENARIO_FILES[1]));
    const platform = extractScenario(readSpec(SCENARIO_FILES[2]));
    const filesystem = extractScenario(readSpec(SCENARIO_FILES[3]));
    const integration = extractScenario(readSpec(SCENARIO_FILES[4]));

    expect(commands).toContain("one captured canonical `ResearchState`");
    expect(commands).toContain(
      "Request materialization mismatch precedes binding drift.",
    );
    expect(commands).toContain("one cache-free target Repository observation");
    expect(commands).toContain('"safeAction":"report-to-root-no-write"');
    expect(commands).toContain("`validateResearchBatchReadOnly`");
    expect(commands).toContain("Non-dry-run commit remains lockful");
    expect(commands).toContain(
      "classifies exact same-key replay before current clock validation",
    );
    expect(commands).toContain(
      "Result, Proposal, and consumed-Approval sidecars use hardened publication",
    );

    expect(workers).toContain(
      "Adapter/worker/template bytes remain unchanged.",
    );
    expect(workers).toContain(
      "Adapters do not recompute, reorder, cache, or supplement those decisions.",
    );
    expect(workers).toContain(
      "Exact normalized success bytes consumed by adapters remain unchanged",
    );
    expect(workers).toContain("Dry-run validation, lockful commit");

    expect(platform).toContain(
      "C07 adapter/worker/template bytes remain frozen.",
    );
    expect(platform).toContain("Task #63 adds no generated asset");
    expect(platform).toContain(
      "Root-side remediation tests live outside payload generation",
    );

    expect(filesystem).toContain(
      "exactly one cache-free target Repository observation",
    );
    expect(filesystem).toContain(
      "Exact same-key replay is classified from canonical ledger before current clock validation",
    );
    expect(filesystem).toContain(
      "Dry-run uses `validateResearchBatchReadOnly` against one caller snapshot.",
    );
    expect(filesystem).toContain(
      "Result, Proposal, and consumed-Approval sidecars share hardened publication",
    );
    expect(filesystem).toContain(
      "Sidecar publication is sequential post-commit, not a filesystem transaction.",
    );

    expect(integration).toContain(
      "Context precedence fixtures combine request, Procedure, policy, scope, artifact, Approval, materialization, and output-ID faults.",
    );
    expect(integration).toContain(
      "CLI failure tests assert exact envelope/key set",
    );
    expect(integration).toContain(
      "using invalid clock plus missing path/throwing stdin",
    );
    expect(integration).toContain(
      "Host adapter/worker/template bytes and packed success contract remain unchanged",
    );
  });

  it("keeps core Research state guard-only with exact successor event authority", () => {
    const core = readSpec("core/backend/research-state.md");
    expect(core).not.toContain(SCENARIO_HEADING);
    expect(core).toContain("## Research Procedure dispatch cutover guard");
    expect(core).toContain(
      "schema-v1 `result.recorded`, schema-v1 `proposal.recorded`, then schema-v2 `approval.consumed`",
    );
    expect(core).toContain(
      "The predecessor two-event Result/Proposal production batch is rejected.",
    );
    expect(core).toContain(
      "applying or rejecting the Proposal remains a separate root-owned mutation",
    );
    expect(core).toContain(
      "Core read-only validation and lockful commit are separate authorities.",
    );
    expect(core).toContain(
      "`validateResearchBatchReadOnly` validates a caller-supplied canonical snapshot",
    );
    expect(core).toContain(
      "Approval-bound exact same-key replay is classified from canonical ledger before current clock validation",
    );
    expect(core).toContain(
      "Result, Proposal, and Approval sidecars are projections only",
    );
    expect(core).toContain("replacement events for materialization recovery");
  });
});
