import * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import { DataFactory } from "rdf-data-factory";
import yaml from "yaml";
import { ge1 } from "../utils/array.js";
import { substitute } from "../utils/compile-envvars.js";
import { context } from "./rdfa11-context.js";
import { JobSourceTypes, JobStepTypes, JobTargetTypes } from "./schema-types.js";
import {
  type IConfigurationData,
  type ICredentialData,
  type IJobData,
  type IJobSourceData,
  type IJobSourceKnownTypes,
  type IJobStepData,
  type IJobStepKnownTypes,
  type IJobTargetData,
  type IJobTargetKnownTypes,
} from "./types.js";

export const CONFIG_FILENAME_YAML = "sparql-query-runner.yaml";

export class ConfigurationError extends Error {}

/** Get a configuration from a valid pipeline declaration file in JSON or YAML */
export async function configFromPath(
  path: string,
  { secrets, defaultPrefixes }
): Promise<IConfigurationData> {
  try {
    const rawContents = await fs.readFile(path, { encoding: "utf-8" });
    return await configFromString(rawContents, { secrets, defaultPrefixes });
  } catch (e) {
    throw new ConfigurationError(`Could not read '${path}'`, e);
  }
}

/** Get a configuration from a valid pipeline declaration in JSON or YAML */
export async function configFromString(
  contents: string,
  { secrets, defaultPrefixes }
): Promise<IConfigurationData> {
  try {
    const substitutedContents = substitute(contents, secrets);
    const config = yaml.parse(substitutedContents, {
      strict: true,
      version: "1.2",
      mapAsMap: true,
    });
    return validateConfiguration(config, defaultPrefixes);
  } catch (e) {
    throw new ConfigurationError(`Could not read configuration:`, e);
  }
}

/** Validate a configuratioun file */
function validateConfiguration(
  data: Readonly<Partial<IConfigurationData>>,
  defaultPrefixes: boolean
): IConfigurationData {
  const version: string | undefined = data["version"];
  if (!version || !version.startsWith("v5"))
    throw new ConfigurationError("Configuration file version 'v5' required");

  // Default prefixes are set here, config-level are copied here, so that jobs may get a copy, too
  const prefixes = Object.assign(defaultPrefixes ? context : {}, data["prefixes"]);

  // validate the jobs individually
  if (!Object.hasOwn(data, "jobs")) throw new ConfigurationError(`Jobs are not correctly defined`);
  const jobs = new Map();
  for (const [name, job] of data["jobs"].entries()) jobs.set(name, validateJob(job, prefixes));

  // return the original data, but override version, prefixes, jobs
  return { ...data, version, prefixes, jobs };
}

/** Normalize an IJob, copying configuration-level prefixes. */
function validateJob(
  data: Readonly<Partial<IJobData>>,
  workflowPrefixes: Record<string, string>
): IJobData {
  const independent = data["independent"] ?? false;
  const prefixes = Object.assign(workflowPrefixes, data["prefixes"]);
  const sources = data["sources"]?.map((data) => validateSource(data, prefixes));
  const steps = data["steps"]?.map((data) => validateStep(data, prefixes));
  const targets = data["targets"]?.map((data) => validateTarget(data, prefixes));

  return { ...data, independent, prefixes, sources, targets, steps };
}

/** Find keys that are well-known access types (sparql:, file:, etc.) */
function knownTypeKeys(
  shortHandTypes: typeof JobSourceTypes | typeof JobStepTypes | typeof JobTargetTypes,
  data: unknown
) {
  return Object.keys(data).filter((k: never) => shortHandTypes.includes(k));
}

/** Validate the known values of a source, returning the full object */
function validateSource(
  data: Partial<IJobSourceData>,
  prefixes: Record<string, string>
): IJobSourceData {
  const knownType = knownTypeKeys(JobSourceTypes, data) as IJobSourceKnownTypes[];
  if (knownType.length != 1 && !Object.hasOwn(data, "type"))
    throw new ConfigurationError(`No single type for source: found ${JSON.stringify(knownType)}`);

  return {
    ...data,
    type: data["type"] ?? `sources/${knownType[0]}`,
    access: data["access"] ?? data[knownType[0]],
    with: {
      ...data.with,
      credentials: validateAuthentication(data["credentials"]),
      onlyGraphs: ge1(data["only-graphs"])
        .map((g) => expandCURIE(g, prefixes))
        .map((g) => stringToGraph(g)),
      targetGraph: [data["target-graph"]]
        .map((g) => expandCURIE(g, prefixes))
        .map((g) => stringToGraph(g))[0],
    },
  };
}

/** Validate the known values of a step, returning the full object */
function validateStep(data: Partial<IJobStepData>, prefixes: Record<string, string>): IJobStepData {
  const knownType = knownTypeKeys(JobStepTypes, data) as IJobStepKnownTypes[];
  if (knownType.length != 1 && !Object.hasOwn(data, "type"))
    throw new ConfigurationError(`No single type for step: found ${JSON.stringify(knownType)}`);

  return {
    ...data,
    type: data["type"] ?? `steps/${knownType[0]}`,
    access: data["access"] ?? data[knownType[0]],
    with: {
      ...data.with,
      targetGraph: [data["target-graph"]]
        .map((g) => expandCURIE(g, prefixes))
        .map((g) => stringToGraph(g))[0],
    },
  };
}

/** Check the known values of a target, returning the full object */
function validateTarget(
  data: Partial<IJobTargetData>,
  prefixes: Record<string, string>
): IJobTargetData {
  const knownType = knownTypeKeys(JobTargetTypes, data) as IJobTargetKnownTypes[];
  if (knownType.length != 1 && !Object.hasOwn(data, "type"))
    throw new ConfigurationError(`No single type for source: found ${JSON.stringify(knownType)}`);

  return {
    ...data,
    type: data["type"] ?? `targets/${knownType[0]}`,
    access: data["access"] ?? data[knownType[0]],
    with: {
      ...data.with,
      credentials: validateAuthentication(data["credentials"]),
      onlyGraphs: ge1(data["only-graphs"])
        .map((g) => expandCURIE(g, prefixes))
        .map((g) => stringToGraph(g)),
    },
  };
}

function validateAuthentication(data: undefined): undefined;
function validateAuthentication(data: Readonly<Partial<ICredentialData>>): ICredentialData;
function validateAuthentication(
  data: Readonly<Partial<ICredentialData>>
): ICredentialData | undefined {
  if (data === undefined) return undefined;

  const password = data["password"];
  const username = data["username"];
  const token = data["token"];
  const headers = data["headers"];

  if (password && username) return { ...data, type: "Basic", password, username };
  if (token) return { ...data, type: "Bearer", token };
  if (headers) return { ...data, type: "HTTP-Header", headers };

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
