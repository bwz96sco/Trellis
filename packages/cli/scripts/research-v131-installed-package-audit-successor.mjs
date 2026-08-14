#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  auditPackedCoreEntries,
  auditPackedCoreEntrySafety,
  buildPackedCoreInventory,
  parseTarListing as parseCoreTarListing,
  validatePackedCorePackage,
  validateTarEntryTypes,
} from "../../core/scripts/packed-core-audit.js";
import {
  PACKED_ACTIVE_RESEARCH_ENTRIES,
  auditPackedActiveContent,
  auditPackedEntries,
  buildPackedCliInventory,
  parseTarListing as parseCliTarListing,
} from "./packed-cli-audit.js";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const CLI_DIR = path.resolve(path.dirname(SCRIPT_FILE), "..");
const CORE_DIR = path.resolve(CLI_DIR, "../core");
const REPO_ROOT = path.resolve(CLI_DIR, "../..");
const TASK_ROOT = path.join(
  REPO_ROOT,
  ".trellis/tasks/08-15-integrate-install-and-freeze-v1-3-1-subject-successor",
);
const RESEARCH_ROOT = path.join(TASK_ROOT, "research");
const T3_INVENTORY_PATH =
  ".trellis/tasks/08-12-project-procedure-2-0-7-family-packages/research/package-inventory.json";
const G0_BASELINE_PATH =
  ".trellis/tasks/08-12-govern-evaluation-contract-v1-3-1-technical-successor/research/g0-protected-path-baseline.json";
const T0A_TASK_PATH =
  ".trellis/tasks/08-15-amend-t0-authorize-t5-successor-refreeze/task.json";
const T0A_COMMIT = "525ea920ece3c1421e116861ac0f22bc14c7e5d5";
const T0A_TREE = "45650f8760b5002a92b143688670432ddab9f700";
const A133_ROOT =
  ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research";
const A133_MANIFEST = `${A133_ROOT}/contract-candidate-manifest-v1.3.1.json`;
const T4_COMMIT = "e7ed93f6b8d2bcb4711715a080ec2984119848bb";
const T4_TREE = "7254198c53055ddb9c896fb7d7ef8778595e54d5";
const PROTECTED_BRANCH = "refs/heads/evidence/v13-baseline";
const PROTECTED_COMMIT = "e6b80d640f0bd264c1acfe6bab906cb3e4ae535a";
const PROTECTED_TREE = "1304e0faa7262cd1c80cd3e8ab9b01057809f9e0";
const T3_COMMIT = "320dfaf779219441adfa4f7c6d1df9596489fc1f";
const A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3";
const A133_TREE = "47633d69ffb68b7e225e01e502fe133616a1078b";
const B133_COMMIT = "56277b874217a3b8a01b63a4905cf6b22708cb05";
const B133_TREE = "3873721fe9208644e856f857a2c34e9651c96edc";
const O133_COMMIT = "2253df9fb67f8ee84d470da23205e9610f8a4e3e";
const O133_TREE = "7e5430197841776a6d8d7f31e8b82517473f082f";
const CONTRACT_VERSION = "evaluation-contract-v1.3.1";
const CONTRACT_DIGEST =
  "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af";
const MEMBER_AGGREGATE =
  "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34";
const COMPLETE_OUTPUT_SET =
  "sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642";
const CANDIDATE_MANIFEST_SHA256 =
  "e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a";
const PACKAGE_SET_DIGEST =
  "sha256:2add30f5b73e7b0df3c22210f308758798b4ad423cad70668a37b9e5430d7104";
