import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  ResearchCapabilityResolutionError,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getBundledResearchProcedureRoot } from "../../src/commands/research/bundled-procedure-root.js";
import {
  ResearchProcedureResolutionError,
  resolveResearchProcedure,
} from "../../src/commands/research/procedure-resolution.js";

const encoder = new TextEncoder();
const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const coreRoot = path.resolve(cliRoot, "../core");
const headings = [
  "Purpose",
  "Preconditions",
  "Inputs",
  "Procedure",
  "Outputs",
  "Checks and Stop Conditions",
  "Authority Boundaries",
];
const BUNDLED_PROCEDURE_DIGESTS: Readonly<Record<string, string>> = {
  "project-setup-v1":
    "sha256:df860ec2e30509f32c6b8b756e6aa9f3d6208cc0df5d8d0ea807dd116c74dda6",
  "quest-framing-v1":
    "sha256:eae45bc692cdc863cce27a0ee28467d1add1d3041bcd9d00ffe3c2f750c6a5ae",
  "quest-admin-v1":
    "sha256:4727cebd5082871021fcf25dfad7718bcb7461e6a0e7252342dfd78906c94656",
  "literature-scan-v1":
    "sha256:8bc6c47db33d88a79537ea2dddb7ebeba12627bfa0972b81ccdd1e8e44d4c8af",
  "literature-review-v1":
    "sha256:0d45af921af865fb149e8a6c0b4f4cd74c12ebfaff7bec4a941b4fa88f64ddd8",
  "idea-generation-v1":
    "sha256:43533d5a6ceb0163e878d8fa7a633d2d5b05ebd1c325431c9c24cf2cacfdd99b",
  "idea-evaluation-v1":
    "sha256:cacb7b636a2619dd6ee3a42c2f678ef7bc43d1844851ad335d054e17a2da5b2c",
  "experiment-round-v1":
    "sha256:a1aa1da8144f225f57b0a119c9092ecf95c4d2ab1095e58dff016ae67640fdc2",
  "experiment-campaign-v1":
    "sha256:7fd0708d21bad92a9f3c2f4765e353f4db075c7f640511786c1c2a61dc0d9903",
  "computation-case-v1":
    "sha256:b0a008e2974210f137fa1d61808efc114e3cea0247d9b124c5c297cf8b61f74f",
  "theory-case-v1":
    "sha256:3ca6764f454ac2b8028eac4939efbeddf9fae9fa9f40e169411ab80d6839cef9",
  "review-case-v1":
    "sha256:bcb10cd00ff578d393bf93fd57b36ff83ed912327e7e3b330753b6e10c490552",
  "review-campaign-v1":
    "sha256:2a23c4cc3813aac72576b2f7baa4223a37329337635ab549c7e3b356fe28b97c",
  "writing-case-v1":
    "sha256:d562ebb4881cd461b97dce3faeb9feca947a34e0e261f7b62bd90a27fa176bda",
};

function projectDirectory(
  root: string,
  procedureId: string,
  version: string,
): string {
  return path.join(
    root,
    ".trellis",
    "research",
    "procedures",
    procedureId,
    version,
  );
}

function capabilityById(id: string) {
  const capability = RESEARCH_CAPABILITY_REGISTRY.find((c) => c.id === id);
  if (capability === undefined) {
    throw new Error(`missing capability ${id}`);
  }
  return capability;
}

