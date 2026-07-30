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

export interface SupportPackEntry {
  readonly path: string;
  readonly role: SupportPackRole;
  readonly mediaType: string;
  readonly contractVersion: string;
  readonly provenanceId: string;
  readonly sha256: string;
  readonly maxBytes: number;
}

export interface SupportPackManifest {
  readonly schemaVersion: 1;
  readonly procedureId: string;
  readonly procedureVersion: string;
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
  if (value.schemaVersion !== 1) {
    fail("Support-pack schemaVersion must be 1");
  }
  if (value.procedureId !== input.procedureId) {
    fail("Support-pack procedureId does not match Procedure id");
  }
  if (value.procedureVersion !== input.procedureVersion) {
    fail("Support-pack procedureVersion does not match Procedure version");
  }
  if (!Array.isArray(value.entries)) {
    fail("Support-pack entries must be an array");
  }
  const seen = new Set<string>();
  const entries: SupportPackEntry[] = [];
  for (const raw of value.entries) {
    const entry = plainObject(raw, "Support-pack entry");
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
    entries.push(
      Object.freeze({
        path,
        role: role as SupportPackRole,
        mediaType: entry.mediaType,
        contractVersion: entry.contractVersion,
        provenanceId: entry.provenanceId,
        sha256: entry.sha256,
        maxBytes: entry.maxBytes,
      }),
    );
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return Object.freeze({
    schemaVersion: 1,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
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
  const entries = [...manifest.entries]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((e) => ({
      path: e.path,
      role: e.role,
      mediaType: e.mediaType,
      contractVersion: e.contractVersion,
      provenanceId: e.provenanceId,
      sha256: e.sha256,
      maxBytes: e.maxBytes,
    }));
  return `${JSON.stringify({
    schemaVersion: 1,
    procedureId: manifest.procedureId,
    procedureVersion: manifest.procedureVersion,
    entries,
  })}\n`;
}
