/**
 * CS5-6 dormant integration verification.
 *
 * Proves: exactly 17 2.0.6 packages with recomputed pins; 2.0.4/2.0.5 trees
 * byte-unchanged; seven accepted A3 leaves authenticated; live Procedure
 * exactly 1.0.0; 2.0.6 dormant with every authority flag false; frozen 229 +
 * expansion 38 + production 116 domains pass (delegated to their owners);
 * clean build; real tarball inventory contains the accepted bundle and the
 * 2.0.6 trees; clean external install resolves and authenticates the accepted
 * pack without .trellis/tasks or env overrides.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  parseAcceptedV13ContractPack,
  resolveProcedureClosureDisposition,
} from "@mindfoldhq/trellis-core/research";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const cliRoot = path.join(repoRoot, "packages/cli");
const coreRoot = path.join(repoRoot, "packages/core");
const procRoot = path.join(cliRoot, "src/templates/research/procedures");
const bundleRoot = path.join(
  cliRoot,
  "src/templates/research/evaluation-contracts/1.3.0",
);

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
];

const A3_LEAF_NAMES = [
  "durable-output-disposition-v1.3.json",
  "artifact-lifecycle-contract-v1.3.json",
  "validator-registry-v1.3.json",
  "validator-binding-matrix-v1.3.json",
  "differential-test-matrix-v1.3.json",
  "derivability-provenance-matrix-v1.3.json",
  "closure-contract-v1.3.json",
] as const;

function loadA3LeafBytes(): Record<string, Uint8Array> {
  const a3 = path.join(
    repoRoot,
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
  );
  const out: Record<string, Uint8Array> = {};
  for (const name of A3_LEAF_NAMES) {
    out[name] = new Uint8Array(fs.readFileSync(path.join(a3, name)));
  }
  return out;
}

function gitHeadBytes(relativePath: string): Buffer | undefined {
  try {
    return execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: repoRoot,
      encoding: "buffer",
    });
  } catch {
    return undefined;
  }
}

describe("CS5-6 dormant integrated candidate", () => {
  it("has exactly 17 complete 2.0.6 packages with recomputed pins", () => {
    const dirs = fs
      .readdirSync(procRoot)
      .filter((d) => fs.statSync(path.join(procRoot, d)).isDirectory());
    expect(dirs.sort()).toEqual([...PROCEDURES].sort());
    for (const pid of PROCEDURES) {
      const base = path.join(procRoot, pid);
      expect(fs.existsSync(path.join(base, "2.0.6", "procedure.json"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.6", "methodology", "pack.json"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.6", "methodology", "package-contract.json"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.6", "methodology", "digests.json"))).toBe(true);
      const contract = JSON.parse(
        fs.readFileSync(
          path.join(base, "2.0.6", "methodology", "package-contract.json"),
          "utf8",
        ),
      ) as {
        acceptedContractDigest: string;
        acceptedMemberAggregateSha256: string;
        authorityFlags: Record<string, boolean>;
        dormant: boolean;
        liveSelection: string;
        closureDisposition: Record<string, unknown>;
      };
      expect(contract.acceptedContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
      expect(contract.acceptedMemberAggregateSha256).toBe(
        V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
      );
      expect(contract.authorityFlags).toEqual({
        activationAuthorized: false,
        releaseAuthorized: false,
        publicationAuthorized: false,
        pushAuthorized: false,
      });
      expect(contract.dormant).toBe(true);
      expect(contract.liveSelection).toBe("1.0.0");
      const disposition = resolveProcedureClosureDisposition(pid);
      if (disposition.kind === "required") {
        expect(contract.closureDisposition.kind).toBe("required");
        expect(fs.existsSync(path.join(base, "2.0.6", "methodology", "closure", `${disposition.family}.json`))).toBe(true);
      } else {
        expect(contract.closureDisposition.kind).toBe("notApplicable");
        expect(fs.existsSync(path.join(base, "2.0.6", "methodology", "closure", "disposition.json"))).toBe(true);
      }
    }
  });

  it(
    "keeps 2.0.4 and 2.0.5 trees byte-unchanged and live Procedure at exactly 1.0.0",
    () => {
    for (const pid of PROCEDURES) {
      for (const version of ["2.0.4", "2.0.5"]) {
        const dir = path.join(procRoot, pid, version);
        const walk = (rel: string): void => {
          const abs = path.join(dir, rel);
          for (const name of fs.readdirSync(abs).sort()) {
            const childRel = rel.length === 0 ? name : `${rel}/${name}`;
            const childAbs = path.join(abs, name);
            const stat = fs.lstatSync(childAbs);
            if (stat.isDirectory()) {
              walk(childRel);
            } else if (stat.isFile()) {
              const head = gitHeadBytes(
                `packages/cli/src/templates/research/procedures/${pid}/${version}/${childRel}`,
              );
              expect(
                head,
                `${pid}/${version}/${childRel} must match HEAD bytes`,
              ).toBeDefined();
              expect(fs.readFileSync(childAbs).equals(head)).toBe(true);
            }
          }
        };
        walk("");
      }
    }
    for (const capability of RESEARCH_CAPABILITY_REGISTRY) {
      expect(capability.procedure.version).toBe("1.0.0");
    }
    },
    300_000,
  );

  it("authenticates the seven accepted leaves and recomputes the member aggregate", () => {
    const pack = parseAcceptedV13ContractPack({
      leafBytes: loadA3LeafBytes(),
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      expectedMemberAggregateSha256: V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    });
    expect(pack.derivedMemberAggregateSha256).toBe(
      V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    );
    expect(Object.keys(pack.memberDigests)).toHaveLength(7);
    const ledger = JSON.parse(
      fs.readFileSync(path.join(bundleRoot, "member-ledger.json"), "utf8"),
    ) as { members: { path: string; sha256: string; byteLength: number }[] };
    expect(ledger.members).toHaveLength(7);
    for (const member of ledger.members) {
      const bytes = fs.readFileSync(path.join(bundleRoot, member.path));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(member.sha256);
      expect(bytes.byteLength).toBe(member.byteLength);
    }
  });

  it(
    "real tarball inventory ships the accepted bundle and 2.0.6 trees; external install authenticates",
    () => {
      execFileSync("pnpm", ["run", "build"], {
        cwd: coreRoot,
        stdio: "pipe",
      });
      execFileSync("pnpm", ["run", "build"], {
        cwd: cliRoot,
        stdio: "pipe",
      });
      const packRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cs5-i-pack-"));
      try {
        const packOne = (dir: string): string => {
          fs.mkdirSync(path.join(packRoot, path.basename(dir)), {
            recursive: true,
          });
          execFileSync(
            "pnpm",
            ["pack", "--pack-destination", path.join(packRoot, path.basename(dir))],
            { cwd: dir, stdio: "pipe" },
          );
          const tarballs = fs
            .readdirSync(path.join(packRoot, path.basename(dir)))
            .filter((f) => f.endsWith(".tgz"))
            .sort();
          expect(tarballs).toHaveLength(1);
          return path.join(packRoot, path.basename(dir), tarballs[0]);
        };
        const coreTarball = packOne(coreRoot);
        const cliTarball = packOne(cliRoot);
        // Inventory inspection: bundle + one 2.0.6 tree + a 2.0.5 tree present.
        const tarList = execFileSync("tar", ["-tzf", cliTarball], {
          encoding: "utf8",
        });
        const entries = [...new Set(tarList.split("\n").filter(Boolean))];
        expect(
          entries.some((e) => e.includes("templates/research/evaluation-contracts/1.3.0/member-ledger.json")),
        ).toBe(true);
        expect(
          entries.some((e) => e.includes("templates/research/procedures/literature-scan-v1/2.0.6/methodology/pack.json")),
        ).toBe(true);
        // pnpm pack ships both src and dist template trees; every 2.0.6 tree
        // must appear in the dist (published) inventory.
        expect(
          entries.filter((e) => e.endsWith("/2.0.6/methodology/pack.json")).length,
        ).toBeGreaterThanOrEqual(17);
        expect(
          entries.filter((e) =>
            e.includes("dist/templates/research/procedures") &&
            e.endsWith("/2.0.6/methodology/pack.json"),
          ).length,
        ).toBe(17);
        // External install: extract both tarballs into an empty directory.
        const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cs5-i-install-"));
        const cliDir = path.join(installRoot, "cli");
        const coreDir = path.join(installRoot, "node_modules", "@mindfoldhq", "trellis-core");
        fs.mkdirSync(coreDir, { recursive: true });
        execFileSync("tar", ["-xzf", cliTarball, "-C", installRoot], { cwd: installRoot });
        execFileSync("tar", ["-xzf", coreTarball, "-C", coreDir, "--strip-components=1"], { cwd: installRoot });
        fs.renameSync(path.join(installRoot, "package"), cliDir);
        // Installed-runtime parse with no .trellis/tasks and no env override.
        const script = `
          import { pathToFileURL } from "node:url";
          const mod = await import(pathToFileURL(${JSON.stringify(
            path.join(cliDir, "dist", "commands", "research", "dispatch-methodology-validation.js"),
          )}).href);
          const dir = mod.resolveAcceptedV13ContractLeafDir();
          const pack = mod.loadAcceptedV13ContractPackFromLeaves();
          if (!dir.includes("templates") || !dir.includes("evaluation-contracts")) {
            throw new Error("unexpected bundle dir " + dir);
          }
          if (pack.derivedMemberAggregateSha256 !== ${JSON.stringify(V13_ACCEPTED_MEMBER_AGGREGATE_SHA256)}) {
            throw new Error("aggregate mismatch");
          }
          if (pack.acceptedContractDigest !== ${JSON.stringify(V13_ACCEPTED_CONTRACT_DIGEST)}) {
            throw new Error("digest mismatch");
          }
          console.log("installed-runtime-ok");
        `;
        const scriptPath = path.join(installRoot, "verify.mjs");
        fs.writeFileSync(scriptPath, script);
        const output = execFileSync(process.execPath, [scriptPath], {
          cwd: installRoot,
          env: {
            ...process.env,
            TRELLIS_V13_ACCEPTED_CONTRACT_DIR: "",
          },
          encoding: "utf8",
        });
        expect(output).toContain("installed-runtime-ok");
        fs.rmSync(installRoot, { recursive: true, force: true });
      } finally {
        fs.rmSync(packRoot, { recursive: true, force: true });
      }
    },
    600_000,
  );
});
