import fs from "node:fs";
import path from "node:path";

import { InvalidArgumentError, type Command } from "commander";

import {
  createResearchCampaign,
  createResearchClaim,
  createResearchEvidence,
  createResearchQuest,
  createResearchRun,
  freezeResearchCampaign,
  initializeResearch,
  invalidateResearchRun,
  rebuildResearch,
  researchStatus,
  setResearchCampaignStatus,
  setResearchClaimStatus,
  setResearchEvidenceStatus,
  setResearchQuestStage,
  setResearchQuestStatus,
  setResearchRunStatus,
  updateResearchCampaignProtocol,
  validateResearch,
} from "./command.js";
import {
  applyResearchProposal,
  prepareResearchDispatch,
  recordResearchDispatchResult,
  rejectResearchProposal,
  type PrepareResearchDispatchOptions,
  type RecordResearchDispatchResultOptions,
  type ReviewResearchProposalOptions,
} from "./dispatch-command.js";
import {
  approveResearchDispatch,
  authorizeResearchDispatch,
  planResearchActivation,
  revokeResearchApproval,
  type GrantResearchApprovalOptions,
  type PlanResearchActivationOptions,
  type RevokeResearchApprovalOptions,
} from "./dispatch-activation-command.js";
import {
  getResearchDispatchContext,
  type GetResearchDispatchContextOptions,
} from "./dispatch-context.js";
import {
  getResearchScientificGateStatus,
  recordResearchScientificGate,
  type ResearchGateMutationOptions,
} from "./gate-command.js";
import {
  getResearchSkillContext,
  listResearchSkills,
  showResearchSkill,
} from "./skill-command.js";
import {
  bindResearchWorkflow,
  closeResearchWorkflow,
  completeResearchWorkflowNode,
  getResearchWorkflowNext,
  getResearchWorkflowStatus,
  recordResearchWorkflowTransition,
  type ResearchWorkflowMutationOptions,
} from "./workflow-command.js";
import {
  addResearchRepository,
  bindResearchRepository,
  listResearchRepositories,
  resolveResearchRepository,
  type AddResearchRepositoryOptions,
  type BindResearchRepositoryOptions,
  type ResolveResearchRepositoryOptions,
} from "./repository.js";
import {
  exportResearchQuest,
  importResearchQuest,
  transferResearchQuestWriter,
  type ResearchQuestExportOptions,
  type ResearchQuestImportOptions,
  type ResearchQuestWriterTransferOptions,
} from "./quest-cutover-command.js";
import {
  parseCampaignIdArgument,
  parseCampaignStatusArgument,
  parseClaimIdArgument,
  parseClaimStatusArgument,
  parseEvidenceIdArgument,
  parseEvidenceStatusArgument,
  parseQuestIdArgument,
  parseQuestStageArgument,
  parseQuestStatusArgument,
  parseRunIdArgument,
  parseRunStatusArgument,
  renderResearchError,
  renderResearchResult,
  type ResearchCommandResult,
  type ResearchMutationOptions,
  type ResearchOutputOptions,
} from "./common.js";
import type {
  ApprovalId,
  ArtifactId,
  CampaignId,
  CampaignStatus,
  ClaimId,
  ClaimStatus,
  EvidenceId,
  DispatchId,
  EvidenceStatus,
  ProposalId,
  QuestId,
  ResearchExecutionHost,
  ResearchExecutionProfile,
  QuestStage,
  QuestStatus,
  RepositoryId,
  RepositoryKind,
  RunId,
  RunStatus,
  ScientificGateDecision,
  ScientificGateId,
  WorkflowCloseOutcome,
  WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";

interface InitOptions extends ResearchMutationOptions {
  name: string;
  description?: string;
}

interface QuestCreateOptions extends ResearchMutationOptions {
  title: string;
  description?: string;
  repository: RepositoryId[];
  id?: QuestId;
}

interface CampaignCreateOptions extends ResearchMutationOptions {
  quest: QuestId;
  title: string;
  protocolDigest: string;
  id?: CampaignId;
}

interface CampaignProtocolOptions extends ResearchMutationOptions {
  digest: string;
}

interface RunCreateOptions extends ResearchMutationOptions {
  campaign: CampaignId;
  title: string;
  id?: RunId;
}

interface RunInvalidateOptions extends ResearchMutationOptions {
  reason: string;
}

interface EvidenceCreateOptions extends ResearchMutationOptions {
  quest: QuestId;
  summary: string;
  run?: RunId;
  id?: EvidenceId;
}

interface ClaimCreateOptions extends ResearchMutationOptions {
  quest: QuestId;
  statement: string;
  evidence: EvidenceId[];
  id?: ClaimId;
}

interface RepositoryAddCliOptions extends ResearchMutationOptions {
  name: string;
  kind: RepositoryKind;
  locator: string;
  expectedRemote?: string;
  defaultBranch?: string;
  hasTrellis?: boolean;
  id?: RepositoryId;
}

interface RepositoryBindCliOptions extends ResearchOutputOptions {
  path: string;
}

interface DispatchContextCliOptions extends ResearchOutputOptions {
  host: ResearchExecutionHost;
}

interface DispatchPrepareCliOptions extends ResearchMutationOptions {
  run: RunId;
  quest: QuestId;
  campaign?: CampaignId;
  repository: RepositoryId;
  ownerSkill: string;
  provider?: string;
  objective: string;
  acceptance: string[];
  contextFile?: string;
  allowWrite: string[];
  expectedOutput: string[];
  check: string[];
  taskRef?: string;
  capability?: string;
  id?: DispatchId;
}

interface DispatchActivationCliOptions extends ResearchMutationOptions {
  capability?: string;
}

interface DispatchApprovalCliOptions extends ResearchMutationOptions {
  host: string;
}

interface DispatchInteractiveApprovalCliOptions {
  root?: string;
  idempotencyKey?: string;
  host: string;
}

interface DispatchRevokeCliOptions extends ResearchMutationOptions {
  reason?: string;
}

interface DispatchRecordResultCliOptions extends ResearchMutationOptions {
  approval: ApprovalId;
  input: string;
}

interface DispatchReviewCliOptions extends ResearchMutationOptions {
  operation: number[];
  rationale: string;
}

const ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseResearchIdArgument<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  if (
    !value.startsWith(`${prefix}_`) ||
    !ID_UUID.test(value.slice(prefix.length + 1))
  ) {
    throw new InvalidArgumentError(
      `${label} must be a ${prefix}_ prefixed UUID`,
    );
  }
  return value as T;
}

