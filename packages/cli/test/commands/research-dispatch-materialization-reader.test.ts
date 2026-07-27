import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  stableResearchJson,
  type Dispatch,
  type ResearchActivation,
  type ResearchApprovalState,
} from "@mindfoldhq/trellis-core/research";

import {
  readResearchContainedFile,
  readResearchDispatchMaterialization,
  ResearchDispatchMaterializationReadError,
} from "../../src/commands/research/dispatch-materialization-reader.js";

const DISPATCH_ID = "dsp_11111111-1111-4111-8111-111111111111" as const;
const ACTIVATION_ID = "act_22222222-2222-4222-8222-222222222222" as const;
const APPROVAL_ID = "apr_33333333-3333-4333-8333-333333333333" as const;
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const DIGEST_D = `sha256:${"d".repeat(64)}`;

const dispatch: Dispatch = {
  id: DISPATCH_ID,
  questId: "qst_44444444-4444-4444-8444-444444444444",
  campaignId: "cmp_55555555-5555-4555-8555-555555555555",
  runId: "run_66666666-6666-4666-8666-666666666666",
  repositoryId: "rep_77777777-7777-4777-8777-777777777777",
  ownerSkill: "legacy",
  objective: "Bounded work",
  acceptanceCriteria: [],
  context: [],
  allowedWritePaths: [],
  expectedOutputs: [],
  checks: [],
  createdAt: "2026-07-24T00:00:00.000Z",
};

const activation: ResearchActivation = {
  id: ACTIVATION_ID,
  dispatchId: DISPATCH_ID,
  questId: dispatch.questId,
  capabilityId: "research.setup.project",
  mode: "explicit",
  procedure: {
    id: "project-setup-v1",
    version: "1.0.0",
    digest: DIGEST_A,
  },
  policyDigest: DIGEST_B,
  requestDigest: DIGEST_C,
  scopeHash: DIGEST_D,
  maxDurationMinutes: 10,
  maxDispatches: 1,
  createdAt: "2026-07-24T00:01:00.000Z",
};

const approval: ResearchApprovalState = {
  grant: {
    id: APPROVAL_ID,
    activationId: ACTIVATION_ID,
    dispatchId: DISPATCH_ID,
    host: "claude",
    mode: "interactive",
    approverLabel: "operator",
    rationale: "Approved",
    requestDigest: DIGEST_C,
    procedureDigest: DIGEST_A,
    policyDigest: DIGEST_B,
    scopeHash: DIGEST_D,
    grantedAt: "2026-07-24T00:02:00.000Z",
    expiresAt: "2026-07-24T00:12:00.000Z",
  },
  status: "granted",
};

function treeSnapshot(root: string): readonly string[] {
  const entries: string[] = [];
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      entries.push(path.relative(root, target));
      if (entry.isDirectory()) walk(target);
    }
  };
  walk(root);
  return entries.sort();
}