const PACKAGE_DIGEST_DOMAIN = Buffer.from(
  "trellis-procedure-207-package-set-v1\0",
  "utf8",
);
const OUTPUTS = Object.freeze({
  input: path.join(RESEARCH_ROOT, "integration-input-attestation.json"),
  tarballs: path.join(RESEARCH_ROOT, "package-tarball-inventory.json"),
  install: path.join(RESEARCH_ROOT, "external-install-evidence.json"),
  protected: path.join(RESEARCH_ROOT, "protected-path-audit.json"),
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(canonical(value))}\n`, "utf8");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function gitBuffer(args, options = {}) {
  return execFileSync("git", ["-C", REPO_ROOT, ...args], {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function gitText(args, options = {}) {
  return gitBuffer(args, options).toString("utf8");
}

function gitObjectBytes(commit, relativePath) {
  return gitBuffer(["show", `${commit}:${relativePath}`]);
}

function gitTree(commit) {
  return gitText(["rev-parse", `${commit}^{tree}`]).trim();
}

function gitFileIdentity(commit, relativePath) {
  const line = gitText(["ls-tree", commit, "--", relativePath]).trim();
  const match = /^(\d{6}) blob ([0-9a-f]{40})\t/.exec(line);
  if (!match) throw new Error(`Missing committed blob ${commit}:${relativePath}`);
  const bytes = gitObjectBytes(commit, relativePath);
  return {
    path: relativePath,
    mode: match[1],
    blobOid: match[2],
    byteLength: bytes.length,
    sha256: sha256(bytes),
    jsonParsePassed: Boolean(JSON.parse(bytes.toString("utf8"))),
  };
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function isWithin(parent, child) {
  const relative = path.relative(fs.realpathSync(parent), fs.realpathSync(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function findOneTarball(directory) {
  const names = fs.readdirSync(directory).filter((name) => name.endsWith(".tgz"));
  if (names.length !== 1) {
    throw new Error(`Expected one tarball in ${directory}, found ${names.length}`);
  }
  return path.join(directory, names[0]);
}

function tarBytes(tarball, entry) {
  return execFileSync("tar", ["-xOf", tarball, entry], {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function tarPackageJson(tarball) {
  return JSON.parse(tarBytes(tarball, "package/package.json").toString("utf8"));
}

function packedRecord({ tarball, entries, packageJson, audit }) {
  const bytes = fs.readFileSync(tarball);
  const packageBytes = tarBytes(tarball, "package/package.json");
  return {
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    tarballBasename: path.basename(tarball),
    byteLength: bytes.length,
    sha256: `sha256:${sha256(bytes)}`,
    normalizedEntryCount: entries.length,
    normalizedSortedEntryDigest: `sha256:${sha256(
      Buffer.from([...entries].sort().join("\n"), "utf8"),
    )}`,
    packedPackageJsonByteLength: packageBytes.length,
    packedPackageJsonSha256: `sha256:${sha256(packageBytes)}`,
    audit,
  };
}

function auditTarballs(coreTarball, cliTarball, t3Inventory, candidateManifest) {
  const coreListing = run("tar", ["-tzf", coreTarball]);
  const coreEntries = parseCoreTarListing(coreListing);
  validateTarEntryTypes(run("tar", ["-tvzf", coreTarball]), coreEntries.length);
  auditPackedCoreEntrySafety(coreEntries);
  const corePackage = tarPackageJson(coreTarball);
  const sourceCorePackage = readJson(path.join(CORE_DIR, "package.json"));
  validatePackedCorePackage(corePackage, sourceCorePackage.version);
  const coreInventory = buildPackedCoreInventory(corePackage);
  const coreAudit = auditPackedCoreEntries(coreEntries, coreInventory);

  const cliListing = run("tar", ["-tzf", cliTarball]);
  const cliEntries = parseCliTarListing(cliListing);
  validateTarEntryTypes(run("tar", ["-tvzf", cliTarball]), cliEntries.length);
  if (new Set(cliEntries).size !== cliEntries.length) {
    throw new Error("Packed CLI contains duplicate normalized entries");
  }
  const migrationManifestNames = cliEntries
    .filter((entry) => entry.startsWith("package/dist/migrations/manifests/"))
    .map((entry) => path.posix.basename(entry));
  const cliAudit = auditPackedEntries(
    cliEntries,
    buildPackedCliInventory(migrationManifestNames),
  );
  const activeContents = new Map(
    Object.values(PACKED_ACTIVE_RESEARCH_ENTRIES).map((entry) => [
      entry,
      tarBytes(cliTarball, entry).toString("utf8"),
    ]),
  );
  auditPackedActiveContent(activeContents);
  const cliPackage = tarPackageJson(cliTarball);
  const sourceCliPackage = readJson(path.join(CLI_DIR, "package.json"));
  if (cliPackage.name !== sourceCliPackage.name || cliPackage.version !== sourceCliPackage.version) {
    throw new Error("Packed CLI identity differs from source package identity");
  }
  if (cliPackage.dependencies?.["@mindfoldhq/trellis-core"] !== corePackage.version) {
    throw new Error("Packed CLI Core dependency is not the exact package version");
  }
  if (JSON.stringify(cliPackage.bin) !== JSON.stringify({ trellis: "./bin/trellis.js", tl: "./bin/trellis.js" })) {
    throw new Error("Packed CLI bin contract drifted");
  }

  const expected207 = new Map(
    t3Inventory.files.map((record) => [
      `package/${record.path.replace("packages/cli/src/", "dist/")}`,
      record,
    ]),
  );
  const actual207 = cliEntries.filter((entry) =>
    /^package\/dist\/templates\/research\/procedures\/[^/]+\/2\.0\.7\//.test(entry),
  );
  if (
    actual207.length !== expected207.size ||
    actual207.some((entry) => !expected207.has(entry))
  ) {
    throw new Error("Packed CLI Procedure 2.0.7 inventory is not the exact T3 set");
  }
  const packageDigest = createHash("sha256").update(PACKAGE_DIGEST_DOMAIN);
  for (const [entry, expected] of [...expected207].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    const bytes = tarBytes(cliTarball, entry);
    if (bytes.length !== expected.byteLength || sha256(bytes) !== expected.sha256) {
      throw new Error(`Packed Procedure bytes drifted: ${entry}`);
    }
    packageDigest.update(expected.path, "utf8");
    packageDigest.update(Buffer.from([0]));
    packageDigest.update(bytes);
    packageDigest.update(Buffer.from([0]));
  }
  const observedPackageSetDigest = `sha256:${packageDigest.digest("hex")}`;
  if (observedPackageSetDigest !== PACKAGE_SET_DIGEST) {
    throw new Error(
      `Packed Procedure 2.0.7 package-set digest mismatch: ${observedPackageSetDigest}`,
    );
  }

  for (const member of candidateManifest.members) {
    const entry = `package/dist/templates/research/evaluation-contracts/1.3.1/${member.filename}`;
    const bytes = tarBytes(cliTarball, entry);
    if (bytes.length !== member.byteLength || sha256(bytes) !== member.sha256) {
      throw new Error(`Packed v1.3.1 member drifted: ${member.filename}`);
    }
  }

  return {
    core: packedRecord({
      tarball: coreTarball,
      entries: coreEntries,
      packageJson: corePackage,
      audit: {
        ...coreAudit,
        pathSafety: "pass",
        entryTypes: "regular-files-and-directories-only",
        duplicates: "absent",
        sourceTestConfigLeakage: "absent",
        exportKeys: Object.keys(corePackage.exports),
        deepImportsExported: false,
      },
    }),
    cli: {
      ...packedRecord({
        tarball: cliTarball,
        entries: cliEntries,
        packageJson: cliPackage,
        audit: {
          ...cliAudit,
          pathSafety: "pass",
          entryTypes: "regular-files-and-directories-only",
          duplicates: "absent",
          forbiddenEntries: "absent",
          acceptedV131MemberCount: candidateManifest.memberCount,
          procedure207FamilyCount: t3Inventory.familyCount,
          procedure207FileCount: actual207.length,
          procedure207PackageSetDigest: observedPackageSetDigest,
          liveProcedureSelection: "1.0.0",
          dormantProcedureVersion: "2.0.7",
        },
      }),
      exactCoreDependency: cliPackage.dependencies["@mindfoldhq/trellis-core"],
      bins: cliPackage.bin,
    },
  };
}

function consumerFixture() {
  return `import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as root from "@mindfoldhq/trellis-core";
import * as channel from "@mindfoldhq/trellis-core/channel";
import * as mem from "@mindfoldhq/trellis-core/mem";
import * as research from "@mindfoldhq/trellis-core/research";
import * as task from "@mindfoldhq/trellis-core/task";
import * as testing from "@mindfoldhq/trellis-core/testing";
const require = createRequire(import.meta.url);
const corePackagePath = require.resolve("@mindfoldhq/trellis-core/package.json");
const cliPackagePath = require.resolve("@mindfoldhq/trellis/package.json");
const corePackage = JSON.parse(fs.readFileSync(corePackagePath, "utf8"));
const cliPackage = JSON.parse(fs.readFileSync(cliPackagePath, "utf8"));
const cliRoot = path.dirname(cliPackagePath);
const validation = await import(pathToFileURL(path.join(cliRoot, "dist/commands/research/dispatch-methodology-validation.js")));
const resolution = await import(pathToFileURL(path.join(cliRoot, "dist/commands/research/procedure-resolution.js")));
const pack = validation.loadAcceptedV131ContractPackFromLeaves();
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "project");
fs.mkdirSync(projectRoot, { recursive: true });
const live = await resolution.resolveResearchProcedure({ root: projectRoot, capabilityId: "research.ideation.generate" });
const dormant = await resolution.resolveResearchProcedure({ root: projectRoot, capabilityId: "research.ideation.generate", mode: "activation-recorded", procedureId: "idea-generation-v1", procedureVersion: "2.0.7" });
let deepImportBlocked = false;
try { await import("@mindfoldhq/trellis-core/dist/research/index.js"); } catch (error) { deepImportBlocked = error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"; }
const functions = [root.parseChannelType, channel.parseChannelType, mem.searchMemSessions, research.readResearchState, task.emptyTaskRecord];
if (functions.some((value) => typeof value !== "function")) throw new Error("Core public export missing");
if (Object.keys(testing).length !== 0) throw new Error("Testing namespace is not empty");
if (!deepImportBlocked) throw new Error("Core deep import unexpectedly resolved");
process.stdout.write(JSON.stringify({
  corePackagePath: fs.realpathSync(path.dirname(corePackagePath)),
  cliPackagePath: fs.realpathSync(cliRoot),
  coreVersion: corePackage.version,
  cliVersion: cliPackage.version,
  cliCoreDependency: cliPackage.dependencies["@mindfoldhq/trellis-core"],
  corePublicImports: true,
  testingNamespaceEmpty: true,
  deepImportBlocked,
  contractVersion: pack.contractVersion,
  contractDigest: pack.acceptedContractDigest,
  memberAggregate: pack.derivedMemberAggregateSha256,
  mappingRowCount: pack.mappingRows.length,
  live: { source: live.source, version: live.manifest.version },
  dormant: { source: dormant.source, version: dormant.manifest.version, schema: dormant.packageSchemaVersion, contractVersion: dormant.supportPack?.manifest.methodologyContractVersion, contractDigest: dormant.supportPack?.manifest.methodologyContractDigest },
}));
`;
}

function runtimeEnv(homeDir) {
  const env = {};
  for (const key of ["PATH", "SHELL", "USER", "LOGNAME", "LANG", "LC_ALL", "SystemRoot", "ComSpec", "PATHEXT"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return {
    ...env,
    HOME: homeDir,
    TMPDIR: path.join(homeDir, "tmp"),
    TRELLIS_QUIET: "1",
    NO_UPDATE_NOTIFIER: "1",
  };
}

function binPath(consumerDir, name) {
  const base = path.join(consumerDir, "node_modules", ".bin", name);
  if (process.platform === "win32" && fs.existsSync(`${base}.cmd`)) return `${base}.cmd`;
  return base;
}

function yamlBlockByPrefix(text, prefix) {
  const marker = `\n  '${prefix}`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Missing lockfile block ${prefix}`);
  const bodyStart = start + 1;
  const remainder = text.slice(bodyStart);
  const next = remainder.slice(1).search(/\n  \S/);
  return next < 0 ? remainder.trimEnd() : remainder.slice(0, next + 1).trimEnd();
}

