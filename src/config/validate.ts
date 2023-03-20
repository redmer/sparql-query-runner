import fs from "fs/promises";
import yaml from "yaml";
import { ge1 } from "../utils/array.js";
import { substitute } from "../utils/compile-envvars.js";
import { context } from "./rdfa11-context.js";
import type {
  IConfiguration,
  IConstructPipeline,
  IConstructStep,
  ICredential,
  IEndpoint,
  ISource,
  ITarget,
  IUpdatePipeline,
  IUpdateStep,
  IValidateStep,
} from "./types";

export const CONFIG_FILENAME = "sparql-query-runner.json";
export const CONFIG_FILENAME_YAML = "sparql-query-runner.yaml";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICliOptions {
  verbose?: boolean;
  cacheIntermediateResults?: boolean;
  warningsAsErrors?: boolean;
}

export class ConfigurationError extends Error {}

/** Parse the configuration file. */
export async function getJsonYamlContents(path: string): Promise<unknown> {
  try {
    const rawContents = fs.readFile(path, { encoding: "utf-8" });
    // Substitute ENV_($) env vars
    const contents = substitute(await rawContents, process.env);
    if (path.endsWith(".yaml")) {
      return yaml.parse(contents, { strict: true, version: "1.2" });
    } else if (path.endsWith(".json")) {
      return JSON.parse(contents);
    }
  } catch (e) {
    throw new ConfigurationError(`Could not read ${path}`, e);
  }
}

/** Validate and hydrate a configuration file. */
export function validateConfiguration(data: unknown): IConfiguration {
  const version: string | undefined = data["version"];
  if (!version || !version.startsWith("v4"))
    throw new ConfigurationError("Configuration file version 'v4' required");

  return {
    version: version,
    pipelines: ge1(data["pipelines"]).map((p) => validatePipeline(p)),
  };
}

/** Validate and hydrate pipeline data. */
function validatePipeline(data: unknown): IUpdatePipeline | IConstructPipeline {
  const asUpdate = validateUpdatePipeline(data);
  const asConstruct = validateConstructPipeline(data);

  if (!!asUpdate && !!asConstruct)
    throw new ConfigurationError(
      `Confusion. Pipeline is both valid as an update-pipeline and a construct-pipeline.` +
        `Please split these pipelines into two. ${JSON.stringify(data)}`
    );
  if (!asUpdate && !asConstruct)
    throw new ConfigurationError(
      `Pipeline couldn't be parsed as update-pipeline nor as construct-pipeline. ${JSON.stringify(
        data
      )}`
    );

  const prefixes = Object.assign({}, context, data["prefixes"]); // combine default RDFa context with supplied prefixes

  return {
    name: data["name"] ?? "Pipeline", // static default
    independent: data["independent"] ?? false, // safe default
    prefixes,
    ...(asUpdate ?? asConstruct),
  };
}

function validateUpdatePipeline(
  data: unknown
): Omit<IUpdatePipeline, "name" | "independent" | "prefixes"> | undefined {
  if (!data["endpoint"] || !data["steps"]) return undefined;

  const type = "direct-update";
  const endpoint = ge1(data["endpoint"]).map((data) => validateEndpoint(data));
  const steps = ge1(data["steps"]).map((data) => validateUpdateStep(data));

  return { type, endpoint, steps };
}

function validateConstructPipeline(
  data: unknown
): Omit<IConstructPipeline, "name" | "independent" | "prefixes"> | undefined {
  // A construct-quads pipeline should have either
  // minimally sources and targets, steps and targets
  if (!data["targets"]) return undefined;

  const type = "construct-quads";
  const sources = ge1(data["sources"])?.map((data) => validateSource(data));
  const targets = ge1(data["targets"]).map((data) => validateTarget(data));
  const steps = ge1(data["steps"])?.map((data) => validateConstructStep(data));

  return { type, sources, targets, steps };
}

function validateEndpoint(data: unknown): IEndpoint {
  if (typeof data === "string") return validateEndpoint({ access: data } as IEndpoint);
  if (data["access"] === undefined)
    throw new ConfigurationError(
      `An endpoint's target url ('access') is missing. (Data: ${JSON.stringify(data)})`
    );

  return {
    access: data["access"],
    credentials: validateAuthentication(data["credentials"]),
  };
}

