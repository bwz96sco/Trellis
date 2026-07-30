import { createHash } from "node:crypto";

import { stableResearchJson } from "./projections.js";
import {
  computeResearchProcedureDigestV2,
  type SupportPackInventoryItem,
  type SupportPackManifest,
} from "./procedure-support-pack.js";
import {
  ResearchCapabilityResolutionError,
  getResearchCapabilityDefinition,
  type DispatchableQuestStage,
  type ResearchActivationMode,
  type ResearchCapabilityDefinition,
  type ResearchCapabilityId,
  type ResearchCapabilityKind,
} from "./stage-capabilities.js";
import {
  decodeStrictResearchUtf8,
  parseStrictResearchJson,
} from "./strict-json.js";

const TEXT_ENCODER = new TextEncoder();
const PROCEDURE_DIGEST_DOMAIN = TEXT_ENCODER.encode(
  "trellis-research-procedure-digest-v1\0",
);
const POLICY_DIGEST_DOMAIN = TEXT_ENCODER.encode(
  "trellis-research-policy-digest-v1\0",
);
const PROCEDURE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MANIFEST_KEYS = [
  "schemaVersion",
  "id",
  "version",
  "stage",
  "kind",
  "inputs",
  "outputs",
  "networkPolicy",
  "repositoryScope",
  "maxDurationMinutes",
  "maxDispatches",
  "replaces",
] as const;
const REQUIRED_MANIFEST_KEYS = MANIFEST_KEYS.slice(0, 9);
const DEFAULT_POLICY_KEYS = [
  "automaticEnabled",
  "maxDurationMinutes",
  "maxDispatches",
  "allowNetwork",
  "allowExternalCost",
  "allowMultipleRepositories",
  "allowCanonicalMutation",
  "allowCapabilityChaining",
] as const;
const CAPABILITY_POLICY_KEYS = [
  "enabled",
  "activation",
  "maxDurationMinutes",
  "maxDispatches",
  "allowNetwork",
  "allowExternalCost",
  "allowMultipleRepositories",
  "allowCanonicalMutation",
  "allowCapabilityChaining",
] as const;

export type ResearchProcedureSource = "bundled" | "project";

export interface ResearchProcedureManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly stage: DispatchableQuestStage;
  readonly kind: ResearchCapabilityKind;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly networkPolicy: "forbidden" | "declared-only";
  readonly repositoryScope: "single" | "multiple";
  readonly maxDurationMinutes?: number;
  readonly maxDispatches?: number;
  readonly replaces?: Readonly<{ id: string; version: string }>;
}

export interface ResearchCapabilityPolicyV1 {
  readonly enabled?: boolean;
  readonly activation?: "explicit";
  readonly maxDurationMinutes?: number;
  readonly maxDispatches?: number;
  readonly allowNetwork?: false;
  readonly allowExternalCost?: false;
  readonly allowMultipleRepositories?: false;
  readonly allowCanonicalMutation?: false;
  readonly allowCapabilityChaining?: false;
}

export interface ResearchProjectPolicyV1 {
  readonly schemaVersion: 1;
  readonly defaults: Readonly<{
    automaticEnabled: boolean;
    maxDurationMinutes: number;
    maxDispatches: number;
    allowNetwork: false;
    allowExternalCost: false;
    allowMultipleRepositories: false;
    allowCanonicalMutation: false;
    allowCapabilityChaining: false;
  }>;
  readonly capabilities: Readonly<
    Partial<Record<ResearchCapabilityId, ResearchCapabilityPolicyV1>>
  >;
}

export type ResearchProcedureIdentityMode =
  | "capability-current"
  | "recorded-version";

