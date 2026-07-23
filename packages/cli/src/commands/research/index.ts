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
  getResearchDispatchContext,
  type GetResearchDispatchContextOptions,
} from "./dispatch-context.js";
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
  CampaignId,
  CampaignStatus,
  ClaimId,
  ClaimStatus,
  EvidenceId,
  DispatchId,
  EvidenceStatus,
  ProposalId,
  QuestId,
  QuestStage,
  QuestStatus,
  RepositoryId,
  RepositoryKind,
  RunId,
  RunStatus,
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
  host?: string;
  skillName: string[];
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
  id?: DispatchId;
}

interface DispatchRecordResultCliOptions extends ResearchMutationOptions {
  file: string;
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

function parseProposalIdArgument(value: string): ProposalId {
  return parseResearchIdArgument<ProposalId>(value, "prp", "proposal ID");
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
    const dispatch = value.dispatch as { id: string };
    const capability = value.capability as {
      stage: string;
      selectedSkill: string;
    };
    const repository = value.repository as { id: string };
    console.log(
      `research dispatch context: ${dispatch.id} host=${String(value.host)} stage=${capability.stage} skill=${capability.selectedSkill} head=${String(value.ledgerHead)} repository=${repository.id}`,
    );
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
      .description("Validate and emit bounded read-only Dispatch context")
      .argument(
        "<request-file>",
        "canonical .trellis/research/dispatches/<dsp-id>/request.json path",
      )
      .option("--host <host>", "execution host: claude or codex (required)")
      .option(
        "--skill-name <name>",
        "discovered canonical skill name (repeatable)",
        collectString,
        [] as string[],
      ),
  ).action(async (requestFile: string, options: DispatchContextCliOptions) => {
    await runAction(options.json, () =>
      getResearchDispatchContext({
        ...options,
        requestFile,
        host: options.host ?? "",
        discoveredSkillNames: options.skillName,
      } as GetResearchDispatchContextOptions),
    );
  });

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
        acceptanceCriteria: options.acceptance,
        allowedWritePaths: options.allowWrite,
        expectedOutputs: options.expectedOutput,
        checks: options.check,
      } as PrepareResearchDispatchOptions),
    );
  });

  addMutationOptions(
    dispatch
      .command("record-result")
      .description("Record one worker Result and pending Proposal")
      .argument("<dispatch-id>", "dispatch ID", parseDispatchIdArgument)
      .requiredOption("--file <json>", "result and proposal JSON file"),
  ).action(
    async (dispatchId: DispatchId, options: DispatchRecordResultCliOptions) => {
      await runAction(options.json, () =>
        recordResearchDispatchResult({
          ...options,
          dispatchId,
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
