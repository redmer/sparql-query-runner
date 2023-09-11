import { SparqlEndpoint } from "../endpoints/sparql.js";
import { LacesHubTarget } from "../targets/laces-hub.js";
import { LocalFileTarget } from "../targets/local-file.js";
import { SPARQLGraphStoreTarget } from "../targets/sparql-graph-store.js";
import { SPARQLQuadStoreTarget } from "../targets/sparql-quad-store.js";
import { SPARQLTarget } from "../targets/sparql.js";

import { AutoSource } from "../sources/auto.js";
import { LocalFileSource } from "../sources/file-local.js";
import { MsAccessSource } from "../sources/msaccess.js";

import ShaclValidateLocal from "../steps/shacl-validate-local.js";
import SparqlConstructQuery from "../steps/sparql-construct.js";
import SparqlUpdate from "../steps/sparql-update.js";

export class ModuleMatcherError extends Error {}

/** These KNOWN_MODULES make pipeline part processing modules available, ordered -- as multiple processors may match. */
export const KNOWN_CONSTRUCT_MODULES: Record<
  IConstructPipelineKeys,
  (typeof WorkflowModule<unknown>)[]
> = {
  sources: [AutoSource, LocalFileSource, MsAccessSource],
  steps: [ShaclValidateLocal, SparqlConstructQuery],
  targets: [
    LacesHubTarget,
    LocalFileTarget,
    SPARQLGraphStoreTarget,
    SPARQLQuadStoreTarget,
    SPARQLTarget,
  ],
};

export const KNOWN_UPDATE_MODULES: Record<IUpdatePipelineKeys, (typeof WorkflowModule<unknown>)[]> =
  {
    endpoint: [SparqlEndpoint],
    steps: [SparqlUpdate],
  };

export type ExecutablePipeline = {
  [key in keyof IConstructPipeline | keyof IUpdatePipeline]?: [
    string,
    IWorkflowModuleQueryDelegate<unknown>
  ][];
};

export async function match(
  data: IConstructPipeline | IUpdatePipeline
): Promise<ExecutablePipeline> {
  if (data.type == "direct-update") return await matchModules(data, KNOWN_UPDATE_MODULES);
  return await matchModules(data, KNOWN_CONSTRUCT_MODULES);
}

/** Match modules for pipeline declaration data with a certain module configuration */
async function matchModules(
  data: IPipeline,
  MODULES:
    | Record<IConstructPipelineKeys, (typeof WorkflowModule<unknown>)[]>
    | Record<IUpdatePipelineKeys, (typeof WorkflowModule<unknown>)[]>
): Promise<ExecutablePipeline> {
  const result: ExecutablePipeline = {};

  for (const [part, modules] of Object.entries(MODULES)) {
    result[part] = result[part] ?? [];

    for (const stepData of data[part]) {
      // The qualifier
      const qModules = modules.filter((m) => m.qualifies(stepData));
      if (qModules.length == 0)
        throw new ModuleMatcherError(`No matching modules //${part} (${JSON.stringify(stepData)})`);
      // Note that multiple modules may qualify: we take the first, so the MODULES order is significant

      result[part].push([qModules[0].name(), new qModules[0](stepData)]);
    }
  }
  return result;
}
