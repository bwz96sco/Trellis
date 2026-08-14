import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  selectApplicableV131BindingsForProcedure,
} from "@mindfoldhq/trellis-core/research";

import {
  A133_CANDIDATE_MANIFEST_SHA256,
  A133_COMMIT,
  A133_COMPLETE_OUTPUT_SET_SHA256,
  A133_TREE,
  B133_COMMIT,
  B133_TREE,
  LIVE_PROCEDURE_VERSION,
  O133_COMMIT,
  O133_TREE,
  PROCEDURE_IDS,
  PROCEDURE_VERSION,
  REPO_ROOT,
  T3_COMMIT,
  T3_CORRECTION_COMMIT,
  T3_CORRECTION_TREE,
  T3_TREE,
  T4_RESEARCH_ROOT,
  assertInstalledAndImmutablePacksMatch,
  parseV207Procedure,
  sha256File,
  writeCanonicalJson,
} from "../research-methodology-harness/production-116.js";

const UNREGISTERED_NOT_APPLICABLE_PROCEDURES = new Set([
  "figure-v1",
  "slides-v1",
  "survey-v1",
  "writing-case-v1",
]);

interface EvidenceRow {
  readonly population: string;
  readonly ordinal: number;
  readonly caseId: string;
  readonly actualProductionOutcome: string;
  readonly expectedProductionOutcome: string;
  readonly productionEntryPoint: string;
  readonly outcomeSource: string;
  readonly productionCallCount: number;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly liveProcedureVersion: string;
  readonly expectedCodesPresent: boolean;
  readonly zeroWrite: boolean;
  readonly canonicalEventDelta: { readonly appendedCount: number };
}