function importerVersion(importer, packageName) {
  const quoted = `      '${packageName}':`;
  const plain = `      ${packageName}:`;
  const start = Math.max(importer.indexOf(quoted), importer.indexOf(plain));
  if (start < 0) throw new Error(`Missing root importer dependency ${packageName}`);
  const remainder = importer.slice(start);
  const next = remainder.slice(1).search(/\n      \S/);
  const block = next < 0 ? remainder : remainder.slice(0, next + 1);
  const match = /\n        version: ([^\n]+)/.exec(block);
  if (!match) throw new Error(`Missing root importer version ${packageName}`);
  return match[1];
}

function buildExternalPnpmLock(importedLock, localCoreSpecifier) {
  const rootLock = fs.readFileSync(path.join(REPO_ROOT, "pnpm-lock.yaml"), "utf8");
  const rootPackages = rootLock.slice(
    rootLock.indexOf("packages:\n") + "packages:\n".length,
    rootLock.indexOf("\nsnapshots:\n"),
  ).replace(/^\n+/, "").trimEnd();
  const rootSnapshots = rootLock.slice(
    rootLock.indexOf("\nsnapshots:\n") + "\nsnapshots:\n".length,
  ).replace(/^\n+/, "").trimEnd();
  const importedImporter = importedLock.slice(
    importedLock.indexOf("importers:\n") + "importers:\n".length,
    importedLock.indexOf("\npackages:\n"),
  ).replace(/^\n+/, "").trimEnd();
  const rootCliImporter = rootLock.slice(
    rootLock.indexOf("  packages/cli:"),
    rootLock.indexOf("\n  packages/core:"),
  );
  const localCorePackage = yamlBlockByPrefix(importedLock, "@mindfoldhq/trellis-core@file:");
  const localCliPackage = yamlBlockByPrefix(importedLock, "@mindfoldhq/trellis@file:");
  const importedSnapshots = importedLock.slice(importedLock.indexOf("\nsnapshots:\n"));
  const localCoreSnapshot = yamlBlockByPrefix(importedSnapshots, "@mindfoldhq/trellis-core@file:");
  let localCliSnapshot = yamlBlockByPrefix(importedSnapshots, "@mindfoldhq/trellis@file:");
  const dependencyVersions = {
    "@mindfoldhq/trellis-core": localCoreSpecifier,
    chalk: importerVersion(rootCliImporter, "chalk"),
    commander: importerVersion(rootCliImporter, "commander"),
    figlet: importerVersion(rootCliImporter, "figlet"),
    inquirer: importerVersion(rootCliImporter, "inquirer"),
    undici: importerVersion(rootCliImporter, "undici"),
    zod: importerVersion(rootCliImporter, "zod"),
  };
  for (const [name, version] of Object.entries(dependencyVersions)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(      ['\"]?${escaped}['\"]?:) [^\\n]+`);
    if (!pattern.test(localCliSnapshot)) {
      throw new Error(`Missing imported CLI snapshot dependency ${name}`);
    }
    localCliSnapshot = localCliSnapshot.replace(pattern, `$1 ${version}`);
  }
  const header = rootLock.slice(0, rootLock.indexOf("importers:\n"));
  return `${header}importers:\n\n${importedImporter}\n\npackages:\n\n${localCorePackage}\n\n${localCliPackage}\n\n${rootPackages}\n\nsnapshots:\n\n${localCoreSnapshot}\n\n${localCliSnapshot}\n\n${rootSnapshots}\n`;
}

function installAndVerify({
  manager,
  consumerDir,
  coreTarball,
  cliTarball,
  versions,
  npmConsumerDir,
}) {
  const homeDir = path.join(consumerDir, "home");
  fs.mkdirSync(path.join(homeDir, "tmp"), { recursive: true });
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    `${JSON.stringify({ name: `trellis-v131-${manager}-consumer`, private: true, type: "module" }, null, 2)}\n`,
  );
  let installArgs;
  if (manager === "npm") {
    installArgs = [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      coreTarball,
      cliTarball,
    ];
    run(manager, installArgs, { cwd: consumerDir });
  } else {
    if (npmConsumerDir === undefined) {
      throw new Error("pnpm audit requires the independently generated npm lockfile");
    }
    fs.copyFileSync(
      path.join(npmConsumerDir, "package.json"),
      path.join(consumerDir, "package.json"),
    );
    const pnpmPackage = readJson(path.join(consumerDir, "package.json"));
    pnpmPackage.packageManager = `pnpm@${versions.pnpm}`;
    fs.writeFileSync(
      path.join(consumerDir, "package.json"),
      `${JSON.stringify(pnpmPackage, null, 2)}\n`,
    );
    fs.copyFileSync(
      path.join(npmConsumerDir, "package-lock.json"),
      path.join(consumerDir, "package-lock.json"),
    );
    run("pnpm", ["import"], { cwd: consumerDir });
    const localCoreSpecifier = readJson(
      path.join(consumerDir, "package.json"),
    ).dependencies["@mindfoldhq/trellis-core"];
    const lockfilePath = path.join(consumerDir, "pnpm-lock.yaml");
    const importedLock = fs.readFileSync(lockfilePath, "utf8");
    if (
      typeof localCoreSpecifier !== "string" ||
      !localCoreSpecifier.startsWith("file:")
    ) {
      throw new Error("Imported pnpm lockfile lacks the expected local Core binding");
    }
    fs.writeFileSync(
      lockfilePath,
      buildExternalPnpmLock(importedLock, localCoreSpecifier),
    );
    installArgs = [
      "install",
      "--offline",
      "--ignore-scripts",
      "--frozen-lockfile",
      "--config.trust-policy=false",
    ];
    run(manager, installArgs, { cwd: consumerDir });
  }
  const fixture = path.join(consumerDir, "runtime-check.mjs");
  fs.writeFileSync(fixture, consumerFixture());
  const env = runtimeEnv(homeDir);
  const result = JSON.parse(run(process.execPath, [fixture], { cwd: consumerDir, env }));
  const coreReal = result.corePackagePath;
  const cliReal = result.cliPackagePath;
  if (!isWithin(consumerDir, coreReal) || !isWithin(consumerDir, cliReal)) {
    throw new Error(`${manager} installed package escaped external consumer`);
  }
  if (isWithin(REPO_ROOT, coreReal) || isWithin(REPO_ROOT, cliReal)) {
    throw new Error(`${manager} resolved an installed package into the repository`);
  }
  if (result.coreVersion !== versions.core || result.cliVersion !== versions.cli) {
    throw new Error(`${manager} installed package version mismatch`);
  }
  if (result.cliCoreDependency !== versions.core || result.cliCoreDependency.includes("workspace:")) {
    throw new Error(`${manager} retained a workspace Core dependency`);
  }
  if (
    result.contractVersion !== CONTRACT_VERSION ||
    result.contractDigest !== CONTRACT_DIGEST ||
    result.memberAggregate !== MEMBER_AGGREGATE ||
    result.mappingRowCount !== 17
  ) {
    throw new Error(`${manager} installed v1.3.1 authentication failed`);
  }
  if (
    result.live.version !== "1.0.0" ||
    result.dormant.version !== "2.0.7" ||
    result.dormant.schema !== 2 ||
    result.dormant.contractVersion !== CONTRACT_VERSION ||
    result.dormant.contractDigest !== CONTRACT_DIGEST
  ) {
    throw new Error(`${manager} installed Procedure authority drifted`);
  }
  const trellisHelp = run(binPath(consumerDir, "trellis"), ["--help"], {
    cwd: consumerDir,
    env,
  });
  const tlHelp = run(binPath(consumerDir, "tl"), ["--help"], {
    cwd: consumerDir,
    env,
  });
  if (!trellisHelp.includes("trellis") || !tlHelp.includes("trellis")) {
    throw new Error(`${manager} installed aliases did not execute`);
  }
  const forbiddenPaths = [
    path.join(consumerDir, ".git"),
    path.join(consumerDir, ".trellis", "tasks"),
    path.join(coreReal, ".trellis", "tasks"),
    path.join(cliReal, ".trellis", "tasks"),
  ];
  if (forbiddenPaths.some((entry) => fs.existsSync(entry))) {
    throw new Error(`${manager} external consumer contains forbidden repository state`);
  }
  return {
    manager,
    toolVersion: versions[manager],
    consumerLocation: "os-temporary-directory-outside-repository",
    installArgv: [manager, ...installArgs.map((arg) => (path.isAbsolute(arg) ? `<${path.basename(arg)}>` : arg))],
    offlineMode: true,
    lifecycleScriptsDisabled: true,
    pnpmImportedLockUsesExactLocalCoreTarball: manager === "pnpm" ? true : null,
    pnpmLockImportedFromLocalNpmLockfile: manager === "pnpm" ? true : null,
    installedVersions: { core: result.coreVersion, cli: result.cliVersion },
    exactCoreDependency: result.cliCoreDependency,
    packageRealpathsContainedByConsumer: true,
    packageRealpathsOutsideRepository: true,
    gitDirectoryAbsent: true,
    trellisTasksAbsent: true,
    repositoryContractOverridePresent: false,
    corePublicImports: result.corePublicImports,
    testingNamespaceEmpty: result.testingNamespaceEmpty,
    deepImportBlocked: result.deepImportBlocked,
    aliasesExecuted: ["trellis", "tl"],
    installedContract: {
      version: result.contractVersion,
      digest: result.contractDigest,
      memberAggregate: result.memberAggregate,
      mappingRowCount: result.mappingRowCount,
    },
    procedureAuthority: {
      liveVersion: result.live.version,
      dormantVersion: result.dormant.version,
      dormantSchema: result.dormant.schema,
      source: result.dormant.source,
    },
    runtimeProviderCommandExecuted: false,
    runtimeNetworkCommandExecuted: false,
    verdict: "pass",
  };
}

function buildInputAttestation(candidateManifest) {
  if (gitTree(T4_COMMIT) !== T4_TREE || gitTree(T0A_COMMIT) !== T0A_TREE || gitTree(A133_COMMIT) !== A133_TREE || gitTree(B133_COMMIT) !== B133_TREE || gitTree(O133_COMMIT) !== O133_TREE) {
    throw new Error("Immutable predecessor tree mismatch");
  }
  try {
    gitBuffer(["merge-base", "--is-ancestor", T4_COMMIT, "HEAD"]);
  } catch {
    throw new Error("Current HEAD does not descend from the exact T4 predecessor");
  }
  const candidateBytes = gitObjectBytes(A133_COMMIT, A133_MANIFEST);
  if (sha256(candidateBytes) !== CANDIDATE_MANIFEST_SHA256) {
    throw new Error("A133 candidate manifest digest mismatch");
  }
  const members = candidateManifest.members.map((member) => {
    const relativePath = `${A133_ROOT}/${member.filename}`;
    const identity = gitFileIdentity(A133_COMMIT, relativePath);
    if (identity.byteLength !== member.byteLength || identity.sha256 !== member.sha256) {
      throw new Error(`A133 semantic member mismatch: ${member.filename}`);
    }
    return identity;
  });
  return {
    schemaVersion: 1,
    recordKind: "t5-successor-integration-input-attestation",
    stage: "T5",
    commitBoundary: "I2",
    directPredecessor: {
      commit: T4_COMMIT,
      tree: T4_TREE,
      currentHeadDescendsFromPredecessor: true,
    },
    immutableInputs: {
      a133: { commit: A133_COMMIT, tree: A133_TREE },
      b133: { commit: B133_COMMIT, tree: B133_TREE, verdict: "pass", findings: 0, humanReviewed: false, humanEquivalent: false },
      o133: { commit: O133_COMMIT, tree: O133_TREE, decision: "accept-with-rationale", authority: "semantic-use-only" },
    },
    semanticAuthority: {
      contractVersion: CONTRACT_VERSION,
      candidateManifestSha256: CANDIDATE_MANIFEST_SHA256,
      memberAggregateSha256: MEMBER_AGGREGATE,
      semanticDigest: CONTRACT_DIGEST,
      completeOutputSetSha256: COMPLETE_OUTPUT_SET,
      members,
      committedBlobAuthentication: "pass",
    },
    procedureAuthority: {
      liveVersion: "1.0.0",
      dormantVersion: "2.0.7",
      familyCount: 17,
      packageSetDigest: PACKAGE_SET_DIGEST,
      activationAuthorized: false,
      liveSelectionChangeAuthorized: false,
    },
    authority: {
      activationAuthorized: false,
      providerExecutionAuthorized: false,
      releaseAuthorized: false,
      publicationAuthorized: false,
      pushAuthorized: false,
      completeSystemAcceptanceAuthorized: false,
    },
    mutableWorktreeSemanticInputAuthorized: false,
    networkUsed: false,
    providerUsed: false,
    privateSourceUsed: false,
    verdict: "pass",
  };
}

function diffDigest(relativePath, cwd = REPO_ROOT) {
  return sha256(execFileSync("git", ["diff", "--binary", "--", relativePath], { cwd, encoding: null }));
}

function stagedDiff(relativePath, cwd = REPO_ROOT) {
  return execFileSync(
    "git",
    ["-C", cwd, "diff", "--cached", "--binary", "--", relativePath],
    { encoding: null },
  );
}

function worktreeStatusPaths() {
  const fields = gitText([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]).split("\0");
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const row = fields[index];
    if (row === "") continue;
    if (row.length < 4 || row[2] !== " ") {
      throw new Error("Malformed Git porcelain status row");
    }
    const status = row.slice(0, 2);
    paths.push(row.slice(3));
    if (status.includes("R") || status.includes("C")) {
      const pairedPath = fields[index + 1];
      if (!pairedPath) throw new Error("Malformed Git rename/copy status row");
      paths.push(pairedPath);
      index += 1;
    }
  }
  return [...new Set(paths)].sort();
}