function parseRepositoryIdArgument(value: string): RepositoryId {
  return parseResearchIdArgument<RepositoryId>(value, "rep", "repository ID");
}

function parseDispatchIdArgument(value: string): DispatchId {
  return parseResearchIdArgument<DispatchId>(value, "dsp", "dispatch ID");
}

function parseApprovalIdArgument(value: string): ApprovalId {
  return parseResearchIdArgument<ApprovalId>(value, "apr", "approval ID");
}

function parseProposalIdArgument(value: string): ProposalId {
  return parseResearchIdArgument<ProposalId>(value, "prp", "proposal ID");
}

function parseResearchHostArgument(value: string): ResearchExecutionHost {
  if (value !== "claude" && value !== "codex") {
    throw new InvalidArgumentError("host must be exactly 'claude' or 'codex'");
  }
  return value;
}

function parseResearchExecutionProfileArgument(
  value: string,
): ResearchExecutionProfile {
  if (value !== "lightweight" && value !== "managed") {
    throw new InvalidArgumentError("profile must be lightweight or managed");
  }
  return value;
}

function parseWorkflowInstanceIdArgument(value: string): WorkflowInstanceId {
  return parseResearchIdArgument<WorkflowInstanceId>(
    value,
    "wfi",
    "Workflow instance ID",
  );
}

function parseScientificGateIdArgument(value: string): ScientificGateId {
  if (value !== "H1" && value !== "H2") {
    throw new InvalidArgumentError("scientific gate must be exactly H1 or H2");
  }
  return value;
}

function parseScientificGateDecisionArgument(
  value: string,
): ScientificGateDecision {
  if (value !== "approve" && value !== "reject") {
    throw new InvalidArgumentError(
      "scientific gate decision must be exactly approve or reject",
    );
  }
  return value;
}

function parseArtifactReferenceArgument(value: string): ArtifactId {
  if (!value.startsWith("artifact:")) {
    throw new InvalidArgumentError(
      "Artifact reference must use artifact:<art-id>",
    );
  }
  return parseResearchIdArgument<ArtifactId>(
    value.slice("artifact:".length),
    "art",
    "Artifact ID",
  );
}

function parseWorkflowCloseOutcomeArgument(
  value: string,
): WorkflowCloseOutcome {
  const outcomes: WorkflowCloseOutcome[] = [
    "completed",
    "blocked",
    "cancelled",
    "superseded",
  ];
  if (!outcomes.includes(value as WorkflowCloseOutcome)) {
    throw new InvalidArgumentError(
      `Workflow outcome must be one of: ${outcomes.join(", ")}`,
    );
  }
  return value as WorkflowCloseOutcome;
}

function parseRepositoryKindArgument(value: string): RepositoryKind {
  const kinds: RepositoryKind[] = ["code", "paper", "notes", "data", "other"];
  if (!kinds.includes(value as RepositoryKind)) {
    throw new InvalidArgumentError(
      `repository kind must be one of: ${kinds.join(", ")}`,
    );
  }
  return value as RepositoryKind;
}

function collectString(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function collectRequiredString(
  value: string,
  previous: string[] | undefined,
): string[] {
  return [...(previous ?? []), value];
}

function collectArtifactReference(
  value: string,
  previous: ArtifactId[] | undefined,
): ArtifactId[] {
  return [...(previous ?? []), parseArtifactReferenceArgument(value)];
}

function collectRepositoryId(
  value: string,
  previous: RepositoryId[],
): RepositoryId[] {
  return [...previous, parseRepositoryIdArgument(value)];
}

function collectOperationIndex(value: string, previous: number[]): number[] {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0) {
    throw new InvalidArgumentError(
      "operation index must be a non-negative integer",
    );
  }
  return [...previous, index];
}

function addOutputOptions(command: Command): Command {
  return command
    .option("--root <path>", "explicit research control-plane root")
    .option("--json", "emit one JSON document");
}

function addMutationOptions(command: Command): Command {
  return addOutputOptions(command)
    .option("--idempotency-key <key>", "durable retry key")
    .option("--dry-run", "validate the prospective mutation without writing");
}

function addWorkflowMutationOptions(command: Command): Command {
  return addOutputOptions(command)
    .option("--idempotency-key <key>", "durable retry key")
    .option("--dry-run", "preview the Workflow mutation without writing")
    .option("--write", "commit exactly one Workflow event");
}

function addGateMutationOptions(command: Command): Command {
  return addOutputOptions(command)
    .option("--idempotency-key <key>", "durable retry key")
    .option("--dry-run", "preview the scientific gate record without writing")
    .option("--write", "commit exactly one scientific gate event");
}

