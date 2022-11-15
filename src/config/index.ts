import fs from "fs/promises";
import yaml from "yaml";
import { oneOrMore } from "../utils/array.js";
import { error, warn } from "../utils/errors.js";
import { context } from "./rdfa11-context.js";
import type {
  IAuthentication,
  IConfiguration,
  IDestination,
  IEndpoint,
  IPipeline,
  IPipelineIN,
  ISource,
  ISourceOrDestination,
  IStep,
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

/**
 * This module collects static functions that get, check and validate a Configuration file.
 */
export namespace Configuration {
  /** Find preferred configuration file in directory */
  export async function prefConfigurationPathInDir(dir: string): Promise<string> {
    const dirContents = await fs.readdir(dir);

    // Look for magic filenames
    if (dirContents.includes(CONFIG_FILENAME_YAML)) {
      // Prefer YAML over JSON
      if (dirContents.includes(CONFIG_FILENAME))
        warn(`Found both ${CONFIG_FILENAME_YAML} and ${CONFIG_FILENAME}. Continuing with YAML.`);

      return `${dir}/${CONFIG_FILENAME_YAML}`;
    } else if (dir.includes(CONFIG_FILENAME)) {
      return `${dir}/${CONFIG_FILENAME}`;
    }

    error(`Found neither ${CONFIG_FILENAME_YAML} nor ${CONFIG_FILENAME} in ${dir}`);
  }

  /** Parse the configuration file. */
  export async function configurationFileContents2(path: string): Promise<any> {
    const contents = fs.readFile(path, { encoding: "utf-8" });
    if (path.endsWith(".yaml")) {
      return yaml.parse(await contents, { strict: true });
    } else if (path.endsWith(".json")) {
      return JSON.parse(await contents);
    }
  }

  /** Validate and hydrate a configuration file. */
  export function validateConfigurationFile(data: any): IConfiguration {
    const version: string | undefined = data["version"];
    if (!version || !version.startsWith("v4"))
      error(`Version of sparql-query-runner requires a configuration file of v4+`);

    return {
      version: version,
      pipelines: oneOrMore<IPipelineIN>(data["pipelines"]).map((p) => validatePipeline(p)),
    };
  }

  /** Validate and hydrate pipeline data. */
  function validatePipeline(data: any): IPipeline {
    return {
      name: data["name"] ?? new Date().toISOString(),
      independent: data["independent"] ?? false,
      prefixes: Object.assign({}, context, data["prefixes"]),
      destinations: oneOrMore<IDestination | string>(data["destinations"]).map(
        (data) => validateSourceOrDestination(data) as IDestination
      ),
      endpoint: oneOrMore<IEndpoint | string>(data["endpoint"]).map((data) =>
        validateEndpoint(data)
      ),
      sources: oneOrMore<ISource | string>(data["sources"]).map(
        (data) => validateSourceOrDestination(data) as ISource
      ),
      steps: oneOrMore<IStep | string>(data["steps"]).map((data) => validateStep(data)),
    };
  }

  /** Heuristic (on file extension) to determine step type. */
  function determineStepType(urls: string[]): IStep["type"] | never {
    const extensions = urls.filter((u) => "".split(".").pop());
    if (extensions.length > 1)
      error(
        `Multiple query types found in step (${extensions.join(", ")}). 
        Cannot determine a single step type. Ensure only .rq or .ru files are present.`
      );

    if (extensions[0] == "rq") return "sparql-query";
    if (extensions[0] == "ru") return "sparql-update";
    error(`Provide /type with value ${urls.join(", ")}, as it can't be determined automatically.`);
  }

  /** Validate and hydrate step data. */
  function validateStep(data: any): IStep {
    if (typeof data === "string") return { url: [data], type: determineStepType([data]) };
    if (typeof data["url"] === "undefined") error(`A /url value for a step is missing.`);

    return {
      type: data["type"] ?? determineStepType(data["url"]),
      url: data["url"],
    };
  }

  /** Validate and hydrate source data or destination data. */
  function validateSourceOrDestination(data: any): ISourceOrDestination {
    if (typeof data === "string") return validateSourceOrDestination({ type: "rdf", url: data });

    return {
      type: data["type"] ?? "rdf",
      url: data["url"] ?? error(`Source or destination requires /url with a path or URL value`),
      graphs: oneOrMore(data["graphs"]),
      authentication: validateAuthentication(data["authentication"]),
      mediatype: data["mediatype"],
    };
  }

  /** Validate endpoint */
  function validateEndpoint(data: any): IEndpoint {
    if (typeof data === "string")
      return {
        get: data,
      };
    return {
      get: data["get"],
      post: data["post"],
      authentication: validateAuthentication(data["authentication"]),
    };
  }

  function validateAuthentication(data: any): IAuthentication | undefined {
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

    error(
      `The authentication type was not recognized. Verify authentication details of:\n` +
        JSON.stringify(data, undefined, 2)
    );
  }
}

/**
 * Get and parse configuration file.
 * This function does not validate the configuration and the options specified.
 * Instead, it loads the pipelines, their sources/destinations/transformations/validations
 * configuration and passes their config values on.
 */
export default async function compileConfigData(): Promise<IConfiguration> {
  const configFilePath = Configuration.prefConfigurationPathInDir(".");
  const data = Configuration.configurationFileContents2(await configFilePath);
  return Configuration.validateConfigurationFile(await data);
}
