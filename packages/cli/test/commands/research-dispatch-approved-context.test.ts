import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as researchCore from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResearchCampaign,
  createResearchQuest,
  createResearchRun,
  initializeResearch,
  setResearchQuestStage,
} from "../../src/commands/research/command.js";
import {
  approveResearchDispatch,
  authorizeResearchDispatch,
} from "../../src/commands/research/dispatch-activation-command.js";
import { resolveApprovedResearchDispatchContext } from "../../src/commands/research/dispatch-approved-context.js";
import { prepareResearchDispatch } from "../../src/commands/research/dispatch-command.js";
import { deriveResearchOutputIds } from "../../src/commands/research/dispatch-output-ids.js";
import { readResearchProjectPolicy } from "../../src/commands/research/project-policy.js";
import { addResearchRepository } from "../../src/commands/research/repository.js";
import {
  createResearchDispatchFixture,
  runResearchFixtureGit,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

describe("approved Research Dispatch Context", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-approved-context-"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("returns frozen provider-neutral input with embedded Procedure instructions and writes nothing", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "approved-context",
    });
    const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1);
    const before = snapshotTree(sandbox);

    const result = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      now,
    });

    expect(result).toMatchObject({
      command: "research dispatch context",
      valid: true,
      context: {
        schemaVersion: 2,
        host: "codex",
        dispatch: { id: fixture.ids.dispatchId },
        approval: { id: granted.approval.grant.id },
        authority: {
          network: false,
          externalCost: false,
          canonicalResearchMutation: false,
          recordResult: false,
        },
        outputContract: {
          dispatchId: fixture.ids.dispatchId,
          resultId: granted.approval.grant.id.replace(/^apr_/, "res_"),
          proposalId: granted.approval.grant.id.replace(/^apr_/, "prp_"),
        },
      },
    });
    expect(result.context.procedure.instructions.length).toBeGreaterThan(0);
    expect(result.context.artifacts).toEqual([
      expect.objectContaining({ path: fs.realpathSync(fixture.artifactPath) }),
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.context.procedure)).toBe(true);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("treats expiry equality as expired and preserves the complete tree", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: "expired-context",
    });
    const before = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        now: new Date(granted.approval.grant.expiresAt),
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_EXPIRED" });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("captures one state and ignores the observation cache without writes", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "one-state-cache-free-context",
    });
    const observationsFile = path.join(
      fixture.root,
      ".trellis",
      ".runtime",
      "research",
      "repo-observations.json",
    );
    fs.mkdirSync(path.dirname(observationsFile), { recursive: true });
    fs.writeFileSync(observationsFile, "{invalid observation cache}\n");
    const readState = vi.spyOn(researchCore, "readResearchState");
    const before = snapshotTree(sandbox);

    const result = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      now: new Date(Date.parse(granted.approval.grant.grantedAt) + 1),
    });

    expect(result.context.repository.path).toBe(
      fs.realpathSync(fixture.repository),
    );
    expect(readState).toHaveBeenCalledTimes(1);
    expect(snapshotTree(sandbox)).toEqual(before);
  });
});

const WRONG_DIGEST = `sha256:${"f".repeat(64)}`;

