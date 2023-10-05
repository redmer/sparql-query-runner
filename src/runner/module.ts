import {
  IJobData,
  IJobPhase,
  IJobSourceData,
  IJobStepData,
  IJobTargetData,
} from "../config/types.js";
import { AskAssertStep } from "../parts/ask-assert.js";
import { ComunicaAutoSource } from "../parts/comunica-auto-source.js";
import { LocalFileSource, LocalFileTarget } from "../parts/file-local.js";
import { InferReason } from "../parts/infer-reason.js";
import { LacesHubSource, LacesHubTarget } from "../parts/laces-hub.js";
import { ShaclValidateLocal } from "../parts/shacl-validate-local.js";
import { ShellCommandStep } from "../parts/shell.js";
import { SparqlConstructQuery } from "../parts/sparql-construct-query.js";
import { GraphStoreTarget } from "../parts/sparql-graph-store.js";
import { QuadStoreTarget } from "../parts/sparql-quad-store.js";
import { SparqlUpdateEndpointTarget } from "../parts/sparql-update-endpoint.js";
import { SparqlUpdateQuery } from "../parts/sparql-update-query.js";
import { TriplyDBSource, TriplyDBTarget } from "../parts/triplydb.js";
import type { WorkflowPartSource, WorkflowPartStep, WorkflowPartTarget } from "../runner/types.js";

export class ModuleMatcherError extends Error {}
export type RegisteredModule = WorkflowPartSource | WorkflowPartStep | WorkflowPartTarget;

/**
 * These KNOWN_MODULES make pipeline part processing modules available,
 * ordered -- as multiple processors may match.
 */
export const KNOWN_MODULES: RegisteredModule[] = [
  new LocalFileSource(),
  new ShaclValidateLocal(),
  new SparqlConstructQuery(),
  new SparqlUpdateQuery(),
  new AskAssertStep(),
  new InferReason(),
  new ShellCommandStep(),
  new SparqlUpdateEndpointTarget(),
  new LocalFileTarget(),
  new LacesHubSource(),
  new LacesHubTarget(),
  new TriplyDBSource(),
  new TriplyDBTarget(),
  new ComunicaAutoSource(),
  new GraphStoreTarget(),
  new QuadStoreTarget(),
];

/** Struct that will enable execution of the workflow. */
export type IExecutableJob = {
  sources: {
    module: WorkflowPartSource;
    data: IJobSourceData;
  }[];
  steps: {
    module: WorkflowPartStep;
    data: IJobStepData;
  }[];
  targets: {
    module: WorkflowPartTarget;
    data: IJobTargetData;
  }[];
};

export async function match(data: IJobData): Promise<IExecutableJob> {
  return await matchModules(data, KNOWN_MODULES);
}

/** Match modules for pipeline declaration data with a certain module configuration */
async function matchModules(data: IJobData, modules: RegisteredModule[]): Promise<IExecutableJob> {
  const result: IExecutableJob = {
    sources: [],
    steps: [],
    targets: [],
  };

  const phases: IJobPhase[] = ["sources", "steps", "targets"];

  for (const phase of phases) {
    for (const stepData of data[phase] ?? []) {
      const qModules = modules
        .filter((m) => m.names.includes(stepData.type))
        .filter((m) => (m.isQualified && m.isQualified(stepData)) || !m.isQualified);

      if (qModules.length == 0)
        throw new ModuleMatcherError(
          `No matching modules for '${stepData.type}':'${stepData.access}')`
        );

      // Note that multiple modules may qualify: we take the first, so the MODULES order is significant
      // @ts-ignore-next: Modules are incompatible, but we're sure to put them in the right basket
      result[phase].push({ module: qModules[0], data: stepData });
    }
  }
  return result;
}
