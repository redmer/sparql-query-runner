import { PickProperties } from "ts-essentials";
import type { IDest, IPipeline, IQueryStep, ISource, IUpdateStep } from "../config/types";

import { LacesDestination } from "../destinations/laces.js";
import { LocalFileDestination } from "../destinations/local-file.js";
import { SPARQLGraphStore } from "../destinations/sparql-graph-store.js";
import { SPARQLQuadStore } from "../destinations/sparql-quad-store.js";
import { SPARQLDestination } from "../destinations/sparql.js";

import type { PipelinePart, PipelinePartGetter } from "../runner/types.js";

import { AutoSource } from "../sources/auto.js";
import { LocalFileSource } from "../sources/local-file.js";
import { MsAccessSource } from "../sources/msaccess.js";

import ShaclValidateLocal from "../steps/shacl-validate-local.js";
import SparqlConstructQuery from "../steps/sparql-query.js";
import SparqlUpdate from "../steps/sparql-update.js";

import * as Report from "../utils/report.js";

/** A matched module. Pipeline key, module name, module info getter. */
export type MatchResult = [keyof IPipeline, string, PipelinePartGetter];

type IPipelineKeys = keyof IPipeline;
type IPipelineArrayValues = PickProperties<Required<IPipeline>, Array<unknown>>;

export async function* matchPipelineParts(data: IPipeline): AsyncGenerator<MatchResult> {
  const modules: Record<IPipelineKeys, PipelinePart<IDest | ISource | IUpdateStep | IQueryStep>[]> =
    {
      destinations: [
        new LacesDestination(),
        new LocalFileDestination(),
        new SPARQLGraphStore(),
        new SPARQLQuadStore(),
        new SPARQLDestination(),
      ],
      sources: [new AutoSource(), new LocalFileSource(), new MsAccessSource()],
      updates: [new ShaclValidateLocal(), new SparqlUpdate()],
      queries: [new ShaclValidateLocal(), new SparqlConstructQuery()],
      // No processing module required...
      independent: [],
      name: [],
      prefixes: [],
      engine: [],
      rules: [], // not executed for now ...
    };

  const orderedKeys: (keyof IPipelineArrayValues)[] = [
    "sources",
    "updates",
    "queries",
    "destinations",
  ];

  for (const key of orderedKeys) {
    const possiblePartModulesForType = modules[key];
    if (!possiblePartModulesForType) continue;

    const moduleData = data[key];
    if (!moduleData) continue;
    if (!Array.isArray(moduleData)) continue;

    for (const [i, stepData] of Object.entries(moduleData)) {
      const step = possiblePartModulesForType.find((module) => module.qualifies(stepData));
      if (!step) {
        Report.error(`No appropriate module for /${key}[${i}]: (${JSON.stringify(stepData)})`);
      }
      yield [key, step.name(), await step.info(stepData)];
    }
  }
}
