import { PickProperties } from "ts-essentials";
import type { IPipeline } from "../config/types";
import LacesDestination from "../destinations/laces.js";
import { LocalFileDestination, SPARQLQuadStore } from "../destinations/local-file.js";
import { SPARQLDestination } from "../destinations/sparql.js";
import { PipelinePart, PipelinePartGetter } from "../runner/types.js";
import { MsAccessSource } from "../sources/msaccess.js";
import { CustomFileSource, RemoteBasicFileSource } from "../sources/local-file.js";
import ShaclValidateLocal from "../steps/shacl-validate-local.js";
import SparqlConstructQuery from "../steps/sparql-query.js";
import SparqlUpdate from "../steps/sparql-update.js";
import * as Report from "../utils/report.js";

export type MatchResult = [keyof IPipeline, string, PipelinePartGetter];

type IPipelineKeys = keyof IPipeline;
type IPipelineArrayValues = PickProperties<Required<IPipeline>, Array<any>>;
type IPipelineArrayValueKeys = keyof IPipelineArrayValues;

export async function* matchPipelineParts(data: IPipeline): AsyncGenerator<MatchResult> {
  const modules: Record<IPipelineKeys, PipelinePart<any>[]> = {
    destinations: [
      new LocalFileDestination(),
      new LacesDestination(),
      new SPARQLDestination(),
      new SPARQLQuadStore(),
    ],
    sources: [new MsAccessSource(), new RemoteBasicFileSource(), new CustomFileSource()],
    steps: [new ShaclValidateLocal(), new SparqlConstructQuery(), new SparqlUpdate()],
    // No processing module required...
    independent: [],
    name: [],
    prefixes: [],
  };

  const orderedKeys: (keyof IPipelineArrayValues)[] = [
    "endpoint",
    "sources",
    "steps",
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
        Report.print(
          "error",
          `No appropriate module for /${key}[${i}]: (${JSON.stringify(stepData)})`
        );
      }
      yield [key, step.name(), await step.info(stepData)];
    }
  }

  // // @ts-ignore
  // for (const [partType, value] of Object.entries<IPipeline[keyof IPipeline]>(data)) {
  //   const possiblePartModulesForType = modules[partType];
  //   if (!possiblePartModulesForType) continue;
  //   if (!Array.isArray(value)) continue;

  //   for (const [i, stepData] of Object.entries(value)) {
  //     const step = possiblePartModulesForType.find((module) => module.match(stepData));
  //     if (!step) {
  //       Report.print(
  //         "error",
  //         `No appropriate module for /${partType}[${i}]: (${JSON.stringify(stepData)})`
  //       );
  //     }
  //     yield [partType as keyof IPipeline, step.name(), await step.info(stepData)];
  //   }
  // }
}
