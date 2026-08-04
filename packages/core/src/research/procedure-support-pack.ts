import { createHash } from "node:crypto";

import {
  decodeStrictResearchUtf8,
  parseStrictResearchJson,
} from "./strict-json.js";

const TEXT_ENCODER = new TextEncoder();

/** Domain-separated from v1 procedure digests. */
export const PROCEDURE_DIGEST_DOMAIN_V2 = TEXT_ENCODER.encode(
  "trellis-research-procedure-digest-v2\0",
);

/** Frozen methodology contract identity (evaluation-contract-v1.2.0). */
export const FROZEN_METHODOLOGY_CONTRACT_VERSION =
  "evaluation-contract-v1.2.0" as const;
export const FROZEN_METHODOLOGY_CONTRACT_DIGEST =
  "sha256:57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb" as const;

/**
 * Development-bound evaluation-contract-v1.3.0 identity from V13-A attempt-2
 * authoring commit 4c49b8fd (frozen-migration-target digest).
 * Not activated; V13-B agent assurance may still fail later.
 */
export const V13_METHODOLOGY_CONTRACT_VERSION =
  "evaluation-contract-v1.3.0" as const;
export const V13_METHODOLOGY_CONTRACT_DIGEST =
  "sha256:76bf0a2402c8585e79499fdfdcc7afda2ff58d479c483fcf19f13e45d9318166" as const;
export const V13_METHODOLOGY_CANDIDATE_MANIFEST_DIGEST =
  "sha256:d8bc82e870d00593c738c7708528f99381e4d6b308bddf9256d5b4b99563e85f" as const;
export const V13_ATTEMPT2_AUTHORING_COMMIT =
  "4c49b8fd0ae5525d24f1d8d1944571b9d62f610f" as const;

/** Exact procedure-version → methodology contract binding (fail-closed). */
export function resolveMethodologyContractBinding(procedureVersion: string): {
  readonly version: string;
  readonly digest: string;
  readonly disposition:
    | "immutable-exception-2.0.0"
    | "historical-exception-2.0.1"
    | "exact-v1.2"
    | "exact-v1.3-attempt-2-development-binding"
    | "unknown-fail-closed";
} {
  if (procedureVersion === "2.0.0") {
    return {
      version: FROZEN_METHODOLOGY_CONTRACT_VERSION,
      digest: FROZEN_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "immutable-exception-2.0.0",
    };
  }
  if (procedureVersion === "2.0.1") {
    return {
      version: FROZEN_METHODOLOGY_CONTRACT_VERSION,
      digest: FROZEN_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "historical-exception-2.0.1",
    };
  }
  if (procedureVersion === "2.0.2") {
    return {
      version: FROZEN_METHODOLOGY_CONTRACT_VERSION,
      digest: FROZEN_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "exact-v1.2",
    };
  }
  if (procedureVersion === "2.0.3") {
    return {
      version: V13_METHODOLOGY_CONTRACT_VERSION,
      digest: V13_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "exact-v1.3-attempt-2-development-binding",
    };
  }
  return {
    version: "",
    digest: "",
    disposition: "unknown-fail-closed",
  };
}

/** Local error type to avoid circular import with procedure-policy. */
export class SupportPackError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SupportPackError";
  }
}