async function writeValidProjectOverride(
  root: string,
  capabilityId = "research.experiment.round",
): Promise<{
  readonly directory: string;
  readonly manifestPath: string;
  readonly instructionPath: string;
}> {
  const capability = capabilityById(capabilityId);
  const bundled = await resolveResearchProcedure({
    root,
    capabilityId: capability.id,
  });
  const directory = projectDirectory(
    root,
    capability.procedure.id,
    capability.procedure.version,
  );
  const manifestPath = path.join(directory, "procedure.json");
  const instructionPath = path.join(directory, "PROCEDURE.md");
  fs.mkdirSync(directory, { recursive: true });
  // Match procedure-policy serializeManifest key order (incl. packageSchemaVersion last).
  const projectManifest = {
    schemaVersion: bundled.manifest.schemaVersion,
    id: bundled.manifest.id,
    version: bundled.manifest.version,
    stage: bundled.manifest.stage,
    kind: bundled.manifest.kind,
    inputs: bundled.manifest.inputs,
    outputs: bundled.manifest.outputs,
    networkPolicy: bundled.manifest.networkPolicy,
    repositoryScope: bundled.manifest.repositoryScope,
    ...(bundled.manifest.maxDurationMinutes === undefined
      ? {}
      : { maxDurationMinutes: bundled.manifest.maxDurationMinutes }),
    ...(bundled.manifest.maxDispatches === undefined
      ? {}
      : { maxDispatches: bundled.manifest.maxDispatches }),
    replaces: {
      id: capability.procedure.id,
      version: capability.procedure.version,
    },
    ...(bundled.manifest.packageSchemaVersion === undefined
      ? {}
      : { packageSchemaVersion: bundled.manifest.packageSchemaVersion }),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(projectManifest)}\n`);
  fs.writeFileSync(instructionPath, "# Project override\n");
  // Schema-v2 packages require a full methodology support pack for project overrides.
  if (bundled.packageSchemaVersion === 2 && bundled.supportPack) {
    const methodologyDir = path.join(directory, "methodology");
    fs.mkdirSync(path.join(methodologyDir, "artifacts"), { recursive: true });
    fs.mkdirSync(path.join(methodologyDir, "instructions"), { recursive: true });
    fs.mkdirSync(path.join(methodologyDir, "validators"), { recursive: true });
    fs.writeFileSync(
      path.join(methodologyDir, "pack.json"),
      Buffer.from(bundled.supportPack.packJsonBytes),
    );
    for (const item of bundled.supportPack.inventoryItems) {
      const target = path.join(methodologyDir, ...item.path.split("/"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, Buffer.from(item.bytes));
    }
  }
  return { directory, manifestPath, instructionPath };
}

describe("Research Procedure filesystem resolution", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-procedure-resolution-"));
    fs.mkdirSync(path.join(root, ".trellis"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("resolves every canonical bundled pair with the seven-section contract", async () => {
    expect(fs.realpathSync(getBundledResearchProcedureRoot())).toContain(
      path.join("templates", "research", "procedures"),
    );
    expect(Object.keys(BUNDLED_PROCEDURE_DIGESTS)).toHaveLength(14);
    for (const capability of RESEARCH_CAPABILITY_REGISTRY) {
      const procedure = await resolveResearchProcedure({
        root,
        capabilityId: capability.id,
      });
      expect(procedure.source).toBe("bundled");
      expect(procedure.manifest.id).toBe(capability.procedure.id);
      expect(procedure.manifest.version).toBe(capability.procedure.version);
      expect(procedure.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
      if (capability.procedure.version === "1.0.0") {
        expect(procedure.digest).toBe(
          BUNDLED_PROCEDURE_DIGESTS[capability.procedure.id],
        );
        const actualHeadings = [
          ...procedure.instructions.matchAll(/^## (.+)$/gm),
        ].map((match) => match[1]);
        expect(actualHeadings).toEqual(headings);
      } else {
        // Methodology packs (2.0.0) use Trellis-native section structure + support pack.
        expect(procedure.digestDomain).toBe("v2");
        expect(procedure.instructions).toMatch(/methodology|Proposal-only/i);
      }
      expect(procedure.instructions).not.toMatch(/skill discovery|selectedSkill/i);
    }
  });

  it(
    "resolves a bundled Procedure from an isolated clean-built dist layout",
    async () => {
      const isolatedRoot = path.join(root, "isolated-build");
      const packageRoot = path.join(isolatedRoot, "package");
      const packageDist = path.join(packageRoot, "dist");
      const corePackageRoot = path.join(
        isolatedRoot,
        "node_modules",
        "@mindfoldhq",
        "trellis-core",
      );
      const coreDist = path.join(corePackageRoot, "dist");
      const tscPath = path.join(cliRoot, "node_modules", "typescript", "bin", "tsc");
      expect(fs.existsSync(packageDist)).toBe(false);

      execFileSync(
        process.execPath,
        [
          tscPath,
          "--project",
          path.join(coreRoot, "tsconfig.json"),
          "--outDir",
          coreDist,
          "--declarationMap",
          "false",
          "--sourceMap",
          "false",
        ],
        { cwd: coreRoot },
      );
      fs.writeFileSync(
        path.join(corePackageRoot, "package.json"),
        `${JSON.stringify({
          name: "@mindfoldhq/trellis-core",
          type: "module",
          exports: {
            "./research": {
              types: "./dist/research/index.d.ts",
              import: "./dist/research/index.js",
            },
          },
        })}\n`,
      );

      const cliTsconfig = path.join(isolatedRoot, "tsconfig.cli.json");
      fs.writeFileSync(
        cliTsconfig,
        `${JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            rootDir: path.join(cliRoot, "src"),
            outDir: packageDist,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            declaration: false,
            sourceMap: false,
            types: ["node"],
            typeRoots: [path.join(cliRoot, "node_modules", "@types")],
            baseUrl: isolatedRoot,
            paths: {
              "@mindfoldhq/trellis-core/research": [
                path.join(coreDist, "research", "index.d.ts"),
              ],
            },
          },
          files: [
            path.join(
              cliRoot,
              "src",
              "commands",
              "research",
              "procedure-resolution.ts",
            ),
          ],
        })}\n`,
      );
      execFileSync(process.execPath, [tscPath, "--project", cliTsconfig], {
        cwd: cliRoot,
      });
      fs.writeFileSync(
        path.join(packageRoot, "package.json"),
        '{"type":"module"}\n',
      );
      fs.cpSync(
        path.join(cliRoot, "src", "templates", "research"),
        path.join(packageDist, "templates", "research"),
        { recursive: true },
      );

      const builtModule = (await import(
        pathToFileURL(
          path.join(
            packageDist,
            "commands",
            "research",
            "procedure-resolution.js",
          ),
        ).href
      )) as {
        resolveResearchProcedure(input: {
          readonly root: string;
          readonly capabilityId: string;
        }): Promise<{
          readonly source: string;
          readonly digest: string;
          readonly manifest: { readonly id: string };
        }>;
      };
      const runtimeRoot = path.join(root, "dist-runtime");
      fs.mkdirSync(path.join(runtimeRoot, ".trellis"), { recursive: true });
      const resolved = await builtModule.resolveResearchProcedure({
        root: runtimeRoot,
        capabilityId: "research.computation.case",
      });

      expect(resolved).toMatchObject({
        source: "bundled",
        manifest: { id: "computation-case-v1", version: "1.0.0" },
      });
      expect(resolved.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
      // Completion Wave-0: future selection is schema-v1 1.0.0.
      expect(resolved.digestDomain ?? "v1").toBe("v1");
      expect(resolved.digest).toBe(
        BUNDLED_PROCEDURE_DIGESTS["computation-case-v1"],
      );
    },
    60_000,
  );

  it("uses a valid project override and ignores unnamed siblings", async () => {
    const capability = capabilityById("research.experiment.round");
    const bundled = await resolveResearchProcedure({
      root,
      capabilityId: capability.id,
    });
    const paths = await writeValidProjectOverride(root, capability.id);
    fs.writeFileSync(path.join(paths.directory, "ignored.txt"), "ignored");
    fs.symlinkSync("missing", path.join(paths.directory, "ignored-link"));

    const project = await resolveResearchProcedure({
      root,
      capabilityId: capability.id,
    });
    expect(project.source).toBe("project");
    expect(project.instructions).toBe("# Project override\n");
    expect(project.digest).not.toBe(bundled.digest);
  });

  it.each(["regular", "non-regular"] as const)(
    "ignores concurrent unnamed %s sibling creation and removal",
    async (siblingType) => {
      const capability = capabilityById("research.experiment.round");
      const paths = await writeValidProjectOverride(root);
      const baseline = await resolveResearchProcedure({
        root,
        capabilityId: capability.id,
      });
      const directoryMtime = fs.statSync(paths.directory).mtimeMs;
      const siblingPath = path.join(paths.directory, `ignored-${siblingType}`);
      const originalRead = fs.readFileSync.bind(fs);
      let mutated = false;
      vi.spyOn(fs, "readFileSync").mockImplementation(((
        target: fs.PathOrFileDescriptor,
        options?: unknown,
      ) => {
        if (
          !mutated &&
          typeof target === "string" &&
          path.resolve(target) === paths.instructionPath
        ) {
          mutated = true;
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
          if (siblingType === "regular") {
            fs.writeFileSync(siblingPath, "ignored");
          } else {
            fs.mkdirSync(siblingPath);
          }
          fs.rmSync(siblingPath, { recursive: true });
        }
        return originalRead(target, options as never);
      }) as typeof fs.readFileSync);

      const resolved = await resolveResearchProcedure({
        root,
        capabilityId: capability.id,
      });
      expect(fs.statSync(paths.directory).mtimeMs).not.toBe(directoryMtime);
      expect(resolved.source).toBe(baseline.source);
      expect(resolved.instructions).toBe(baseline.instructions);
      expect(resolved.digest).toBe(baseline.digest);
    },
  );

  it("fails closed for every present-invalid project candidate", async () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[1];
    const directory = projectDirectory(root, capability.procedure.id, capability.procedure.version);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "PROCEDURE.md"), "partial");

    await expect(
      resolveResearchProcedure({ root, capabilityId: capability.id }),
    ).rejects.toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });

    fs.rmSync(path.join(root, ".trellis", "research"), {
      recursive: true,
      force: true,
    });
    fs.mkdirSync(path.join(root, ".trellis", "research"));
    fs.symlinkSync(
      getBundledResearchProcedureRoot(),
      path.join(root, ".trellis", "research", "procedures"),
      "dir",
    );
    await expect(
      resolveResearchProcedure({ root, capabilityId: capability.id }),
    ).rejects.toBeInstanceOf(ResearchProcedureResolutionError);
  });

  it("rejects malformed override bytes without bundled fallback", async () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[2];
    const directory = projectDirectory(root, capability.procedure.id, capability.procedure.version);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "procedure.json"), encoder.encode("{}\n"));
    fs.writeFileSync(path.join(directory, "PROCEDURE.md"), "invalid override");

    try {
      await resolveResearchProcedure({ root, capabilityId: capability.id });
      throw new Error("expected invalid project Procedure");
    } catch (error) {
      expect(error).toBeInstanceOf(ResearchProcedureResolutionError);
      expect(error).toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });
    }
  });

  it.each(["procedure.json", "PROCEDURE.md"] as const)(
    "rejects a symlinked %s without bundled fallback",
    async (fileName) => {
      const capability = capabilityById("research.experiment.round");
      const paths = await writeValidProjectOverride(root);
      const selectedPath = path.join(paths.directory, fileName);
      const outsidePath = path.join(root, `outside-${fileName}`);
      fs.writeFileSync(outsidePath, fs.readFileSync(selectedPath));
      fs.rmSync(selectedPath);
      fs.symlinkSync(outsidePath, selectedPath);

      await expect(
        resolveResearchProcedure({ root, capabilityId: capability.id }),
      ).rejects.toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });
    },
  );

  it.each(["procedure.json", "PROCEDURE.md"] as const)(
    "rejects a non-regular %s without bundled fallback",
    async (fileName) => {
      const capability = capabilityById("research.experiment.round");
      const paths = await writeValidProjectOverride(root);
      const selectedPath = path.join(paths.directory, fileName);
      fs.rmSync(selectedPath);
      fs.mkdirSync(selectedPath);

      await expect(
        resolveResearchProcedure({ root, capabilityId: capability.id }),
      ).rejects.toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });
    },
  );

  // Inject EACCES at the read boundary instead of chmod: root users and Windows
  // ACL semantics can make permission-bit assertions non-deterministic.
  it.each(["procedure.json", "PROCEDURE.md"] as const)(
    "maps an unreadable %s to the selected-source error",
    async (fileName) => {
      const capability = capabilityById("research.experiment.round");
      const paths = await writeValidProjectOverride(root);
      const selectedPath = path.join(paths.directory, fileName);
      const originalRead = fs.readFileSync.bind(fs);
      vi.spyOn(fs, "readFileSync").mockImplementation(((
        target: fs.PathOrFileDescriptor,
        options?: unknown,
      ) => {
        if (typeof target === "string" && path.resolve(target) === selectedPath) {
          const error = new Error("permission denied") as NodeJS.ErrnoException;
          error.code = "EACCES";
          throw error;
        }
        return originalRead(target, options as never);
      }) as typeof fs.readFileSync);

      await expect(
        resolveResearchProcedure({ root, capabilityId: capability.id }),
      ).rejects.toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });
    },
  );

  it("rejects a manifest changed after its stable read but before the pair completes", async () => {
    const capability = capabilityById("research.experiment.round");
    const paths = await writeValidProjectOverride(root);
    const originalRead = fs.readFileSync.bind(fs);
    let changed = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (
        !changed &&
        typeof target === "string" &&
        path.resolve(target) === paths.instructionPath
      ) {
        changed = true;
        const manifest = JSON.parse(
          originalRead(paths.manifestPath, "utf8"),
        ) as Record<string, unknown>;
        const inputs = manifest.inputs as string[];
        manifest.inputs = [inputs[1], inputs[0], ...inputs.slice(2)];
        fs.writeFileSync(paths.manifestPath, `${JSON.stringify(manifest)}\n`);
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);

    await expect(
      resolveResearchProcedure({ root, capabilityId: capability.id }),
    ).rejects.toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });
  });

  it("rejects ancestor replacement between the two named-file reads", async () => {
    const capability = capabilityById("research.experiment.round");
    const paths = await writeValidProjectOverride(root);
    const originalRead = fs.readFileSync.bind(fs);
    let replaced = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (
        !replaced &&
        typeof target === "string" &&
        path.resolve(target) === paths.instructionPath
      ) {
        replaced = true;
        const trellisPath = path.join(root, ".trellis");
        const displacedPath = path.join(root, ".trellis-displaced");
        fs.renameSync(trellisPath, displacedPath);
        fs.mkdirSync(trellisPath);
        fs.renameSync(
          path.join(displacedPath, "research"),
          path.join(trellisPath, "research"),
        );
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);

    await expect(
      resolveResearchProcedure({ root, capabilityId: capability.id }),
    ).rejects.toMatchObject({ code: "INVALID_PROJECT_PROCEDURE" });
  });

  it("rejects an unknown capability before filesystem access", async () => {
    const missingRoot = path.join(root, "does-not-exist");
    await expect(
      resolveResearchProcedure({
        root: missingRoot,
        capabilityId: "research.unknown.case",
      }),
    ).rejects.toBeInstanceOf(ResearchCapabilityResolutionError);
  });
});