function collectEvidenceId(
  value: string,
  previous: EvidenceId[],
): EvidenceId[] {
  return [...previous, parseEvidenceIdArgument(value)];
}

function renderExtendedResearchResult(result: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (typeof result !== "object" || result === null) {
    console.log(String(result));
    return;
  }
  const value = result as Record<string, unknown>;
  if (value.command === "research dispatch context" && value.valid === true) {
    const context = value.context as {
      host: string;
      dispatch: { id: string };
      capability: { id: string; stage: string };
      approval: { id: string };
      repository: { id: string };
    };
    console.log(
      `research dispatch context: ${context.dispatch.id} host=${context.host} stage=${context.capability.stage} capability=${context.capability.id} approval=${context.approval.id} head=${String(value.ledgerHead)} repository=${context.repository.id}`,
    );
    return;
  }
  if (value.command === "research gate record") {
    const record = value.record as {
      id: string;
      workflowInstanceId: string;
      nodeId: string;
      gateId: string;
      decision: string;
    };
    console.log(
      `${record.id} instance=${record.workflowInstanceId} node=${record.nodeId} gate=${record.gateId} decision=${record.decision} state=${String(value.state)} head=${String(value.headSeq)}`,
    );
    return;
  }
  if (value.command === "research gate status") {
    console.log(
      `${String(value.workflowInstanceId)} workflow=${String(value.workflowId)}@${String(value.workflowVersion)} node=${String(value.currentNodeId)} completed=${String(value.currentNodeCompleted)} gates=${(value.declaredGateIds as string[]).join(",")} history=${(value.history as unknown[]).length}`,
    );
    const effective = value.effective as Record<
      string,
      null | { id: string; decision: string }
    >;
    for (const gateId of ["H1", "H2"]) {
      const record = effective[gateId];
      console.log(
        record === null || record === undefined
          ? `${gateId} none`
          : `${gateId} ${record.id} decision=${record.decision}`,
      );
    }
    return;
  }
  if ("events" in value || "counts" in value || "valid" in value) {
    renderResearchResult(result as ResearchCommandResult, false);
    return;
  }
  if (value.command === "research repo list") {
    const repositories = value.repositories as {
      id: string;
      name: string;
      kind: string;
      locator: string;
    }[];
    for (const repository of repositories) {
      console.log(
        `${repository.id} ${repository.kind} ${repository.name} ${repository.locator}`,
      );
    }
    return;
  }
  if (value.command === "research repo resolve") {
    const repository = value.repository as { id: string };
    const observation = value.observation as {
      path: string;
      revision: string | null;
    };
    console.log(
      `${repository.id} path=${observation.path} revision=${observation.revision ?? "none"} source=${String(value.source)}`,
    );
    return;
  }
  if (value.command === "research repo bind") {
    console.log(`${String(value.repositoryId)} bound=${String(value.path)}`);
    return;
  }
  if (value.command === "research skill list") {
    const skills = value.skills as {
      id: string;
      version: string;
      source: string;
      skillKind: string;
      invocationSource: string;
      allowedProfiles: string[];
    }[];
    for (const skill of skills) {
      console.log(
        `${skill.id}@${skill.version} source=${skill.source} kind=${skill.skillKind} invocation=${skill.invocationSource} profiles=${skill.allowedProfiles.join(",")}`,
      );
    }
    return;
  }
  if (value.command === "research skill show") {
    const manifest = value.manifest as { id: string; version: string };
    const instructions = value.instructions as {
      byteLength: number;
      digest: string;
    };
    const members = value.members as unknown[];
    console.log(
      `${manifest.id}@${manifest.version} source=${String(value.source)} instructions=${instructions.byteLength} digest=${instructions.digest} members=${members.length}`,
    );
    return;
  }
  if (value.command === "research skill context") {
    console.log(String(value.instructions));
    const members = value.members as { path: string; content: string }[];
    for (const member of members) {
      console.log(`\n--- ${member.path} ---\n${member.content}`);
    }
    return;
  }
  if (value.command === "research workflow status") {
    const instance = value.instance as null | {
      workflowInstanceId: string;
      workflowId: string;
      workflowVersion: string;
      currentNodeId: string;
      status: string;
    };
    console.log(
      instance === null
        ? `${String(value.questId)} state=${String(value.state)}`
        : `${String(value.questId)} state=${String(value.state)} instance=${instance.workflowInstanceId} workflow=${instance.workflowId}@${instance.workflowVersion} node=${instance.currentNodeId} status=${instance.status}`,
    );
    return;
  }
  if (value.command === "research workflow next") {
    const choices = value.choices as {
      id: string;
      fromNodeId: string;
      toNodeId: string;
      legal: boolean;
      missingRefs: string[];
      missingGateIds: string[];
      satisfyingGateRecordIds: string[];
    }[];
    console.log(
      `${String(value.questId)} instance=${String(value.workflowInstanceId ?? "none")} node=${String(value.currentNodeId ?? "none")} stop=${String(value.stopReason)}`,
    );
    for (const choice of choices) {
      console.log(
        `${choice.id} ${choice.fromNodeId}->${choice.toNodeId} legal=${choice.legal} missingRefs=${choice.missingRefs.join(",")} missingGates=${choice.missingGateIds.join(",")} satisfyingGateRecords=${choice.satisfyingGateRecordIds.join(",")}`,
      );
    }
    return;
  }
  console.log(JSON.stringify(result));
}