const REL_PATH = /^(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/;
const ROLE_TYPES = new Set([
  "instructions",
  "artifacts",
  "templates",
  "rubrics",
  "validators",
  "other",
]);

export type SupportPackRole =
  | "instructions"
  | "artifacts"
  | "templates"
  | "rubrics"
  | "validators"
  | "other";

export type SupportPackWorkerVisibility = "worker-visible" | "root-only";

export interface SupportPackEntry {
  readonly path: string;
  readonly role: SupportPackRole;
  readonly mediaType: string;
  readonly contractVersion: string;
  readonly provenanceId: string;
  readonly sha256: string;
  readonly maxBytes: number;
  /** Defaults to worker-visible when omitted (immutable 2.0.0 fixtures). */
  readonly workerVisibility: SupportPackWorkerVisibility;
}

export interface SupportPackManifest {
  readonly schemaVersion: 1;
  readonly procedureId: string;
  readonly procedureVersion: string;
  /**
   * Methodology contract identity. Optional on retained immutable 2.0.0
   * fixtures; required for 2.0.1+ schema-v2 packs.
   * Exact bindings: 2.0.2 → evaluation-contract-v1.2.0; 2.0.3 →
   * evaluation-contract-v1.3.0 attempt-2 development digest. Unknown
   * Procedure/contract/digest combinations fail closed.
   */
  readonly methodologyContractVersion?: string;
  readonly methodologyContractDigest?: string;
  readonly entries: readonly SupportPackEntry[];
}

export interface SupportPackInventoryItem {
  readonly path: string;
  readonly role: SupportPackRole;
  readonly mediaType: string;
  readonly contractVersion: string;
  readonly provenanceId: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly workerVisibility: SupportPackWorkerVisibility;
  readonly bytes: Uint8Array;
}

function fail(message: string, cause?: unknown): never {
  throw new SupportPackError(message, cause ? { cause } : undefined);
}

function plainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function isLowerHexSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function normalizeRelativePath(raw: string): string {
  if (typeof raw !== "string" || raw.length === 0) {
    fail("Support-pack entry path must be a non-empty string");
  }
  if (
    raw.includes("\0") ||
    raw.includes("\\") ||
    raw.startsWith("/") ||
    raw.includes("//") ||
    raw.split("/").some((s) => s === "" || s === "." || s === "..")
  ) {
    fail(`Support-pack entry path is unsafe: ${raw}`);
  }
  if (!REL_PATH.test(raw)) {
    fail(`Support-pack entry path has invalid characters: ${raw}`);
  }
  return raw;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Prefixed(parts: readonly Uint8Array[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return `sha256:${hash.digest("hex")}`;
}

/**
 * Parse methodology/pack.json (canonical form required: exact keys order not required,
 * but path list must be unique and sorted for digest inventory).
 */
export function parseSupportPackManifest(input: {
  readonly packJsonBytes: Uint8Array;
  readonly procedureId: string;
  readonly procedureVersion: string;
}): SupportPackManifest {
  let parsed: unknown;
  try {
    parsed = parseStrictResearchJson(input.packJsonBytes);
  } catch (error) {
    fail("Support-pack pack.json is invalid JSON", error);
  }
  const value = plainObject(parsed, "Support-pack pack.json");
  // Closed object: reject unknown top-level keys.
  const allowedTop = new Set([
    "schemaVersion",
    "procedureId",
    "procedureVersion",
    "methodologyContractVersion",
    "methodologyContractDigest",
    "entries",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedTop.has(key)) {
      fail(`Support-pack pack.json has unknown field '${key}'`);
    }
  }
  if (value.schemaVersion !== 1) {
    fail("Support-pack schemaVersion must be 1");
  }
  if (value.procedureId !== input.procedureId) {
    fail("Support-pack procedureId does not match Procedure id");
  }
  if (value.procedureVersion !== input.procedureVersion) {
    fail("Support-pack procedureVersion does not match Procedure version");
  }
  const isImmutable200 = input.procedureVersion === "2.0.0";
  const isHistorical201 = input.procedureVersion === "2.0.1";
  // Semantic repair packs (2.0.2+) and any future 2.x beyond retained fixtures.
  const requiresStrictSchemaV2 =
    !isImmutable200 &&
    !isHistorical201 &&
    (/^2\./.test(input.procedureVersion) ||
      input.procedureVersion.startsWith("2."));
  const requiresMethodologyContract = !isImmutable200;

  let methodologyContractVersion: string | undefined;
  let methodologyContractDigest: string | undefined;
  if (value.methodologyContractVersion !== undefined) {
    if (
      typeof value.methodologyContractVersion !== "string" ||
      value.methodologyContractVersion.length === 0
    ) {
      fail("Support-pack methodologyContractVersion must be a non-empty string");
    }
    methodologyContractVersion = value.methodologyContractVersion;
  }
  if (value.methodologyContractDigest !== undefined) {
    if (
      typeof value.methodologyContractDigest !== "string" ||
      !value.methodologyContractDigest.startsWith("sha256:") ||
      !isLowerHexSha256(value.methodologyContractDigest.slice("sha256:".length))
    ) {
      fail(
        "Support-pack methodologyContractDigest must be sha256:<64 lowercase hex>",
      );
    }
    methodologyContractDigest = value.methodologyContractDigest;
  }
  if (requiresMethodologyContract) {
    if (
      methodologyContractVersion === undefined ||
      methodologyContractDigest === undefined
    ) {
      fail(
        "Support-pack methodologyContractVersion and methodologyContractDigest are required for schema-v2 packages other than immutable 2.0.0",
      );
    }
  }
  if (input.procedureVersion === "2.0.2") {
    if (
      methodologyContractVersion !== FROZEN_METHODOLOGY_CONTRACT_VERSION ||
      methodologyContractDigest !== FROZEN_METHODOLOGY_CONTRACT_DIGEST
    ) {
      fail(
        "Support-pack 2.0.2 methodology contract must equal exact frozen evaluation-contract-v1.2.0 identity",
      );
    }
  } else if (input.procedureVersion === "2.0.3") {
    if (
      methodologyContractVersion !== V13_METHODOLOGY_CONTRACT_VERSION ||
      methodologyContractDigest !== V13_METHODOLOGY_CONTRACT_DIGEST
    ) {
      fail(
        "Support-pack 2.0.3 methodology contract must equal exact evaluation-contract-v1.3.0 attempt-2 development binding",
      );
    }
  } else if (requiresStrictSchemaV2) {
    fail(
      `Support-pack Procedure version ${input.procedureVersion} has no authorized methodology contract binding (fail closed)`,
    );
  }
  if (!Array.isArray(value.entries)) {
    fail("Support-pack entries must be an array");
  }
  const seen = new Set<string>();
  const entries: SupportPackEntry[] = [];
  const allowedEntry = new Set([
    "path",
    "role",
    "mediaType",
    "contractVersion",
    "provenanceId",
    "sha256",
    "maxBytes",
    "workerVisibility",
  ]);
  for (const raw of value.entries) {
    const entry = plainObject(raw, "Support-pack entry");
    for (const key of Object.keys(entry)) {
      if (!allowedEntry.has(key)) {
        fail(`Support-pack entry has unknown field '${key}'`);
      }
    }
    const path = normalizeRelativePath(String(entry.path ?? ""));
    if (seen.has(path)) fail(`Duplicate support-pack path: ${path}`);
    seen.add(path);
    const role = entry.role;
    if (typeof role !== "string" || !ROLE_TYPES.has(role)) {
      fail(`Unsupported support-pack role for ${path}`);
    }
    if (typeof entry.mediaType !== "string" || entry.mediaType.length === 0) {
      fail(`Support-pack mediaType required for ${path}`);
    }
    if (
      typeof entry.contractVersion !== "string" ||
      entry.contractVersion.length === 0
    ) {
      fail(`Support-pack contractVersion required for ${path}`);
    }
    if (
      typeof entry.provenanceId !== "string" ||
      entry.provenanceId.length === 0
    ) {
      fail(`Support-pack provenanceId required for ${path}`);
    }
    if (typeof entry.sha256 !== "string" || !isLowerHexSha256(entry.sha256)) {
      fail(`Support-pack sha256 must be 64 lowercase hex for ${path}`);
    }
    if (
      typeof entry.maxBytes !== "number" ||
      !Number.isInteger(entry.maxBytes) ||
      entry.maxBytes <= 0
    ) {
      fail(`Support-pack maxBytes must be a positive integer for ${path}`);
    }
    let workerVisibility: SupportPackWorkerVisibility;
    if (entry.workerVisibility === undefined) {
      // Retained immutable 2.0.0/2.0.1 fixtures omit visibility; default only for those.
      // 2.0.2+ require explicit workerVisibility (no silent worker-visible default).
      if (requiresStrictSchemaV2 || input.procedureVersion === "2.0.2") {
        fail(
          `Support-pack workerVisibility is required for ${path} on procedure ${input.procedureVersion}`,
        );
      }
      workerVisibility = "worker-visible";
    } else if (
      entry.workerVisibility !== "worker-visible" &&
      entry.workerVisibility !== "root-only"
    ) {
      fail(`Support-pack workerVisibility invalid for ${path}`);
    } else {
      workerVisibility = entry.workerVisibility;
    }
    entries.push(
      Object.freeze({
        path,
        role: role as SupportPackRole,
        mediaType: entry.mediaType,
        contractVersion: entry.contractVersion,
        provenanceId: entry.provenanceId,
        sha256: entry.sha256,
        maxBytes: entry.maxBytes,
        workerVisibility,
      }),
    );
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return Object.freeze({
    schemaVersion: 1,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    ...(methodologyContractVersion !== undefined
      ? { methodologyContractVersion }
      : {}),
    ...(methodologyContractDigest !== undefined
      ? { methodologyContractDigest }
      : {}),
    entries: Object.freeze(entries),
  });
}

export function buildSupportPackInventory(input: {
  readonly manifest: SupportPackManifest;
  readonly files: Readonly<Record<string, Uint8Array>>;
}): readonly SupportPackInventoryItem[] {
  const items: SupportPackInventoryItem[] = [];
  for (const entry of input.manifest.entries) {
    const bytes = input.files[entry.path];
    if (bytes === undefined) {
      fail(`Support-pack entry missing file bytes: ${entry.path}`);
    }
    if (bytes.byteLength > entry.maxBytes) {
      fail(
        `Support-pack entry exceeds maxBytes: ${entry.path} (${bytes.byteLength} > ${entry.maxBytes})`,
      );
    }
    const hex = sha256Hex(bytes);
    if (hex !== entry.sha256) {
      fail(
        `Support-pack entry sha256 mismatch: ${entry.path} (declared ${entry.sha256}, actual ${hex})`,
      );
    }
    // reject embedded NULs in text-like media
    if (
      entry.mediaType.startsWith("text/") ||
      entry.mediaType === "application/json"
    ) {
      try {
        const text = decodeStrictResearchUtf8(bytes);
        if (text.includes("\0")) {
          fail(`Support-pack text entry contains NUL: ${entry.path}`);
        }
      } catch (error) {
        fail(`Support-pack text entry invalid UTF-8: ${entry.path}`, error);
      }
    }
    items.push(
      Object.freeze({
        path: entry.path,
        role: entry.role,
        mediaType: entry.mediaType,
        contractVersion: entry.contractVersion,
        provenanceId: entry.provenanceId,
        sha256: entry.sha256,
        byteLength: bytes.byteLength,
        workerVisibility: entry.workerVisibility,
        bytes,
      }),
    );
  }
  return Object.freeze(items);
}

/**
 * Canonical inventory JSON for digest binding (no file bytes, ordered paths).
 */
export function serializeSupportPackInventoryForDigest(
  items: readonly SupportPackInventoryItem[],
): string {
  const rows = items.map((item) => ({
    path: item.path,
    role: item.role,
    mediaType: item.mediaType,
    contractVersion: item.contractVersion,
    provenanceId: item.provenanceId,
    sha256: item.sha256,
    byteLength: item.byteLength,
    workerVisibility: item.workerVisibility,
  }));
  return `${JSON.stringify(rows)}\n`;
}

export function computeResearchProcedureDigestV2(input: {
  readonly canonicalManifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
  readonly packJsonBytes: Uint8Array;
  readonly inventoryItems: readonly SupportPackInventoryItem[];
}): string {
  const manifestBytes = new Uint8Array(input.canonicalManifestBytes);
  const instructionBytes = new Uint8Array(input.instructionBytes);
  const packJsonBytes = new Uint8Array(input.packJsonBytes);
  if (
    manifestBytes.length === 0 ||
    manifestBytes[manifestBytes.length - 1] !== 0x0a
  ) {
    fail("Canonical Procedure manifest must end in one LF");
  }
  if (instructionBytes.length === 0) {
    fail("Procedure instructions must not be empty");
  }
  if (
    packJsonBytes.length === 0 ||
    packJsonBytes[packJsonBytes.length - 1] !== 0x0a
  ) {
    fail("Support-pack pack.json canonical bytes must end in one LF");
  }
  const inventoryJson = serializeSupportPackInventoryForDigest(
    input.inventoryItems,
  );
  const inventoryBytes = TEXT_ENCODER.encode(inventoryJson);
  const parts: Uint8Array[] = [
    PROCEDURE_DIGEST_DOMAIN_V2,
    manifestBytes.subarray(0, manifestBytes.length - 1),
    Uint8Array.of(0x0a),
    instructionBytes,
    Uint8Array.of(0x00),
    packJsonBytes.subarray(0, packJsonBytes.length - 1),
    Uint8Array.of(0x0a),
    inventoryBytes,
  ];
  // bind exact entry bytes in stable path order
  for (const item of input.inventoryItems) {
    parts.push(Uint8Array.of(0x00), item.bytes);
  }
  return sha256Prefixed(parts);
}

/**
 * Canonicalize pack.json for stable bytes (sorted entries by path, fixed key order).
 */
export function serializeSupportPackManifest(
  manifest: SupportPackManifest,
): string {
  const requiresExplicitVisibility =
    manifest.procedureVersion !== "2.0.0" &&
    manifest.procedureVersion !== "2.0.1" &&
    /^2\./.test(manifest.procedureVersion);
  const entries = [...manifest.entries]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((e) => {
      const row: Record<string, unknown> = {
        path: e.path,
        role: e.role,
        mediaType: e.mediaType,
        contractVersion: e.contractVersion,
        provenanceId: e.provenanceId,
        sha256: e.sha256,
        maxBytes: e.maxBytes,
      };
      // Retained 2.0.0/2.0.1 omit default worker-visible so on-disk bytes stay valid.
      // 2.0.2+ always serialize explicit workerVisibility.
      if (requiresExplicitVisibility || e.workerVisibility !== "worker-visible") {
        row.workerVisibility = e.workerVisibility;
      }
      return row;
    });
  const body: Record<string, unknown> = {
    schemaVersion: 1,
    procedureId: manifest.procedureId,
    procedureVersion: manifest.procedureVersion,
  };
  if (manifest.methodologyContractVersion !== undefined) {
    body.methodologyContractVersion = manifest.methodologyContractVersion;
  }
  if (manifest.methodologyContractDigest !== undefined) {
    body.methodologyContractDigest = manifest.methodologyContractDigest;
  }
  body.entries = entries;
  return `${JSON.stringify(body)}\n`;
}

/**
 * Package schema discriminator (not inferred from pack.json presence).
 * - Explicit packageSchemaVersion on procedure.json is authoritative.
 * - Retained immutable 2.0.0 fixtures without the field are schema-v2 by exact version.
 * - 2.0.1 / 2.0.2+ must set packageSchemaVersion: 2 on procedure.json.
 */
export function resolveProcedurePackageSchemaVersion(input: {
  readonly packageSchemaVersion?: unknown;
  readonly procedureVersion: string;
}): 1 | 2 {
  if (input.packageSchemaVersion === 1) return 1;
  if (input.packageSchemaVersion === 2) return 2;
  if (input.packageSchemaVersion !== undefined) {
    fail("packageSchemaVersion must be 1 or 2 when present");
  }
  if (input.procedureVersion === "2.0.0") return 2;
  if (/^2\./.test(input.procedureVersion) && input.procedureVersion !== "2.0.0") {
    fail(
      "Procedure packages with version 2.x other than immutable 2.0.0 must set packageSchemaVersion: 2",
    );
  }
  return 1;
}
