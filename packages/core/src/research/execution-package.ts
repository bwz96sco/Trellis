import { createHash } from "node:crypto";

import {
  serializeSupportPackInventoryForDigest,
  type SupportPackInventoryItem,
} from "./procedure-support-pack.js";
import { getResearchCapabilityDefinition } from "./stage-capabilities.js";
import {
  decodeStrictResearchUtf8,
  parseStrictResearchJson,
} from "./strict-json.js";

const TEXT_ENCODER = new TextEncoder();
const SKILL_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const LOWER_SHA256 = /^[0-9a-f]{64}$/;
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_INSTRUCTION_BYTES = 256 * 1024;
const MAX_MEMBER_COUNT = 256;
const MAX_MEMBER_BYTES = 1024 * 1024;
const MAX_AGGREGATE_MEMBER_BYTES = 8 * 1024 * 1024;

const INSTRUCTION_DIGEST_DOMAIN = TEXT_ENCODER.encode(
  "trellis-research-execution-package-instruction-v1\0",
);
const MEMBER_INVENTORY_DIGEST_DOMAIN = TEXT_ENCODER.encode(
  "trellis-research-execution-package-member-inventory-v1\0",
);
const SKILL_PACKAGE_DIGEST_DOMAIN = TEXT_ENCODER.encode(
  "trellis-research-execution-package-digest-v3\0",
);

export type ResearchExecutionPackageKind = "procedure" | "skill";
export type ResearchExecutionProfile = "lightweight" | "managed";
export type ResearchSkillInvocationSource = "model" | "operator-explicit";
export type ResearchSkillEntrypointType = "model-context" | "root-command";
export type ResearchSkillKind = "bounded" | "workflow" | "advisory" | "admin";
export type ResearchSkillMemberRole =
  | "reference"
  | "template"
  | "validator"
  | "helper";
export type ResearchSkillMemberLoad = "default" | "on-demand";
export type ResearchSkillMemberVisibility = "worker-visible" | "root-only";
export type ResearchSkillMemberAudience = "worker" | "root";

export interface ResolvedExecutionPackageIdentity {
  readonly id: string;
  readonly version: string;
  readonly schemaVersion: number;
  readonly packageKind: ResearchExecutionPackageKind;
  readonly packageDigest: `sha256:${string}`;
  readonly instructionDigest: `sha256:${string}`;
  readonly memberInventoryDigest: `sha256:${string}`;
}

export interface ResearchSkillMemberV3 {
  readonly path: string;
  readonly role: ResearchSkillMemberRole;
  readonly load: ResearchSkillMemberLoad;
  readonly visibility: ResearchSkillMemberVisibility;
  readonly sha256: string;
  readonly maxBytes: number;
}

export interface ResearchSkillManifestV3 {
  readonly schemaVersion: 3;
  readonly packageKind: "skill";
  readonly id: string;
  readonly version: string;
  readonly skillKind: ResearchSkillKind;
  readonly invocationSource: ResearchSkillInvocationSource;
  readonly entrypointType: ResearchSkillEntrypointType;
  readonly instructionFile: "SKILL.md";
  readonly allowedProfiles: readonly ResearchExecutionProfile[];
  readonly managedBinding?: Readonly<{ capabilityId: string }>;
  readonly members: readonly ResearchSkillMemberV3[];
  readonly outputs?: Readonly<{
    primary: readonly string[];
    defaultPersistence: "ephemeral" | "request-dependent" | "durable-required";
  }>;
  readonly handoff?: Readonly<{
    suggestedSkillIds: readonly string[];
    autoInvoke: false;
  }>;
}

export interface ResearchSkillInventoryItemV3 extends ResearchSkillMemberV3 {
  readonly byteLength: number;
  readonly content: string;
}

