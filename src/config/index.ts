import fs from "fs/promises";
import { oneOrMore } from "../utils/array";
import { error, SQRWarning, warn } from "../utils/errors";
import { context } from "./rdfa11-context";
import {
  IAuthentication,
  IConfiguration,
  IDestination,
  IEndpoint,
  IPipeline,
  ISource,
  ISourceOrDestination,
  IStep,
} from "./types";
import yaml from "yaml";

export const CONFIG_FILENAME = "sparql-query-runner.json";
export const CONFIG_FILENAME_YAML = "sparql-query-runner.yaml";

export interface CliOptions {
  /** Always abort on any error. */
  abortOnError: boolean;

  /** Cache step results */
  cacheIntermediateResults: boolean;

  /** Output CONSTRUCT steps as SHACL rules in specified path */
  outputShaclRulesToFilePath: string;

  /** Treat SHACL warnings as errors. */
  shaclWarningsAsErrors: boolean;
}

export namespace Configuration {
  /** Returns the YAML or JSON file contents */
  export async function configurationFileContents(): Promise<any | never> {
    // Get the JSON or YAML configuration file
    const filesInPWD = await fs.readdir(".");
    if (filesInPWD.includes(CONFIG_FILENAME_YAML)) {
      // Prefer YAML over JSON
      if (filesInPWD.includes(CONFIG_FILENAME))
        warn(`Found both ${CONFIG_FILENAME_YAML} and ${CONFIG_FILENAME}. Continuing with YAML.`);

      const rawData = await fs.readFile(CONFIG_FILENAME_YAML, { encoding: "utf-8" });
      return yaml.parse(rawData);
    } else if (filesInPWD.includes(CONFIG_FILENAME)) {
      const rawData = await fs.readFile(CONFIG_FILENAME, { encoding: "utf-8" });
      return JSON.parse(rawData);
    }

    error(`Found neither ${CONFIG_FILENAME_YAML} nor ${CONFIG_FILENAME} in present directory.`);
  }

  export function validateConfigurationFile(data: Readonly<any>): IConfiguration {
    const version: string | undefined = data["version"];
    if (!version || !version.startsWith("v4"))
      error(`Version of sparql-query-runner requires a configuration file of v4+`);

    return {
      version: version,
      pipelines: oneOrMore<IPipeline>(data["pipelines"]).map((p) => validatePipeline(p)),
    };
  }

  function validatePipeline(data: Readonly<Partial<IPipeline>>): IPipeline {
    return {
      name: data["name"] ?? `linked data pipeline, run ${new Date().toISOString()}`,
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

  function validateStep(data: Readonly<Partial<IStep> | string>): IStep {
    if (typeof data === "string") return { url: [data], type: determineStepType([data]) };
    if (typeof data["url"] === "undefined") error(`A /url value for a step is missing.`);

    return {
      type: data["type"] ?? determineStepType(data["url"]),
      url: data["url"],
    };
  }

  function validateSourceOrDestination(
    data: Readonly<Partial<ISourceOrDestination> | string>
  ): ISourceOrDestination {
    if (typeof data === "string") return validateSourceOrDestination({ type: "rdf", url: data });

    return {
      type: data["type"] ?? "rdf",
      url: data["url"] ?? error(`Source or destination requires /url with a path or URL value`),
      graphs: oneOrMore(data["graphs"]),
      authentication: validateAuthentication(data["authentication"]),
      mediatype: data["mediatype"],
    };
  }

  function validateEndpoint(data: Readonly<Partial<IEndpoint> | string>): IEndpoint {
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

  function validateAuthentication(
    data: Readonly<Partial<IAuthentication>> | undefined
  ): IAuthentication | undefined {
    if (data === undefined) return undefined;

    // If token_env, this is a Bearer type
    if (data["token_env"])
      return {
        type: "Bearer",
        token_env: data["token_env"],
      };

    // If password_env and user_env, this is a Basic auth type
    if (data["password_env"] && data["user_env"])
      return {
        type: "Basic",
        password_env: data["password_env"],
        user_env: data["user_env"],
      };

    error(
      `The authentication type was not recognized. Verify authentication details of
      ${JSON.stringify(data, undefined, 2)}`
    );
  }
}

/**
 * Get and parse configuration file.
 * This function does not validate the configuration and the options specified.
 * Instead, it loads the pipelines, their sources/destinations/transformations/validations
 * configuration and passes their config values on.
 */
export default async function compileConfigData(
  opts: Partial<CliOptions>
): Promise<IConfiguration> {
  const data = Configuration.configurationFileContents();
  const contents = Configuration.validateConfigurationFile(data);

  const path = [CONFIG_FILENAME, CONFIG_FILENAME_YAML];
  if (opts.abortOnError || process.env.TREAT_WARNINGS_AS_ERRORS) {
    process.env.TREAT_WARNINGS_AS_ERRORS = true;
  }
}
