import {
  IJobData,
  IJobModuleData,
  IJobSourceData,
  IJobStepData,
  IJobTargetData,
} from "../config/types.js";
import type { WorkflowPart } from "../runner/types.js";
import { AutoSource } from "../sources/comunica-auto.js";
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
import { ArrayElement } from "../utils/types.js";

export class ModuleMatcherError extends Error {}

/** The executable parts of a IJobData */
type IJobDataExecutable = Omit<IJobData, "name" | "independent" | "prefixes">;

export type JobModules = {
  [key in keyof IJobDataExecutable]: WorkflowPart<ArrayElement<IJobDataExecutable[key]>>[];
};

/**
 * These KNOWN_MODULES make pipeline part processing modules available,
 * ordered -- as multiple processors may match.
 */
export const KNOWN_CONSTRUCT_MODULES: JobModules = {
  sources: [new LocalFileSource(), new AutoSource()],
  steps: [new ShaclValidateLocal(), new SparqlQuadQuery(), new SparqlUpdate(), new ShellPart()],
  targets: [
    new SPARQLTarget(),
    new LacesHubTarget(),
    new TriplyDBTarget(),
    new LocalFileTarget(),
    new SPARQLGraphStoreTarget(),
    new SPARQLQuadStoreTarget(),
  ],
};

export type IExecutableModuleCtx<T extends IJobModuleData = IJobModuleData> = {
  module: WorkflowPart<T>;
  data: T;
};

export type IExecutableJob = {
  sources: IExecutableModuleCtx<IJobSourceData>[];
  steps: IExecutableModuleCtx<IJobStepData>[];
  targets: IExecutableModuleCtx<IJobTargetData>[];
};

export async function match(data: IJobData): Promise<IExecutableJob> {
  return await matchModules(data, KNOWN_CONSTRUCT_MODULES);
}

/** Match modules for pipeline declaration data with a certain module configuration */
async function matchModules(data: IJobData, MODULES: JobModules): Promise<IExecutableJob> {
  const result: IExecutableJob = {
    sources: [],
    steps: [],
    targets: [],
  };

  const parts: (keyof IJobDataExecutable)[] = ["sources", "steps", "targets"];
  for (const part of parts) {
    const modules = MODULES[part];
    // @ts-expect-error
    result[part] = result[part] ?? []; // Create part or get present parts

    for (const stepData of data[part]) {
      // Recast for typing
      const qModules = modules.filter(
        // @ts-expect-error: the `type:` field cannot be combined across modules
        (m) => (m.isQualified && m.isQualified(stepData)) || m.id() === stepData.type
      );
      // @xts-expect-error
      // .filter((m) => (m.isQualified && m.isQualified(stepData)) || true);

      if (qModules.length == 0)
        throw new ModuleMatcherError(
          `No matching modules '${stepData.type}' (${JSON.stringify(stepData)})`
        );
      // Note that multiple modules may qualify: we take the first, so the MODULES order is significant

      result[part].push({
        // @ts-expect-error: Would need to seperate-out the different module types.
        module: qModules[0],
        // @ts-expect-error: Would need to seperate-out the different module types.
        data: stepData,
      });
    }
  }
  return result;
}
