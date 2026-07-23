import { createHash } from "node:crypto";

const RELEASED_NATIVE_WORKFLOW_SOURCE_PATH =
  "packages/cli/src/templates/trellis/workflow.md" as const;

export interface ReleasedNativeWorkflowDigestEvidence {
  readonly sha256: string;
  readonly releaseTags: readonly string[];
  readonly sourcePath: typeof RELEASED_NATIVE_WORKFLOW_SOURCE_PATH;
}

/**
 * Exact tagged-source evidence for every released native workflow byte variant.
 *
 * Each digest is the SHA-256 of the raw Git blob at `sourcePath` for every tag
 * in `releaseTags`. Do not add normalized, reconstructed, or unreleased content.
 */
const RELEASED_NATIVE_WORKFLOW_DIGEST_ROWS = [
  [
    "9b6d6e8027bd2cf32d9efd7ef77d6524c59fcaa4ad6052f72d028a07a5fd69a7",
    ["v0.3.7", "v0.3.8", "v0.3.9", "v0.3.10"],
  ],
  [
    "892242e83f53194f49f7326ed9b50a7fc72ff810cd316c4d03ea8e7f11f5bbbd",
    ["v0.4.0", "v0.4.0-beta.10", "v0.4.0-rc.0", "v0.4.0-rc.1"],
  ],
  [
    "3863873f1dc614503bc8d0d5371f37f43d8abf6d3d21fb4bd8acffa871aea408",
    [
      "v0.4.0-beta.1",
      "v0.4.0-beta.2",
      "v0.4.0-beta.3",
      "v0.4.0-beta.4",
      "v0.4.0-beta.5",
      "v0.4.0-beta.6",
      "v0.4.0-beta.7",
      "v0.4.0-beta.8",
      "v0.4.0-beta.9",
    ],
  ],
  [
    "e02d67ba62f2db4af402ce270abfa878831b5a0d4ab646b8af82d2c7e9492bd8",
    [
      "v0.5.0",
      "v0.5.0-rc.4",
      "v0.5.0-rc.5",
      "v0.5.0-rc.6",
      "v0.5.0-rc.7",
      "v0.5.1",
      "v0.5.2",
    ],
  ],
  [
    "62850523214b952500c648339f444898d5e178480f8c90509799147238ce6142",
    ["v0.5.0-beta.1", "v0.5.0-beta.2", "v0.5.0-beta.3", "v0.5.0-beta.4"],
  ],
  [
    "7689d26b68097752637f6c4f6469b4f4c87a3b581947ad89b06ff7c60e7dc593",
    ["v0.5.0-beta.5", "v0.5.0-beta.6", "v0.5.0-beta.7", "v0.5.0-beta.8"],
  ],
  [
    "a330b52d6161164b719d8478f83b52c72fd3b093fd5446f521f6c8e22524f380",
    ["v0.5.0-beta.9"],
  ],
  [
    "dab5f6129c867010c64b9f5c25775865a2d8234ed081f4fe250f0868ec8b0092",
    ["v0.5.0-beta.10", "v0.5.0-beta.11"],
  ],
  [
    "64c9b01d448b5cbd2db93a5ca1ef0ece49e62dd77c3682a0a43e8e47dfb6bff1",
    ["v0.5.0-beta.12", "v0.5.0-beta.13"],
  ],
  [
    "3328b94491e79b1c2cc278f26b3dacd384cb874284ee9ae145146efa2588326f",
    ["v0.5.0-beta.14"],
  ],
  [
    "714d747edc65a3ab7cb1ae7a52cbf8c83d6ec0204a043ce12c38162d10b207f7",
    ["v0.5.0-beta.15", "v0.5.0-beta.16"],
  ],
  [
    "065dd01a17e29484c787f292ea8de070f62b024de69c9318f52a0749c223d2ef",
    ["v0.5.0-beta.17"],
  ],
  [
    "c2e2ea24c1a565cede5db0a063dd1a50979a0ce452af4bf2439bf3d7b1911679",
    ["v0.5.0-beta.18", "v0.5.0-beta.19"],
  ],
  [
    "f7c60117e2424dc3d3bf0e70b331f72aecf2e94a04a7f22ec131faf6087d493a",
    ["v0.5.0-rc.0", "v0.5.0-rc.1", "v0.5.0-rc.2", "v0.5.0-rc.3"],
  ],
  [
    "9cdbe19ffc2d72a6cc96592b4ab43cd7eb49bae2abfc6f27d40c65902a4628e7",
    ["v0.5.3"],
  ],
  [
    "8efff8ef8effe0f610bfa19c8cc75af7726682d4cc1ddaf96d1b53db9e727acf",
    ["v0.5.4", "v0.5.5", "v0.5.6"],
  ],
  [
    "d0b522ae6e7b41c11784701cd7c3bd1fb621e4d94cd64c50f83a826e478beb5e",
    ["v0.5.7"],
  ],
  [
    "28cf77ea1f3963e6b84d4657cee569603dc0c48e80db4bb3bfb43a9c12ec83c2",
    ["v0.5.8", "v0.6.0-beta.0"],
  ],
  [
    "f7f888cf61afe4b4903c90046c701a6c115ed80d39c50da8fd2ac437922175b6",
    [
      "v0.5.9",
      "v0.5.10",
      "v0.5.11",
      "v0.5.12",
      "v0.5.13",
      "v0.5.14",
      "v0.5.15",
      "v0.5.16",
      "v0.5.17",
      "v0.6.0-beta.1",
      "v0.6.0-beta.2",
      "v0.6.0-beta.3",
      "v0.6.0-beta.4",
      "v0.6.0-beta.5",
      "v0.6.0-beta.6",
      "v0.6.0-beta.7",
    ],
  ],
  [
    "f4b8a6f89017f62071986d6d36cc32c4c7f01fe6f023f0fd9311eddc57d8c94f",
    ["v0.5.18", "v0.5.19"],
  ],
  [
    "dfd132985732d36cd1b9bc4e2670db580fd2df260298a3eefbdbab26d17da321",
    [
      "v0.6.0",
      "v0.6.0-beta.19",
      "v0.6.0-beta.20",
      "v0.6.0-beta.21",
      "v0.6.0-beta.22",
      "v0.6.0-beta.23",
      "v0.6.0-rc.0",
    ],
  ],
  [
    "d052469bdb3ffc7a001d8beffc9028bd268255a89fa59e8f85d5446e25e1ff7b",
    [
      "v0.6.0-beta.8",
      "v0.6.0-beta.9",
      "v0.6.0-beta.10",
      "v0.6.0-beta.11",
      "v0.6.0-beta.12",
      "v0.6.0-beta.13",
      "v0.6.0-beta.14",
      "v0.6.0-beta.15",
    ],
  ],
  [
    "86bbc6d896eeabc80bd815d2533e5a8f1d6f238d8e2b3e56ae2c1f49dd92d838",
    ["v0.6.0-beta.16", "v0.6.0-beta.17", "v0.6.0-beta.18"],
  ],
  [
    "e2f20bb05bbb14969598256d8187b785f152cee2069b5c46790642d1dadaf006",
    ["v0.6.1", "v0.6.2"],
  ],
  [
    "f44acd1c08d1601fdc4377671ef932eb3e09f0e87b7872a6d0ee4baeada29fcb",
    ["v0.6.3"],
  ],
  [
    "f2d97f01f6f2ee34de7a389dc9d0a5969c1f2713fda92a3a852f6a91d556d507",
    ["v0.6.4"],
  ],
  [
    "078bc526d7a29b1d391cc198d113d28225cf46a6868d655498832a6cc9a36acf",
    ["v0.6.5"],
  ],
  [
    "9eb806e50767409b26dba4a63f34bc8cf58a8affcc18fe83e47568b5aca23510",
    ["v0.6.6", "v0.6.7"],
  ],
] as const;

export const RELEASED_NATIVE_WORKFLOW_DIGESTS: readonly ReleasedNativeWorkflowDigestEvidence[] =
  Object.freeze(
    RELEASED_NATIVE_WORKFLOW_DIGEST_ROWS.map(([sha256, releaseTags]) =>
      Object.freeze({
        sha256,
        releaseTags: Object.freeze([...releaseTags]),
        sourcePath: RELEASED_NATIVE_WORKFLOW_SOURCE_PATH,
      }),
    ),
  );

const RELEASED_NATIVE_WORKFLOW_SHA256 = new Set(
  RELEASED_NATIVE_WORKFLOW_DIGESTS.map((evidence) => evidence.sha256),
);

/** Match exact UTF-8 bytes against immutable released native workflow evidence. */
export function isReleasedNativeWorkflow(content: string): boolean {
  const digest = createHash("sha256").update(content, "utf-8").digest("hex");
  return RELEASED_NATIVE_WORKFLOW_SHA256.has(digest);
}
