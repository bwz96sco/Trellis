import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  buildSupportPackInventory,
  computeResearchProcedureDigestV2,
  parseAcceptedV131ContractPack,
  parseAcceptedV131ResearchProcedure,
  parseSupportPackManifest,
  resolveV131ProcedureArtifactFamilyMapping,
  selectApplicableV131BindingsForProcedure,
  serializeSupportPackInventoryForDigest,
} from "@mindfoldhq/trellis-core/research";
import type {
  V131AcceptedContractPack,
  V131LeafFileName,
} from "@mindfoldhq/trellis-core/research";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const procedureRoot = path.join(
  repoRoot,
  "packages/cli/src/templates/research/procedures",
);
const taskRoot = path.join(
  repoRoot,
  ".trellis/tasks/08-12-project-procedure-2-0-7-family-packages",
);
const generatorPath = path.join(
  repoRoot,
  "packages/cli/scripts/research-methodology-207-generate.py",
);

const PREDECESSOR_COMMIT =
  "3ff308c2befe574512a8eb173eebbe6d3141c6d9";
const PREDECESSOR_TREE = "2830c1415ae282e99c3539eb155a4af19cb7bcb9";
const A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3";
const A133_ROOT =
  ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research";
const PROCEDURE_VERSION = "2.0.7";
const LIVE_SELECTION = "1.0.0";

const PROCEDURES = [
  "computation-case-v1",
  "experiment-campaign-v1",
  "experiment-round-v1",
  "figure-v1",
  "idea-evaluation-v1",
  "idea-generation-v1",
  "literature-review-v1",
  "literature-scan-v1",
  "project-setup-v1",
  "quest-admin-v1",
  "quest-framing-v1",
  "review-campaign-v1",
  "review-case-v1",
  "slides-v1",
  "survey-v1",
  "theory-case-v1",
  "writing-case-v1",
] as const;

const CLOSURE_FAMILIES: Readonly<Record<string, string>> = {
  "experiment-campaign-v1": "research-experiment",
  "experiment-round-v1": "research-experiment",
  "idea-evaluation-v1": "research-idea-evaluation",
  "idea-generation-v1": "research-ideation",
  "literature-review-v1": "research-literature",
  "literature-scan-v1": "research-literature",
};

const HISTORICAL_VERSIONS = new Set([
  "1.0.0",
  "2.0.0",
  "2.0.1",
  "2.0.2",
  "2.0.3",
  "2.0.4",
  "2.0.5",
  "2.0.6",
]);

const UNREGISTERED_NOT_APPLICABLE_PROCEDURES = new Set([
  "figure-v1",
  "slides-v1",
  "survey-v1",
  "writing-case-v1",
]);

interface PackageContract {
  readonly acceptedContractDigest: string;
  readonly acceptedMemberAggregateSha256: string;
  readonly authorityFlags: Readonly<Record<string, boolean>>;
  readonly capabilityId: string;
  readonly closureDisposition: Readonly<Record<string, unknown>>;
  readonly dormant: boolean;
  readonly liveSelection: string;
  readonly mapping: Readonly<Record<string, unknown>>;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly supportInventory: {
    readonly workerVisible: readonly string[];
    readonly rootOnly: readonly string[];
    readonly discoveryAuthorized: boolean;
    readonly complete: boolean;
  };
  readonly validatorDescriptorsExecutable: boolean;
  readonly workerAuthority: string;
}

interface DigestDocument {
  readonly inventoryDigest: string;
  readonly packJsonSha256: string;
  readonly procedureDigest: string;
}

interface ValidatorDocument {
  readonly descriptorOnly: boolean;
  readonly executableValidatorBodiesIncluded: boolean;
  readonly validatorCount: number;
  readonly validators: readonly Readonly<Record<string, unknown>>[];
}

interface LifecycleDocument {
  readonly mapping: Readonly<Record<string, unknown>>;
  readonly rowCount: number;
  readonly rows: readonly { readonly artifactId: string }[];
}

interface BindingsDocument {
  readonly bindingCount: number;
  readonly bindings: readonly { readonly bindingId: string }[];
}

function gitBytes(commit: string, relativePath: string): Buffer {
  return execFileSync(
    "git",
    ["-C", repoRoot, "show", `${commit}:${relativePath}`],
    { maxBuffer: 16 * 1024 * 1024 },
  );
}