export interface ParsedResearchSkillExecutionPackage {
  readonly source: "project" | "bundled";
  readonly manifest: ResearchSkillManifestV3;
  readonly canonicalManifestJson: string;
  readonly instructions: string;
  readonly identity: ResolvedExecutionPackageIdentity;
  readonly members: readonly ResearchSkillInventoryItemV3[];
}

export type ResearchExecutionPackageErrorCode =
  | "INVALID_RESEARCH_SKILL_MANIFEST"
  | "INVALID_RESEARCH_SKILL_INSTRUCTIONS"
  | "INVALID_RESEARCH_SKILL_MEMBER"
  | "RESEARCH_SKILL_INVOCATION_FORBIDDEN"
  | "RESEARCH_SKILL_MEMBER_FORBIDDEN"
  | "RESEARCH_EXECUTION_PACKAGE_IDENTITY_MISMATCH";

export class ResearchExecutionPackageError extends Error {
  readonly code: ResearchExecutionPackageErrorCode;

  constructor(
    code: ResearchExecutionPackageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchExecutionPackageError";
    this.code = code;
  }
}

function fail(
  code: ResearchExecutionPackageErrorCode,
  message: string,
  cause?: unknown,
): never {
  throw new ResearchExecutionPackageError(
    code,
    message,
    cause === undefined ? undefined : { cause },
  );
}

function plainObject(
  input: unknown,
  label: string,
  code: ResearchExecutionPackageErrorCode,
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    fail(code, `${label} must be a JSON object`);
  }
  return input as Record<string, unknown>;
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string,
  code: ResearchExecutionPackageErrorCode,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(code, `${label}.${key} is not supported`);
  }
  for (const key of required) {
    if (!(key in value)) fail(code, `${label}.${key} is required`);
  }
}

function stringValue(
  input: unknown,
  label: string,
  code: ResearchExecutionPackageErrorCode,
): string {
  if (typeof input !== "string" || input.length === 0) {
    fail(code, `${label} must be a non-empty string`);
  }
  return input;
}

function enumValue<T extends string>(
  input: unknown,
  label: string,
  values: readonly T[],
  code: ResearchExecutionPackageErrorCode,
): T {
  if (typeof input !== "string" || !values.includes(input as T)) {
    fail(code, `${label} must be one of: ${values.join(", ")}`);
  }
  return input as T;
}

function positiveInteger(
  input: unknown,
  label: string,
  maximum: number,
  code: ResearchExecutionPackageErrorCode,
): number {
  if (
    typeof input !== "number" ||
    !Number.isInteger(input) ||
    input <= 0 ||
    input > maximum
  ) {
    fail(code, `${label} must be an integer between 1 and ${maximum}`);
  }
  return input;
}

function exactSemver(input: unknown, label: string): string {
  const value = stringValue(input, label, "INVALID_RESEARCH_SKILL_MANIFEST");
  if (value.includes("+")) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", `${label} must be exact SemVer`);
  }
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
    value,
  );
  if (
    match === null ||
    match[4]
      ?.split(".")
      .some((part) => /^\d+$/.test(part) && /^0\d/.test(part))
  ) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", `${label} must be exact SemVer`);
  }
  return value;
}

function sortedUniqueStrings(
  input: unknown,
  label: string,
  options: { readonly allowEmpty?: boolean; readonly idPattern?: RegExp } = {},
): readonly string[] {
  if (!Array.isArray(input) || (!options.allowEmpty && input.length === 0)) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      `${label} must be ${options.allowEmpty ? "an" : "a non-empty"} array`,
    );
  }
  const items = input.map((entry) =>
    stringValue(entry, `${label} entry`, "INVALID_RESEARCH_SKILL_MANIFEST"),
  );
  if (new Set(items).size !== items.length) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", `${label} entries must be unique`);
  }
  if (options.idPattern && items.some((item) => !options.idPattern?.test(item))) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", `${label} contains an invalid Skill id`);
  }
  const sorted = [...items].sort();
  if (sorted.some((item, index) => item !== items[index])) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", `${label} must be sorted`);
  }
  return Object.freeze(items);
}

