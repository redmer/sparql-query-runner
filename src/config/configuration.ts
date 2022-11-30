import fs from "fs/promises";
import yaml from "yaml";
import { ge1 } from "../utils/array.js";
import * as Report from "../utils/report.js";
import { context } from "./rdfa11-context.js";
import type {
  IAuth,
  IConfiguration,
  IConstructPipeline,
  IConstructStep,
  IDest,
  IEndpoint,
  ISource,
  IUpdatePipeline,
  IUpdateStep,
  IValidateStep,
} from "./types";

export const CONFIG_FILENAME = "sparql-query-runner.json";
export const CONFIG_FILENAME_YAML = "sparql-query-runner.yaml";

export interface ICliOptions {
  /** Always abort on any error. */
  abortOnError: boolean;

  /** Cache step results */
  cacheIntermediateResults: boolean;

  /** Output CONSTRUCT steps as SHACL rules on stdout */
  outputShaclRulesToFilePath: string;

  /** Treat SHACL warnings as errors. */
  shaclWarningsAsErrors: boolean;
}

/** Find preferred configuration file in directory */
export async function prefConfigurationPathInDir(dir: string): Promise<string> {
  const dirContents = await fs.readdir(dir);

  // Look for magic filenames
  if (dirContents.includes(CONFIG_FILENAME_YAML)) {
    // Prefer YAML over JSON
    if (dirContents.includes(CONFIG_FILENAME))
      Report.warning(
        `Found both ${CONFIG_FILENAME_YAML} and ${CONFIG_FILENAME}. Continuing with YAML.`
      );

    return `${dir}/${CONFIG_FILENAME_YAML}`;
  } else if (dir.includes(CONFIG_FILENAME)) {
    return `${dir}/${CONFIG_FILENAME}`;
  }

  Report.error(`Found neither ${CONFIG_FILENAME_YAML} nor ${CONFIG_FILENAME} in ${dir}`);
}

/** Parse the configuration file. */
export async function configurationFileContents2(path: string): Promise<unknown> {
  const contents = fs.readFile(path, { encoding: "utf-8" });
  if (path.endsWith(".yaml")) {
    return yaml.parse(await contents, { strict: true });
  } else if (path.endsWith(".json")) {
    return JSON.parse(await contents);
  }
}

/** Validate and hydrate a configuration file. */
export function validateConfigurationFile(data: unknown): IConfiguration {
  const version: string | undefined = data["version"];
  if (!version || !version.startsWith("v4"))
    Report.error(`This sparql-query-runner requires a configuration file version v4`);

  return {
    version: version,
    pipelines: ge1(data["pipelines"]).map((p) => validatePipeline(p)),
  };
}

/** Validate and hydrate pipeline data. */
function validatePipeline(data: unknown): IUpdatePipeline | IConstructPipeline {
  const asUpdate = validateUpdatePipeline(data);
  const asConstruct = validateConstructPipeline(data);

  if (asUpdate && asConstruct)
    Report.error(
      `Confusion. Pipeline is both valid as an update-pipeline and a construct-pipeline.` +
        `Please split these pipelines into two.`
    );

  return {
    name: data["name"] ?? new Date().toISOString(),
    independent: data["independent"] ?? false,
    prefixes: Object.assign({}, context, data["prefixes"]),
    ...(asUpdate ?? asConstruct),
  };
}

function validateUpdatePipeline(
  data: unknown
): Omit<IUpdatePipeline, "name" | "independent" | "prefixes"> | undefined {
  if (!data["endpoint"] || !data["steps"]) return undefined;

  const type = "direct-update";
  const endpoint = validateEndpoint(data["endpoint"]);
  const steps = ge1(data["steps"]).map((data) => validateUpdateStep(data));

  return { type, endpoint, steps };
}

function validateConstructPipeline(
  data: unknown
): Omit<IConstructPipeline, "name" | "independent" | "prefixes"> | undefined {
  if (!data["sources"] || !data["destinations"]) return undefined;

  const type = "construct-quads";
  const sources = ge1(data["sources"]).map((data) => validateSource(data));
  const destinations = ge1(data["destinations"]).map((data) => validateDest(data));
  const steps = ge1(data["steps"]).map((data) => validateConstructStep(data));

  return { type, sources, destinations, steps };
}

function validateEndpoint(data: unknown): IEndpoint {
  if (typeof data === "string") return validateEndpoint({ post: data } as IEndpoint);
  if (data["post"] === undefined) Report.error(`An endpoint's target url ('post') is missing.`);

  return {
    post: data["post"],
    auth: validateAuthentication(data["auth"]),
  };
}

function validateUpdateStep(data: unknown): IUpdateStep {
  if (typeof data === "string")
    return validateUpdateStep({ type: "sparql-update", url: [data] } as IUpdateStep);
  if (data["url"] === undefined) Report.error(`A url value for an update step is missing.`);

  return {
    type: data["type"] ?? "sparql-update",
    url: ge1(data["url"]),
  };
}

function validateConstructStep(data: unknown): IConstructStep | IValidateStep {
  if (typeof data === "string")
    return validateConstructStep({ type: "sparql-construct", url: [data] } as IConstructStep);
  if (data["url"] === undefined) Report.error(`A url value for an update step is missing.`);

  return {
    type: data["type"] ?? "sparql-query",
    url: ge1(data["url"]),
    intoGraph: ge1(data["intoGraphs"]),
    targetClass: data["targetClass"],
  };
}

function validateSource(data: unknown): ISource {
  if (typeof data === "string") return validateSource({ type: "auto", url: data } as ISource);
  if (data["url"] === undefined) Report.error(`Source requires a URL to find data`);

  return {
    type: data["type"] ?? "auto",
    url: data["url"],
    onlyGraphs: ge1(data["onlyGraphs"]),
    auth: validateAuthentication(data["auth"]),
  };
}

function validateDest(data: unknown): IDest {
  if (typeof data === "string") return validateDest({ type: "auto", url: data } as IDest);
  if (data["url"] === undefined) Report.error(`Source requires a target URL to export to`);

  return {
    type: data["type"] ?? "auto",
    url: data["url"],
    onlyGraphs: ge1(data["onlyGraphs"]),
    auth: validateAuthentication(data["authentication"]),
  };
}

function validateAuthentication(data: unknown): IAuth;
function validateAuthentication(data: undefined): undefined;
function validateAuthentication(data: unknown): IAuth | undefined {
  if (data === undefined) return undefined;

  // If password_env and user_env, this is a Basic auth type
  if (data["password_env"] !== undefined && data["user_env"] !== undefined)
    return {
      type: "Basic",
      password_env: data["password_env"],
      user_env: data["user_env"],
    };

  // If token_env, this is a Bearer type
  if (data["token_env"] !== undefined)
    return {
      type: "Bearer",
      token_env: data["token_env"],
    };

  Report.error(
    `The authentication type was not recognized. Verify authentication details of:\n` +
      JSON.stringify(data, undefined, 2)
  );
}

/**
 * Get and parse configuration file.
 * This function does not validate the configuration and the options specified.
 * Instead, it loads the pipelines, their sources/destinations/transformations/validations
 * configuration and passes their config values on.
 */
export default async function compileConfigData(path?: string): Promise<IConfiguration> {
  const configFilePath = path ?? (await prefConfigurationPathInDir("."));
  const data = configurationFileContents2(configFilePath);
  return validateConfigurationFile(await data);
}