function gitText(args: readonly string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function parseJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function loadImmutablePack(): V131AcceptedContractPack {
  const leafBytes: Partial<Record<V131LeafFileName, Uint8Array>> = {};
  for (const memberName of V131_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    leafBytes[memberName] = new Uint8Array(
      gitBytes(A133_COMMIT, `${A133_ROOT}/${memberName}`),
    );
  }
  return parseAcceptedV131ContractPack({ leafBytes });
}

function packageDirectory(procedureId: string): string {
  return path.join(procedureRoot, procedureId, PROCEDURE_VERSION);
}

function packageFilePaths(procedureId: string): string[] {
  const root = packageDirectory(procedureId);
  const paths: string[] = [];
  const walk = (directory: string): void => {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const stat = fs.statSync(absolute);
      if (stat.isDirectory()) {
        walk(absolute);
      } else if (stat.isFile()) {
        paths.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  };
  walk(root);
  return paths.sort();
}

function expectedPackageFiles(procedureId: string): string[] {
  const closureFamily = CLOSURE_FAMILIES[procedureId];
  const closurePath =
    closureFamily === undefined
      ? "methodology/closure/disposition.json"
      : `methodology/closure/${closureFamily}.json`;
  return [
    "PROCEDURE.md",
    "methodology/artifacts/artifact-contract.json",
    "methodology/bindings/bindings.json",
    closurePath,
    "methodology/digests.json",
    "methodology/instructions/checkpoints.md",
    "methodology/lifecycle/lifecycle-rows.json",
    "methodology/pack.json",
    "methodology/pack.json.sha256",
    "methodology/package-contract.json",
    "methodology/validators/validators.json",
    "procedure.json",
  ].sort();
}

function sha256Prefixed(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function loadPackageInventory(procedureId: string): {
  readonly manifest: ReturnType<typeof parseSupportPackManifest>;
  readonly inventoryItems: ReturnType<typeof buildSupportPackInventory>;
  readonly manifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
  readonly packJsonBytes: Uint8Array;
} {
  const directory = packageDirectory(procedureId);
  const manifestBytes = new Uint8Array(
    fs.readFileSync(path.join(directory, "procedure.json")),
  );
  const instructionBytes = new Uint8Array(
    fs.readFileSync(path.join(directory, "PROCEDURE.md")),
  );
  const packJsonBytes = new Uint8Array(
    fs.readFileSync(path.join(directory, "methodology/pack.json")),
  );
  const manifest = parseSupportPackManifest({
    packJsonBytes,
    procedureId,
    procedureVersion: PROCEDURE_VERSION,
  });
  const files: Record<string, Uint8Array> = {};
  for (const entry of manifest.entries) {
    files[entry.path] = new Uint8Array(
      fs.readFileSync(path.join(directory, "methodology", entry.path)),
    );
  }
  return {
    manifest,
    inventoryItems: buildSupportPackInventory({ manifest, files }),
    manifestBytes,
    instructionBytes,
    packJsonBytes,
  };
}

describe("immutable dormant Procedure 2.0.7 family packages", () => {
  it("authenticates immutable A133 input and has exactly 17 twelve-file package roots", () => {
    expect(
      gitText(["rev-parse", `${PREDECESSOR_COMMIT}^{commit}`]).trim(),
    ).toBe(PREDECESSOR_COMMIT);
    expect(gitText(["rev-parse", `${PREDECESSOR_COMMIT}^{tree}`]).trim()).toBe(
      PREDECESSOR_TREE,
    );
    expect(() =>
      gitText([
        "merge-base",
        "--is-ancestor",
        PREDECESSOR_COMMIT,
        "HEAD",
      ]),
    ).not.toThrow();
    const pack = loadImmutablePack();
    expect(pack.contractVersion).toBe(V131_ACCEPTED_CONTRACT_VERSION);
    expect(pack.acceptedContractDigest).toBe(V131_ACCEPTED_CONTRACT_DIGEST);
    expect(pack.derivedMemberAggregateSha256).toBe(
      V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    );
    expect(pack.mappingRows).toHaveLength(17);

    const families = fs
      .readdirSync(procedureRoot)
      .filter((name) => fs.statSync(path.join(procedureRoot, name)).isDirectory())
      .sort();
    expect(families).toEqual([...PROCEDURES].sort());
    for (const procedureId of PROCEDURES) {
      expect(packageFilePaths(procedureId)).toEqual(
        expectedPackageFiles(procedureId),
      );
    }
  });

  it("parses every support pack and every registered Procedure through the exact Core schema-v2 path", () => {
    for (const procedureId of PROCEDURES) {
      const loaded = loadPackageInventory(procedureId);
      expect(loaded.manifest.methodologyContractVersion).toBe(
        V131_ACCEPTED_CONTRACT_VERSION,
      );
      expect(loaded.manifest.methodologyContractDigest).toBe(
        V131_ACCEPTED_CONTRACT_DIGEST,
      );
      expect(loaded.manifest.entries).toHaveLength(7);
      expect(loaded.manifest.entries.map((entry) => entry.path)).toEqual(
        [...loaded.manifest.entries.map((entry) => entry.path)].sort(),
      );

      if (UNREGISTERED_NOT_APPLICABLE_PROCEDURES.has(procedureId)) {
        continue;
      }

      const contract = parseJsonFile<PackageContract>(
        path.join(
          packageDirectory(procedureId),
          "methodology/package-contract.json",
        ),
      );
      const parsed = parseAcceptedV131ResearchProcedure({
        capabilityId: contract.capabilityId,
        source: "bundled",
        manifestBytes: loaded.manifestBytes,
        instructionBytes: loaded.instructionBytes,
        identityMode: "recorded-version",
        recordedProcedureId: procedureId,
        recordedVersion: PROCEDURE_VERSION,
        packageSchemaVersion: 2,
        supportPack: {
          manifest: loaded.manifest,
          packJsonBytes: loaded.packJsonBytes,
          inventoryItems: loaded.inventoryItems,
        },
      });
      expect(parsed.manifest).toMatchObject({
        id: procedureId,
        version: PROCEDURE_VERSION,
        packageSchemaVersion: 2,
      });
      expect(parsed.digestDomain).toBe("v2");
    }
  });

  it("recomputes every Procedure, pack, and inventory digest from exact bytes", () => {
    for (const procedureId of PROCEDURES) {
      const loaded = loadPackageInventory(procedureId);
      const directory = packageDirectory(procedureId);
      const digests = parseJsonFile<DigestDocument>(
        path.join(directory, "methodology/digests.json"),
      );
      const procedureDigest = computeResearchProcedureDigestV2({
        canonicalManifestBytes: loaded.manifestBytes,
        instructionBytes: loaded.instructionBytes,
        packJsonBytes: loaded.packJsonBytes,
        inventoryItems: loaded.inventoryItems,
      });
      expect(digests.procedureDigest).toBe(procedureDigest);
      expect(digests.packJsonSha256).toBe(
        sha256Prefixed(loaded.packJsonBytes),
      );
      expect(digests.inventoryDigest).toBe(
        sha256Prefixed(
          serializeSupportPackInventoryForDigest(loaded.inventoryItems),
        ),
      );
      expect(
        fs
          .readFileSync(path.join(directory, "methodology/pack.json.sha256"), "utf8")
          .trim(),
      ).toBe(digests.packJsonSha256.slice("sha256:".length));
    }
  });

  it("projects exact mappings, lifecycle rows, and applicable bindings from immutable A133", () => {
    const pack = loadImmutablePack();
    for (const procedureId of PROCEDURES) {
      const contract = parseJsonFile<PackageContract>(
        path.join(
          packageDirectory(procedureId),
          "methodology/package-contract.json",
        ),
      );
      const mapping = resolveV131ProcedureArtifactFamilyMapping({
        pack,
        procedureId,
        procedureVersion: PROCEDURE_VERSION,
        capabilityId: contract.capabilityId,
      });
      expect(contract.mapping).toEqual(mapping);

      const lifecycle = parseJsonFile<LifecycleDocument>(
        path.join(
          packageDirectory(procedureId),
          "methodology/lifecycle/lifecycle-rows.json",
        ),
      );
      const expectedArtifacts =
        mapping.artifactFamily === null
          ? []
          : pack.artifacts.filter(
              (artifact) => artifact.family === mapping.artifactFamily,
            );
      expect(lifecycle.mapping).toEqual(mapping);
      expect(lifecycle.rowCount).toBe(expectedArtifacts.length);
      expect(lifecycle.rows.map((row) => row.artifactId)).toEqual(
        expectedArtifacts.map((row) => row.artifactId),
      );

      const bindings = parseJsonFile<BindingsDocument>(
        path.join(
          packageDirectory(procedureId),
          "methodology/bindings/bindings.json",
        ),
      );
      const expectedBindings = selectApplicableV131BindingsForProcedure({
        pack,
        procedureId,
        procedureVersion: PROCEDURE_VERSION,
        capabilityId: contract.capabilityId,
      });
      expect(bindings.bindingCount).toBe(expectedBindings.length);
      expect(bindings.bindings.map((row) => row.bindingId)).toEqual(
        expectedBindings.map((row) => row.binding.bindingId),
      );
    }
  });

  it("keeps support inventories explicit, descriptors non-executable, and all authority dormant", () => {
    for (const procedureId of PROCEDURES) {
      const directory = packageDirectory(procedureId);
      const loaded = loadPackageInventory(procedureId);
      const contract = parseJsonFile<PackageContract>(
        path.join(directory, "methodology/package-contract.json"),
      );
      const workerVisible = loaded.manifest.entries
        .filter((entry) => entry.workerVisibility === "worker-visible")
        .map((entry) => entry.path)
        .sort();
      const rootOnly = loaded.manifest.entries
        .filter((entry) => entry.workerVisibility === "root-only")
        .map((entry) => entry.path)
        .sort();
      expect(contract.supportInventory).toEqual({
        workerVisible,
        rootOnly,
        discoveryAuthorized: false,
        complete: true,
      });
      expect(contract.acceptedContractDigest).toBe(
        V131_ACCEPTED_CONTRACT_DIGEST,
      );
      expect(contract.acceptedMemberAggregateSha256).toBe(
        V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
      );
      expect(contract.procedureId).toBe(procedureId);
      expect(contract.procedureVersion).toBe(PROCEDURE_VERSION);
      expect(contract.workerAuthority).toBe("proposal-only");
      expect(contract.validatorDescriptorsExecutable).toBe(false);
      expect(contract.authorityFlags).toEqual({
        activationAuthorized: false,
        publicationAuthorized: false,
        pushAuthorized: false,
        releaseAuthorized: false,
        workerAuthorityChangeAuthorized: false,
      });
      expect(contract.dormant).toBe(true);
      expect(contract.liveSelection).toBe(LIVE_SELECTION);

      const validators = parseJsonFile<ValidatorDocument>(
        path.join(directory, "methodology/validators/validators.json"),
      );
      expect(validators.descriptorOnly).toBe(true);
      expect(validators.executableValidatorBodiesIncluded).toBe(false);
      expect(validators.validatorCount).toBe(20);
      for (const descriptor of validators.validators) {
        expect(Object.keys(descriptor).sort()).toEqual([
          "description",
          "id",
          "severity",
          "stableErrors",
          "version",
        ]);
        expect(descriptor).not.toHaveProperty("predicate");
        expect(descriptor).not.toHaveProperty("rootImplementation");
        expect(descriptor).not.toHaveProperty("inputFactSchema");
      }
    }
  });

  it("preserves historical bytes, matches the frozen T3 inventory, and regenerates byte-identically", () => {
    const rows = gitText([
      "ls-tree",
      "-r",
      PREDECESSOR_COMMIT,
      "packages/cli/src/templates/research/procedures",
    ])
      .split("\n")
      .filter((row) => row.length > 0);
    for (const row of rows) {
      const tab = row.indexOf("\t");
      expect(tab).toBeGreaterThan(0);
      const relativePath = row.slice(tab + 1);
      const parts = relativePath.split("/");
      expect(parts.slice(0, 6)).toEqual([
        "packages",
        "cli",
        "src",
        "templates",
        "research",
        "procedures",
      ]);
      expect(parts.length).toBeGreaterThanOrEqual(9);
      const version = parts[7];
      if (version === undefined || !HISTORICAL_VERSIONS.has(version)) {
        continue;
      }
      expect(fs.readFileSync(path.join(repoRoot, relativePath))).toEqual(
        gitBytes(PREDECESSOR_COMMIT, relativePath),
      );
    }

    const topology = JSON.parse(
      gitBytes(
        PREDECESSOR_COMMIT,
        ".trellis/tasks/08-12-govern-evaluation-contract-v1-3-1-technical-successor/research/g0-topology-ownership-and-stage-inventories.json",
      ).toString("utf8"),
    ) as {
      readonly stageInventories: {
        readonly T3: { readonly count: number; readonly paths: readonly string[] };
      };
    };
    expect(topology.stageInventories.T3.count).toBe(213);
    expect(new Set(topology.stageInventories.T3.paths).size).toBe(213);
    for (const relativePath of topology.stageInventories.T3.paths) {
      expect(fs.statSync(path.join(repoRoot, relativePath)).isFile()).toBe(true);
    }

    const versionRecheck = parseJsonFile<{
      readonly historyCommand: readonly string[];
    }>(path.join(taskRoot, "research/procedure-version-recheck.json"));
    expect(versionRecheck.historyCommand).toEqual([
      "git",
      "log",
      PREDECESSOR_COMMIT,
      "--format=",
      "--name-only",
      "--",
      "packages/cli/src/templates/research/procedures",
    ]);

    const result = JSON.parse(
      execFileSync(
        "uv",
        ["run", "python", generatorPath, "--verify"],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
          maxBuffer: 16 * 1024 * 1024,
        },
      ),
    ) as {
      readonly evidenceFileCount: number;
      readonly familyCount: number;
      readonly packageFileCount: number;
      readonly t3InventoryCount: number;
      readonly verdict: string;
    };
    expect(result).toMatchObject({
      evidenceFileCount: 6,
      familyCount: 17,
      packageFileCount: 204,
      t3InventoryCount: 213,
      verdict: "pass",
    });

    for (const name of [
      "projection-input-attestation.json",
      "procedure-version-recheck.json",
      "package-inventory.json",
      "generation-evidence-ledger.json",
      "historical-procedure-audit.json",
      "package-verification.json",
    ]) {
      const bytes = fs.readFileSync(path.join(taskRoot, "research", name));
      expect(bytes.at(-1)).toBe(0x0a);
      expect(bytes.subarray(-2).toString()).not.toBe("\n\n");
    }
  }, 60_000);
});