function parseAllowedProfiles(input: unknown): readonly ResearchExecutionProfile[] {
  if (!Array.isArray(input)) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "skill.allowedProfiles must be an array",
    );
  }
  const profiles = input.map((entry) =>
    enumValue(
      entry,
      "skill.allowedProfiles entry",
      ["lightweight", "managed"] as const,
      "INVALID_RESEARCH_SKILL_MANIFEST",
    ),
  );
  if (new Set(profiles).size !== profiles.length) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "skill.allowedProfiles entries must be unique",
    );
  }
  const canonical = ["lightweight", "managed"].filter((profile) =>
    profiles.includes(profile as ResearchExecutionProfile),
  );
  if (canonical.some((profile, index) => profile !== profiles[index])) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "skill.allowedProfiles must use canonical order",
    );
  }
  return Object.freeze(profiles);
}

function normalizeMemberPath(input: unknown): string {
  const value = stringValue(
    input,
    "skill member.path",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
    value === "skill.json" ||
    value === "SKILL.md"
  ) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      `skill member.path is unsafe: ${value}`,
    );
  }
  return value;
}

function parseMember(input: unknown): ResearchSkillMemberV3 {
  const value = plainObject(
    input,
    "skill member",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  assertKeys(
    value,
    ["path", "role", "load", "visibility", "sha256", "maxBytes"],
    ["path", "role", "load", "visibility", "sha256", "maxBytes"],
    "skill member",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  const digest = stringValue(
    value.sha256,
    "skill member.sha256",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  if (!LOWER_SHA256.test(digest)) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "skill member.sha256 must be 64 lowercase hexadecimal characters",
    );
  }
  return Object.freeze({
    path: normalizeMemberPath(value.path),
    role: enumValue(
      value.role,
      "skill member.role",
      ["reference", "template", "validator", "helper"] as const,
      "INVALID_RESEARCH_SKILL_MANIFEST",
    ),
    load: enumValue(
      value.load,
      "skill member.load",
      ["default", "on-demand"] as const,
      "INVALID_RESEARCH_SKILL_MANIFEST",
    ),
    visibility: enumValue(
      value.visibility,
      "skill member.visibility",
      ["worker-visible", "root-only"] as const,
      "INVALID_RESEARCH_SKILL_MANIFEST",
    ),
    sha256: digest,
    maxBytes: positiveInteger(
      value.maxBytes,
      "skill member.maxBytes",
      MAX_MEMBER_BYTES,
      "INVALID_RESEARCH_SKILL_MANIFEST",
    ),
  });
}

function parseManifest(input: unknown): ResearchSkillManifestV3 {
  const value = plainObject(
    input,
    "Research Skill manifest",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  assertKeys(
    value,
    [
      "schemaVersion",
      "packageKind",
      "id",
      "version",
      "skillKind",
      "invocationSource",
      "entrypointType",
      "instructionFile",
      "allowedProfiles",
      "managedBinding",
      "members",
      "outputs",
      "handoff",
    ],
    [
      "schemaVersion",
      "packageKind",
      "id",
      "version",
      "skillKind",
      "invocationSource",
      "entrypointType",
      "instructionFile",
      "allowedProfiles",
      "members",
    ],
    "Research Skill manifest",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  if (value.schemaVersion !== 3 || value.packageKind !== "skill") {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "Research Skill manifest must declare schemaVersion 3 and packageKind skill",
    );
  }
  const id = stringValue(
    value.id,
    "skill.id",
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  if (!SKILL_ID.test(id)) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", "skill.id is invalid");
  }
  if (value.instructionFile !== "SKILL.md") {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "skill.instructionFile must be SKILL.md",
    );
  }
  const allowedProfiles = parseAllowedProfiles(value.allowedProfiles);
  if (!Array.isArray(value.members) || value.members.length > MAX_MEMBER_COUNT) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      `skill.members must contain at most ${MAX_MEMBER_COUNT} entries`,
    );
  }
  const members = value.members.map(parseMember);
  const memberPaths = members.map((member) => member.path);
  if (new Set(memberPaths).size !== memberPaths.length) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", "skill member paths must be unique");
  }
  const sortedMemberPaths = [...memberPaths].sort();
  if (sortedMemberPaths.some((memberPath, index) => memberPath !== memberPaths[index])) {
    fail("INVALID_RESEARCH_SKILL_MANIFEST", "skill.members must be sorted by path");
  }

  const invocationSource = enumValue(
    value.invocationSource,
    "skill.invocationSource",
    ["model", "operator-explicit"] as const,
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );
  const entrypointType = enumValue(
    value.entrypointType,
    "skill.entrypointType",
    ["model-context", "root-command"] as const,
    "INVALID_RESEARCH_SKILL_MANIFEST",
  );

  let managedBinding: ResearchSkillManifestV3["managedBinding"];
  if (value.managedBinding !== undefined) {
    const binding = plainObject(
      value.managedBinding,
      "skill.managedBinding",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    assertKeys(
      binding,
      ["capabilityId"],
      ["capabilityId"],
      "skill.managedBinding",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    const capabilityId = stringValue(
      binding.capabilityId,
      "skill.managedBinding.capabilityId",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    if (getResearchCapabilityDefinition(capabilityId) === undefined) {
      fail(
        "INVALID_RESEARCH_SKILL_MANIFEST",
        `skill.managedBinding.capabilityId '${capabilityId}' is unknown`,
      );
    }
    managedBinding = Object.freeze({ capabilityId });
  }

  if (entrypointType === "model-context") {
    if (allowedProfiles.length === 0) {
      fail(
        "INVALID_RESEARCH_SKILL_MANIFEST",
        "model-context Skills require at least one allowed profile",
      );
    }
    if (allowedProfiles.includes("managed") !== (managedBinding !== undefined)) {
      fail(
        "INVALID_RESEARCH_SKILL_MANIFEST",
        "managedBinding must be present exactly when managed is allowed",
      );
    }
  } else if (
    invocationSource !== "operator-explicit" ||
    allowedProfiles.length !== 0 ||
    managedBinding !== undefined ||
    members.some((member) => member.visibility === "worker-visible")
  ) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "root-command Skills require operator-explicit invocation, no profiles or managed binding, and no worker-visible members",
    );
  }

  let outputs: ResearchSkillManifestV3["outputs"];
  if (value.outputs !== undefined) {
    const parsed = plainObject(
      value.outputs,
      "skill.outputs",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    assertKeys(
      parsed,
      ["primary", "defaultPersistence"],
      ["primary", "defaultPersistence"],
      "skill.outputs",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    outputs = Object.freeze({
      primary: sortedUniqueStrings(parsed.primary, "skill.outputs.primary"),
      defaultPersistence: enumValue(
        parsed.defaultPersistence,
        "skill.outputs.defaultPersistence",
        ["ephemeral", "request-dependent", "durable-required"] as const,
        "INVALID_RESEARCH_SKILL_MANIFEST",
      ),
    });
  }

  let handoff: ResearchSkillManifestV3["handoff"];
  if (value.handoff !== undefined) {
    const parsed = plainObject(
      value.handoff,
      "skill.handoff",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    assertKeys(
      parsed,
      ["suggestedSkillIds", "autoInvoke"],
      ["suggestedSkillIds", "autoInvoke"],
      "skill.handoff",
      "INVALID_RESEARCH_SKILL_MANIFEST",
    );
    if (parsed.autoInvoke !== false) {
      fail("INVALID_RESEARCH_SKILL_MANIFEST", "skill.handoff.autoInvoke must be false");
    }
    handoff = Object.freeze({
      suggestedSkillIds: sortedUniqueStrings(
        parsed.suggestedSkillIds,
        "skill.handoff.suggestedSkillIds",
        { allowEmpty: true, idPattern: SKILL_ID },
      ),
      autoInvoke: false,
    });
  }

  return Object.freeze({
    schemaVersion: 3,
    packageKind: "skill",
    id,
    version: exactSemver(value.version, "skill.version"),
    skillKind: enumValue(
      value.skillKind,
      "skill.skillKind",
      ["bounded", "workflow", "advisory", "admin"] as const,
      "INVALID_RESEARCH_SKILL_MANIFEST",
    ),
    invocationSource,
    entrypointType,
    instructionFile: "SKILL.md",
    allowedProfiles,
    ...(managedBinding === undefined ? {} : { managedBinding }),
    members: Object.freeze(members),
    ...(outputs === undefined ? {} : { outputs }),
    ...(handoff === undefined ? {} : { handoff }),
  });
}

export function serializeResearchSkillManifestV3(
  manifest: ResearchSkillManifestV3,
): string {
  const value = {
    schemaVersion: 3,
    packageKind: "skill",
    id: manifest.id,
    version: manifest.version,
    skillKind: manifest.skillKind,
    invocationSource: manifest.invocationSource,
    entrypointType: manifest.entrypointType,
    instructionFile: "SKILL.md",
    allowedProfiles: manifest.allowedProfiles,
    ...(manifest.managedBinding === undefined
      ? {}
      : { managedBinding: { capabilityId: manifest.managedBinding.capabilityId } }),
    members: manifest.members.map((member) => ({
      path: member.path,
      role: member.role,
      load: member.load,
      visibility: member.visibility,
      sha256: member.sha256,
      maxBytes: member.maxBytes,
    })),
    ...(manifest.outputs === undefined
      ? {}
      : {
          outputs: {
            primary: manifest.outputs.primary,
            defaultPersistence: manifest.outputs.defaultPersistence,
          },
        }),
    ...(manifest.handoff === undefined
      ? {}
      : {
          handoff: {
            suggestedSkillIds: manifest.handoff.suggestedSkillIds,
            autoInvoke: false,
          },
        }),
  };
  return `${JSON.stringify(value)}\n`;
}

function uint64Frame(bytes: Uint8Array): Uint8Array {
  const framed = new Uint8Array(8 + bytes.length);
  new DataView(framed.buffer).setBigUint64(0, BigInt(bytes.length), false);
  framed.set(bytes, 8);
  return framed;
}

function digest(parts: readonly Uint8Array[]): `sha256:${string}` {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return `sha256:${hash.digest("hex")}`;
}

export function computeResearchExecutionPackageInstructionDigest(
  instructionBytes: Uint8Array,
): `sha256:${string}` {
  const bytes = new Uint8Array(instructionBytes);
  return digest([INSTRUCTION_DIGEST_DOMAIN, uint64Frame(bytes)]);
}

export function computeResearchExecutionPackageMemberInventoryDigest(input: {
  readonly adapter: "procedure-v1" | "procedure-v2" | "skill-v3";
  readonly canonicalInventoryBytes: Uint8Array;
}): `sha256:${string}` {
  return digest([
    MEMBER_INVENTORY_DIGEST_DOMAIN,
    uint64Frame(TEXT_ENCODER.encode(input.adapter)),
    uint64Frame(new Uint8Array(input.canonicalInventoryBytes)),
  ]);
}

function serializeSkillInventory(items: readonly ResearchSkillInventoryItemV3[]): string {
  return `${JSON.stringify(
    items.map((item) => ({
      path: item.path,
      role: item.role,
      load: item.load,
      visibility: item.visibility,
      sha256: item.sha256,
      maxBytes: item.maxBytes,
      byteLength: item.byteLength,
    })),
  )}\n`;
}

export function computeResearchSkillPackageDigest(input: {
  readonly canonicalManifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
  readonly canonicalInventoryBytes: Uint8Array;
  readonly members: readonly Readonly<{
    path: string;
    bytes: Uint8Array;
  }>[];
}): `sha256:${string}` {
  const parts: Uint8Array[] = [
    SKILL_PACKAGE_DIGEST_DOMAIN,
    uint64Frame(new Uint8Array(input.canonicalManifestBytes)),
    uint64Frame(new Uint8Array(input.instructionBytes)),
    uint64Frame(new Uint8Array(input.canonicalInventoryBytes)),
  ];
  for (const member of input.members) {
    parts.push(
      uint64Frame(TEXT_ENCODER.encode(member.path)),
      uint64Frame(new Uint8Array(member.bytes)),
    );
  }
  return digest(parts);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length && left.every((byte, index) => byte === right[index])
  );
}

function parseTextBytes(
  bytes: Uint8Array,
  label: string,
  maximumBytes: number,
  code: ResearchExecutionPackageErrorCode,
  options: { readonly allowEmpty?: boolean } = {},
): string {
  if ((!options.allowEmpty && bytes.length === 0) || bytes.length > maximumBytes) {
    fail(
      code,
      options.allowEmpty
        ? `${label} must contain at most ${maximumBytes} bytes`
        : `${label} must contain between 1 and ${maximumBytes} bytes`,
    );
  }
  let text: string;
  try {
    text = decodeStrictResearchUtf8(bytes);
  } catch (error) {
    fail(code, `${label} must be valid UTF-8 without BOM`, error);
  }
  if (text.includes("\0")) fail(code, `${label} must not contain NUL`);
  return text;
}

export function parseResearchSkillExecutionPackage(input: {
  readonly source: "project" | "bundled";
  readonly manifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
  readonly memberBytes: Readonly<Record<string, Uint8Array>>;
}): ParsedResearchSkillExecutionPackage {
  const manifestBytes = new Uint8Array(input.manifestBytes);
  if (manifestBytes.length === 0 || manifestBytes.length > MAX_MANIFEST_BYTES) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      `skill.json must contain between 1 and ${MAX_MANIFEST_BYTES} bytes`,
    );
  }
  let parsed: unknown;
  try {
    parsed = parseStrictResearchJson(manifestBytes);
  } catch (error) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "Research Skill manifest JSON is invalid",
      error,
    );
  }
  const manifest = parseManifest(parsed);
  const canonicalManifestJson = serializeResearchSkillManifestV3(manifest);
  const canonicalManifestBytes = TEXT_ENCODER.encode(canonicalManifestJson);
  if (!sameBytes(manifestBytes, canonicalManifestBytes)) {
    fail(
      "INVALID_RESEARCH_SKILL_MANIFEST",
      "Research Skill manifest bytes are not canonical",
    );
  }

  const instructionBytes = new Uint8Array(input.instructionBytes);
  const instructions = parseTextBytes(
    instructionBytes,
    "SKILL.md",
    MAX_INSTRUCTION_BYTES,
    "INVALID_RESEARCH_SKILL_INSTRUCTIONS",
  );
  const suppliedPaths = Object.keys(input.memberBytes).sort();
  const declaredPaths = manifest.members.map((member) => member.path);
  if (
    suppliedPaths.length !== declaredPaths.length ||
    suppliedPaths.some((memberPath, index) => memberPath !== declaredPaths[index])
  ) {
    fail(
      "INVALID_RESEARCH_SKILL_MEMBER",
      "supplied Skill members must exactly match the declared inventory",
    );
  }

  let aggregateBytes = 0;
  const digestMembers: { path: string; bytes: Uint8Array }[] = [];
  const members = manifest.members.map((member) => {
    const supplied = input.memberBytes[member.path];
    if (supplied === undefined) {
      fail("INVALID_RESEARCH_SKILL_MEMBER", `Skill member is missing: ${member.path}`);
    }
    const bytes = new Uint8Array(supplied);
    aggregateBytes += bytes.length;
    if (bytes.length > member.maxBytes || bytes.length > MAX_MEMBER_BYTES) {
      fail(
        "INVALID_RESEARCH_SKILL_MEMBER",
        `Skill member exceeds its byte limit: ${member.path}`,
      );
    }
    const actualDigest = createHash("sha256").update(bytes).digest("hex");
    if (actualDigest !== member.sha256) {
      fail(
        "INVALID_RESEARCH_SKILL_MEMBER",
        `Skill member digest does not match its manifest: ${member.path}`,
      );
    }
    const content = parseTextBytes(
      bytes,
      `Skill member ${member.path}`,
      member.maxBytes,
      "INVALID_RESEARCH_SKILL_MEMBER",
      { allowEmpty: true },
    );
    digestMembers.push({ path: member.path, bytes });
    return Object.freeze({ ...member, byteLength: bytes.length, content });
  });
  if (aggregateBytes > MAX_AGGREGATE_MEMBER_BYTES) {
    fail(
      "INVALID_RESEARCH_SKILL_MEMBER",
      `Skill member inventory exceeds ${MAX_AGGREGATE_MEMBER_BYTES} bytes`,
    );
  }

  const canonicalInventoryJson = serializeSkillInventory(members);
  const canonicalInventoryBytes = TEXT_ENCODER.encode(canonicalInventoryJson);
  const identity = Object.freeze({
    id: manifest.id,
    version: manifest.version,
    schemaVersion: 3,
    packageKind: "skill" as const,
    packageDigest: computeResearchSkillPackageDigest({
      canonicalManifestBytes,
      instructionBytes,
      canonicalInventoryBytes,
      members: digestMembers,
    }),
    instructionDigest:
      computeResearchExecutionPackageInstructionDigest(instructionBytes),
    memberInventoryDigest:
      computeResearchExecutionPackageMemberInventoryDigest({
        adapter: "skill-v3",
        canonicalInventoryBytes,
      }),
  });

  return Object.freeze({
    source: input.source,
    manifest,
    canonicalManifestJson,
    instructions,
    identity,
    members: Object.freeze(members),
  });
}

