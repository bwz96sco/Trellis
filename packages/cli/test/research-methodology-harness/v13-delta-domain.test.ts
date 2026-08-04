import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  deriveMethodologyValidatorFacts,
  resolveMethodologyContractBinding,
  shouldMaterializeMethodologyReportSidecar,
} from "@mindfoldhq/trellis-core/research";

import {
  assertRegistryComplete,
  loadCaseRegistry,
} from "./case-registry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const domainPath = path.join(here, "v13-delta-domain.json");

describe("v1.3 delta domain (separate from frozen 229/38)", () => {
  it("preserves frozen 229 and expansion 38 registries byte-stable", () => {
    const registry = loadCaseRegistry();
    const completeness = assertRegistryComplete(registry);
    expect(completeness.ok).toBe(true);
    expect(registry.frozen).toHaveLength(229);
    expect(registry.expansion).toHaveLength(38);
  });

  it("loads a digest-bound v1.3 delta domain that is not relabeled as v1.2", () => {
    const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as {
      kind: string;
      domainId: string;
      notRelabeledAsFrozenV12: boolean;
      methodologyContractVersion: string;
      methodologyContractDigest: string;
      frozenV12RegistryCounts: {
        frozen229: number;
        expansion38: number;
        preservedUnchanged: boolean;
      };
      cases: Array<{ caseId: string }>;
    };
    expect(domain.kind).toBe("evaluation-contract-v1.3-delta-domain");
    expect(domain.domainId).toBe("V13-DELTA");
    expect(domain.notRelabeledAsFrozenV12).toBe(true);
    expect(domain.methodologyContractVersion).toBe(
      V13_METHODOLOGY_CONTRACT_VERSION,
    );
    expect(domain.methodologyContractDigest).toBe(
      V13_METHODOLOGY_CONTRACT_DIGEST,
    );
    expect(domain.frozenV12RegistryCounts).toEqual({
      frozen229: 229,
      expansion38: 38,
      preservedUnchanged: true,
    });
    expect(domain.cases.length).toBeGreaterThanOrEqual(5);
    expect(domain.cases.every((c) => c.caseId.startsWith("V13-"))).toBe(true);
  });

  it("executes shipped functions for v1.3 delta semantics", () => {
    // V13-NO-STATUS-HEURISTIC
    const facts = deriveMethodologyValidatorFacts({
      resultStatus: "completed",
      methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
    });
    expect(facts).not.toHaveProperty("selected");
    expect(facts).not.toHaveProperty("blocked");

    // Contained: 2.0.3 is historical-unaccepted, not development binding.
    expect(resolveMethodologyContractBinding("2.0.3").disposition).toBe(
      "historical-unaccepted-2.0.3-not-authoritative",
    );
    expect(resolveMethodologyContractBinding("2.0.3").authoritative).toBe(
      false,
    );

    // V13-SIDECAR-ONLY-AFTER-BATCH
    expect(
      shouldMaterializeMethodologyReportSidecar({
        validationOk: true,
        criticalFailure: false,
        batchCommitted: false,
      }),
    ).toBe(false);
  });
});
