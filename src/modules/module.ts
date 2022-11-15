import type { IDestination, IEndpoint, ISource, IStep } from "../config/types";
import LocalFileDestination from "../destinations/file.js";
import LacesDestination from "../destinations/laces.js";
import { SPARQLEndpoint } from "../endpoints/sparql.js";
import { PipelinePart, PipelinePartGetter } from "../runner/types.js";
import { MsAccessSource } from "../sources/msaccess.js";
import { CustomFileSource, RemoteBasicFileSource } from "../sources/rdf.js";
import ShaclValidateLocal from "../steps/shacl-validate-local.js";
import SparqlConstructQuery from "../steps/sparql-query.js";
import SparqlUpdate from "../steps/sparql-update.js";

export type MatchResult = [string, PipelinePartGetter];

export async function getPipelinePart<T extends IStep | ISource | IDestination | IEndpoint>(
  data: T
): Promise<MatchResult>;
export async function getPipelinePart<T extends IStep>(data: T): Promise<MatchResult>;
export async function getPipelinePart<T extends ISource>(data: T): Promise<MatchResult>;
export async function getPipelinePart<T extends IDestination>(data: T): Promise<MatchResult>;
export async function getPipelinePart<T extends IEndpoint>(data: T): Promise<MatchResult>;
export async function getPipelinePart(data: any): Promise<MatchResult> {
  const modules: PipelinePart<any>[] = [
    new SPARQLEndpoint(),
    new LocalFileDestination(),
    new LacesDestination(),
    new MsAccessSource(),
    new RemoteBasicFileSource(),
    new CustomFileSource(),
    new ShaclValidateLocal(),
    new SparqlUpdate(),
    new SparqlConstructQuery(),
  ];
  const step = modules.find((module) => module.match(data));
  if (!step) {
    throw new Error(`No appropriate module found for: ${JSON.stringify(data)}`);
  }
  return [step.name(), await step?.info(data)];
}
