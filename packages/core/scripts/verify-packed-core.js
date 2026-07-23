#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditPackedCoreEntries,
  auditPackedCoreEntrySafety,
  buildPackedCoreInventory,
  parseTarListing,
  validatePackedCorePackage,
  validateTarEntryTypes,
} from "./packed-core-audit.js";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const CORE_DIR = path.resolve(path.dirname(SCRIPT_FILE), "..");
const REPO_ROOT = path.resolve(CORE_DIR, "../..");
const PACKAGE_NAME = "@mindfoldhq/trellis-core";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function findPackedTarball(directory) {
  const tarballs = fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();
  if (tarballs.length !== 1) {
    throw new Error(
      `pnpm pack produced ${tarballs.length} tarballs in ${directory}; expected exactly one.`,
    );
  }
  return path.join(directory, tarballs[0]);
}

function writeConsumerFixtures(consumerDir) {
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(consumerDir, "runtime-check.mjs"),
    `import * as root from "${PACKAGE_NAME}";
import * as channel from "${PACKAGE_NAME}/channel";
import * as mem from "${PACKAGE_NAME}/mem";
import * as research from "${PACKAGE_NAME}/research";
import * as task from "${PACKAGE_NAME}/task";
import * as testing from "${PACKAGE_NAME}/testing";

const expectations = [
  ["root.parseChannelType", root.parseChannelType],
  ["root.emptyTaskRecord", root.emptyTaskRecord],
  ["channel.parseChannelType", channel.parseChannelType],
  ["mem.searchMemSessions", mem.searchMemSessions],
  ["research.readResearchState", research.readResearchState],
  ["research.resolveResearchCapability", research.resolveResearchCapability],
  ["task.emptyTaskRecord", task.emptyTaskRecord],
];
for (const [name, value] of expectations) {
  if (typeof value !== "function") throw new Error(name + " is not a function");
}
if (root.parseChannelType !== channel.parseChannelType) {
  throw new Error("root Channel export identity changed");
}
if (root.emptyTaskRecord !== task.emptyTaskRecord) {
  throw new Error("root Task export identity changed");
}
const expectedRootKeys = [...new Set([...Object.keys(channel), ...Object.keys(task)])].sort();
const actualRootKeys = Object.keys(root).sort();
if (JSON.stringify(actualRootKeys) !== JSON.stringify(expectedRootKeys)) {
  throw new Error("root exports differ from the exact Channel plus Task composition");
}
for (const key of expectedRootKeys) {
  const expected = Object.prototype.hasOwnProperty.call(channel, key) ? channel[key] : task[key];
  if (root[key] !== expected) throw new Error("root export identity changed: " + key);
}
if (Object.keys(testing).length !== 0) {
  throw new Error("reserved Testing namespace is not empty");
}
let deepImportBlocked = false;
try {
  await import("${PACKAGE_NAME}/dist/research/index.js");
} catch (error) {
  if (error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error;
  deepImportBlocked = true;
}
if (!deepImportBlocked) throw new Error("undeclared deep import unexpectedly resolved");
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, "consumer.ts"),
    `import * as root from "${PACKAGE_NAME}";
import * as channelNamespace from "${PACKAGE_NAME}/channel";
import { parseChannelType } from "${PACKAGE_NAME}/channel";
import type { ChannelType } from "${PACKAGE_NAME}/channel";
import { searchMemSessions } from "${PACKAGE_NAME}/mem";
import type { MemSessionInfo } from "${PACKAGE_NAME}/mem";
import { readResearchState, resolveResearchCapability } from "${PACKAGE_NAME}/research";
import type { ResearchCapabilityId, ResearchState } from "${PACKAGE_NAME}/research";
import * as taskNamespace from "${PACKAGE_NAME}/task";
import { emptyTaskRecord } from "${PACKAGE_NAME}/task";
import type { TrellisTaskRecord } from "${PACKAGE_NAME}/task";
import * as testing from "${PACKAGE_NAME}/testing";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Assert<Condition extends true> = Condition;
type RootKeysMatch = Assert<
  Equal<keyof typeof root, keyof typeof channelNamespace | keyof typeof taskNamespace>
>;
type TestingKeysAreEmpty = Assert<Equal<keyof typeof testing, never>>;

const channelType: ChannelType = parseChannelType("project");
const taskRecord: TrellisTaskRecord = emptyTaskRecord();
const memReader: typeof searchMemSessions = searchMemSessions;
const researchReader: (root: string) => Promise<ResearchState> = readResearchState;
const capabilityId: ResearchCapabilityId = resolveResearchCapability({ stage: "audit" }).capability.id;
const memSession = undefined as MemSessionInfo | undefined;
root.parseChannelType;
root.emptyTaskRecord;
// @ts-expect-error Mem remains outside the root compatibility barrel.
root.searchMemSessions;
// @ts-expect-error Research remains outside the root compatibility barrel.
root.readResearchState;
void [channelType, taskRecord, memReader, researchReader, capabilityId, memSession, testing];
`,
  );
  fs.writeFileSync(
    path.join(consumerDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          types: ["node"],
          typeRoots: [path.join(CORE_DIR, "node_modules/@types")],
        },
        include: ["consumer.ts"],
      },
      null,
      2,
    ) + "\n",
  );
}

export function verifyPackedCore() {
  const sourcePackageJson = readJson(path.join(CORE_DIR, "package.json"));
  const temporaryRoot = fs.mkdtempSync(
    path.join(REPO_ROOT, ".pack-core-verify-"),
  );

  try {
    console.log("clean-building core before package verification...");
    execFileSync("pnpm", ["run", "build"], {
      cwd: CORE_DIR,
      stdio: "inherit",
    });
    execFileSync("pnpm", ["pack", "--pack-destination", temporaryRoot], {
      cwd: CORE_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const packOutput = findPackedTarball(temporaryRoot);
    const snapshotDir = path.join(temporaryRoot, "snapshot");
    fs.mkdirSync(snapshotDir);
    const packedTarball = path.join(snapshotDir, "trellis-core.tgz");
    fs.writeFileSync(packedTarball, fs.readFileSync(packOutput), {
      flag: "wx",
      mode: 0o400,
    });

    const tarListing = execFileSync("tar", ["-tzf", packedTarball], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const entries = parseTarListing(tarListing);
    const tarVerboseListing = execFileSync("tar", ["-tvzf", packedTarball], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    validateTarEntryTypes(tarVerboseListing, entries.length);
    auditPackedCoreEntrySafety(entries);
    const packedPackageJson = JSON.parse(
      execFileSync("tar", ["-xOf", packedTarball, "package/package.json"], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
    validatePackedCorePackage(packedPackageJson, sourcePackageJson.version);
    const inventory = buildPackedCoreInventory(packedPackageJson);
    const audit = auditPackedCoreEntries(entries, inventory);

    const extractDir = path.join(temporaryRoot, "extract");
    fs.mkdirSync(extractDir);
    execFileSync("tar", ["-xzf", packedTarball, "-C", extractDir], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const extractedPackageJson = readJson(
      path.join(extractDir, "package/package.json"),
    );
    if (JSON.stringify(extractedPackageJson) !== JSON.stringify(packedPackageJson)) {
      throw new Error("Extracted core package metadata differs from the audited tar entry.");
    }

    const consumerDir = path.join(temporaryRoot, "consumer");
    fs.mkdirSync(consumerDir);
    writeConsumerFixtures(consumerDir);
    execFileSync(
      "npm",
      [
        "install",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-package-lock",
        packedTarball,
      ],
      { cwd: consumerDir, stdio: ["pipe", "pipe", "pipe"] },
    );
    execFileSync(process.execPath, [path.join(consumerDir, "runtime-check.mjs")], {
      cwd: consumerDir,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const typescriptBin = path.join(
      CORE_DIR,
      "node_modules/typescript/bin/tsc",
    );
    execFileSync(
      process.execPath,
      [typescriptBin, "--project", path.join(consumerDir, "tsconfig.json")],
      { cwd: consumerDir, stdio: "inherit" },
    );

    console.log(
      `ok packed core: ${audit.entryCount} canonical entries; ${audit.requiredEntryCount} required metadata/runtime/declaration entries present.`,
    );
    console.log(
      "ok packed core imports: root plus five subpaths resolve, declarations compile, Testing is empty, and deep imports are blocked.",
    );
    return audit;
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_FILE) {
  try {
    verifyPackedCore();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