interface DifferentialDomains {
  readonly frozenV12: {
    readonly count: number;
    readonly sourceDigest: string;
    readonly identityMutationAllowed: boolean;
  };
  readonly expansion38: {
    readonly count: number;
    readonly sourceDigest: string;
    readonly relationship: string;
  };
  readonly v13Delta: {
    readonly caseCount: number;
    readonly idNamespace: string;
    readonly relationship: string;
  };
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitText(commit: string, relativePath: string): string {
  return execFileSync(
    "git",
    ["-C", REPO_ROOT, "show", `${commit}:${relativePath}`],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
}

function gitTree(commit: string): string {
  return execFileSync("git", ["-C", REPO_ROOT, "rev-parse", `${commit}^{tree}`], {
    encoding: "utf8",
  }).trim();
}

function parseJsonLines(filePath: string): EvidenceRow[] {
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.endsWith("\n") || text.endsWith("\n\n")) {
    throw new Error("Production evidence must have exactly one final LF");
  }
  return text
    .trimEnd()
    .split("\n")
    .map((line, index) => {
      try {
        return JSON.parse(line) as EvidenceRow;
      } catch (error) {
        throw new Error(`Production evidence line ${index + 1} is invalid JSON`, {
          cause: error,
        });
      }
    });
}

function validateProductionEvidence(
  rows: readonly EvidenceRow[],
  acceptedCaseIds: readonly string[],
): void {
  if (rows.length !== 116) {
    throw new Error(`Missing or extra production evidence: expected 116, got ${rows.length}`);
  }
  const ids = rows.map((row) => row.caseId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate production evidence caseId");
  }
  if (
    acceptedCaseIds.length !== 116 ||
    acceptedCaseIds.some((caseId, index) => ids[index] !== caseId)
  ) {
    throw new Error("Skipped or reordered production case evidence");
  }
  const ordinals = rows.map((row) => row.ordinal);
  if (ordinals.some((ordinal, index) => ordinal !== index)) {
    throw new Error("Skipped or duplicate production evidence ordinal");
  }
  for (const row of rows) {
    if (row.population !== "production-116") {
      throw new Error("Population-conflated production evidence");
    }
    if (
      row.productionEntryPoint !== "recordApprovedResearchDispatchResult" ||
      row.outcomeSource !== "root-owned-production-entry-point" ||
      row.productionCallCount !== 1
    ) {
      throw new Error("Disconnected-oracle production evidence");
    }
    if (
      row.actualProductionOutcome !== row.expectedProductionOutcome ||
      row.expectedCodesPresent !== true
    ) {
      throw new Error(`Production outcome mismatch for ${row.caseId}`);
    }
    if (row.actualProductionOutcome === "rejected") {
      if (row.zeroWrite !== true || row.canonicalEventDelta.appendedCount !== 0) {
        throw new Error(`Rejected case ${row.caseId} lacks zero-write proof`);
      }
    }
    if (
      row.procedureVersion !== PROCEDURE_VERSION ||
      row.liveProcedureVersion !== LIVE_PROCEDURE_VERSION
    ) {
      throw new Error(`Procedure authority drift for ${row.caseId}`);
    }
  }
}

function loadDifferentialDomains(): DifferentialDomains {
  const document = JSON.parse(
    gitText(
      A133_COMMIT,
      ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research/differential-test-matrix-v1.3.1.json",
    ),
  ) as { readonly domains: DifferentialDomains };
  return document.domains;
}

function buildInputAttestation(): Record<string, unknown> {
  const { immutable, installed } = assertInstalledAndImmutablePacksMatch();
  const candidateManifestPath =
    ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research/contract-candidate-manifest-v1.3.1.json";
  const candidateManifestBytes = gitText(A133_COMMIT, candidateManifestPath);
  const g0Attestation = JSON.parse(
    gitText(
      T3_CORRECTION_COMMIT,
      ".trellis/tasks/08-12-govern-evaluation-contract-v1-3-1-technical-successor/research/g0-accepted-semantic-input-attestation.json",
    ),
  ) as Record<string, unknown>;
  return {
    schemaVersion: 1,
    recordKind: "harness-input-attestation",
    stage: "T4",
    immutableInputs: {
      a133: {
        commit: A133_COMMIT,
        tree: A133_TREE,
        observedTree: gitTree(A133_COMMIT),
        candidateManifestSha256: A133_CANDIDATE_MANIFEST_SHA256,
        observedCandidateManifestSha256: sha256(candidateManifestBytes),
        memberAggregateSha256: immutable.derivedMemberAggregateSha256,
        semanticDigest: immutable.acceptedContractDigest,
        completeOutputSetSha256: A133_COMPLETE_OUTPUT_SET_SHA256,
      },
      b133: {
        commit: B133_COMMIT,
        tree: B133_TREE,
        observedTree: gitTree(B133_COMMIT),
        humanReviewed: false,
        humanEquivalent: false,
      },
      o133: {
        commit: O133_COMMIT,
        tree: O133_TREE,
        observedTree: gitTree(O133_COMMIT),
        authority: "semantic-use-only",
      },
      t3Correction: {
        commit: T3_CORRECTION_COMMIT,
        tree: T3_CORRECTION_TREE,
        observedTree: gitTree(T3_CORRECTION_COMMIT),
        parentCommit: "4082d51fdd7359bf224fbd33d772a56c49a2ec0c",
      },
      t3PackageProjection: {
        commit: T3_COMMIT,
        tree: T3_TREE,
        observedTree: gitTree(T3_COMMIT),
      },
    },
    installedAuthority: {
      contractVersion: installed.contractVersion,
      acceptedContractDigest: installed.acceptedContractDigest,
      memberAggregateSha256: installed.derivedMemberAggregateSha256,
      memberDigests: installed.memberDigests,
      matchesImmutableA133:
        JSON.stringify(installed.memberDigests) ===
        JSON.stringify(immutable.memberDigests),
    },
    procedureAuthority: {
      allocatedVersion: PROCEDURE_VERSION,
      dormant: true,
      liveSelection: LIVE_PROCEDURE_VERSION,
      activationAuthorized: false,
      liveSelectionChangeAuthorized: false,
      familyCount: PROCEDURE_IDS.length,
    },
    governanceAttestationDigest: sha256(JSON.stringify(g0Attestation)),
    containment: {
      providerExecution: false,
      network: false,
      release: false,
      publication: false,
      push: false,
      archive: false,
      activation: false,
      productionSourceModified: false,
    },
    verdict: "pass",
  };
}

describe("T4 v1.3.1 coverage and evidence reconciliation", () => {
  const { immutable: pack } = assertInstalledAndImmutablePacksMatch();
  const acceptedCaseIds = pack.deltaCases.map((row) => String(row.caseId));
  const evidencePath = path.join(
    T4_RESEARCH_ROOT,
    "production-116-case-evidence.jsonl",
  );

  it("reconciles exact independent populations and contract/package totals", () => {
    const domains = loadDifferentialDomains();
    expect(domains).toEqual({
      expansion38: {
        count: 38,
        relationship: "separate-post-freeze-expansion",
        sourceDigest:
          "d70c0fbe3a23860b3113acfd87419a512da95d61c1cd5c5cfa8f9f4b8d09715a",
      },
      frozenV12: {
        count: 229,
        identityMutationAllowed: false,
        sourceDigest:
          "b4d9a6d46920e56ef1092b32d1e1a8fad8d85b98f6bbda7109eec9bd580e4834",
      },
      v13Delta: {
        caseCount: 116,
        idNamespace: "V13-*",
        relationship: "new-reviewed-semantics-only",
      },
    });
    expect(new Set(acceptedCaseIds).size).toBe(116);
    expect(acceptedCaseIds.every((caseId) => caseId.startsWith("V13-"))).toBe(true);

    const families = pack.mappingRows.map((row) => row.procedureId);
    expect(families).toHaveLength(17);
    expect(new Set(families).size).toBe(17);
    expect(new Set(families)).toEqual(new Set(PROCEDURE_IDS));
    expect(pack.artifacts).toHaveLength(65);
    const dimensions = new Set(
      pack.artifacts.flatMap((artifact) => Object.keys(artifact.dimensions)),
    );
    expect(dimensions.size).toBe(13);
    expect(pack.validators).toHaveLength(20);
    expect(pack.bindings).toHaveLength(876);
    expect(pack.deltaCases).toHaveLength(116);
    expect(pack.provenanceRows).toHaveLength(3_343);

    const applicableBindingIds = new Set<string>();
    const productionRegisteredProcedures: string[] = [];
    const structuralOnlyProcedures: string[] = [];
    for (const procedureId of PROCEDURE_IDS) {
      const mapping = pack.mappingRows.find((row) => row.procedureId === procedureId);
      expect(mapping, procedureId).toBeDefined();
      if (UNREGISTERED_NOT_APPLICABLE_PROCEDURES.has(procedureId)) {
        expect(mapping?.disposition, procedureId).toBe("notApplicable");
        structuralOnlyProcedures.push(procedureId);
        continue;
      }
      const procedure = parseV207Procedure(procedureId);
      productionRegisteredProcedures.push(procedureId);
      const applicable = selectApplicableV131BindingsForProcedure({
        pack,
        procedureId,
        procedureVersion: PROCEDURE_VERSION,
        capabilityId: procedure.capabilityId,
      });
      for (const row of applicable) {
        applicableBindingIds.add(row.binding.bindingId);
      }
    }
    expect(productionRegisteredProcedures).toHaveLength(13);
    expect(structuralOnlyProcedures).toEqual([
      "figure-v1",
      "slides-v1",
      "survey-v1",
      "writing-case-v1",
    ]);
    expect(applicableBindingIds.size).toBe(876);

    const rows = parseJsonLines(evidencePath);
    validateProductionEvidence(rows, acceptedCaseIds);

    const coverage = {
      schemaVersion: 1,
      recordKind: "coverage-reconciliation",
      populations: {
        historical: {
          name: "historical-229",
          count: domains.frozenV12.count,
          sourceDigest: domains.frozenV12.sourceDigest,
          executedByThisStage: false,
        },
        expansion: {
          name: "expansion-38",
          count: domains.expansion38.count,
          sourceDigest: domains.expansion38.sourceDigest,
          executedByThisStage: false,
        },
        production: {
          name: "production-116",
          count: rows.length,
          caseIdDigest: `sha256:${sha256(acceptedCaseIds.join("\n"))}`,
          executedByThisStage: true,
        },
        distinct: true,
        conflated: false,
      },
      reconciliation: {
        procedureFamilies: {
          expected: 17,
          actual: new Set(families).size,
          productionRegistered: productionRegisteredProcedures.length,
          structuralOnlyNotApplicable: structuralOnlyProcedures.length,
          source: "authenticated-mapping-rows-and-package-roots",
        },
        enforceableArtifacts: {
          expected: 65,
          actual: pack.artifacts.length,
          source: "authenticated-lifecycle-contract",
        },
        lifecycleDimensions: {
          expected: 13,
          actual: dimensions.size,
          source: "authenticated-artifact-dimension-union",
        },
        trustedValidators: {
          expected: 20,
          actual: pack.validators.length,
          source: "authenticated-validator-registry",
        },
        validatorBindings: {
          expected: 876,
          actual: pack.bindings.length,
          applicableUnion: applicableBindingIds.size,
          source: "authenticated-binding-matrix-and-13-registered-procedure-applicability-union",
        },
        productionMutations: {
          expected: 116,
          actual: rows.length,
          uniqueCaseIds: new Set(rows.map((row) => row.caseId)).size,
          source: "authenticated-differential-matrix-and-production-evidence",
        },
        provenanceRows: {
          expected: 3_343,
          actual: pack.provenanceRows.length,
          source: "authenticated-derivability-provenance-matrix",
        },
      },
      evidenceIntegrity: {
        missing: false,
        duplicate: false,
        skipped: false,
        disconnectedOracle: false,
        populationConflation: false,
        exactProductionEntryPoint: "recordApprovedResearchDispatchResult",
      },
      authority: {
        contractDigest: V131_ACCEPTED_CONTRACT_DIGEST,
        memberAggregateSha256: V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
        procedureVersion: PROCEDURE_VERSION,
        dormant: true,
        liveSelection: LIVE_PROCEDURE_VERSION,
      },
      verdict: "pass",
    };
    writeCanonicalJson(
      path.join(T4_RESEARCH_ROOT, "harness-input-attestation.json"),
      buildInputAttestation(),
    );
    writeCanonicalJson(
      path.join(T4_RESEARCH_ROOT, "coverage-reconciliation.json"),
      coverage,
    );
  });

  it("rejects missing, duplicate, skipped, disconnected, and conflated evidence", () => {
    const rows = parseJsonLines(evidencePath);
    expect(() => validateProductionEvidence(rows.slice(1), acceptedCaseIds)).toThrow(
      /Missing or extra/,
    );
    expect(() =>
      validateProductionEvidence([...rows.slice(0, -1), rows[0] as EvidenceRow], acceptedCaseIds),
    ).toThrow(/Duplicate/);
    expect(() =>
      validateProductionEvidence(
        [rows[1] as EvidenceRow, rows[0] as EvidenceRow, ...rows.slice(2)],
        acceptedCaseIds,
      ),
    ).toThrow(/Skipped or reordered/);
    expect(() =>
      validateProductionEvidence(
        [
          { ...rows[0], outcomeSource: "semantic-evaluator" } as EvidenceRow,
          ...rows.slice(1),
        ],
        acceptedCaseIds,
      ),
    ).toThrow(/Disconnected-oracle/);
    expect(() =>
      validateProductionEvidence(
        [
          { ...rows[0], population: "historical-229" } as EvidenceRow,
          ...rows.slice(1),
        ],
        acceptedCaseIds,
      ),
    ).toThrow(/Population-conflated/);
  });

  it("records compact evidence digests after reconciliation", () => {
    for (const name of [
      "harness-input-attestation.json",
      "production-116-case-evidence.jsonl",
      "coverage-reconciliation.json",
      "filesystem-and-event-effects.json",
      "execution-evidence-ledger.json",
    ]) {
      const filePath = path.join(T4_RESEARCH_ROOT, name);
      expect(fs.existsSync(filePath), name).toBe(true);
      expect(sha256File(filePath), name).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
