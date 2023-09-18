/* eslint-disable @typescript-eslint/no-explicit-any */
import * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import { DataFactory } from "rdf-data-factory";
import yaml from "yaml";
import { ge1 } from "../utils/array.js";
import { substitute } from "../utils/compile-envvars.js";
import { context } from "./rdfa11-context.js";
import { JobSourceTypes, JobStepTypes, JobTargetTypes } from "./schema-types.js";
import {
  IAuthBasicData,
  IAuthBearerData,
  IAuthHeaderData,
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

export const CONFIG_FILENAME_YAML = "workflow.sqr.yaml";

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
  const substitutedContents = substitute(contents, secrets);
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
  const jobs = new Map();
  for (const [name, job] of (data.get("jobs") as Map<keyof IJobData, any>).entries())
    jobs.set(name, validateJob(name, job, prefixes));

  // return the original data, but override version, prefixes, jobs

  return { ...Object.fromEntries(data.entries()), version, prefixes, jobs };
}

/** Normalize an IJob, copying configuration-level prefixes. */
function validateJob(
  name: string,
  data: Map<keyof IJobData, any>,
  workflowPrefixes: Record<string, string>
): IJobData {
  const independent = data.get("independent") ?? false;
  const prefixes = Object.assign(
    workflowPrefixes,
    data.has("prefixes") ? Object.fromEntries(data.get("prefixes").entries) : {}
  );
  const sources = data.get("sources")?.map((data) => validateSource(data, prefixes));
  const steps = data.get("steps")?.map((data) => validateStep(data, prefixes));
  const targets = data.get("targets")?.map((data) => validateTarget(data, prefixes));

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
  shortHandTypes: typeof JobSourceTypes | typeof JobStepTypes | typeof JobTargetTypes,
  data: Map<any, any>
) {
  return [...data.keys()].filter((k: never) => shortHandTypes.includes(k));
}

/** Validate the known values of a source, returning the full object */
function validateSource(
  data: Map<keyof IJobSourceData, any>,
  prefixes: Record<string, string>
): IJobSourceData {
  const knownType = knownTypeKeys(JobSourceTypes, data) as IJobSourceKnownTypes[];
  if (knownType.length != 1 && !data.has("type"))
    throw new ConfigurationError(
      `No single type for source (${JSON.stringify(data)}) found: ${JSON.stringify(knownType)}`
    );

  return {
    ...Object.fromEntries(data.entries()),
    type: data.get("type") ?? `sources/${knownType[0]}`,
    access: data.get("access") ?? data.get(knownType[0]),
    with: {
      ...Object.fromEntries(data.get("with")?.entries() ?? []),
      credentials: validateAuthentication(data.get("with")?.get("credentials")),
      onlyGraphs: ge1(data.get("with")?.get("only-graphs"))
        ?.map((g) => expandCURIE(g, prefixes))
        ?.map((g) => stringToGraph(g)),
      targetGraph: ge1(data.get("with")?.get("target-graph"))
        ?.map((g) => expandCURIE(g, prefixes))
        ?.map((g) => stringToGraph(g))[0],
    },
  };
}

/** Validate the known values of a step, returning the full object */
function validateStep(
  data: Map<keyof IJobStepData, any>,
  prefixes: Record<string, string>
): IJobStepData {
  const knownType = knownTypeKeys(JobStepTypes, data) as IJobStepKnownTypes[];
  if (knownType.length != 1 && !data.has("type"))
    throw new ConfigurationError(
      `No single type for step (${JSON.stringify(data)}) found: ${JSON.stringify(knownType)}`
    );

  return {
    ...Object.fromEntries(data.entries()),
    type: data.get("type") ?? `steps/${knownType[0]}`,
    access: data.get("access") ?? data.get(knownType[0]),
    with: {
      ...Object.fromEntries(data.get("with")?.entries() ?? []),
      targetGraph: ge1(data.get("with")?.get("target-graph"))
        ?.map((g) => expandCURIE(g, prefixes))
        ?.map((g) => stringToGraph(g))[0],
    },
  };
}

/** Check the known values of a target, returning the full object */
function validateTarget(
  data: Map<keyof IJobTargetData, any>,
  prefixes: Record<string, string>
): IJobTargetData {
  const knownType = knownTypeKeys(JobTargetTypes, data) as IJobTargetKnownTypes[];
  if (knownType.length != 1 && !data.has("type"))
    throw new ConfigurationError(
      `No single type for target (${JSON.stringify(data)}) found: ${JSON.stringify(knownType)}`
    );

  return {
    ...Object.fromEntries(data.entries()),
    type: data.get("type") ?? `targets/${knownType[0]}`,
    access: data.get("access") ?? data.get(knownType[0]),
    with: {
      ...Object.fromEntries(data.get("with")?.entries() ?? []),
      credentials: validateAuthentication(data.get("with")?.get("credentials")),
      onlyGraphs: ge1(data.get("with")?.get("only-graphs"))
        ?.map((g) => expandCURIE(g, prefixes))
        ?.map((g) => stringToGraph(g)),
    },
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
function expandCURIE(uriOrCurie: string, prefixes: Record<string, string>): string {
  const sep = ":";
  if (uriOrCurie.includes("/")) return uriOrCurie;

  const [prefix, ...lname] = uriOrCurie.split(sep);
  const localname = lname.join(sep);
  return (prefixes[prefix] ?? prefix) + localname;
}

function stringToGraph(graphName: string): RDF.Quad_Graph {
  const df = new DataFactory();
  if (graphName === "") return df.defaultGraph();
  else return df.namedNode(graphName);
}
