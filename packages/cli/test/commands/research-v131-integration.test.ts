import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const taskResearchRoot = path.join(
  repoRoot,
  ".trellis/tasks/08-12-integrate-install-and-freeze-v1-3-1-subject/research",
);
const auditScript = path.join(
  repoRoot,
  "packages/cli/scripts/research-v131-installed-package-audit.mjs",
);

function readEvidence<T>(name: string): T {
  const bytes = fs.readFileSync(path.join(taskResearchRoot, name));
  expect(bytes.at(-1)).toBe(0x0a);
  expect(bytes.subarray(-2).toString()).not.toBe("\n\n");
  return JSON.parse(bytes.toString("utf8")) as T;
}

describe("T5 v1.3.1 installed-package integration", () => {
  it(
    "reproduces the retained npm and pnpm external-install evidence",
    () => {
      const output = execFileSync(process.execPath, [auditScript, "--verify"], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      expect(output).toContain("T5 installed-package audit verify passed");

      const input = readEvidence<{
        readonly recordKind: string;
        readonly stage: string;
        readonly commitBoundary: string;
        readonly directPredecessor: { readonly commit: string };
        readonly procedureAuthority: {
          readonly liveVersion: string;
          readonly dormantVersion: string;
          readonly familyCount: number;
        };
        readonly authority: Record<string, boolean>;
        readonly verdict: string;
      }>("integration-input-attestation.json");
      expect(input).toMatchObject({
        recordKind: "t5-integration-input-attestation",
        stage: "T5",
        commitBoundary: "I1",
        directPredecessor: {
          commit: "ff7baa58c2a668af8e3e53f7614f814c9a734cc5",
        },
        procedureAuthority: {
          liveVersion: "1.0.0",
          dormantVersion: "2.0.7",
          familyCount: 17,
        },
        verdict: "pass",
      });
      expect(Object.values(input.authority)).toEqual(
        expect.arrayContaining([false]),
      );
      expect(Object.values(input.authority).every((value) => !value)).toBe(true);

      const tarballs = readEvidence<{
        readonly recordKind: string;
        readonly core: { readonly packageVersion: string };
        readonly cli: {
          readonly packageVersion: string;
          readonly exactCoreDependency: string;
          readonly audit: {
            readonly acceptedV131MemberCount: number;
            readonly procedure207FamilyCount: number;
            readonly procedure207FileCount: number;
          };
        };
        readonly verdict: string;
      }>("package-tarball-inventory.json");
      expect(tarballs).toMatchObject({
        recordKind: "t5-package-tarball-inventory",
        core: { packageVersion: "0.6.7" },
        cli: {
          packageVersion: "0.6.7",
          exactCoreDependency: "0.6.7",
          audit: {
            acceptedV131MemberCount: 7,
            procedure207FamilyCount: 17,
            procedure207FileCount: 204,
          },
        },
        verdict: "pass",
      });

      const install = readEvidence<{
        readonly recordKind: string;
        readonly networkPackageResolutionAllowed: boolean;
        readonly consumers: readonly {
          readonly manager: string;
          readonly offlineMode: boolean;
          readonly lifecycleScriptsDisabled: boolean;
          readonly packageRealpathsOutsideRepository: boolean;
          readonly aliasesExecuted: readonly string[];
          readonly procedureAuthority: {
            readonly liveVersion: string;
            readonly dormantVersion: string;
          };
          readonly verdict: string;
        }[];
        readonly verdict: string;
      }>("external-install-evidence.json");
      expect(install.recordKind).toBe("t5-external-install-evidence");
      expect(install.networkPackageResolutionAllowed).toBe(false);
      expect(install.consumers.map(({ manager }) => manager)).toEqual([
        "npm",
        "pnpm",
      ]);
      for (const consumer of install.consumers) {
        expect(consumer).toMatchObject({
          offlineMode: true,
          lifecycleScriptsDisabled: true,
          packageRealpathsOutsideRepository: true,
          aliasesExecuted: ["trellis", "tl"],
          procedureAuthority: {
            liveVersion: "1.0.0",
            dormantVersion: "2.0.7",
          },
          verdict: "pass",
        });
      }
      expect(install.verdict).toBe("pass");

      const protectedAudit = readEvidence<{
        readonly recordKind: string;
        readonly files: readonly { readonly matches: boolean }[];
        readonly submodules: readonly { readonly matches: boolean }[];
        readonly verdict: string;
      }>("protected-path-audit.json");
      expect(protectedAudit.recordKind).toBe("t5-protected-path-audit");
      expect(protectedAudit.files.every(({ matches }) => matches)).toBe(true);
      expect(protectedAudit.submodules.every(({ matches }) => matches)).toBe(
        true,
      );
      expect(protectedAudit.verdict).toBe("pass");
    },
    600_000,
  );
});