export function normalizeResearchProcedureExecutionPackageIdentity(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly packageSchemaVersion: 1 | 2;
  readonly packageDigest: string;
  readonly instructionBytes: Uint8Array;
  readonly supportPackInventory?: readonly SupportPackInventoryItem[];
}): ResolvedExecutionPackageIdentity {
  if (!/^sha256:[0-9a-f]{64}$/.test(input.packageDigest)) {
    fail(
      "RESEARCH_EXECUTION_PACKAGE_IDENTITY_MISMATCH",
      "Procedure package digest is invalid",
    );
  }
  if (
    (input.packageSchemaVersion === 1 && input.supportPackInventory !== undefined) ||
    (input.packageSchemaVersion === 2 && input.supportPackInventory === undefined)
  ) {
    fail(
      "RESEARCH_EXECUTION_PACKAGE_IDENTITY_MISMATCH",
      "Procedure support inventory does not match its package schema version",
    );
  }
  const inventoryJson =
    input.packageSchemaVersion === 1
      ? "[]\n"
      : serializeSupportPackInventoryForDigest(input.supportPackInventory ?? []);
  return Object.freeze({
    id: input.procedureId,
    version: input.procedureVersion,
    schemaVersion: input.packageSchemaVersion,
    packageKind: "procedure",
    packageDigest: input.packageDigest as `sha256:${string}`,
    instructionDigest: computeResearchExecutionPackageInstructionDigest(
      input.instructionBytes,
    ),
    memberInventoryDigest:
      computeResearchExecutionPackageMemberInventoryDigest({
        adapter:
          input.packageSchemaVersion === 1 ? "procedure-v1" : "procedure-v2",
        canonicalInventoryBytes: TEXT_ENCODER.encode(inventoryJson),
      }),
  });
}

