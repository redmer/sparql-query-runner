import fs from "fs/promises";
import type { Exact } from "ts-essentials";
import yaml from "yaml";
import { ge1 } from "../utils/array.js";
import * as Report from "../utils/report.js";
import { context } from "./rdfa11-context.js";
import type {
  IAuthentication,
  IConfiguration,
  IDest,
  IPipeline,
  IQueryStep,
  IRuleStep,
  ISource,
  IUpdateStep,
} from "./types";

export const CONFIG_FILENAME = "sparql-query-runner.json";
export const CONFIG_FILENAME_YAML = "sparql-query-runner.yaml";

export interface ICliOptions {
  /** Always abort on any error. */
  abortOnError: boolean;

  /** Cache step results */
  cacheIntermediateResults: boolean;

  /** Output CONSTRUCT steps as SHACL rules on stdout */
  outputShaclRulesToFilePath: boolean;

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
      Report.print(
        "warning",
        `Found both ${CONFIG_FILENAME_YAML} and ${CONFIG_FILENAME}. Continuing with YAML.`
      );

    return `${dir}/${CONFIG_FILENAME_YAML}`;
  } else if (dir.includes(CONFIG_FILENAME)) {
    return `${dir}/${CONFIG_FILENAME}`;
  }

  Report.print("error", `Found neither ${CONFIG_FILENAME_YAML} nor ${CONFIG_FILENAME} in ${dir}`);
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
    Report.print("error", `Version of sparql-query-runner requires a configuration file of v4+`);

  return {
    version: version,
    pipelines: ge1(data["pipelines"]).map((p) => validatePipeline(p)),
  };
}

/** Validate and hydrate pipeline data. */
function validatePipeline(data: unknown): Exact<Required<IPipeline>, Required<IPipeline>> {
  return {
    name: data["name"] ?? new Date().toISOString(),
    independent: data["independent"] ?? false,
    prefixes: Object.assign({}, context, data["prefixes"]),
    destinations: ge1(data["destinations"]).map((data) => validateDest(data) as IDest),
    sources: ge1(data["sources"]).map((data) => validateSource(data) as ISource),
    queries: ge1(data["queries"]).map((data) => validateQueryStep(data)),
    updates: ge1(data["updates"]).map((data) => validateUpdateStep(data)),
    rules: ge1(data["rules"]).map((data) => validateRuleStep(data)),
    engine: data["engine"] ?? undefined,
  };
}

function validateUpdateStep(data: unknown): IUpdateStep {
  if (typeof data === "string")
    return validateUpdateStep({ type: "sparql-update", url: [data] } as IUpdateStep);
  if (typeof data["url"] === "undefined")
    Report.print("error", `A url value for an update step is missing.`);

  return {
    type: data["type"] ?? "sparql-update",
    url: ge1(data["url"]),
  };
}

function validateQueryStep(data: unknown): IQueryStep {
  if (typeof data === "string")
    return validateQueryStep({ type: "sparql-query", url: [data] } as IQueryStep);
  if (typeof data["url"] === "undefined")
    Report.print("error", `A url value for an update step is missing.`);

  return {
    type: data["type"] ?? "sparql-query",
    url: ge1(data["url"]),
    graph: ge1(data["graphs"]),
  };
}

function validateRuleStep(data: unknown): IRuleStep {
  if (typeof data === "string" || !data["targetClass"])
    Report.print("error", `A rule step requires an explicit targetClass`);
  if (typeof data["url"] === "undefined")
    Report.print("error", `A url value for a rule step is missing`);

  return {
    type: data["type"] ?? "sparql-query",
    url: ge1(data["url"]),
    targetClass: ge1(data["targetClass"]),
  };
}

function validateSource(data: unknown): ISource {
  if (typeof data === "string") return validateSource({ type: "auto", url: data } as ISource);
  if (typeof data["url"] === "undefined")
    Report.print("error", `Source requires a URL to find data`);

  return {
    type: data["type"] ?? "auto",
    url: data["url"],
    graphs: ge1(data["graphs"]),
    authentication: validateAuthentication(data["authentication"]),
  };
}

function validateDest(data: unknown): IDest {
  if (typeof data === "string") return validateDest({ type: "auto", url: data } as IDest);
  if (typeof data["url"] === "undefined")
    Report.print("error", `Source requires a target URL to export to`);

  return {
    type: data["type"] ?? "auto",
    url: data["url"],
    graphs: ge1(data["graphs"]),
    authentication: validateAuthentication(data["authentication"]),
  };
}

function validateAuthentication(data: unknown): IAuthentication;
function validateAuthentication(data: undefined): undefined;
function validateAuthentication(data: unknown): IAuthentication | undefined {
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
export default async function compileConfigData(): Promise<IConfiguration> {
  const configFilePath = prefConfigurationPathInDir(".");
  const data = configurationFileContents2(await configFilePath);
  return validateConfigurationFile(await data);
}
