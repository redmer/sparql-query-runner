import type {
  IConstructStep,
  IEndpoint,
  IPipeline,
  ISource,
  ITarget,
  IUpdateStep,
  IValidateStep,
} from "../config/types";

import { SparqlEndpoint } from "../endpoints/sparql.js";
import { LacesHubTarget } from "../targets/laces-hub.js";
import { LocalFileTarget } from "../targets/local-file.js";
import { SPARQLGraphStoreTarget } from "../targets/sparql-graph-store.js";
import { SPARQLQuadStoreTarget } from "../targets/sparql-quad-store.js";
import { SPARQLTarget } from "../targets/sparql.js";

import type { PipelinePart, PipelinePartGetter } from "../runner/types.js";

import { AutoSource } from "../sources/auto.js";
import { LocalFileSource } from "../sources/localfile.js";
import { MsAccessSource } from "../sources/msaccess.js";

import ShaclValidateLocal from "../steps/shacl-validate-local.js";
import SparqlConstructQuery from "../steps/sparql-construct.js";
import SparqlUpdate from "../steps/sparql-update.js";

import { KeysOfUnion } from "../utils/types";

/** A matched module. Pipeline key, module name, module info getter. */
export type MatchResult = [KeysOfUnion<IPipeline>, string, PipelinePartGetter];

type IPipelineKeys = KeysOfUnion<IPipeline>;

export class ModuleMatcherError extends Error {}

export async function* matchPipelineParts(data: IPipeline): AsyncGenerator<MatchResult> {
  const ALL_MODULES: Record<
    IPipelineKeys,
    | PipelinePart<IEndpoint>[]
    | PipelinePart<ITarget>[]
    | PipelinePart<ISource>[]
    | PipelinePart<IValidateStep | IUpdateStep | IConstructStep>[]
  > = {
    endpoint: [new SparqlEndpoint()],
    targets: [
      new LacesHubTarget(),
      new LocalFileTarget(),
      new SPARQLGraphStoreTarget(),
      new SPARQLQuadStoreTarget(),
      new SPARQLTarget(),
    ],
    sources: [new AutoSource(), new LocalFileSource(), new MsAccessSource()],
    steps: [new ShaclValidateLocal(), new SparqlUpdate(), new SparqlConstructQuery()],
    // No processing module required...
    independent: undefined,
    name: undefined,
    prefixes: undefined,
    type: undefined,
  };

  const orderedKeys: IPipelineKeys[] = ["sources", "endpoint", "steps", "targets"];

  for (const workflowPart of orderedKeys) {
    // First sources, then endpoint, then steps, etc.
    const modulesForKey: PipelinePart<unknown>[] = ALL_MODULES[workflowPart];
    if (!Array.isArray(modulesForKey)) continue;

    const pipelineDataForKey = data[workflowPart];
    if (!pipelineDataForKey) continue;

    for (const [i, stepData] of Object.entries(pipelineDataForKey)) {
      const qualifyingModule = modulesForKey.find((module: PipelinePart<unknown>) =>
        module.qualifies(stepData)
      );

      if (!qualifyingModule)
        throw new ModuleMatcherError(
          `No appropriate module for /${workflowPart}[${i + 1}]: (${JSON.stringify(stepData)})`
        );

      yield [workflowPart, qualifyingModule.name(), await qualifyingModule.info(stepData)];
    }
  }
}