export interface ParsedResearchProcedure {
  readonly capability: ResearchCapabilityDefinition;
  readonly source: ResearchProcedureSource;
  readonly manifest: ResearchProcedureManifest;
  readonly canonicalManifestJson: string;
  readonly instructions: string;
  readonly digest: string;
  /** Present only when a methodology support pack was bound into a v2 digest. */
  readonly digestDomain?: "v1" | "v2";
  /** Procedure package schema discriminator used for digest/support-pack rules. */
  readonly packageSchemaVersion: 1 | 2;
  /**
   * Retained support-pack views for schema-v2 packages (not discarded after digest).
   * Root-only entries remain in inventory; worker-visible view filters them.
   */
  readonly supportPack?: Readonly<{
    readonly manifest: SupportPackManifest;
    readonly packJsonBytes: Uint8Array;
    readonly inventoryItems: readonly SupportPackInventoryItem[];
    readonly workerVisibleInventory: readonly SupportPackInventoryItem[];
  }>;
}

export interface ParsedResearchProjectPolicy {
  readonly policy: ResearchProjectPolicyV1;
  readonly sourceJson: string;
  readonly digest: string;
}

export interface ResearchEffectiveAuthority {
  readonly capabilityId: ResearchCapabilityId;
  readonly procedure: Readonly<{ id: string; version: string; digest: string }>;
  readonly enabled: boolean;
  readonly kind: ResearchCapabilityKind;
  readonly activation: ResearchActivationMode;
  readonly automaticPolicyEnabled: boolean;
  readonly workerAuthority: "proposal-only";
  readonly networkPolicy: "forbidden" | "declared-only";
  readonly repositoryScope: "single" | "multiple";
  readonly allowExternalCost: false;
  readonly allowCanonicalMutation: false;
  readonly allowCapabilityChaining: false;
  readonly maxDurationMinutes: number;
  readonly maxDispatches: number;
}

export type ResearchAutomaticIneligibilityReason =
  | "CAPABILITY_DISABLED"
  | "AUTOMATIC_POLICY_DISABLED"
  | "CAPABILITY_NOT_BOUNDED"
  | "ACTIVATION_NOT_AUTOMATIC"
  | "NETWORK_NOT_FORBIDDEN"
  | "EXTERNAL_COST_ALLOWED"
  | "REPOSITORY_SCOPE_NOT_SINGLE"
  | "CANONICAL_MUTATION_ALLOWED"
  | "CAPABILITY_CHAINING_ALLOWED"
  | "MAX_DISPATCHES_EXCEEDED"
  | "MAX_DURATION_EXCEEDED";

export interface ResearchAutomaticEligibility {
  readonly eligible: boolean;
  readonly reasons: readonly ResearchAutomaticIneligibilityReason[];
}

export type ResearchProcedurePolicyErrorCode =
  | "INVALID_RESEARCH_PROCEDURE"
  | "INVALID_RESEARCH_POLICY"
  | "POLICY_WIDENS_AUTHORITY";

export class ResearchProcedurePolicyError extends Error {
  readonly code: ResearchProcedurePolicyErrorCode;

  constructor(
    code: ResearchProcedurePolicyErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchProcedurePolicyError";
    this.code = code;
  }
}

export const CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON = `{
  "schemaVersion": 1,
  "defaults": {
    "automaticEnabled": false,
    "maxDurationMinutes": 15,
    "maxDispatches": 1,
    "allowNetwork": false,
    "allowExternalCost": false,
    "allowMultipleRepositories": false,
    "allowCanonicalMutation": false,
    "allowCapabilityChaining": false
  },
  "capabilities": {}
}
`;

function fail(
  code: ResearchProcedurePolicyErrorCode,
  message: string,
  cause?: unknown,
): never {
  throw new ResearchProcedurePolicyError(
    code,
    message,
    cause === undefined ? undefined : { cause },
  );
}

