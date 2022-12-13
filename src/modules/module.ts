import type {
  IConstructStep,
  IDest,
  IEndpoint,
  IPipeline,
  ISource,
  IUpdateStep,
  IValidateStep,
} from "../config/types";

import { LacesHubDestination } from "../destinations/laces-hub.js";
import { LocalFileDestination } from "../destinations/local-file.js";
import { SPARQLGraphStore } from "../destinations/sparql-graph-store.js";
import { SPARQLQuadStore } from "../destinations/sparql-quad-store.js";
import { SPARQLDestination } from "../destinations/sparql.js";
import { SparqlEndpoint } from "../endpoints/sparql.js";

import type { PipelinePart, PipelinePartGetter } from "../runner/types.js";

import { AutoSource } from "../sources/auto.js";
import { LocalFileSource } from "../sources/local-file.js";
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
    | PipelinePart<IDest>[]
    | PipelinePart<ISource>[]
    | PipelinePart<IValidateStep | IUpdateStep | IConstructStep>[]
  > = {
    endpoint: [new SparqlEndpoint()],
    destinations: [
      new LacesHubDestination(),
      new LocalFileDestination(),
      new SPARQLGraphStore(),
      new SPARQLQuadStore(),
      new SPARQLDestination(),
    ],
    sources: [new AutoSource(), new LocalFileSource(), new MsAccessSource()],
    steps: [new ShaclValidateLocal(), new SparqlUpdate(), new SparqlConstructQuery()],
    // No processing module required...
    independent: undefined,
    name: undefined,
    prefixes: undefined,
    type: undefined,
  };

  const orderedKeys: IPipelineKeys[] = ["sources", "endpoint", "steps", "destinations"];

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
          `No appropriate module for /${workflowPart}[${i}]: (${JSON.stringify(stepData)})`
        );

      yield [workflowPart, qualifyingModule.name(), await qualifyingModule.info(stepData)];
    }
  }
}