export function validateResearchSkillInvocation(input: {
  readonly skill: ParsedResearchSkillExecutionPackage;
  readonly invocationSource: ResearchSkillInvocationSource;
  readonly profile?: ResearchExecutionProfile;
}): void {
  const { manifest } = input.skill;
  if (manifest.invocationSource === "operator-explicit" && input.invocationSource !== "operator-explicit") {
    fail(
      "RESEARCH_SKILL_INVOCATION_FORBIDDEN",
      `Research Skill '${manifest.id}' requires operator-explicit selection`,
    );
  }
  if (manifest.entrypointType === "root-command") {
    if (input.profile !== undefined) {
      fail(
        "RESEARCH_SKILL_INVOCATION_FORBIDDEN",
        `Research Skill '${manifest.id}' is a root command and has no model execution profile`,
      );
    }
    return;
  }
  if (input.profile === undefined || !manifest.allowedProfiles.includes(input.profile)) {
    fail(
      "RESEARCH_SKILL_INVOCATION_FORBIDDEN",
      `Research Skill '${manifest.id}' does not allow the requested execution profile`,
    );
  }
  if (input.profile === "managed" && manifest.managedBinding === undefined) {
    fail(
      "RESEARCH_SKILL_INVOCATION_FORBIDDEN",
      `Research Skill '${manifest.id}' has no managed capability binding`,
    );
  }
}

