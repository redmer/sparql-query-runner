/* eslint-disable @typescript-eslint/no-explicit-any */
import * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import { DataFactory } from "rdf-data-factory";
import yaml from "yaml";
import { ge1 } from "../utils/array.js";
import { substituteVars } from "../utils/compile-envvars.js";
import { context } from "./rdfa11-context.js";
import { PartShorthandSource, PartShorthandStep, PartShorthandTarget } from "./schema-types.js";
import {
  IAuthBasicData,
  IAuthBearerData,
  IAuthHeaderData,
  IJobModuleData,
  IJobPhase,
  Prefixes,
  type ICredentialData,
  type IJobData,
  type IJobSourceData,
  type IJobSourceKnownTypes,
  type IJobStepData,
  type IJobStepKnownTypes,
  type IJobTargetData,
  type IJobTargetKnownTypes,
  type IWorkflowData,
} from "./types.js";

export const CONFIG_EXT = "sqr.yaml";
export const CONFIG_FILENAME_YAML = `workflow.${CONFIG_EXT}`;

export class ConfigurationError extends Error {}

/** Get a configuration from a valid pipeline declaration file in JSON or YAML */
export async function configFromPath(
  path: string,
  { secrets, defaultPrefixes }
): Promise<IWorkflowData> {
  const rawContents = await fs.readFile(path, { encoding: "utf-8" });
  return await configFromString(rawContents, { secrets, defaultPrefixes });
}

/** Get a configuration from a valid pipeline declaration in JSON or YAML */
export async function configFromString(
  contents: string,
  { secrets, defaultPrefixes }: { secrets: Record<string, string>; defaultPrefixes: boolean }
): Promise<IWorkflowData> {
  const substitutedContents = substituteVars(contents, secrets);
  const config = yaml.parse(substitutedContents, {
    strict: true,
    version: "1.2",
    mapAsMap: true,
  });
  return validateConfiguration(config, defaultPrefixes);
}

/** Validate a configuratioun file */
function validateConfiguration(
  data: Map<keyof IWorkflowData, any>,
  defaultPrefixes: boolean
): IWorkflowData {
  const version = data.get("version");

  if (!version || !version?.startsWith("v5"))
    throw new ConfigurationError("Configuration file version 'v5' required");

  // Default prefixes are set here, config-level are copied here, so that jobs may get a copy, too
  const prefixes = Object.assign(
    defaultPrefixes ? context : {},
    data.has("prefixes") ? Object.fromEntries(data.get("prefixes").entries()) : {}
  );

  // validate the jobs individually
  if (!data.has("jobs")) throw new ConfigurationError(`Jobs are not correctly defined`);
  const jobs: IJobData[] = [];
  for (const [name, job] of (data.get("jobs") as Map<keyof IJobData, any>).entries())
    jobs.push(validateJob(name, job, prefixes));

  // return the original data, but override version, prefixes, jobs

  return { ...Object.fromEntries(data.entries()), version, prefixes, jobs };
}

/** Normalize an IJob, copying configuration-level prefixes. */
function validateJob(
  name: string,
  data: Map<keyof IJobData, any>,
  workflowPrefixes: Prefixes
): IJobData {
  const independent = data.get("independent") ?? false;
  const prefixes = Object.assign(
    workflowPrefixes,
    data.has("prefixes") ? Object.fromEntries(data.get("prefixes").entries) : {}
  );
  const sources = data.get("sources")?.map((data) => validateModule("sources", data, prefixes));
  const steps = data.get("steps")?.map((data) => validateModule("steps", data, prefixes));
  const targets = data.get("targets")?.map((data) => validateModule("targets", data, prefixes));

  return {
    ...Object.fromEntries(data.entries()),
    name,
    independent,
    prefixes,
    sources,
    steps,
    targets,
  };
}

/** Find keys that are well-known access types (sparql:, file:, etc.) */
function knownTypeKeys(
  shortHandTypes:
    | typeof PartShorthandSource
    | typeof PartShorthandStep
    | typeof PartShorthandTarget,
  data: Map<any, any>
) {
  return [...data.keys()].filter((k: never) => shortHandTypes.includes(k));
}

function validateModule(
  phase: IJobPhase,
  data: Map<keyof IJobSourceData | IJobStepData | IJobTargetData, any>,
  prefixes: Prefixes
): IJobModuleData {
  let knownType: string | any[];
  if (phase == "sources")
    knownType = knownTypeKeys(PartShorthandSource, data) as IJobSourceKnownTypes[];
  if (phase == "steps") knownType = knownTypeKeys(PartShorthandStep, data) as IJobStepKnownTypes[];
  if (phase == "targets")
    knownType = knownTypeKeys(PartShorthandTarget, data) as IJobTargetKnownTypes[];

  if (knownType.length != 1 && !data.has("type"))
    throw new ConfigurationError(
      `${phase}: could not infer type from '${[...data.keys()].join(
        ", "
      )}'. Check or provide explicit 'type' key.`
    );

  return {
    ...Object.fromEntries(data.entries()),
    type: data.get("type") ?? `${phase}/${knownType[0]}`,
    access: data.get("access") ?? data.get(knownType[0]),
    with: {
      ...Object.fromEntries(data.get("with")?.entries() ?? []),
      credentials: validateAuthentication(data.get("with")?.get("credentials")),
      onlyGraphs: ge1(data.get("with")?.get("only-graphs"))
        ?.map((g) => expandCURIE(g, prefixes))
        ?.map((g) => stringToGraph(g)),
      intoGraph: ge1(data.get("with")?.get("into-graph"))
        ?.map((g) => expandCURIE(g, prefixes))
        ?.map((g) => stringToGraph(g))?.[0],
    },
    prefixes: prefixes,
  };
}

function validateAuthentication(data: undefined): undefined;
function validateAuthentication(
  data: Map<keyof (IAuthBasicData & IAuthBearerData & IAuthHeaderData), any>
): ICredentialData;
function validateAuthentication(
  data: Map<keyof (IAuthBasicData & IAuthBearerData & IAuthHeaderData), any> | undefined
): ICredentialData | undefined {
  if (data === undefined) return undefined;

  const password = data.get("password");
  const username = data.get("username");
  const token = data.get("token");
  const headers = data.get("headers");

  if (password && username) return { type: "Basic", password, username };
  if (token) return { type: "Bearer", token };
  if (headers) return { type: "HTTP-Header", headers };

  // Credential type not recognized. For a useful error, some context but no full
  // passwords should be given.
  const value = JSON.stringify(headers ?? token ?? username ?? data);
  const len = Math.min(Math.ceil(value.length / 5), 5);

  throw new ConfigurationError(
    `The authentication type was not recognized. 
    Verify authentication details (${value.slice(0, len)}...${value.slice(-len)})`
  );
}

/** Try to expand a CURIE; returns the original string if prefix is unknown */
export function expandCURIE(uriOrCurie: string, prefixes: Prefixes): string {
  for (const prefix of Object.keys(prefixes))
    if (uriOrCurie.startsWith(prefix + ":"))
      return prefixes[prefix] + uriOrCurie.slice((prefix + ":").length);

  return uriOrCurie;
}

function stringToGraph(graphName: string): RDF.Quad_Graph {
  const df = new DataFactory();
  if (graphName === "") return df.defaultGraph();
  else return df.namedNode(graphName);
}