function plainObject(
  value: unknown,
  label: string,
  code: ResearchProcedurePolicyErrorCode,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(code, `${label} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string,
  code: ResearchProcedurePolicyErrorCode,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(code, `${label} has unknown key '${key}'`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(code, `${label} is missing required key '${key}'`);
    }
  }
}

function positiveInteger(
  value: unknown,
  label: string,
  code: ResearchProcedurePolicyErrorCode,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    fail(code, `${label} must be a positive integer`);
  }
  return value;
}

function stringArray(
  value: unknown,
  label: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("INVALID_RESEARCH_PROCEDURE", `${label} must be a non-empty array`);
  }
  const items: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      fail(
        "INVALID_RESEARCH_PROCEDURE",
        `${label} entries must be non-empty strings`,
      );
    }
    if (seen.has(item)) {
      fail("INVALID_RESEARCH_PROCEDURE", `${label} entries must be unique`);
    }
    seen.add(item);
    items.push(item);
  }
  return Object.freeze(items);
}

function exactSemver(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("+")) {
    fail("INVALID_RESEARCH_PROCEDURE", `${label} must be exact SemVer`);
  }
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
    value,
  );
  if (match === null) {
    fail("INVALID_RESEARCH_PROCEDURE", `${label} must be exact SemVer`);
  }
  const prerelease = match[4];
  if (
    prerelease?.split(".").some((identifier) => /^\d+$/.test(identifier) && /^0\d/.test(identifier))
  ) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      `${label} has a leading-zero numeric prerelease identifier`,
    );
  }
  return value;
}

function registeredCapability(capabilityId: string): ResearchCapabilityDefinition {
  const capability = getResearchCapabilityDefinition(capabilityId);
  if (capability === undefined) {
    throw new ResearchCapabilityResolutionError(
      "UNKNOWN_CAPABILITY",
      `Unknown Research capability '${capabilityId}'`,
    );
  }
  return capability;
}

function parseManifest(
  parsed: unknown,
  capability: ResearchCapabilityDefinition,
  source: ResearchProcedureSource,
  identityMode: ResearchProcedureIdentityMode = "capability-current",
  recordedVersion?: string,
): ResearchProcedureManifest {
  const value = plainObject(
    parsed,
    "Research Procedure manifest",
    "INVALID_RESEARCH_PROCEDURE",
  );
  assertKeys(
    value,
    MANIFEST_KEYS,
    REQUIRED_MANIFEST_KEYS,
    "Research Procedure manifest",
    "INVALID_RESEARCH_PROCEDURE",
  );
  if (value.schemaVersion !== 1) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure schemaVersion must be 1");
  }
  if (typeof value.id !== "string" || !PROCEDURE_ID.test(value.id)) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure id must be a lowercase slug");
  }
  const version = exactSemver(value.version, "Procedure version");
  if (value.stage !== capability.stage) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure stage does not match capability");
  }
  if (value.kind !== capability.kind) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure kind does not match capability");
  }
  if (value.id !== capability.procedure.id) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "Procedure identity does not match capability binding",
    );
  }
  if (identityMode === "capability-current") {
    if (version !== capability.procedure.version) {
      fail(
        "INVALID_RESEARCH_PROCEDURE",
        "Procedure identity does not match capability binding",
      );
    }
  } else {
    if (recordedVersion === undefined || version !== recordedVersion) {
      fail(
        "INVALID_RESEARCH_PROCEDURE",
        "Procedure version does not match recorded activation version",
      );
    }
  }
  if (value.networkPolicy !== "forbidden" && value.networkPolicy !== "declared-only") {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure networkPolicy is invalid");
  }
  if (value.repositoryScope !== "single" && value.repositoryScope !== "multiple") {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure repositoryScope is invalid");
  }
  if (
    capability.networkPolicy === "forbidden" &&
    value.networkPolicy !== "forbidden"
  ) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure widens network authority");
  }
  if (
    capability.repositoryScope === "single" &&
    value.repositoryScope !== "single"
  ) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure widens repository scope");
  }
  const maxDurationMinutes =
    value.maxDurationMinutes === undefined
      ? undefined
      : positiveInteger(
          value.maxDurationMinutes,
          "Procedure maxDurationMinutes",
          "INVALID_RESEARCH_PROCEDURE",
        );
  const maxDispatches =
    value.maxDispatches === undefined
      ? undefined
      : positiveInteger(
          value.maxDispatches,
          "Procedure maxDispatches",
          "INVALID_RESEARCH_PROCEDURE",
        );
  if (
    maxDurationMinutes !== undefined &&
    maxDurationMinutes > capability.maxDurationMinutes
  ) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure widens duration limit");
  }
  if (maxDispatches !== undefined && maxDispatches > capability.maxDispatches) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure widens Dispatch limit");
  }

  let replaces: Readonly<{ id: string; version: string }> | undefined;
  if (source === "project") {
    const replacement = plainObject(
      value.replaces,
      "Project Procedure replaces",
      "INVALID_RESEARCH_PROCEDURE",
    );
    assertKeys(
      replacement,
      ["id", "version"],
      ["id", "version"],
      "Project Procedure replaces",
      "INVALID_RESEARCH_PROCEDURE",
    );
    // Project overrides must declare which bundled identity they replace.
    // In capability-current mode this is the registry binding; in recorded-version
    // mode it is the recorded package version being revalidated.
    const expectedReplaceVersion =
      identityMode === "capability-current"
        ? capability.procedure.version
        : recordedVersion!;
    if (
      replacement.id !== capability.procedure.id ||
      replacement.version !== expectedReplaceVersion
    ) {
      fail(
        "INVALID_RESEARCH_PROCEDURE",
        "Project Procedure replaces must match bundled binding",
      );
    }
    replaces = Object.freeze({
      id: capability.procedure.id,
      version: expectedReplaceVersion,
    });
  } else if (value.replaces !== undefined) {
    fail("INVALID_RESEARCH_PROCEDURE", "Bundled Procedure must omit replaces");
  }

  return Object.freeze({
    schemaVersion: 1,
    id: value.id,
    version,
    stage: capability.stage,
    kind: capability.kind,
    inputs: stringArray(value.inputs, "Procedure inputs"),
    outputs: stringArray(value.outputs, "Procedure outputs"),
    networkPolicy: value.networkPolicy,
    repositoryScope: value.repositoryScope,
    ...(maxDurationMinutes === undefined ? {} : { maxDurationMinutes }),
    ...(maxDispatches === undefined ? {} : { maxDispatches }),
    ...(replaces === undefined ? {} : { replaces }),
  });
}

function serializeManifest(manifest: ResearchProcedureManifest): string {
  return `${JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    id: manifest.id,
    version: manifest.version,
    stage: manifest.stage,
    kind: manifest.kind,
    inputs: manifest.inputs,
    outputs: manifest.outputs,
    networkPolicy: manifest.networkPolicy,
    repositoryScope: manifest.repositoryScope,
    ...(manifest.maxDurationMinutes === undefined
      ? {}
      : { maxDurationMinutes: manifest.maxDurationMinutes }),
    ...(manifest.maxDispatches === undefined
      ? {}
      : { maxDispatches: manifest.maxDispatches }),
    ...(manifest.replaces === undefined
      ? {}
      : {
          replaces: {
            id: manifest.replaces.id,
            version: manifest.replaces.version,
          },
        }),
  })}\n`;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function sha256(parts: readonly Uint8Array[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return `sha256:${hash.digest("hex")}`;
}

export function computeResearchProcedureDigest(input: {
  readonly canonicalManifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
}): string {
  const manifestBytes = new Uint8Array(input.canonicalManifestBytes);
  const instructionBytes = new Uint8Array(input.instructionBytes);
  if (
    manifestBytes.length === 0 ||
    manifestBytes[manifestBytes.length - 1] !== 0x0a
  ) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "Canonical Procedure manifest must end in one LF",
    );
  }
  if (instructionBytes.length === 0) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure instructions must not be empty");
  }
  return sha256([
    PROCEDURE_DIGEST_DOMAIN,
    manifestBytes.subarray(0, manifestBytes.length - 1),
    Uint8Array.of(0x0a),
    instructionBytes,
  ]);
}

export function parseResearchProcedure(input: {
  readonly capabilityId: string;
  readonly source: ResearchProcedureSource;
  readonly manifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
  readonly identityMode?: ResearchProcedureIdentityMode;
  readonly recordedVersion?: string;
  /**
   * When present, Procedure digest uses the v2 domain binding support-pack
   * inventory. Omit for schema-v1 packages (default).
   */
  readonly packageSchemaVersion?: 1 | 2;
  readonly supportPack?: {
    readonly manifest: SupportPackManifest;
    readonly packJsonBytes: Uint8Array;
    readonly inventoryItems: readonly SupportPackInventoryItem[];
  };
}): ParsedResearchProcedure {
  const capability = registeredCapability(input.capabilityId);
  const identityMode = input.identityMode ?? "capability-current";
  if (
    identityMode === "recorded-version" &&
    (input.recordedVersion === undefined || input.recordedVersion.length === 0)
  ) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "recordedVersion is required for recorded-version identity mode",
    );
  }
  const manifestBytes = new Uint8Array(input.manifestBytes);
  const instructionBytes = new Uint8Array(input.instructionBytes);
  let parsed: unknown;
  try {
    parsed = parseStrictResearchJson(manifestBytes);
  } catch (error) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure manifest JSON is invalid", error);
  }
  const manifest = parseManifest(
    parsed,
    capability,
    input.source,
    identityMode,
    input.recordedVersion,
  );
  const packageSchemaVersion = input.packageSchemaVersion ?? 1;
  if (packageSchemaVersion === 2 && input.supportPack === undefined) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "Schema-v2 Procedure packages require a methodology support pack",
    );
  }
  if (packageSchemaVersion === 1 && input.supportPack !== undefined) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "Schema-v1 Procedure packages must not bind a methodology support pack",
    );
  }
  const canonicalManifestJson = serializeManifest(manifest);
  const canonicalManifestBytes = TEXT_ENCODER.encode(canonicalManifestJson);
  if (!sameBytes(manifestBytes, canonicalManifestBytes)) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "Procedure manifest bytes are not canonical",
    );
  }
  if (instructionBytes.length === 0) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure instructions must not be empty");
  }
  let instructions: string;
  try {
    instructions = decodeStrictResearchUtf8(instructionBytes);
  } catch (error) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure instructions are invalid UTF-8", error);
  }
  if (instructions.includes("\0")) {
    fail("INVALID_RESEARCH_PROCEDURE", "Procedure instructions contain NUL");
  }
  let digest: string;
  let digestDomain: "v1" | "v2" = "v1";
  let supportPack:
    | ParsedResearchProcedure["supportPack"]
    | undefined;
  if (input.supportPack !== undefined) {
    digest = computeResearchProcedureDigestV2({
      canonicalManifestBytes,
      instructionBytes,
      packJsonBytes: input.supportPack.packJsonBytes,
      inventoryItems: input.supportPack.inventoryItems,
    });
    digestDomain = "v2";
    const workerVisibleInventory = Object.freeze(
      input.supportPack.inventoryItems.filter(
        (item) => item.workerVisibility === "worker-visible",
      ),
    );
    supportPack = Object.freeze({
      manifest: input.supportPack.manifest,
      packJsonBytes: new Uint8Array(input.supportPack.packJsonBytes),
      inventoryItems: input.supportPack.inventoryItems,
      workerVisibleInventory,
    });
  } else {
    digest = computeResearchProcedureDigest({
      canonicalManifestBytes,
      instructionBytes,
    });
  }
  return Object.freeze({
    capability,
    source: input.source,
    manifest,
    canonicalManifestJson,
    instructions,
    digest,
    digestDomain,
    packageSchemaVersion,
    ...(supportPack !== undefined ? { supportPack } : {}),
  });
}

function parseAllowFalse(
  value: unknown,
  label: string,
  required: boolean,
): false | undefined {
  if (value === true) fail("POLICY_WIDENS_AUTHORITY", `${label} cannot be true`);
  if (value === undefined && !required) return undefined;
  if (value !== false) fail("INVALID_RESEARCH_POLICY", `${label} must be false`);
  return false;
}

function parsePolicy(input: unknown): ResearchProjectPolicyV1 {
  const value = plainObject(
    input,
    "Research project policy",
    "INVALID_RESEARCH_POLICY",
  );
  assertKeys(
    value,
    ["schemaVersion", "defaults", "capabilities"],
    ["schemaVersion", "defaults", "capabilities"],
    "Research project policy",
    "INVALID_RESEARCH_POLICY",
  );
  if (value.schemaVersion !== 1) {
    fail("INVALID_RESEARCH_POLICY", "Research policy schemaVersion must be 1");
  }
  const defaults = plainObject(
    value.defaults,
    "Research policy defaults",
    "INVALID_RESEARCH_POLICY",
  );
  assertKeys(
    defaults,
    DEFAULT_POLICY_KEYS,
    DEFAULT_POLICY_KEYS,
    "Research policy defaults",
    "INVALID_RESEARCH_POLICY",
  );
  if (typeof defaults.automaticEnabled !== "boolean") {
    fail(
      "INVALID_RESEARCH_POLICY",
      "Research policy automaticEnabled must be boolean",
    );
  }
  const maxDurationMinutes = positiveInteger(
    defaults.maxDurationMinutes,
    "Research policy default maxDurationMinutes",
    "INVALID_RESEARCH_POLICY",
  );
  const maxDispatches = positiveInteger(
    defaults.maxDispatches,
    "Research policy default maxDispatches",
    "INVALID_RESEARCH_POLICY",
  );
  const parsedDefaults = Object.freeze({
    automaticEnabled: defaults.automaticEnabled,
    maxDurationMinutes,
    maxDispatches,
    allowNetwork: parseAllowFalse(defaults.allowNetwork, "allowNetwork", true) as false,
    allowExternalCost: parseAllowFalse(
      defaults.allowExternalCost,
      "allowExternalCost",
      true,
    ) as false,
    allowMultipleRepositories: parseAllowFalse(
      defaults.allowMultipleRepositories,
      "allowMultipleRepositories",
      true,
    ) as false,
    allowCanonicalMutation: parseAllowFalse(
      defaults.allowCanonicalMutation,
      "allowCanonicalMutation",
      true,
    ) as false,
    allowCapabilityChaining: parseAllowFalse(
      defaults.allowCapabilityChaining,
      "allowCapabilityChaining",
      true,
    ) as false,
  });

  const capabilitiesInput = plainObject(
    value.capabilities,
    "Research policy capabilities",
    "INVALID_RESEARCH_POLICY",
  );
  const capabilities: Partial<
    Record<ResearchCapabilityId, ResearchCapabilityPolicyV1>
  > = {};
  for (const [capabilityId, rawOverride] of Object.entries(capabilitiesInput)) {
    const capability = getResearchCapabilityDefinition(capabilityId);
    if (capability === undefined) {
      fail(
        "INVALID_RESEARCH_POLICY",
        `Research policy names unknown capability '${capabilityId}'`,
      );
    }
    const override = plainObject(
      rawOverride,
      `Research policy capability '${capabilityId}'`,
      "INVALID_RESEARCH_POLICY",
    );
    assertKeys(
      override,
      CAPABILITY_POLICY_KEYS,
      [],
      `Research policy capability '${capabilityId}'`,
      "INVALID_RESEARCH_POLICY",
    );
    if (override.enabled !== undefined && typeof override.enabled !== "boolean") {
      fail("INVALID_RESEARCH_POLICY", "Capability enabled must be boolean");
    }
    if (override.activation === "automatic") {
      fail(
        "POLICY_WIDENS_AUTHORITY",
        "Capability activation cannot become automatic",
      );
    }
    if (override.activation !== undefined && override.activation !== "explicit") {
      fail("INVALID_RESEARCH_POLICY", "Capability activation must be explicit");
    }
    const overrideDuration =
      override.maxDurationMinutes === undefined
        ? undefined
        : positiveInteger(
            override.maxDurationMinutes,
            "Capability maxDurationMinutes",
            "INVALID_RESEARCH_POLICY",
          );
    const overrideDispatches =
      override.maxDispatches === undefined
        ? undefined
        : positiveInteger(
            override.maxDispatches,
            "Capability maxDispatches",
            "INVALID_RESEARCH_POLICY",
          );
    if (overrideDuration !== undefined && overrideDuration > maxDurationMinutes) {
      fail(
        "POLICY_WIDENS_AUTHORITY",
        "Capability duration exceeds policy default",
      );
    }
    if (overrideDispatches !== undefined && overrideDispatches > maxDispatches) {
      fail(
        "POLICY_WIDENS_AUTHORITY",
        "Capability Dispatch limit exceeds policy default",
      );
    }
    capabilities[capability.id] = Object.freeze({
      ...(override.enabled === undefined ? {} : { enabled: override.enabled }),
      ...(override.activation === undefined
        ? {}
        : { activation: override.activation }),
      ...(overrideDuration === undefined
        ? {}
        : { maxDurationMinutes: overrideDuration }),
      ...(overrideDispatches === undefined
        ? {}
        : { maxDispatches: overrideDispatches }),
      ...(parseAllowFalse(override.allowNetwork, "allowNetwork", false) === undefined
        ? {}
        : { allowNetwork: false as const }),
      ...(parseAllowFalse(
        override.allowExternalCost,
        "allowExternalCost",
        false,
      ) === undefined
        ? {}
        : { allowExternalCost: false as const }),
      ...(parseAllowFalse(
        override.allowMultipleRepositories,
        "allowMultipleRepositories",
        false,
      ) === undefined
        ? {}
        : { allowMultipleRepositories: false as const }),
      ...(parseAllowFalse(
        override.allowCanonicalMutation,
        "allowCanonicalMutation",
        false,
      ) === undefined
        ? {}
        : { allowCanonicalMutation: false as const }),
      ...(parseAllowFalse(
        override.allowCapabilityChaining,
        "allowCapabilityChaining",
        false,
      ) === undefined
        ? {}
        : { allowCapabilityChaining: false as const }),
    });
  }

  return Object.freeze({
    schemaVersion: 1,
    defaults: parsedDefaults,
    capabilities: Object.freeze(capabilities),
  });
}

export function computeResearchProjectPolicyDigest(
  policy: ResearchProjectPolicyV1,
): string {
  return sha256([
    POLICY_DIGEST_DOMAIN,
    TEXT_ENCODER.encode(stableResearchJson(policy)),
  ]);
}

export function parseResearchProjectPolicy(
  policyBytes: Uint8Array,
): ParsedResearchProjectPolicy {
  const bytes = new Uint8Array(policyBytes);
  let input: unknown;
  let sourceJson: string;
  try {
    sourceJson = decodeStrictResearchUtf8(bytes);
    input = parseStrictResearchJson(bytes);
  } catch (error) {
    fail("INVALID_RESEARCH_POLICY", "Research project policy JSON is invalid", error);
  }
  const policy = parsePolicy(input);
  return Object.freeze({
    policy,
    sourceJson,
    digest: computeResearchProjectPolicyDigest(policy),
  });
}

export function resolveResearchEffectiveAuthority(input: {
  readonly capabilityId: string;
  readonly procedure: ParsedResearchProcedure;
  readonly policy: ParsedResearchProjectPolicy;
}): ResearchEffectiveAuthority {
  const capability = registeredCapability(input.capabilityId);
  if (input.procedure.capability.id !== capability.id) {
    fail(
      "INVALID_RESEARCH_PROCEDURE",
      "Resolved Procedure belongs to another capability",
    );
  }
  const override = input.policy.policy.capabilities[capability.id];
  const procedureDuration =
    input.procedure.manifest.maxDurationMinutes ?? capability.maxDurationMinutes;
  const procedureDispatches =
    input.procedure.manifest.maxDispatches ?? capability.maxDispatches;
  const activation =
    capability.activation === "explicit" ||
    capability.kind === "workflow" ||
    override?.activation === "explicit"
      ? "explicit"
      : "automatic";
  const networkPolicy =
    input.procedure.manifest.networkPolicy === "forbidden" ||
    input.policy.policy.defaults.allowNetwork === false ||
    override?.allowNetwork === false
      ? "forbidden"
      : "declared-only";
  const repositoryScope =
    input.procedure.manifest.repositoryScope === "single" ||
    input.policy.policy.defaults.allowMultipleRepositories === false ||
    override?.allowMultipleRepositories === false
      ? "single"
      : "multiple";

  return Object.freeze({
    capabilityId: capability.id,
    procedure: Object.freeze({
      id: input.procedure.manifest.id,
      version: input.procedure.manifest.version,
      digest: input.procedure.digest,
    }),
    enabled: override?.enabled !== false,
    kind: capability.kind,
    activation,
    automaticPolicyEnabled: input.policy.policy.defaults.automaticEnabled,
    workerAuthority: "proposal-only",
    networkPolicy,
    repositoryScope,
    allowExternalCost: false,
    allowCanonicalMutation: false,
    allowCapabilityChaining: false,
    maxDurationMinutes: Math.min(
      capability.maxDurationMinutes,
      procedureDuration,
      input.policy.policy.defaults.maxDurationMinutes,
      override?.maxDurationMinutes ?? Number.POSITIVE_INFINITY,
    ),
    maxDispatches: Math.min(
      capability.maxDispatches,
      procedureDispatches,
      input.policy.policy.defaults.maxDispatches,
      override?.maxDispatches ?? Number.POSITIVE_INFINITY,
    ),
  });
}

export function evaluateResearchAutomaticEligibility(
  authority: ResearchEffectiveAuthority,
): ResearchAutomaticEligibility {
  const reasons: ResearchAutomaticIneligibilityReason[] = [];
  if (!authority.enabled) reasons.push("CAPABILITY_DISABLED");
  if (!authority.automaticPolicyEnabled) reasons.push("AUTOMATIC_POLICY_DISABLED");
  if (authority.kind !== "bounded") reasons.push("CAPABILITY_NOT_BOUNDED");
  if (authority.activation !== "automatic") reasons.push("ACTIVATION_NOT_AUTOMATIC");
  if (authority.networkPolicy !== "forbidden") reasons.push("NETWORK_NOT_FORBIDDEN");
  if (authority.allowExternalCost !== false) reasons.push("EXTERNAL_COST_ALLOWED");
  if (authority.repositoryScope !== "single") {
    reasons.push("REPOSITORY_SCOPE_NOT_SINGLE");
  }
  if (authority.allowCanonicalMutation !== false) {
    reasons.push("CANONICAL_MUTATION_ALLOWED");
  }
  if (authority.allowCapabilityChaining !== false) {
    reasons.push("CAPABILITY_CHAINING_ALLOWED");
  }
  if (authority.maxDispatches > 1) reasons.push("MAX_DISPATCHES_EXCEEDED");
  if (authority.maxDurationMinutes > 15) reasons.push("MAX_DURATION_EXCEEDED");
  return Object.freeze({
    eligible: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}