function protectedWorktreeRoot() {
  const blocks = gitText(["worktree", "list", "--porcelain"])
    .trim()
    .split("\n\n");
  for (const block of blocks) {
    const fields = Object.fromEntries(
      block
        .split("\n")
        .filter((line) => line.includes(" "))
        .map((line) => [line.slice(0, line.indexOf(" ")), line.slice(line.indexOf(" ") + 1)]),
    );
    if (fields.branch !== PROTECTED_BRANCH || !fields.worktree) continue;
    const root = fields.worktree;
    if (fs.realpathSync(root) === fs.realpathSync(REPO_ROOT)) {
      throw new Error("Protected and integration worktrees must remain separate");
    }
    const commit = run("git", ["rev-parse", "HEAD"], { cwd: root }).trim();
    const tree = run("git", ["rev-parse", "HEAD^{tree}"], { cwd: root }).trim();
    if (commit !== PROTECTED_COMMIT || tree !== PROTECTED_TREE) {
      throw new Error("Protected worktree Git subject drifted");
    }
    return root;
  }
  throw new Error("Protected evidence/v13-baseline worktree not found");
}

function buildProtectedAudit() {
  const protectedRoot = protectedWorktreeRoot();
  const baselineBytes = gitObjectBytes(T4_COMMIT, G0_BASELINE_PATH);
  const baseline = JSON.parse(baselineBytes.toString("utf8"));
  if (gitTree(T0A_COMMIT) !== T0A_TREE) {
    throw new Error("T5 successor authorization tree mismatch");
  }
  const authority = JSON.parse(
    gitObjectBytes(T0A_COMMIT, T0A_TASK_PATH).toString("utf8"),
  );
  const i2Inventory = authority.meta?.i2Inventory;
  if (
    i2Inventory?.count !== 8 ||
    !Array.isArray(i2Inventory.paths) ||
    i2Inventory.paths.length !== 8 ||
    new Set(i2Inventory.paths).size !== 8
  ) {
    throw new Error("Committed T0A I2 inventory is not the exact eight-path set");
  }
  const protectedPaths = [
    ...baseline.files.map((record) => record.path),
    ...baseline.submodules.map((record) => record.path),
    baseline.untrackedCs5Decision.path,
  ];
  const allowedPaths = new Set(i2Inventory.paths);
  const dirtyPaths = worktreeStatusPaths();
  const stagedPaths = gitText(["diff", "--cached", "--name-only", "-z"])
    .split("\0")
    .filter(Boolean)
    .sort();
  const unexpectedDirtyPaths = dirtyPaths.filter((entry) => !allowedPaths.has(entry));
  const unexpectedStagedPaths = stagedPaths.filter((entry) => !allowedPaths.has(entry));
  const prospectiveOutputs = new Set(Object.values(OUTPUTS));
  const missingI2Paths = i2Inventory.paths.filter((entry) => {
    const absolute = path.join(REPO_ROOT, entry);
    return !fs.existsSync(absolute) && !prospectiveOutputs.has(absolute);
  });
  if (
    unexpectedDirtyPaths.length > 0 ||
    unexpectedStagedPaths.length > 0 ||
    missingI2Paths.length > 0
  ) {
    throw new Error(
      `I2 worktree scope mismatch: unexpectedDirty=${unexpectedDirtyPaths.join(",")} unexpectedStaged=${unexpectedStagedPaths.join(",")} missing=${missingI2Paths.join(",")}`,
    );
  }
  const worktreeScope = {
    inventorySourceCommit: T0A_COMMIT,
    i2PathCount: i2Inventory.count,
    protectedPathCount: protectedPaths.length,
    allI2PathsPresentOrProduced: true,
    allObservedDirtyPathsAllowed: true,
    allObservedStagedPathsAllowed: true,
    unexpectedDirtyPaths,
    unexpectedStagedPaths,
    missingI2Paths,
    verdict: "pass",
  };
  const files = baseline.files.map((record) => {
    const stagedBytes = stagedDiff(record.path, protectedRoot);
    const actual = {
      path: record.path,
      sha256: sha256(fs.readFileSync(path.join(protectedRoot, record.path))),
      gitDiffBinarySha256: diffDigest(record.path, protectedRoot),
      stagedDiffBinarySha256: sha256(stagedBytes),
      stagedDiffEmpty: stagedBytes.length === 0,
    };
    return {
      ...actual,
      expectedSha256: record.sha256,
      expectedGitDiffBinarySha256: record.gitDiffBinarySha256,
      matches:
        actual.sha256 === record.sha256 &&
        actual.gitDiffBinarySha256 === record.gitDiffBinarySha256 &&
        actual.stagedDiffEmpty,
    };
  });
  const submodules = baseline.submodules.map((record) => {
    const cwd = path.join(protectedRoot, record.path);
    const worktreeCommit = run("git", ["rev-parse", "HEAD"], { cwd }).trim();
    const statusShort = run("git", ["status", "--short", "--untracked-files=all"], { cwd }).trimEnd().split("\n").filter(Boolean);
    const gitDiffBinarySha256 = sha256(execFileSync("git", ["diff", "--binary"], { cwd, encoding: null }));
    const indexLine = run("git", ["ls-files", "--stage", "--", record.path], { cwd: protectedRoot }).trim();
    const indexMatch = /^160000 ([0-9a-f]{40}) 0\t/.exec(indexLine);
    const superprojectIndexCommit = indexMatch?.[1] ?? null;
    const stagedBytes = stagedDiff(record.path, protectedRoot);
    const stagedDiffEmpty = stagedBytes.length === 0;
    return {
      path: record.path,
      indexedCommit: record.commit,
      superprojectIndexCommit,
      worktreeCommit,
      statusShort,
      gitDiffBinarySha256,
      stagedDiffBinarySha256: sha256(stagedBytes),
      stagedDiffEmpty,
      matches:
        superprojectIndexCommit === record.commit &&
        stagedDiffEmpty &&
        worktreeCommit === record.commit &&
        JSON.stringify(statusShort) === JSON.stringify(record.statusShort) &&
        gitDiffBinarySha256 === record.gitDiffBinarySha256,
    };
  });
  const untracked = baseline.untrackedCs5Decision;
  const untrackedBytes = fs.readFileSync(path.join(protectedRoot, untracked.path));
  const untrackedRecord = {
    path: untracked.path,
    tracked: run("git", ["ls-files", "--", untracked.path], { cwd: protectedRoot }).trim() !== "",
    sha256: sha256(untrackedBytes),
  };
  const verdict = files.every((record) => record.matches) && submodules.every((record) => record.matches) && untrackedRecord.tracked === false && untrackedRecord.sha256 === untracked.sha256;
  if (!verdict) throw new Error("Protected path baseline mismatch");
  return {
    schemaVersion: 1,
    recordKind: "t5-successor-protected-path-audit",
    stage: "T5",
    commitBoundary: "I2",
    baseline: { sourceCommit: T4_COMMIT, path: G0_BASELINE_PATH, sha256: sha256(baselineBytes) },
    protectedWorktree: {
      branch: PROTECTED_BRANCH,
      commit: PROTECTED_COMMIT,
      tree: PROTECTED_TREE,
      separateFromIntegrationWorktree: fs.realpathSync(protectedRoot) !== fs.realpathSync(REPO_ROOT),
    },
    authorizedPredecessor: {
      commit: T4_COMMIT,
      tree: T4_TREE,
      currentHeadDescendsFromPredecessor: true,
    },
    worktreeScope,
    files,
    submodules,
    untrackedCs5Decision: { ...untrackedRecord, expectedSha256: untracked.sha256, matches: true },
    immutableExclusions: baseline.immutableExclusions,
    t1ThroughT4MutationPerformed: false,
    historicalCs5Cs6MutationPerformed: false,
    verdict: "pass",
  };
}