function mutateLedgerBindings(
  root: string,
  bindings: Partial<{
    requestDigest: string;
    procedureDigest: string;
    policyDigest: string;
    scopeHash: string;
  }>,
): void {
  const eventsFile = researchCore.researchPaths(root).eventsFile;
  const events = fs
    .readFileSync(eventsFile, "utf8")
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
  for (const event of events) {
    if (event.kind === "activation.planned") {
      const payload = event.payload as {
        activation: {
          requestDigest: string;
          procedure: { digest: string };
          policyDigest: string;
          scopeHash: string;
        };
      };
      if (bindings.requestDigest !== undefined) {
        payload.activation.requestDigest = bindings.requestDigest;
      }
      if (bindings.procedureDigest !== undefined) {
        payload.activation.procedure.digest = bindings.procedureDigest;
      }
      if (bindings.policyDigest !== undefined) {
        payload.activation.policyDigest = bindings.policyDigest;
      }
      if (bindings.scopeHash !== undefined) {
        payload.activation.scopeHash = bindings.scopeHash;
      }
    }
    if (event.kind === "approval.granted") {
      const payload = event.payload as {
        approval: {
          requestDigest: string;
          procedureDigest: string;
          policyDigest: string;
          scopeHash: string;
        };
      };
      Object.assign(payload.approval, bindings);
    }
  }
  fs.writeFileSync(
    eventsFile,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
}

function disableAutomaticPolicy(root: string): void {
  const policyFile = path.join(root, ".trellis", "research", "policy.json");
  const policy = JSON.parse(fs.readFileSync(policyFile, "utf8")) as {
    defaults: { automaticEnabled: boolean };
  };
  policy.defaults.automaticEnabled = false;
  fs.writeFileSync(policyFile, `${JSON.stringify(policy, null, 2)}\n`);
}

async function disableCapability(
  root: string,
  capabilityId: string,
): Promise<string> {
  const policyFile = path.join(root, ".trellis", "research", "policy.json");
  const policy = JSON.parse(fs.readFileSync(policyFile, "utf8")) as {
    capabilities: Record<string, { enabled?: boolean }>;
  };
  policy.capabilities[capabilityId] = {
    ...policy.capabilities[capabilityId],
    enabled: false,
  };
  fs.writeFileSync(policyFile, `${JSON.stringify(policy, null, 2)}\n`);
  return (await readResearchProjectPolicy({ root })).digest;
}

function parityValue(
  value: Awaited<ReturnType<typeof resolveApprovedResearchDispatchContext>>,
): unknown {
  const copy = structuredClone(value.context) as Record<string, unknown>;
  delete copy.host;
  const approval = copy.approval as Record<string, unknown>;
  delete approval.id;
  const output = copy.outputContract as Record<string, unknown>;
  delete output.resultId;
  delete output.proposalId;
  return copy;
}

describe("approved Context acceptance matrix", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-context-acceptance-"),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("preserves request-materialization precedence over all binding drift", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const approval = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    mutateLedgerBindings(fixture.root, {
      requestDigest: WRONG_DIGEST,
      procedureDigest: WRONG_DIGEST,
      policyDigest: WRONG_DIGEST,
      scopeHash: WRONG_DIGEST,
    });
    fs.writeFileSync(fixture.requestPath, "{broken}\n");
    const before = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        now: new Date(Date.parse(approval.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "REQUEST_STATE_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("preserves binding order ahead of existing artifact drift and stays zero-write", async () => {
    const requestFixture = await createResearchDispatchFixture(
      path.join(sandbox, "request"),
      { automaticEnabled: true },
    );
    const requestApproval = await authorizeResearchDispatch({
      root: requestFixture.root,
      dispatchId: requestFixture.ids.dispatchId,
      host: "codex",
    });
    mutateLedgerBindings(requestFixture.root, {
      requestDigest: WRONG_DIGEST,
      procedureDigest: WRONG_DIGEST,
    });
    fs.writeFileSync(requestFixture.artifactPath, "stale artifact\n");
    const beforeRequest = snapshotTree(sandbox);
    await expect(
      resolveApprovedResearchDispatchContext({
        root: requestFixture.root,
        dispatchId: requestFixture.ids.dispatchId,
        host: "codex",
        now: new Date(Date.parse(requestApproval.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "REQUEST_DIGEST_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforeRequest);

    const procedureFixture = await createResearchDispatchFixture(
      path.join(sandbox, "procedure"),
      { automaticEnabled: true },
    );
    const procedureApproval = await authorizeResearchDispatch({
      root: procedureFixture.root,
      dispatchId: procedureFixture.ids.dispatchId,
      host: "codex",
    });
    mutateLedgerBindings(procedureFixture.root, {
      procedureDigest: WRONG_DIGEST,
    });
    disableAutomaticPolicy(procedureFixture.root);
    fs.writeFileSync(procedureFixture.artifactPath, "stale artifact\n");
    const beforeProcedure = snapshotTree(sandbox);
    await expect(
      resolveApprovedResearchDispatchContext({
        root: procedureFixture.root,
        dispatchId: procedureFixture.ids.dispatchId,
        host: "codex",
        now: new Date(
          Date.parse(procedureApproval.approval.grant.grantedAt) + 1,
        ),
      }),
    ).rejects.toMatchObject({ code: "PROCEDURE_DIGEST_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforeProcedure);

    const policyFixture = await createResearchDispatchFixture(
      path.join(sandbox, "policy"),
      { automaticEnabled: true },
    );
    const policyApproval = await authorizeResearchDispatch({
      root: policyFixture.root,
      dispatchId: policyFixture.ids.dispatchId,
      host: "codex",
    });
    mutateLedgerBindings(policyFixture.root, { scopeHash: WRONG_DIGEST });
    disableAutomaticPolicy(policyFixture.root);
    fs.writeFileSync(policyFixture.artifactPath, "stale artifact\n");
    const beforePolicy = snapshotTree(sandbox);
    await expect(
      resolveApprovedResearchDispatchContext({
        root: policyFixture.root,
        dispatchId: policyFixture.ids.dispatchId,
        host: "codex",
        now: new Date(Date.parse(policyApproval.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "POLICY_DIGEST_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforePolicy);

    const scopeFixture = await createResearchDispatchFixture(
      path.join(sandbox, "scope"),
      {
        automaticEnabled: true,
        expectedRemote: "https://example.com/original.git",
      },
    );
    const scopeApproval = await authorizeResearchDispatch({
      root: scopeFixture.root,
      dispatchId: scopeFixture.ids.dispatchId,
      host: "codex",
    });
    mutateLedgerBindings(scopeFixture.root, { scopeHash: WRONG_DIGEST });
    runResearchFixtureGit(
      scopeFixture.repository,
      "remote",
      "set-url",
      "origin",
      "https://example.com/drifted.git",
    );
    fs.writeFileSync(scopeFixture.artifactPath, "stale artifact\n");
    const beforeScope = snapshotTree(sandbox);
    await expect(
      resolveApprovedResearchDispatchContext({
        root: scopeFixture.root,
        dispatchId: scopeFixture.ids.dispatchId,
        host: "codex",
        now: new Date(Date.parse(scopeApproval.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "SCOPE_HASH_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforeScope);
  });

  it("rejects disabled capability before Repository access", async () => {
    const fixture = await createResearchDispatchFixture(
      path.join(sandbox, "disabled-capability"),
      { automaticEnabled: true },
    );
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    const state = await researchCore.readResearchState(fixture.root);
    const activationId = state.activationByDispatchId[fixture.ids.dispatchId];
    const activation =
      activationId === undefined ? undefined : state.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation");
    const policyDigest = await disableCapability(
      fixture.root,
      activation.capabilityId,
    );
    mutateLedgerBindings(fixture.root, { policyDigest });
    fs.renameSync(fixture.repository, `${fixture.repository}.offline`);
    const before = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        now: new Date(Date.parse(granted.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "CAPABILITY_DISABLED" });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("reports Procedure and policy drift before broad activation authority mismatch", async () => {
    const procedureFixture = await createResearchDispatchFixture(
      path.join(sandbox, "procedure-authority-drift"),
      { automaticEnabled: true },
    );
    const procedureGrant = await authorizeResearchDispatch({
      root: procedureFixture.root,
      dispatchId: procedureFixture.ids.dispatchId,
      host: "claude",
    });
    const now = new Date(
      Date.parse(procedureGrant.approval.grant.grantedAt) + 1,
    );
    const baseline = await resolveApprovedResearchDispatchContext({
      root: procedureFixture.root,
      dispatchId: procedureFixture.ids.dispatchId,
      host: "claude",
      now,
    });
    const procedureDirectory = path.join(
      procedureFixture.root,
      ".trellis",
      "research",
      "procedures",
      baseline.context.procedure.manifest.id,
      baseline.context.procedure.manifest.version,
    );
    // Valid schema-v2 project override (full methodology pack) with drifted instructions.
    const bundledRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../src/templates/research/procedures",
      baseline.context.procedure.manifest.id,
      baseline.context.procedure.manifest.version,
    );
    fs.cpSync(bundledRoot, procedureDirectory, { recursive: true });
    const driftedManifest = {
      schemaVersion: baseline.context.procedure.manifest.schemaVersion,
      id: baseline.context.procedure.manifest.id,
      version: baseline.context.procedure.manifest.version,
      stage: baseline.context.procedure.manifest.stage,
      kind: baseline.context.procedure.manifest.kind,
      inputs: baseline.context.procedure.manifest.inputs,
      outputs: baseline.context.procedure.manifest.outputs,
      networkPolicy: baseline.context.procedure.manifest.networkPolicy,
      repositoryScope: baseline.context.procedure.manifest.repositoryScope,
      ...(baseline.context.procedure.manifest.maxDurationMinutes === undefined
        ? {}
        : {
            maxDurationMinutes:
              baseline.context.procedure.manifest.maxDurationMinutes,
          }),
      ...(baseline.context.procedure.manifest.maxDispatches === undefined
        ? {}
        : {
            maxDispatches: baseline.context.procedure.manifest.maxDispatches,
          }),
      replaces: {
        id: baseline.context.procedure.manifest.id,
        version: baseline.context.procedure.manifest.version,
      },
      ...(baseline.context.procedure.manifest.packageSchemaVersion === undefined
        ? {}
        : {
            packageSchemaVersion:
              baseline.context.procedure.manifest.packageSchemaVersion,
          }),
    };
    fs.writeFileSync(
      path.join(procedureDirectory, "procedure.json"),
      `${JSON.stringify(driftedManifest)}\n`,
    );
    fs.writeFileSync(
      path.join(procedureDirectory, "PROCEDURE.md"),
      `${baseline.context.procedure.instructions}\nProcedure drift.\n`,
    );
    const beforeProcedure = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root: procedureFixture.root,
        dispatchId: procedureFixture.ids.dispatchId,
        host: "claude",
        now,
      }),
    ).rejects.toMatchObject({ code: "PROCEDURE_DIGEST_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforeProcedure);

    const policyFixture = await createResearchDispatchFixture(
      path.join(sandbox, "policy-authority-drift"),
      { automaticEnabled: true },
    );
    const policyGrant = await authorizeResearchDispatch({
      root: policyFixture.root,
      dispatchId: policyFixture.ids.dispatchId,
      host: "claude",
    });
    const policyPath = path.join(
      policyFixture.root,
      ".trellis",
      "research",
      "policy.json",
    );
    const policy = JSON.parse(fs.readFileSync(policyPath, "utf8")) as {
      defaults: { maxDurationMinutes: number };
    };
    policy.defaults.maxDurationMinutes = 10;
    fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
    const beforePolicy = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root: policyFixture.root,
        dispatchId: policyFixture.ids.dispatchId,
        host: "claude",
        now: new Date(Date.parse(policyGrant.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "POLICY_DIGEST_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforePolicy);

    const relationFixture = await createResearchDispatchFixture(
      path.join(sandbox, "broad-authority-relation"),
      { automaticEnabled: true },
    );
    const relationGrant = await authorizeResearchDispatch({
      root: relationFixture.root,
      dispatchId: relationFixture.ids.dispatchId,
      host: "claude",
    });
    const relationState = await researchCore.readResearchState(
      relationFixture.root,
    );
    const activationId =
      relationState.activationByDispatchId[relationFixture.ids.dispatchId];
    const activation =
      activationId === undefined
        ? undefined
        : relationState.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation");
    activation.maxDurationMinutes += 1;
    vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(
      relationState,
    );
    const beforeRelation = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root: relationFixture.root,
        dispatchId: relationFixture.ids.dispatchId,
        host: "claude",
        now: new Date(Date.parse(relationGrant.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_RELATION_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(beforeRelation);
  });

  it("distinguishes absent activation from missing reverse index and duplicate entities", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    const canonical = await researchCore.readResearchState(fixture.root);
    const activationId =
      canonical.activationByDispatchId[fixture.ids.dispatchId];
    if (activationId === undefined) throw new Error("Expected activation");
    const activation = canonical.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation entity");
    const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1);
    const before = snapshotTree(sandbox);
    const cases = [
      {
        name: "missing reverse index",
        code: "APPROVAL_RELATION_MISMATCH",
        mutate: (state: typeof canonical) => {
          Reflect.deleteProperty(
            state.activationByDispatchId,
            fixture.ids.dispatchId,
          );
        },
      },
      {
        name: "duplicate activation entities",
        code: "APPROVAL_RELATION_MISMATCH",
        mutate: (state: typeof canonical) => {
          const duplicateId =
            "act_99999999-9999-4999-8999-999999999999" as const;
          state.activations[duplicateId] = {
            ...structuredClone(activation),
            id: duplicateId,
          };
        },
      },
      {
        name: "truly absent activation",
        code: "ACTIVATION_REQUIRED",
        mutate: (state: typeof canonical) => {
          Reflect.deleteProperty(
            state.activationByDispatchId,
            fixture.ids.dispatchId,
          );
          Reflect.deleteProperty(state.activations, activationId);
        },
      },
    ] as const;

    for (const item of cases) {
      const state = structuredClone(canonical);
      item.mutate(state);
      vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(state);
      await expect(
        resolveApprovedResearchDispatchContext({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "claude",
          now,
        }),
        item.name,
      ).rejects.toMatchObject({ code: item.code });
      expect(snapshotTree(sandbox), item.name).toEqual(before);
    }
  });

  it("rejects the complete approval-index corruption matrix before host selection", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    const canonical = await researchCore.readResearchState(fixture.root);
    const activationId =
      canonical.activationByDispatchId[fixture.ids.dispatchId];
    const approvalId = granted.approval.grant.id;
    if (activationId === undefined) throw new Error("Expected activation");
    const otherApprovalId = "apr_99999999-9999-4999-8999-999999999999" as const;
    const otherActivationId =
      "act_99999999-9999-4999-8999-999999999999" as const;
    const otherDispatchId = "dsp_99999999-9999-4999-8999-999999999999" as const;
    const addSecondApproval = (
      state: typeof canonical,
    ): researchCore.ResearchApprovalState => {
      const original = state.approvals[approvalId];
      if (original === undefined) throw new Error("Expected approval");
      const second = structuredClone(original);
      second.grant.id = otherApprovalId;
      state.approvals[otherApprovalId] = second;
      return second;
    };
    const cases: readonly {
      readonly name: string;
      readonly corrupt: (state: typeof canonical) => void;
    }[] = [
      {
        name: "duplicate indexed ID",
        corrupt: (state) => {
          state.approvalIdsByActivationId[activationId] = [
            approvalId,
            approvalId,
          ];
        },
      },
      {
        name: "missing indexed entity",
        corrupt: (state) => {
          state.approvalIdsByActivationId[activationId] = [
            approvalId,
            otherApprovalId,
          ];
        },
      },
      {
        name: "omitted reverse relation",
        corrupt: (state) => {
          state.approvalIdsByActivationId[activationId] = [];
        },
      },
      {
        name: "foreign activation",
        corrupt: (state) => {
          const approval = state.approvals[approvalId];
          if (approval === undefined) throw new Error("Expected approval");
          approval.grant.activationId = otherActivationId;
        },
      },
      {
        name: "foreign Dispatch",
        corrupt: (state) => {
          const approval = state.approvals[approvalId];
          if (approval === undefined) throw new Error("Expected approval");
          approval.grant.dispatchId = otherDispatchId;
        },
      },
      ...(
        [
          "requestDigest",
          "procedureDigest",
          "policyDigest",
          "scopeHash",
        ] as const
      ).map((binding) => ({
        name: `${binding} mismatch`,
        corrupt: (state: typeof canonical) => {
          const approval = state.approvals[approvalId];
          if (approval === undefined) throw new Error("Expected approval");
          approval.grant[binding] = WRONG_DIGEST;
        },
      })),
      {
        name: "grant order mismatch",
        corrupt: (state) => {
          addSecondApproval(state);
          state.approvalIdsByActivationId[activationId] = [
            otherApprovalId,
            approvalId,
          ];
        },
      },
      {
        name: "multiple eligible requested-host grants",
        corrupt: (state) => {
          addSecondApproval(state);
          state.approvalIdsByActivationId[activationId] = [
            approvalId,
            otherApprovalId,
          ];
        },
      },
    ];
    const before = snapshotTree(sandbox);

    for (const item of cases) {
      const corrupted = structuredClone(canonical);
      item.corrupt(corrupted);
      vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(
        corrupted,
      );
      await expect(
        resolveApprovedResearchDispatchContext({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host:
            item.name === "multiple eligible requested-host grants"
              ? "claude"
              : "codex",
          now: new Date(Date.parse(granted.approval.grant.grantedAt) + 1),
        }),
        item.name,
      ).rejects.toMatchObject({ code: "APPROVAL_RELATION_MISMATCH" });
      expect(snapshotTree(sandbox), item.name).toEqual(before);
    }
  });

  it("preserves hierarchy, completion, activation, and capability precedence pairs", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    const canonical = await researchCore.readResearchState(fixture.root);
    const activationId =
      canonical.activationByDispatchId[fixture.ids.dispatchId];
    if (activationId === undefined) throw new Error("Expected activation");
    const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1);
    const completedResult = {
      id: "res_99999999-9999-4999-8999-999999999999" as const,
      dispatchId: fixture.ids.dispatchId,
      runId: fixture.ids.runId,
      status: "completed" as const,
      summary: "Already complete",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: now.toISOString(),
    };
    const cases = [
      {
        name: "hierarchy before completion",
        code: "DISPATCH_HIERARCHY_INVALID",
        mutate: (state: typeof canonical) => {
          Reflect.deleteProperty(state.quests, fixture.ids.questId);
          state.results[completedResult.id] = completedResult;
        },
      },
      {
        name: "completion before activation",
        code: "DISPATCH_ALREADY_COMPLETED",
        mutate: (state: typeof canonical) => {
          state.results[completedResult.id] = completedResult;
          Reflect.deleteProperty(
            state.activationByDispatchId,
            fixture.ids.dispatchId,
          );
        },
      },
      {
        name: "activation relation before capability",
        code: "APPROVAL_RELATION_MISMATCH",
        mutate: (state: typeof canonical) => {
          const activation = state.activations[activationId];
          if (activation === undefined) throw new Error("Expected activation");
          activation.dispatchId = "dsp_99999999-9999-4999-8999-999999999999";
          activation.capabilityId = "unknown.capability";
        },
      },
      {
        name: "capability before request materialization",
        code: "UNKNOWN_CAPABILITY",
        mutate: (state: typeof canonical) => {
          const activation = state.activations[activationId];
          if (activation === undefined) throw new Error("Expected activation");
          activation.capabilityId = "unknown.capability";
        },
        breakRequest: true,
      },
    ] as const;

    for (const item of cases) {
      const state = structuredClone(canonical);
      item.mutate(state);
      if ("breakRequest" in item)
        fs.writeFileSync(fixture.requestPath, "{broken}\n");
      const before = snapshotTree(sandbox);
      vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(state);
      await expect(
        resolveApprovedResearchDispatchContext({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "claude",
          now,
        }),
        item.name,
      ).rejects.toMatchObject({ code: item.code });
      expect(snapshotTree(sandbox), item.name).toEqual(before);
      if ("breakRequest" in item) {
        fs.writeFileSync(
          fixture.requestPath,
          researchCore.stableResearchJson(
            canonical.dispatches[fixture.ids.dispatchId],
          ),
        );
      }
    }
  });

  it("checks activation and approval materializations before output collisions", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    const canonical = await researchCore.readResearchState(fixture.root);
    const ids = deriveResearchOutputIds(granted.approval.grant.id);
    const collisionState = structuredClone(canonical);
    collisionState.results[ids.resultId] = {
      id: ids.resultId,
      dispatchId: "dsp_99999999-9999-4999-8999-999999999999",
      runId: "run_99999999-9999-4999-8999-999999999999",
      status: "completed",
      summary: "Foreign occupation",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: granted.approval.grant.grantedAt,
    };
    const dispatchDirectory = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.ids.dispatchId,
    );
    const paths = [
      path.join(dispatchDirectory, "activation.json"),
      path.join(
        dispatchDirectory,
        "approvals",
        `${granted.approval.grant.id}.json`,
      ),
    ];

    for (const target of paths) {
      const original = fs.readFileSync(target);
      fs.writeFileSync(target, "{broken}\n");
      const before = snapshotTree(sandbox);
      vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(
        structuredClone(collisionState),
      );
      await expect(
        resolveApprovedResearchDispatchContext({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "claude",
          now: new Date(Date.parse(granted.approval.grant.grantedAt) + 1),
        }),
      ).rejects.toMatchObject({ code: "MATERIALIZATION_STATE_MISMATCH" });
      expect(snapshotTree(sandbox)).toEqual(before);
      fs.writeFileSync(target, original);
    }
  });

  it("rejects cross-repository artifacts before returning single-repository worker authority", async () => {
    const root = path.join(sandbox, "cross-repository", "control");
    const targetRepository = path.join(sandbox, "cross-repository", "target-a");
    const artifactRepository = path.join(
      sandbox,
      "cross-repository",
      "source-b",
    );
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    fs.mkdirSync(path.join(targetRepository, "inputs"), { recursive: true });
    fs.mkdirSync(path.join(artifactRepository, "inputs"), { recursive: true });
    await initializeResearch({ root, name: "Cross-repository Context" });
    const target = await addResearchRepository({
      root,
      name: "target-a",
      kind: "code",
      locator: "../target-a",
      hasTrellis: false,
    });
    const source = await addResearchRepository({
      root,
      name: "source-b",
      kind: "data",
      locator: "../source-b",
      hasTrellis: false,
    });
    const questId = researchCore.createQuestId();
    const campaignId = researchCore.createCampaignId();
    const runId = researchCore.createRunId();
    const dispatchId = researchCore.createDispatchId();
    await createResearchQuest({
      root,
      id: questId,
      title: "Cross-repository authority",
      repositoryIds: [target.repository.id, source.repository.id],
    });
    await setResearchQuestStage({ root, questId, stage: "literature" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Cross-repository campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({
      root,
      id: runId,
      campaignId,
      title: "Cross-repository run",
    });
    const artifactBody = "DECLARED ARTIFACT\n";
    const targetArtifactPath = path.join(
      targetRepository,
      "inputs",
      "source.txt",
    );
    const crossRepositoryArtifactPath = path.join(
      artifactRepository,
      "inputs",
      "source.txt",
    );
    fs.writeFileSync(targetArtifactPath, artifactBody);
    fs.writeFileSync(crossRepositoryArtifactPath, artifactBody);
    const contextFile = path.join(sandbox, "cross-repository", "context.json");
    fs.writeFileSync(
      contextFile,
      JSON.stringify([
        {
          artifact: {
            id: "art_99999999-9999-4999-8999-999999999999",
            repositoryId: target.repository.id,
            path: "inputs/source.txt",
            kind: "source",
            sha256: createHash("sha256").update(artifactBody).digest("hex"),
            mediaType: "text/plain",
          },
        },
      ]),
    );
    await prepareResearchDispatch({
      root,
      id: dispatchId,
      runId,
      questId,
      campaignId,
      repositoryId: target.repository.id,
      ownerSkill: "historical-research-runner",
      capabilityId: "research.literature.review",
      provider: "claude",
      objective: "Review source B while targeting repository A",
      acceptanceCriteria: ["Remain within normalized worker authority"],
      contextFile,
      allowedWritePaths: ["outputs/report.json"],
      expectedOutputs: ["Review report"],
      checks: ["test -f outputs/report.json"],
      idempotencyKey: "cross-repository:prepare",
    });
    const state = await researchCore.readResearchState(root);
    const activationId = state.activationByDispatchId[dispatchId];
    const activation =
      activationId === undefined ? undefined : state.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation");
    const answers = [
      "Operator",
      "Reviewed multi-repository Procedure",
      `APPROVE ${dispatchId} claude ${activation.requestDigest.slice(7, 19)}`,
    ];
    const granted = await approveResearchDispatch(
      { root, dispatchId, host: "claude" },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => answers.shift() ?? "",
        close: () => undefined,
      },
    );
    const approvedState = structuredClone(
      await researchCore.readResearchState(root),
    );
    const dispatch = approvedState.dispatches[dispatchId];
    if (dispatch === undefined) throw new Error("Expected Dispatch");
    const artifact = dispatch.context[0]?.artifact;
    if (artifact === undefined) throw new Error("Expected Dispatch artifact");
    artifact.repositoryId = source.repository.id;
    artifact.path = "inputs/source.txt";
    const corruptedActivationId =
      approvedState.activationByDispatchId[dispatchId];
    const corruptedActivation =
      corruptedActivationId === undefined
        ? undefined
        : approvedState.activations[corruptedActivationId];
    if (corruptedActivation === undefined)
      throw new Error("Expected activation");
    corruptedActivation.requestDigest =
      researchCore.digestDispatchRequest(dispatch);
    fs.writeFileSync(
      path.join(
        root,
        ".trellis",
        "research",
        "dispatches",
        dispatchId,
        "request.json",
      ),
      researchCore.stableResearchJson(dispatch),
    );
    fs.renameSync(targetRepository, `${targetRepository}.offline`);
    vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(
      approvedState,
    );
    const before = snapshotTree(sandbox);

    await expect(
      resolveApprovedResearchDispatchContext({
        root,
        dispatchId,
        host: "claude",
        now: new Date(Date.parse(granted.approval.grant.grantedAt) + 1),
      }),
    ).rejects.toMatchObject({
      code: "REPOSITORY_INVALID",
      message:
        "Single-Repository authority cannot include artifacts from another Repository",
    });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("keeps Claude and Codex normalized Context provider-neutral", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const claude = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: "context-parity-claude",
    });
    const codex = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "context-parity-codex",
    });
    const now = new Date("2026-07-24T12:00:00.001Z");

    const claudeContext = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      now,
    });
    const codexContext = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      now,
    });

    expect(claude.approval.grant.mode).toBe(codex.approval.grant.mode);
    expect(claude.approval.grant.expiresAt).toBe(
      codex.approval.grant.expiresAt,
    );
    expect(claudeContext.context.outputContract).toMatchObject(
      deriveResearchOutputIds(claudeContext.context.approval.id),
    );
    expect(codexContext.context.outputContract).toMatchObject(
      deriveResearchOutputIds(codexContext.context.approval.id),
    );
    expect(parityValue(claudeContext)).toEqual(parityValue(codexContext));
  });

  it("preserves no-history, host, revoked, and consumed approval classifications", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    const canonical = await researchCore.readResearchState(fixture.root);
    const activationId =
      canonical.activationByDispatchId[fixture.ids.dispatchId];
    const approvalId = granted.approval.grant.id;
    if (activationId === undefined) throw new Error("Expected activation");
    const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1);
    const before = snapshotTree(sandbox);
    const cases = [
      {
        name: "no history",
        host: "claude" as const,
        code: "APPROVAL_REQUIRED",
        mutate: (state: typeof canonical) => {
          Reflect.deleteProperty(state.approvals, approvalId);
          state.approvalIdsByActivationId[activationId] = [];
        },
      },
      {
        name: "host mismatch",
        host: "codex" as const,
        code: "APPROVAL_HOST_MISMATCH",
        mutate: () => undefined,
      },
      {
        name: "revoked",
        host: "claude" as const,
        code: "APPROVAL_REVOKED",
        mutate: (state: typeof canonical) => {
          const approval = state.approvals[approvalId];
          if (approval === undefined) throw new Error("Expected approval");
          state.approvals[approvalId] = {
            grant: approval.grant,
            status: "revoked",
            revokedAt: now.toISOString(),
            revocationReason: "operator revoked",
          };
        },
      },
      {
        name: "consumed",
        host: "claude" as const,
        code: "DISPATCH_ALREADY_COMPLETED",
        mutate: (state: typeof canonical) => {
          const approval = state.approvals[approvalId];
          if (approval === undefined) throw new Error("Expected approval");
          const ids = deriveResearchOutputIds(approvalId);
          state.approvals[approvalId] = {
            grant: approval.grant,
            status: "consumed",
            consumedAt: now.toISOString(),
            ...ids,
          };
        },
      },
    ] as const;

    for (const item of cases) {
      const state = structuredClone(canonical);
      item.mutate(state);
      vi.spyOn(researchCore, "readResearchState").mockResolvedValueOnce(state);
      await expect(
        resolveApprovedResearchDispatchContext({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: item.host,
          now,
        }),
        item.name,
      ).rejects.toMatchObject({ code: item.code });
      expect(snapshotTree(sandbox), item.name).toEqual(before);
    }
  });

  it("retains legitimate approval mode and expiry differences", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T14:00:00.000Z"));
    const automaticFixture = await createResearchDispatchFixture(
      path.join(sandbox, "automatic"),
      { automaticEnabled: true },
    );
    const automaticGrant = await authorizeResearchDispatch({
      root: automaticFixture.root,
      dispatchId: automaticFixture.ids.dispatchId,
      host: "claude",
    });
    const automaticContext = await resolveApprovedResearchDispatchContext({
      root: automaticFixture.root,
      dispatchId: automaticFixture.ids.dispatchId,
      host: "claude",
      now: new Date(Date.parse(automaticGrant.approval.grant.grantedAt) + 1),
    });

    vi.setSystemTime(new Date("2026-07-24T14:05:00.000Z"));
    const interactiveFixture = await createResearchDispatchFixture(
      path.join(sandbox, "interactive"),
      { automaticEnabled: false },
    );
    const state = await researchCore.readResearchState(interactiveFixture.root);
    const activationId =
      state.activationByDispatchId[interactiveFixture.ids.dispatchId];
    const activation =
      activationId === undefined ? undefined : state.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation");
    const answers = [
      "Operator",
      "Reviewed",
      `APPROVE ${interactiveFixture.ids.dispatchId} codex ${activation.requestDigest.slice(7, 19)}`,
    ];
    const interactiveGrant = await approveResearchDispatch(
      {
        root: interactiveFixture.root,
        dispatchId: interactiveFixture.ids.dispatchId,
        host: "codex",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => answers.shift() ?? "",
        close: () => undefined,
      },
    );
    const interactiveContext = await resolveApprovedResearchDispatchContext({
      root: interactiveFixture.root,
      dispatchId: interactiveFixture.ids.dispatchId,
      host: "codex",
      now: new Date(Date.parse(interactiveGrant.approval.grant.grantedAt) + 1),
    });

    expect(automaticContext.context.approval.mode).toBe("automatic");
    expect(interactiveContext.context.approval.mode).toBe("interactive");
    expect(automaticContext.context.approval.expiresAt).not.toBe(
      interactiveContext.context.approval.expiresAt,
    );
  });
});