export function selectResearchSkillMembers(input: {
  readonly skill: ParsedResearchSkillExecutionPackage;
  readonly audience: ResearchSkillMemberAudience;
  readonly requestedPaths?: readonly string[];
}): readonly ResearchSkillInventoryItemV3[] {
  const requested = input.requestedPaths ?? [];
  if (new Set(requested).size !== requested.length) {
    fail(
      "RESEARCH_SKILL_MEMBER_FORBIDDEN",
      "Requested Research Skill member paths must be unique",
    );
  }
  const byPath = new Map(input.skill.members.map((member) => [member.path, member]));
  for (const requestedPath of requested) {
    const member = byPath.get(requestedPath);
    if (
      member === undefined ||
      (input.audience === "worker" && member.visibility !== "worker-visible")
    ) {
      fail(
        "RESEARCH_SKILL_MEMBER_FORBIDDEN",
        `Research Skill member request is forbidden: ${requestedPath}`,
      );
    }
  }
  const selected = input.skill.members.filter(
    (member) =>
      (input.audience === "root" || member.visibility === "worker-visible") &&
      (member.load === "default" || requested.includes(member.path)),
  );
  return Object.freeze(selected);
}

export function selectExactResearchSkillMembers(input: {
  readonly skill: ParsedResearchSkillExecutionPackage;
  readonly audience: ResearchSkillMemberAudience;
  readonly requestedPaths: readonly string[];
}): readonly ResearchSkillInventoryItemV3[] {
  selectResearchSkillMembers(input);
  const requested = new Set(input.requestedPaths);
  return Object.freeze(
    input.skill.members.filter(
      (member) =>
        requested.has(member.path) &&
        (input.audience === "root" || member.visibility === "worker-visible"),
    ),
  );
}

export function assertResearchExecutionPackageIdentity(
  actual: ResolvedExecutionPackageIdentity,
  expected: Readonly<
    Partial<ResolvedExecutionPackageIdentity> &
      Pick<ResolvedExecutionPackageIdentity, "id" | "version" | "packageKind">
  >,
): void {
  for (const key of [
    "id",
    "version",
    "packageKind",
    "schemaVersion",
    "packageDigest",
    "instructionDigest",
    "memberInventoryDigest",
  ] as const) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) {
      fail(
        "RESEARCH_EXECUTION_PACKAGE_IDENTITY_MISMATCH",
        `Research execution-package identity mismatch for ${key}`,
      );
    }
  }
}
