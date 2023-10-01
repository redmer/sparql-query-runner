import {
  IJobData,
  IJobPhase,
  IJobSourceData,
  IJobStepData,
  IJobTargetData,
} from "../config/types.js";
import { AutoSource } from "../parts/comunica-auto-datasource.js";
import type { WorkflowPart } from "../runner/types.js";
import { LocalFileSource } from "../sources/file-local.js";
import { ShaclValidateLocal } from "../steps/shacl-validate-local.js";
import { ShellPart } from "../steps/shell.js";
import { SparqlQuadQuery } from "../steps/sparql-construct.js";
import { SparqlUpdate } from "../steps/sparql-update.js";
import { LacesHubTarget } from "../targets/laces-hub.js";
import { LocalFileTarget } from "../targets/local-file.js";
import { SPARQLGraphStoreTarget } from "../targets/sparql-graph-store.js";
import { SPARQLQuadStoreTarget } from "../targets/sparql-quad-store.js";
import { SPARQLTarget } from "../targets/sparql.js";
import { TriplyDBTarget } from "../targets/triplydb.js";

export class ModuleMatcherError extends Error {}
export type RegisteredModule = WorkflowPart<IJobPhase>;

/**
 * These KNOWN_MODULES make pipeline part processing modules available,
 * ordered -- as multiple processors may match.
 */
export const KNOWN_MODULES: RegisteredModule[] = [
  new LocalFileSource(),
  new AutoSource(),
  new ShaclValidateLocal(),
  new SparqlQuadQuery(),
  new SparqlUpdate(),
  new ShellPart(),
  new SPARQLTarget(),
  new LacesHubTarget(),
  new TriplyDBTarget(),
  new LocalFileTarget(),
  new SPARQLGraphStoreTarget(),
  new SPARQLQuadStoreTarget(),
];

export type IExecutableModuleCtx<P extends IJobPhase> = {
  module: WorkflowPart<P>;
  data: P extends "sources"
    ? IJobSourceData
    : P extends "steps"
    ? IJobStepData
    : P extends "targets"
    ? IJobTargetData
    : never;
};

export type IExecutableJob = {
  sources: IExecutableModuleCtx<"sources">[];
  steps: IExecutableModuleCtx<"steps">[];
  targets: IExecutableModuleCtx<"targets">[];
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
        .filter((m) => (m.qualifies && m.qualifies(stepData, phase)) || !m.qualifies);

      if (qModules.length == 0)
        throw new ModuleMatcherError(
          `No matching modules for '${stepData.type}':'${stepData.access}')`
        );

      // Note that multiple modules may qualify: we take the first, so the MODULES order is significant
      result[phase].push({
        module: qModules[0],
        // @ts-ignore-next: This type can't be deduced, therefore ignore
        data: stepData,
      });
    }
  }
  return result;
}
