import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI_ROOT = path.dirname(
  fileURLToPath(new URL("../package.json", import.meta.url)),
);
const BUILT_CLI_ROOT_ENV = "TRELLIS_TEST_BUILT_CLI_ROOT";
const EXCLUDED_ASSET_ENTRIES = new Set(["__pycache__", ".DS_Store"]);
const EXCLUDED_ASSET_EXTENSIONS = new Set([".pyc", ".pyo", ".ts"]);

let buildRoot: string | undefined;

function copyRuntimeAssets(source: string, destination: string): void {
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (sourcePath) => {
      const entry = path.basename(sourcePath);
      return (
        !EXCLUDED_ASSET_ENTRIES.has(entry) &&
        !EXCLUDED_ASSET_EXTENSIONS.has(path.extname(entry))
      );
    },
  });
}

export function setup(): void {
  const cacheRoot = path.join(CLI_ROOT, "node_modules", ".cache");
  fs.mkdirSync(cacheRoot, { recursive: true });
  buildRoot = fs.mkdtempSync(path.join(cacheRoot, "trellis-vitest-build-"));

  try {
    const distRoot = path.join(buildRoot, "dist");
    execFileSync(
      "pnpm",
      ["exec", "tsc", "-p", "tsconfig.json", "--outDir", distRoot],
      {
        cwd: CLI_ROOT,
        stdio: "inherit",
      },
    );

    copyRuntimeAssets(
      path.join(CLI_ROOT, "src", "templates"),
      path.join(distRoot, "templates"),
    );
    copyRuntimeAssets(
      path.join(CLI_ROOT, "src", "migrations", "manifests"),
      path.join(distRoot, "migrations", "manifests"),
    );

    const binRoot = path.join(buildRoot, "bin");
    fs.mkdirSync(binRoot, { recursive: true });
    fs.copyFileSync(
      path.join(CLI_ROOT, "bin", "trellis.js"),
      path.join(binRoot, "trellis.js"),
    );
    fs.copyFileSync(
      path.join(CLI_ROOT, "package.json"),
      path.join(buildRoot, "package.json"),
    );

    process.env[BUILT_CLI_ROOT_ENV] = buildRoot;
  } catch (error) {
    fs.rmSync(buildRoot, { recursive: true, force: true });
    buildRoot = undefined;
    throw error;
  }
}

export function teardown(): void {
  Reflect.deleteProperty(process.env, BUILT_CLI_ROOT_ENV);
  if (buildRoot !== undefined) {
    fs.rmSync(buildRoot, { recursive: true, force: true });
    buildRoot = undefined;
  }
}