describe("read-only Research dispatch materializations", () => {
  let root: string;
  let dispatchDir: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-reader-"));
    dispatchDir = path.join(
      root,
      ".trellis",
      "research",
      "dispatches",
      DISPATCH_ID,
    );
    fs.mkdirSync(path.join(dispatchDir, "approvals"), { recursive: true });
    fs.writeFileSync(path.join(dispatchDir, "request.json"), stableResearchJson(dispatch));
    fs.writeFileSync(
      path.join(dispatchDir, "activation.json"),
      stableResearchJson({ schemaVersion: 2, activation }),
    );
    fs.writeFileSync(
      path.join(dispatchDir, "approvals", `${APPROVAL_ID}.json`),
      stableResearchJson({ schemaVersion: 2, approval }),
    );
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("returns strict canonical request, activation, and approval values", () => {
    expect(
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "request",
        expected: dispatch,
      }).value,
    ).toEqual(dispatch);
    expect(
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "activation",
        expected: activation,
      }).value,
    ).toEqual(activation);
    expect(
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "approval",
        approvalId: APPROVAL_ID,
        expected: approval,
      }).value,
    ).toEqual(approval);
  });

  it("creates nothing when a required parent or target is missing", () => {
    fs.rmSync(path.join(root, ".trellis"), { recursive: true });
    const before = treeSnapshot(root);
    expect(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "request",
        expected: dispatch,
      }),
    ).toThrow(ResearchDispatchMaterializationReadError);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("rejects parent and final-target symlinks", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-reader-outside-"));
    try {
      fs.rmSync(path.join(root, ".trellis", "research"), { recursive: true });
      fs.symlinkSync(outside, path.join(root, ".trellis", "research"));
      expect(() =>
        readResearchDispatchMaterialization({
          root,
          dispatchId: DISPATCH_ID,
          kind: "request",
          expected: dispatch,
        }),
      ).toThrow(ResearchDispatchMaterializationReadError);

      fs.rmSync(path.join(root, ".trellis", "research"));
      fs.mkdirSync(dispatchDir, { recursive: true });
      const outsideRequest = path.join(outside, "request.json");
      fs.writeFileSync(outsideRequest, stableResearchJson(dispatch));
      fs.symlinkSync(outsideRequest, path.join(dispatchDir, "request.json"));
      expect(() =>
        readResearchDispatchMaterialization({
          root,
          dispatchId: DISPATCH_ID,
          kind: "request",
          expected: dispatch,
        }),
      ).toThrow(ResearchDispatchMaterializationReadError);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects noncanonical envelopes, unknown keys, and semantic drift", () => {
    fs.writeFileSync(
      path.join(dispatchDir, "activation.json"),
      JSON.stringify({ schemaVersion: 2, activation }),
    );
    expect(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "activation",
        expected: activation,
      }),
    ).toThrow(ResearchDispatchMaterializationReadError);

    fs.writeFileSync(
      path.join(dispatchDir, "activation.json"),
      stableResearchJson({ schemaVersion: 2, activation, extra: true }),
    );
    expect(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "activation",
        expected: activation,
      }),
    ).toThrow(ResearchDispatchMaterializationReadError);

    fs.writeFileSync(
      path.join(dispatchDir, "request.json"),
      stableResearchJson({ ...dispatch, objective: "Drifted" }),
    );
    expect(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "request",
        expected: dispatch,
      }),
    ).toThrow(ResearchDispatchMaterializationReadError);
  });

  it("rejects malformed UTF-8 without replacement decoding", () => {
    fs.writeFileSync(
      path.join(dispatchDir, "request.json"),
      Uint8Array.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]),
    );

    expect(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "request",
        expected: dispatch,
      }),
    ).toThrow(ResearchDispatchMaterializationReadError);
  });

  it("rejects missing, dangling, and non-regular path components without mutation", () => {
    const assertUnchangedFailure = (read: () => unknown): void => {
      const before = treeSnapshot(root);
      expect(read).toThrow(ResearchDispatchMaterializationReadError);
      expect(treeSnapshot(root)).toEqual(before);
    };

    fs.rmSync(path.join(dispatchDir, "activation.json"));
    assertUnchangedFailure(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "activation",
        expected: activation,
      }),
    );
    fs.writeFileSync(
      path.join(dispatchDir, "activation.json"),
      stableResearchJson({ schemaVersion: 2, activation }),
    );

    fs.rmSync(path.join(dispatchDir, "request.json"));
    fs.mkdirSync(path.join(dispatchDir, "request.json"));
    assertUnchangedFailure(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "request",
        expected: dispatch,
      }),
    );
    fs.rmSync(path.join(dispatchDir, "request.json"), { recursive: true });

    fs.symlinkSync(path.join(dispatchDir, "missing.json"), path.join(dispatchDir, "request.json"));
    assertUnchangedFailure(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "request",
        expected: dispatch,
      }),
    );
    fs.rmSync(path.join(dispatchDir, "request.json"));
    fs.writeFileSync(path.join(dispatchDir, "request.json"), stableResearchJson(dispatch));

    fs.rmSync(path.join(dispatchDir, "approvals"), { recursive: true });
    fs.writeFileSync(path.join(dispatchDir, "approvals"), "not a directory\n");
    assertUnchangedFailure(() =>
      readResearchDispatchMaterialization({
        root,
        dispatchId: DISPATCH_ID,
        kind: "approval",
        approvalId: APPROVAL_ID,
        expected: approval,
      }),
    );
  });

  it("rejects malformed envelopes, wrong embedded IDs, and stale approval state", () => {
    const requestFile = path.join(dispatchDir, "request.json");
    const activationFile = path.join(dispatchDir, "activation.json");
    const approvalFile = path.join(
      dispatchDir,
      "approvals",
      `${APPROVAL_ID}.json`,
    );
    const restore = (): void => {
      fs.writeFileSync(requestFile, stableResearchJson(dispatch));
      fs.writeFileSync(
        activationFile,
        stableResearchJson({ schemaVersion: 2, activation }),
      );
      fs.writeFileSync(
        approvalFile,
        stableResearchJson({ schemaVersion: 2, approval }),
      );
    };
    const cases = [
      {
        name: "malformed JSON",
        mutate: () => fs.writeFileSync(requestFile, "{"),
        read: () =>
          readResearchDispatchMaterialization({
            root,
            dispatchId: DISPATCH_ID,
            kind: "request",
            expected: dispatch,
          }),
      },
      {
        name: "unknown request key",
        mutate: () =>
          fs.writeFileSync(requestFile, stableResearchJson({ ...dispatch, extra: true })),
        read: () =>
          readResearchDispatchMaterialization({
            root,
            dispatchId: DISPATCH_ID,
            kind: "request",
            expected: dispatch,
          }),
      },
      {
        name: "wrong activation ID",
        mutate: () =>
          fs.writeFileSync(
            activationFile,
            stableResearchJson({
              schemaVersion: 2,
              activation: {
                ...activation,
                id: "act_99999999-9999-4999-8999-999999999999",
              },
            }),
          ),
        read: () =>
          readResearchDispatchMaterialization({
            root,
            dispatchId: DISPATCH_ID,
            kind: "activation",
            expected: activation,
          }),
      },
      {
        name: "wrong approval ID",
        mutate: () =>
          fs.writeFileSync(
            approvalFile,
            stableResearchJson({
              schemaVersion: 2,
              approval: {
                ...approval,
                grant: {
                  ...approval.grant,
                  id: "apr_99999999-9999-4999-8999-999999999999",
                },
              },
            }),
          ),
        read: () =>
          readResearchDispatchMaterialization({
            root,
            dispatchId: DISPATCH_ID,
            kind: "approval",
            approvalId: APPROVAL_ID,
            expected: approval,
          }),
      },
      {
        name: "stale approval status",
        mutate: () =>
          fs.writeFileSync(
            approvalFile,
            stableResearchJson({
              schemaVersion: 2,
              approval: {
                grant: approval.grant,
                status: "revoked",
                revokedAt: "2026-07-24T00:03:00.000Z",
                revocationReason: "stale sidecar",
              },
            }),
          ),
        read: () =>
          readResearchDispatchMaterialization({
            root,
            dispatchId: DISPATCH_ID,
            kind: "approval",
            approvalId: APPROVAL_ID,
            expected: approval,
          }),
      },
    ] as const;

    for (const item of cases) {
      restore();
      item.mutate();
      const before = treeSnapshot(root);
      expect(item.read, item.name).toThrow(ResearchDispatchMaterializationReadError);
      expect(treeSnapshot(root), item.name).toEqual(before);
    }
  });

  it("securely reads a stable contained Result input path", () => {
    const input = path.join(dispatchDir, "worker-output.json");
    fs.writeFileSync(input, '{"result":{},"proposal":{}}');
    expect(Buffer.from(readResearchContainedFile(root, input)).toString("utf8")).toBe(
      '{"result":{},"proposal":{}}',
    );
    expect(() => readResearchContainedFile(root, path.join(root, "..", "outside"))).toThrow(
      /inside the control root/,
    );
  });
});

