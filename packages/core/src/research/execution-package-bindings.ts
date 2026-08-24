import type {
  ExecutionPackageActivation,
  ExecutionPackageApprovalGrant,
  LegacyProcedureActivation,
  LegacyProcedureApprovalGrant,
  ResearchActivation,
  ResearchApprovalGrant,
} from "./types.js";

export function isExecutionPackageActivation(
  activation: ResearchActivation,
): activation is ExecutionPackageActivation {
  return "executionPackage" in activation;
}

export function isExecutionPackageApprovalGrant(
  grant: ResearchApprovalGrant,
): grant is ExecutionPackageApprovalGrant {
  return "executionPackageDigest" in grant;
}

export function getResearchActivationPackageDigest(
  activation: ResearchActivation,
): string {
  return isExecutionPackageActivation(activation)
    ? activation.executionPackage.packageDigest
    : activation.procedure.digest;
}

export function getResearchApprovalPackageDigest(
  grant: ResearchApprovalGrant,
): string {
  return isExecutionPackageApprovalGrant(grant)
    ? grant.executionPackageDigest
    : grant.procedureDigest;
}

export function cloneResearchActivation(
  activation: ResearchActivation,
): ResearchActivation {
  if (isExecutionPackageActivation(activation)) {
    const managedExecution = Object.freeze({
      ...activation.managedExecution,
      requestedMemberPaths: Object.freeze([
        ...activation.managedExecution.requestedMemberPaths,
      ]),
      ...(activation.managedExecution.workflow === undefined
        ? {}
        : {
            workflow: Object.freeze({
              ...activation.managedExecution.workflow,
            }),
          }),
    });
    return {
      ...activation,
      executionPackage: Object.freeze({ ...activation.executionPackage }),
      managedExecution,
    } satisfies ExecutionPackageActivation;
  }
  return {
    ...activation,
    procedure: { ...activation.procedure },
  } satisfies LegacyProcedureActivation;
}

export function cloneResearchApprovalGrant(
  grant: ResearchApprovalGrant,
): ResearchApprovalGrant {
  if (isExecutionPackageApprovalGrant(grant)) {
    return { ...grant } satisfies ExecutionPackageApprovalGrant;
  }
  return { ...grant } satisfies LegacyProcedureApprovalGrant;
}