async function runAction(
  json: boolean | undefined,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    const result = await operation();
    renderExtendedResearchResult(result, json === true);
    if (typeof result === "object" && result !== null) {
      const warnings = (result as { runtimeWarnings?: unknown })
        .runtimeWarnings;
      if (Array.isArray(warnings)) {
        for (const warning of warnings) console.error(String(warning));
      }
    }
  } catch (error) {
    renderResearchError(error, json === true);
    process.exitCode = 1;
  }
}

export function registerResearchCommand(program: Command): void {
  const research = program
    .command("research")
    .description("Manage deterministic research lifecycle state");

  addMutationOptions(
    research
      .command("init")
      .description("Initialize one research workspace")
      .requiredOption("--name <name>", "workspace name")
      .option("--description <text>", "workspace description"),
  ).action(async (options: InitOptions) => {
    await runAction(options.json, () => initializeResearch(options));
  });

  addOutputOptions(
    research.command("status").description("Inspect research state watermarks"),
  ).action(async (options: ResearchOutputOptions) => {
    await runAction(options.json, () => researchStatus(options));
  });

  addOutputOptions(
    research
      .command("validate")
      .description("Strict-parse and reduce the complete research ledger"),
  ).action(async (options: ResearchOutputOptions) => {
    await runAction(options.json, () => validateResearch(options));
  });

  addOutputOptions(
    research
      .command("rebuild")
      .description(
        "Rebuild deterministic research projections from the ledger",
      ),
  ).action(async (options: ResearchOutputOptions) => {
    await runAction(options.json, () => rebuildResearch(options));
  });

  const skill = research
    .command("skill")
    .description("Inspect authenticated Research Skill packages");

  addOutputOptions(
    skill.command("list").description("List Research Skills"),
  ).action(async (options: ResearchOutputOptions) => {
    await runAction(options.json, () => listResearchSkills(options));
  });

  addOutputOptions(
    skill
      .command("show")
      .description("Show authenticated Research Skill metadata")
      .requiredOption("--skill <id>", "exact Research Skill ID")
      .option("--version <version>", "exact Research Skill version"),
  ).action(
    async (
      options: ResearchOutputOptions & { skill: string; version?: string },
    ) => {
      await runAction(options.json, () => showResearchSkill(options));
    },
  );

  addOutputOptions(
    skill
      .command("context")
      .description("Emit one read-only lightweight Research Skill Context")
      .requiredOption("--skill <id>", "exact Research Skill ID")
      .requiredOption(
        "--profile <profile>",
        "execution profile",
        parseResearchExecutionProfileArgument,
      )
      .option(
        "--member <path>",
        "explicit optional member path (repeatable)",
        collectString,
        [] as string[],
      )
      .option("--quest <quest-id>", "Quest context", parseQuestIdArgument),
  ).action(
    async (
      options: ResearchOutputOptions & {
        skill: string;
        profile: ResearchExecutionProfile;
        member: string[];
        quest?: QuestId;
      },
    ) => {
      await runAction(options.json, () => getResearchSkillContext(options));
    },
  );

  const workflow = research
    .command("workflow")
    .description("Manage explicit Research Workflow state");

  addWorkflowMutationOptions(
    workflow
      .command("bind")
      .description("Preview or bind an exact Workflow definition")
      .requiredOption("--quest <quest-id>", "Quest ID", parseQuestIdArgument)
      .requiredOption("--workflow <id>", "exact Workflow ID")
      .requiredOption("--version <version>", "exact Workflow version")
      .requiredOption("--start-node <node>", "declared start node ID"),
  ).action(
    async (
      options: ResearchWorkflowMutationOptions & {
        quest: QuestId;
        workflow: string;
        version: string;
        startNode: string;
      },
    ) => {
      await runAction(options.json, () => bindResearchWorkflow(options));
    },
  );

  addWorkflowMutationOptions(
    workflow
      .command("complete")
      .description("Preview or record one lightweight node completion")
      .requiredOption(
        "--instance <wfi-id>",
        "Workflow instance ID",
        parseWorkflowInstanceIdArgument,
      )
      .requiredOption("--node <id>", "current Workflow node ID")
      .requiredOption(
        "--accepted-ref <ref>",
        "accepted result:<id> or artifact:<id> reference (repeatable)",
        collectRequiredString,
      ),
  ).action(
    async (
      options: ResearchWorkflowMutationOptions & {
        instance: WorkflowInstanceId;
        node: string;
        acceptedRef: string[];
      },
    ) => {
      await runAction(options.json, () =>
        completeResearchWorkflowNode(options),
      );
    },
  );

  addWorkflowMutationOptions(
    workflow
      .command("transition")
      .description("Preview or record one explicit Workflow transition")
      .requiredOption(
        "--instance <wfi-id>",
        "Workflow instance ID",
        parseWorkflowInstanceIdArgument,
      )
      .requiredOption("--transition <id>", "declared transition ID"),
  ).action(
    async (
      options: ResearchWorkflowMutationOptions & {
        instance: WorkflowInstanceId;
        transition: string;
      },
    ) => {
      await runAction(options.json, () =>
        recordResearchWorkflowTransition(options),
      );
    },
  );

  addWorkflowMutationOptions(
    workflow
      .command("close")
      .description("Preview or close one active Workflow instance")
      .requiredOption(
        "--instance <wfi-id>",
        "Workflow instance ID",
        parseWorkflowInstanceIdArgument,
      )
      .requiredOption(
        "--outcome <outcome>",
        "completed, blocked, cancelled, or superseded",
        parseWorkflowCloseOutcomeArgument,
      )
      .requiredOption("--rationale <text>", "non-empty closure rationale"),
  ).action(
    async (
      options: ResearchWorkflowMutationOptions & {
        instance: WorkflowInstanceId;
        outcome: WorkflowCloseOutcome;
        rationale: string;
      },
    ) => {
      await runAction(options.json, () => closeResearchWorkflow(options));
    },
  );

  addOutputOptions(
    workflow
      .command("status")
      .description("Read canonical Workflow status for one Quest")
      .requiredOption("--quest <quest-id>", "Quest ID", parseQuestIdArgument),
  ).action(async (options: ResearchOutputOptions & { quest: QuestId }) => {
    await runAction(options.json, () => getResearchWorkflowStatus(options));
  });

  addOutputOptions(
    workflow
      .command("next")
      .description("List explicit legal and blocked outgoing transitions")
      .requiredOption("--quest <quest-id>", "Quest ID", parseQuestIdArgument),
  ).action(async (options: ResearchOutputOptions & { quest: QuestId }) => {
    await runAction(options.json, () => getResearchWorkflowNext(options));
  });

  const gate = research
    .command("gate")
    .description("Record and inspect explicit scientific gate decisions");

  addGateMutationOptions(
    gate
      .command("record")
      .description("Preview or record one explicit H1/H2 decision")
      .requiredOption(
        "--instance <wfi-id>",
        "Workflow instance ID",
        parseWorkflowInstanceIdArgument,
      )
      .requiredOption(
        "--gate <H1|H2>",
        "scientific gate ID",
        parseScientificGateIdArgument,
      )
      .requiredOption(
        "--decision <approve|reject>",
        "explicit scientific decision",
        parseScientificGateDecisionArgument,
      )
      .requiredOption("--actor <label>", "explicit operator label")
      .requiredOption("--rationale <text>", "non-empty scientific rationale")
      .option(
        "--approved-ref <ref>",
        "approved scientific reference (repeatable)",
        collectString,
        [] as string[],
      )
      .option(
        "--rejected-ref <ref>",
        "rejected scientific reference (repeatable)",
        collectString,
        [] as string[],
      )
      .requiredOption(
        "--evidence-ref <artifact:art-id>",
        "accepted evidence Artifact reference (repeatable)",
        collectArtifactReference,
      )
      .option(
        "--source-artifact <artifact:art-id>",
        "source Artifact included in evidence",
        parseArtifactReferenceArgument,
      ),
  ).action(
    async (
      options: ResearchGateMutationOptions & {
        instance: WorkflowInstanceId;
        gate: ScientificGateId;
        decision: ScientificGateDecision;
        actor: string;
        rationale: string;
        approvedRef: string[];
        rejectedRef: string[];
        evidenceRef: ArtifactId[];
        sourceArtifact?: ArtifactId;
      },
    ) => {
      await runAction(options.json, () =>
        recordResearchScientificGate(options),
      );
    },
  );

  addOutputOptions(
    gate
      .command("status")
      .description(
        "Read canonical scientific gate status for one Workflow instance",
      )
      .requiredOption(
        "--instance <wfi-id>",
        "Workflow instance ID",
        parseWorkflowInstanceIdArgument,
      ),
  ).action(
    async (
      options: ResearchOutputOptions & { instance: WorkflowInstanceId },
    ) => {
      await runAction(options.json, () =>
        getResearchScientificGateStatus(options),
      );
    },
  );

  const repo = research
    .command("repo")
    .description("Manage portable research repositories");

  addMutationOptions(
    repo
      .command("add")
      .description("Register a portable research repository")
      .requiredOption("--name <name>", "repository name")
      .requiredOption(
        "--kind <kind>",
        "repository kind",
        parseRepositoryKindArgument,
      )
      .requiredOption("--locator <path>", "POSIX path relative to control root")
      .option("--expected-remote <url>", "expected origin remote URL")
      .option("--default-branch <branch>", "default branch hint")
      .option("--has-trellis", "repository has a Trellis installation")
      .option(
        "--id <rep-id>",
        "explicit repository ID",
        parseRepositoryIdArgument,
      ),
  ).action(async (options: RepositoryAddCliOptions) => {
    await runAction(options.json, () =>
      addResearchRepository(options as AddResearchRepositoryOptions),
    );
  });

  addOutputOptions(
    repo
      .command("bind")
      .description("Bind a repository to an absolute machine-local path")
      .argument("<repository-id>", "repository ID", parseRepositoryIdArgument)
      .requiredOption("--path <path>", "absolute repository path"),
  ).action(
    async (repositoryId: RepositoryId, options: RepositoryBindCliOptions) => {
      await runAction(options.json, () =>
        bindResearchRepository({
          ...options,
          repositoryId,
        } as BindResearchRepositoryOptions),
      );
    },
  );

  addOutputOptions(
    repo.command("list").description("List registered repositories"),
  ).action(async (options: ResearchOutputOptions) => {
    await runAction(options.json, () => listResearchRepositories(options));
  });

  addOutputOptions(
    repo
      .command("resolve")
      .description("Resolve and observe a registered repository")
      .argument("<repository-id>", "repository ID", parseRepositoryIdArgument),
  ).action(
    async (repositoryId: RepositoryId, options: ResearchOutputOptions) => {
      await runAction(options.json, () =>
        resolveResearchRepository({
          ...options,
          repositoryId,
        } as ResolveResearchRepositoryOptions),
      );
    },
  );

  const quest = research.command("quest").description("Manage research quests");

  addOutputOptions(
    quest
      .command("import")
      .description("Preview or import one source Research Quest")
      .requiredOption(
        "--source <research-quest.yaml>",
        "source Quest YAML path",
      )
      .option(
        "--events <research-events.jsonl>",
        "source reviewed events JSONL path",
      )
      .option("--preview-token <token>", "exact token returned by preview")
      .option("--dry-run", "preview without writing")
      .option("--write", "commit the exact previewed import"),
  ).action(async (options: ResearchQuestImportOptions) => {
    await runAction(options.json, () => importResearchQuest(options));
  });

  addOutputOptions(
    quest
      .command("export")
      .description("Preview or write one validated source-format export")
      .requiredOption("--quest <quest-id>", "Quest ID", parseQuestIdArgument)
      .requiredOption("--target <directory>", "new export target directory")
      .option("--dry-run", "preview without writing")
      .option("--write", "publish and record the exact export"),
  ).action(async (options: ResearchQuestExportOptions) => {
    await runAction(options.json, () => exportResearchQuest(options));
  });

  addOutputOptions(
    quest
      .command("transfer-writer")
      .description("Preview or record one verified Quest writer transfer")
      .requiredOption("--quest <quest-id>", "Quest ID", parseQuestIdArgument)
      .requiredOption(
        "--to <trellis|source>",
        "new writer",
        (value: string) => {
          if (value !== "trellis" && value !== "source") {
            throw new InvalidArgumentError(
              "writer must be exactly trellis or source",
            );
          }
          return value;
        },
      )
      .requiredOption("--rationale <text>", "non-empty transfer rationale")
      .requiredOption(
        "--export-digest <sha256>",
        "validated export or import snapshot digest",
      )
      .option("--dry-run", "preview without writing")
      .option("--write", "commit the exact writer transfer"),
  ).action(async (options: ResearchQuestWriterTransferOptions) => {
    await runAction(options.json, () => transferResearchQuestWriter(options));
  });

  addMutationOptions(
    quest
      .command("create")
      .description("Create an active quest at the setup stage")
      .requiredOption("--title <title>", "quest title")
      .option("--description <text>", "quest description")
      .option(
        "--repository <repository-id>",
        "associated repository ID (repeatable)",
        collectRepositoryId,
        [] as RepositoryId[],
      )
      .option("--id <qst-id>", "explicit quest ID", parseQuestIdArgument),
  ).action(async (options: QuestCreateOptions) => {
    await runAction(options.json, () =>
      createResearchQuest({
        ...options,
        id: options.id,
        title: options.title,
        description: options.description,
        repositoryIds: options.repository,
      }),
    );
  });

  addMutationOptions(
    quest
      .command("status")
      .description("Change quest status")
      .argument("<quest-id>", "quest ID", parseQuestIdArgument)
      .argument("<status>", "quest status", parseQuestStatusArgument),
  ).action(
    async (
      questId: QuestId,
      status: QuestStatus,
      options: ResearchMutationOptions,
    ) => {
      await runAction(options.json, () =>
        setResearchQuestStatus({ ...options, questId, status }),
      );
    },
  );

  addMutationOptions(
    quest
      .command("stage")
      .description("Change quest stage")
      .argument("<quest-id>", "quest ID", parseQuestIdArgument)
      .argument("<stage>", "quest stage", parseQuestStageArgument),
  ).action(
    async (
      questId: QuestId,
      stage: QuestStage,
      options: ResearchMutationOptions,
    ) => {
      await runAction(options.json, () =>
        setResearchQuestStage({ ...options, questId, stage }),
      );
    },
  );

  const campaign = research
    .command("campaign")
    .description("Manage research campaigns");

  addMutationOptions(
    campaign
      .command("create")
      .description("Create a draft campaign")
      .requiredOption(
        "--quest <quest-id>",
        "parent quest ID",
        parseQuestIdArgument,
      )
      .requiredOption("--title <title>", "campaign title")
      .requiredOption("--protocol-digest <digest>", "campaign protocol digest")
      .option("--id <cmp-id>", "explicit campaign ID", parseCampaignIdArgument),
  ).action(async (options: CampaignCreateOptions) => {
    await runAction(options.json, () =>
      createResearchCampaign({
        ...options,
        id: options.id,
        questId: options.quest,
        title: options.title,
        protocolDigest: options.protocolDigest,
      }),
    );
  });

  addMutationOptions(
    campaign
      .command("protocol")
      .description("Update a draft campaign protocol digest")
      .argument("<campaign-id>", "campaign ID", parseCampaignIdArgument)
      .requiredOption("--digest <digest>", "new protocol digest"),
  ).action(async (campaignId: CampaignId, options: CampaignProtocolOptions) => {
    await runAction(options.json, () =>
      updateResearchCampaignProtocol({
        ...options,
        campaignId,
        protocolDigest: options.digest,
      }),
    );
  });

  addMutationOptions(
    campaign
      .command("freeze")
      .description("Freeze a draft campaign")
      .argument("<campaign-id>", "campaign ID", parseCampaignIdArgument),
  ).action(async (campaignId: CampaignId, options: ResearchMutationOptions) => {
    await runAction(options.json, () =>
      freezeResearchCampaign({ ...options, campaignId }),
    );
  });

  addMutationOptions(
    campaign
      .command("status")
      .description("Change campaign status")
      .argument("<campaign-id>", "campaign ID", parseCampaignIdArgument)
      .argument("<status>", "campaign status", parseCampaignStatusArgument),
  ).action(
    async (
      campaignId: CampaignId,
      status: CampaignStatus,
      options: ResearchMutationOptions,
    ) => {
      await runAction(options.json, () =>
        setResearchCampaignStatus({ ...options, campaignId, status }),
      );
    },
  );

  const run = research.command("run").description("Manage research runs");

  addMutationOptions(
    run
      .command("create")
      .description("Create a planned run")
      .requiredOption(
        "--campaign <campaign-id>",
        "parent campaign ID",
        parseCampaignIdArgument,
      )
      .requiredOption("--title <title>", "run title")
      .option("--id <run-id>", "explicit run ID", parseRunIdArgument),
  ).action(async (options: RunCreateOptions) => {
    await runAction(options.json, () =>
      createResearchRun({
        ...options,
        id: options.id,
        campaignId: options.campaign,
        title: options.title,
      }),
    );
  });

  addMutationOptions(
    run
      .command("status")
      .description("Change run status")
      .argument("<run-id>", "run ID", parseRunIdArgument)
      .argument("<status>", "run status", parseRunStatusArgument),
  ).action(
    async (
      runId: RunId,
      status: RunStatus,
      options: ResearchMutationOptions,
    ) => {
      await runAction(options.json, () =>
        setResearchRunStatus({ ...options, runId, status }),
      );
    },
  );

  addMutationOptions(
    run
      .command("invalidate")
      .description("Explicitly invalidate a run")
      .argument("<run-id>", "run ID", parseRunIdArgument)
      .requiredOption("--reason <reason>", "non-empty invalidation reason"),
  ).action(async (runId: RunId, options: RunInvalidateOptions) => {
    await runAction(options.json, () =>
      invalidateResearchRun({ ...options, runId, reason: options.reason }),
    );
  });

  const evidence = research
    .command("evidence")
    .description("Manage research evidence");

  addMutationOptions(
    evidence
      .command("create")
      .description("Create active evidence")
      .requiredOption(
        "--quest <quest-id>",
        "parent quest ID",
        parseQuestIdArgument,
      )
      .requiredOption("--summary <summary>", "evidence summary")
      .option("--run <run-id>", "source run ID", parseRunIdArgument)
      .option("--id <evd-id>", "explicit evidence ID", parseEvidenceIdArgument),
  ).action(async (options: EvidenceCreateOptions) => {
    await runAction(options.json, () =>
      createResearchEvidence({
        ...options,
        id: options.id,
        questId: options.quest,
        runId: options.run,
        summary: options.summary,
      }),
    );
  });

  addMutationOptions(
    evidence
      .command("status")
      .description("Change evidence status")
      .argument("<evidence-id>", "evidence ID", parseEvidenceIdArgument)
      .argument("<status>", "evidence status", parseEvidenceStatusArgument),
  ).action(
    async (
      evidenceId: EvidenceId,
      status: EvidenceStatus,
      options: ResearchMutationOptions,
    ) => {
      await runAction(options.json, () =>
        setResearchEvidenceStatus({ ...options, evidenceId, status }),
      );
    },
  );

  const claim = research.command("claim").description("Manage research claims");

  addMutationOptions(
    claim
      .command("create")
      .description("Create a candidate claim")
      .requiredOption(
        "--quest <quest-id>",
        "parent quest ID",
        parseQuestIdArgument,
      )
      .requiredOption("--statement <statement>", "claim statement")
      .option(
        "--evidence <evidence-id...>",
        "supporting evidence IDs",
        collectEvidenceId,
        [] as EvidenceId[],
      )
      .option("--id <clm-id>", "explicit claim ID", parseClaimIdArgument),
  ).action(async (options: ClaimCreateOptions) => {
    await runAction(options.json, () =>
      createResearchClaim({
        ...options,
        id: options.id,
        questId: options.quest,
        statement: options.statement,
        evidenceIds: options.evidence,
      }),
    );
  });

  addMutationOptions(
    claim
      .command("status")
      .description("Change claim status")
      .argument("<claim-id>", "claim ID", parseClaimIdArgument)
      .argument("<status>", "claim status", parseClaimStatusArgument),
  ).action(
    async (
      claimId: ClaimId,
      status: ClaimStatus,
      options: ResearchMutationOptions,
    ) => {
      await runAction(options.json, () =>
        setResearchClaimStatus({ ...options, claimId, status }),
      );
    },
  );

  const dispatch = research
    .command("dispatch")
    .description("Prepare and review bounded research dispatches");

  addOutputOptions(
    dispatch
      .command("context")
      .description("Validate and emit approved read-only Dispatch context")
      .argument("<dispatch-id>", "dispatch ID", parseDispatchIdArgument)
      .requiredOption(
        "--host <host>",
        "execution host: claude or codex",
        parseResearchHostArgument,
      ),
  ).action(
    async (dispatchId: DispatchId, options: DispatchContextCliOptions) => {
      await runAction(options.json, () =>
        getResearchDispatchContext({
          ...options,
          dispatchId,
        } as GetResearchDispatchContextOptions),
      );
    },
  );

  addMutationOptions(
    dispatch
      .command("prepare")
      .description("Record a portable dispatch request")
      .requiredOption("--run <run-id>", "run ID", parseRunIdArgument)
      .requiredOption("--quest <quest-id>", "quest ID", parseQuestIdArgument)
      .option(
        "--campaign <campaign-id>",
        "campaign ID",
        parseCampaignIdArgument,
      )
      .requiredOption(
        "--repository <repository-id>",
        "target repository ID",
        parseRepositoryIdArgument,
      )
      .requiredOption("--owner-skill <skill>", "owning skill")
      .option("--capability <id>", "explicit Research capability ID")
      .requiredOption("--objective <text>", "bounded objective")
      .option(
        "--acceptance <text>",
        "acceptance criterion (repeatable)",
        collectString,
        [] as string[],
      )
      .option("--context-file <json>", "JSON array of context entries")
      .option(
        "--allow-write <path>",
        "allowed repository-relative write path (repeatable)",
        collectString,
        [] as string[],
      )
      .option(
        "--expected-output <text>",
        "expected output (repeatable)",
        collectString,
        [] as string[],
      )
      .option(
        "--check <text>",
        "check command or criterion (repeatable)",
        collectString,
        [] as string[],
      )
      .option("--provider <provider>", "provider hint")
      .option("--task-ref <ref>", "portable Task reference")
      .option("--id <dsp-id>", "explicit dispatch ID", parseDispatchIdArgument),
  ).action(async (options: DispatchPrepareCliOptions) => {
    await runAction(options.json, () =>
      prepareResearchDispatch({
        ...options,
        id: options.id,
        runId: options.run,
        questId: options.quest,
        campaignId: options.campaign,
        repositoryId: options.repository,
        ownerSkill: options.ownerSkill,
        capabilityId: options.capability ?? "",
        acceptanceCriteria: options.acceptance,
        allowedWritePaths: options.allowWrite,
        expectedOutputs: options.expectedOutput,
        checks: options.check,
      } as PrepareResearchDispatchOptions),
    );
  });

  addMutationOptions(
    dispatch
      .command("plan-activation")
      .description("Plan activation for a historical Dispatch")
      .argument("<dispatch-id>", "dispatch ID", parseDispatchIdArgument)
      .option("--capability <id>", "explicit Research capability ID"),
  ).action(
    async (dispatchId: DispatchId, options: DispatchActivationCliOptions) => {
      await runAction(options.json, () =>
        planResearchActivation({
          ...options,
          dispatchId,
          capabilityId: options.capability ?? "",
        } as PlanResearchActivationOptions),
      );
    },
  );

  addMutationOptions(
    dispatch
      .command("authorize")
      .description("Grant a policy-bounded automatic approval")
      .argument("<dispatch-id>", "dispatch ID", parseDispatchIdArgument)
      .requiredOption("--host <host>", "execution host: claude or codex"),
  ).action(
    async (dispatchId: DispatchId, options: DispatchApprovalCliOptions) => {
      await runAction(options.json, () =>
        authorizeResearchDispatch({
          ...options,
          dispatchId,
        } as GrantResearchApprovalOptions),
      );
    },
  );

  dispatch
    .command("approve")
    .description("Interactively approve one Dispatch for a host")
    .argument("<dispatch-id>", "dispatch ID", parseDispatchIdArgument)
    .requiredOption("--host <host>", "execution host: claude or codex")
    .option("--root <path>", "explicit research control-plane root")
    .option("--idempotency-key <key>", "durable retry key")
    .action(
      async (
        dispatchId: DispatchId,
        options: DispatchInteractiveApprovalCliOptions,
      ) => {
        await runAction(false, () =>
          approveResearchDispatch({
            ...options,
            dispatchId,
          } as GrantResearchApprovalOptions),
        );
      },
    );

  addMutationOptions(
    dispatch
      .command("revoke")
      .description("Revoke one granted Research approval")
      .argument("<approval-id>", "approval ID", parseApprovalIdArgument)
      .option("--reason <text>", "revocation reason"),
  ).action(
    async (approvalId: ApprovalId, options: DispatchRevokeCliOptions) => {
      await runAction(options.json, () =>
        revokeResearchApproval({
          ...options,
          approvalId,
        } as RevokeResearchApprovalOptions),
      );
    },
  );

  addMutationOptions(
    dispatch
      .command("record-result")
      .description("Record one approved worker Result and pending Proposal")
      .argument("<dispatch-id>", "dispatch ID", parseDispatchIdArgument)
      .requiredOption(
        "--approval <apr-id>",
        "approval ID",
        parseApprovalIdArgument,
      )
      .requiredOption("--input <path|->", "result and proposal JSON input"),
  ).action(
    async (dispatchId: DispatchId, options: DispatchRecordResultCliOptions) => {
      const cwd = path.resolve(process.cwd());
      await runAction(options.json, () =>
        recordResearchDispatchResult({
          ...options,
          dispatchId,
          approvalId: options.approval,
          input:
            options.input === "-"
              ? {
                  kind: "stdin",
                  cwd,
                  read: () => fs.readFileSync(0),
                }
              : { kind: "path", cwd, path: options.input },
        } as RecordResearchDispatchResultOptions),
      );
    },
  );

  addMutationOptions(
    dispatch
      .command("apply")
      .description("Apply selected typed Proposal operations")
      .argument("<proposal-id>", "proposal ID", parseProposalIdArgument)
      .option(
        "--operation <index>",
        "zero-based operation index (repeatable; defaults to all)",
        collectOperationIndex,
        [] as number[],
      )
      .requiredOption("--rationale <text>", "review rationale"),
  ).action(
    async (proposalId: ProposalId, options: DispatchReviewCliOptions) => {
      await runAction(options.json, () =>
        applyResearchProposal({
          ...options,
          proposalId,
          operationIndexes:
            options.operation.length === 0 ? undefined : options.operation,
        } as ReviewResearchProposalOptions),
      );
    },
  );

  addMutationOptions(
    dispatch
      .command("reject")
      .description("Reject a pending Proposal without applying operations")
      .argument("<proposal-id>", "proposal ID", parseProposalIdArgument)
      .requiredOption("--rationale <text>", "review rationale"),
  ).action(
    async (proposalId: ProposalId, options: DispatchReviewCliOptions) => {
      await runAction(options.json, () =>
        rejectResearchProposal({
          ...options,
          proposalId,
          operationIndexes: [],
        } as ReviewResearchProposalOptions),
      );
    },
  );
}