const RACE_DISPATCH_ID = "dsp_11111111-1111-4111-8111-111111111111" as const;
const raceDispatch: Dispatch = {
  id: RACE_DISPATCH_ID,
  questId: "qst_22222222-2222-4222-8222-222222222222",
  campaignId: "cmp_33333333-3333-4333-8333-333333333333",
  runId: "run_44444444-4444-4444-8444-444444444444",
  repositoryId: "rep_55555555-5555-4555-8555-555555555555",
  ownerSkill: "legacy",
  objective: "Bounded work",
  acceptanceCriteria: [],
  context: [],
  allowedWritePaths: [],
  expectedOutputs: [],
  checks: [],
  createdAt: "2026-07-24T00:00:00.000Z",
};

function readRaceRequest(root: string): Dispatch {
  return readResearchDispatchMaterialization({
    root,
    dispatchId: RACE_DISPATCH_ID,
    kind: "request",
    expected: raceDispatch,
  }).value;
}

describe("Research materialization replacement and identity races", () => {
  let root: string;
  let dispatchDir: string;
  let requestFile: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-material-race-"));
    dispatchDir = path.join(
      root,
      ".trellis",
      "research",
      "dispatches",
      RACE_DISPATCH_ID,
    );
    requestFile = path.join(dispatchDir, "request.json");
    fs.mkdirSync(path.join(dispatchDir, "approvals"), { recursive: true });
    fs.writeFileSync(requestFile, stableResearchJson(raceDispatch));
    fs.writeFileSync(
      path.join(dispatchDir, "activation.json"),
      stableResearchJson({ schemaVersion: 2, activation }),
    );
    fs.writeFileSync(
      path.join(dispatchDir, "approvals", `${APPROVAL_ID}.json`),
      stableResearchJson({ schemaVersion: 2, approval }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("detects parent-directory replacement between selection and validation", () => {
    const originalStat = fs.statSync.bind(fs);
    let rootStats = 0;
    vi.spyOn(fs, "statSync").mockImplementation(((target, options) => {
      if (path.resolve(String(target)) === path.resolve(root)) {
        rootStats += 1;
        if (rootStats === 2) {
          fs.renameSync(dispatchDir, `${dispatchDir}.old`);
          fs.mkdirSync(dispatchDir);
          fs.writeFileSync(requestFile, stableResearchJson(raceDispatch));
        }
      }
      return originalStat(target, options as never);
    }) as typeof fs.statSync);

    expect(() => readRaceRequest(root)).toThrow(ResearchDispatchMaterializationReadError);
  });

  it.each(["request", "activation", "approval"] as const)(
    "detects %s target replacement before descriptor open",
    (kind) => {
      const target =
        kind === "request"
          ? requestFile
          : kind === "activation"
            ? path.join(dispatchDir, "activation.json")
            : path.join(dispatchDir, "approvals", `${APPROVAL_ID}.json`);
      const originalBytes = fs.readFileSync(target);
      const originalOpen = fs.openSync.bind(fs);
      let replaced = false;
      vi.spyOn(fs, "openSync").mockImplementation(((selected, flags, mode) => {
        if (!replaced && path.resolve(String(selected)) === path.resolve(target)) {
          replaced = true;
          fs.renameSync(target, `${target}.old`);
          fs.writeFileSync(target, originalBytes);
        }
        return originalOpen(selected, flags, mode);
      }) as typeof fs.openSync);

      const read = (): unknown => {
        if (kind === "request") return readRaceRequest(root);
        if (kind === "activation") {
          return readResearchDispatchMaterialization({
            root,
            dispatchId: RACE_DISPATCH_ID,
            kind,
            expected: activation,
          });
        }
        return readResearchDispatchMaterialization({
          root,
          dispatchId: RACE_DISPATCH_ID,
          kind,
          approvalId: APPROVAL_ID,
          expected: approval,
        });
      };
      expect(read).toThrow(ResearchDispatchMaterializationReadError);
    },
  );

  it("detects target replacement between pre-open identity and descriptor open", () => {
    const originalOpen = fs.openSync.bind(fs);
    let replaced = false;
    vi.spyOn(fs, "openSync").mockImplementation(((target, flags, mode) => {
      if (!replaced && path.resolve(String(target)) === path.resolve(requestFile)) {
        replaced = true;
        fs.renameSync(requestFile, `${requestFile}.old`);
        fs.writeFileSync(requestFile, stableResearchJson(raceDispatch));
      }
      return originalOpen(target, flags, mode);
    }) as typeof fs.openSync);

    expect(() => readRaceRequest(root)).toThrow(ResearchDispatchMaterializationReadError);
  });

  it("detects pathname replacement while descriptor bytes are being read", () => {
    const originalRead = fs.readFileSync.bind(fs);
    let replaced = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((target, options) => {
      const bytes = originalRead(target, options as never);
      if (!replaced && typeof target === "number") {
        replaced = true;
        fs.renameSync(requestFile, `${requestFile}.old`);
        fs.writeFileSync(requestFile, stableResearchJson(raceDispatch));
      }
      return bytes;
    }) as typeof fs.readFileSync);

    expect(() => readRaceRequest(root)).toThrow(ResearchDispatchMaterializationReadError);
  });

  it("detects in-place descriptor mutation while bytes are being read", () => {
    const originalRead = fs.readFileSync.bind(fs);
    let changed = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((target, options) => {
      const bytes = originalRead(target, options as never);
      if (!changed && typeof target === "number") {
        changed = true;
        fs.writeFileSync(
          requestFile,
          stableResearchJson({ ...raceDispatch, objective: "Mutated after descriptor read" }),
        );
      }
      return bytes;
    }) as typeof fs.readFileSync);

    expect(() => readRaceRequest(root)).toThrow(ResearchDispatchMaterializationReadError);
  });

  it("detects parent replacement after the target read", () => {
    const originalRead = fs.readFileSync.bind(fs);
    let replaced = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((target, options) => {
      const bytes = originalRead(target, options as never);
      if (!replaced && typeof target === "number") {
        replaced = true;
        fs.renameSync(dispatchDir, `${dispatchDir}.old`);
        fs.mkdirSync(dispatchDir);
        fs.writeFileSync(requestFile, stableResearchJson(raceDispatch));
      }
      return bytes;
    }) as typeof fs.readFileSync);

    expect(() => readRaceRequest(root)).toThrow(ResearchDispatchMaterializationReadError);
  });

  it("ignores unrelated sibling metadata changes", () => {
    const sibling = path.join(dispatchDir, "unrelated.txt");
    fs.writeFileSync(sibling, "before\n");
    const originalRead = fs.readFileSync.bind(fs);
    let changed = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((target, options) => {
      const bytes = originalRead(target, options as never);
      if (!changed && typeof target === "number") {
        changed = true;
        fs.writeFileSync(sibling, "after\n");
      }
      return bytes;
    }) as typeof fs.readFileSync);

    expect(readRaceRequest(root)).toEqual(raceDispatch);
  });
});