function writeOrVerify(records, mode) {
  fs.mkdirSync(RESEARCH_ROOT, { recursive: true });
  for (const [key, value] of Object.entries(records)) {
    const target = OUTPUTS[key];
    const bytes = canonicalBytes(value);
    if (mode === "write") {
      fs.writeFileSync(target, bytes);
    } else {
      if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) {
        throw new Error(`Retained evidence drift: ${path.relative(REPO_ROOT, target)}`);
      }
    }
  }
}

export function runInstalledPackageAudit(mode = "verify") {
  if (mode !== "write" && mode !== "verify") throw new Error("Expected --write or --verify");
  const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131-i2-"));
  if (isWithin(REPO_ROOT, externalRoot)) throw new Error("External audit root is inside repository");
  let cleaned = false;
  try {
    const candidateManifest = JSON.parse(gitObjectBytes(A133_COMMIT, A133_MANIFEST).toString("utf8"));
    const t3Inventory = JSON.parse(gitObjectBytes(T3_COMMIT, T3_INVENTORY_PATH).toString("utf8"));
    const input = buildInputAttestation(candidateManifest);
    const protectedAudit = buildProtectedAudit();

    run("pnpm", ["run", "build"], { cwd: CORE_DIR, stdio: "inherit" });
    run("pnpm", ["run", "build"], { cwd: CLI_DIR, stdio: "inherit" });
    const corePackDir = path.join(externalRoot, "pack", "core");
    const cliPackDir = path.join(externalRoot, "pack", "cli");
    fs.mkdirSync(corePackDir, { recursive: true });
    fs.mkdirSync(cliPackDir, { recursive: true });
    run("pnpm", ["pack", "--pack-destination", corePackDir], { cwd: CORE_DIR });
    run("pnpm", ["pack", "--pack-destination", cliPackDir], { cwd: CLI_DIR });
    const coreTarball = findOneTarball(corePackDir);
    const cliTarball = findOneTarball(cliPackDir);
    const packageInventory = auditTarballs(coreTarball, cliTarball, t3Inventory, candidateManifest);
    const versions = {
      core: packageInventory.core.packageVersion,
      cli: packageInventory.cli.packageVersion,
      npm: run("npm", ["--version"]).trim(),
      pnpm: run("pnpm", ["--version"]).trim(),
    };
    const consumersRoot = path.join(externalRoot, "consumers");
    const npmDir = path.join(consumersRoot, "npm");
    const pnpmDir = path.join(consumersRoot, "pnpm");
    fs.mkdirSync(npmDir, { recursive: true });
    fs.mkdirSync(pnpmDir, { recursive: true });
    const npmConsumer = installAndVerify({
      manager: "npm",
      consumerDir: npmDir,
      coreTarball,
      cliTarball,
      versions,
    });
    const pnpmConsumer = installAndVerify({
      manager: "pnpm",
      consumerDir: pnpmDir,
      coreTarball,
      cliTarball,
      versions,
      npmConsumerDir: npmDir,
    });
    const consumers = [npmConsumer, pnpmConsumer];
    const installEvidence = {
      schemaVersion: 1,
      recordKind: "t5-successor-external-install-evidence",
      stage: "T5",
      commitBoundary: "I2",
      tarballs: {
        core: { sha256: packageInventory.core.sha256, byteLength: packageInventory.core.byteLength },
        cli: { sha256: packageInventory.cli.sha256, byteLength: packageInventory.cli.byteLength },
      },
      tools: { npm: versions.npm, pnpm: versions.pnpm },
      consumers,
      sameAuthenticatedTarballsUsedByBothConsumers: true,
      externalRootOutsideRepository: true,
      cleanup: "performed-in-finally-after-evidence-capture",
      networkPackageResolutionAllowed: false,
      providerExecutionPerformed: false,
      activationPerformed: false,
      liveSelectionChangePerformed: false,
      verdict: "pass",
    };
    writeOrVerify(
      { input, tarballs: { schemaVersion: 1, recordKind: "t5-successor-package-tarball-inventory", stage: "T5", commitBoundary: "I2", ...packageInventory, verdict: "pass" }, install: installEvidence, protected: protectedAudit },
      mode,
    );
    return { packageInventory, installEvidence };
  } finally {
    fs.rmSync(externalRoot, { recursive: true, force: true });
    cleaned = !fs.existsSync(externalRoot);
    if (!cleaned) throw new Error("External audit cleanup failed");
  }
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE;
if (direct) {
  const arg = process.argv[2];
  const mode = arg === "--write" ? "write" : arg === "--verify" ? "verify" : null;
  if (mode === null) throw new Error("Usage: research-v131-installed-package-audit.mjs --write|--verify");
  runInstalledPackageAudit(mode);
  process.stdout.write(`T5 successor installed-package audit ${mode} passed\n`);
}