function validateUpdateStep(data: unknown): IUpdateStep {
  if (typeof data === "string")
    return validateUpdateStep({ type: "sparql-update", access: [data] } as IUpdateStep);
  if (data["access"] === undefined && data["update"] === undefined)
    throw new ConfigurationError(
      `A query value (access,update) for step is missing. (Data: ${JSON.stringify(data)})`
    );

  if (data["access"] && data["update"])
    throw new ConfigurationError(
      `Mutually exclusive 'access' and 'update' supplied for step. (Data: ${JSON.stringify(data)})`
    );

  return {
    type: data["type"] ?? "sparql-update",
    access: ge1(data["access"]),
    update: data["update"],
  };
}

function validateConstructStep(data: unknown): IConstructStep | IValidateStep {
  if (typeof data === "string")
    return validateConstructStep({ type: "sparql-construct", access: [data] } as IConstructStep);

  // `access` or `construct` is required, except for the following types
  if (data["access"] === undefined && data["construct"] === undefined)
    if (!["shacl-validate"].includes(data["type"]))
      throw new ConfigurationError(
        `A query value (access,construct) for step is missing. (Data: ${JSON.stringify(data)})`
      );

  if (data["access"] && data["construct"])
    throw new ConfigurationError(
      `Mutually exclusive 'access' and 'construct' supplied for step. (Data: ${JSON.stringify(
        data
      )})`
    );

  return {
    type: data["type"] ?? "sparql-construct",
    access: ge1(data["access"]),
    construct: data["construct"],
    intoGraph: data["intoGraph"],
    targetClass: data["targetClass"],
  };
}

function validateSource(data: unknown): ISource {
  if (typeof data === "string") return validateSource({ type: "auto", access: data } as ISource);
  if (data["access"] === undefined)
    throw new ConfigurationError(
      `Source requires a URL to find data. (Data: ${JSON.stringify(data)})`
    );

  return {
    type: data["type"] ?? "auto",
    access: data["access"],
    credentials: validateAuthentication(data["credentials"]),
    onlyGraphs: ge1(data["onlyGraphs"]),
  };
}

function validateTarget(data: unknown): ITarget {
  if (typeof data === "string")
    return validateTarget({ type: "localfile", access: data } as ITarget);
  if (data["access"] === undefined)
    throw new ConfigurationError(
      `Source requires a target URL to export to. (Data: ${JSON.stringify(data)})`
    );

  return {
    type: data["type"] ?? "localfile",
    access: data["access"],
    credentials: validateAuthentication(data["credentials"]),
    onlyGraphs: ge1(data["onlyGraphs"]),
  };
}

function validateAuthentication(data: unknown): ICredential;
function validateAuthentication(data: undefined): undefined;
function validateAuthentication(data: unknown): ICredential | undefined {
  if (data === undefined) return undefined;

  // If password_env and user_env, this is a Basic auth type
  if (data["password"] && data["username"])
    return {
      type: "Basic",
      password: data["password"],
      username: data["username"],
    };

  // If token_env, this is a Bearer type
  if (data["token"])
    return {
      type: "Bearer",
      token: data["token"],
    };

  throw new ConfigurationError(
    `The authentication type was not recognized. Verify authentication details of:\n` +
      JSON.stringify(data, undefined, 2)
  );
}

/**
 * Get and parse configuration file.
 *
 * This function does not validate the configuration and the options specified.
 * Instead, it loads the pipelines, their sources, targets, transformations, and validations
 * configuration and passes their config values on.
 */
export default async function compileConfigData(path?: string | string[]): Promise<IConfiguration> {
  const allConfigs: IConfiguration = { version: "v4.compiled", pipelines: [] };

  // If there are multiple paths, we can merge the pipelines into a single IConfiguration
  for (const file of ge1(path)) {
    const data = await getJsonYamlContents(file);
    const config = validateConfiguration(data);
    allConfigs.pipelines.push(...config.pipelines);
  }

  return allConfigs;
}
