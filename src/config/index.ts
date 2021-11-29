import fs from "fs-extra";
import { oneOrMore } from "../utils/array";
import { SQRError } from "../utils/errors";
import { context } from "./rdfa11-context";
import { IConfiguration, IPipeline, IStep } from "./types";

export const CONFIG_FILENAME = "sparql-query-runner.json";

export interface ConfigOptions {
  /** Specify a different path to find a pipeline config file. */
  customConfigurationFilePath: string;
}

/**
 * Get and parse configuration file.
 * This function does not validate the configuration and the options specified.
 * Instead, it loads the pipelines, their sources/destinations/transformations/validations
 * configuration and passes their config values on.
 */
export default async function getConfiguration(
  opts: Partial<ConfigOptions>
): Promise<IConfiguration> {
  const path = opts.customConfigurationFilePath ?? CONFIG_FILENAME;

  try {
    const configJSONString = await fs.readFile(path, { encoding: "utf-8" });
    const configJSON = JSON.parse(configJSONString);
    return { pipeline: await _constructPipelinesFromConfig(configJSON) };
  } catch (err) {
    SQRError(1520, `Could not parse "${path}" as configuration JSON (${(err as any)?.message})`);
  }
}

async function _constructPipelinesFromConfig(json: any): Promise<IPipeline[]> {
  // This function collects pipeline information from the configuration file, substituting types and defaults.
  const pipelines: IPipeline[] = [];
  for (const p of oneOrMore<IPipeline>(json["pipeline"])) {
    let rdfaContext;
    if (json["include-default-rdfa-context"] === true) rdfaContext = context;
    pipelines.push({
      endpoint: p["endpoint"] ?? SQRError(1519, `Pipeline/endpoint is required`),
      name: p["name"] ?? `linked data pipeline, run ${new Date().toISOString()}`,
      prefixes: Object.assign({}, rdfaContext, p["prefixes"]),
      steps: _constructStepsFromConfig(p),
    });
  }

  return pipelines;
}

function _constructStepsFromConfig(json: any): IStep[] {
  const steps: IStep[] = [];
  for (const s of oneOrMore<IStep>(json["steps"])) {
    steps.push({
      ...s, // pass on extra configuration items as-is (not oneOrMore)
      type: s["type"] ?? SQRError(1543, `Pipeline/Step/type is required`),
      url: oneOrMore(s["url"]) ?? SQRError(1544, `Pipeline/Step/url is required`),
    });
  }
  return steps;
}
