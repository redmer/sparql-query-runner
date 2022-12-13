#!/usr/bin/env node

import * as dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import compileConfigData, { CONFIG_FILENAME_YAML } from "../config/validate.js";
import * as PipelineSupervisor from "../runner/pipeline-supervisor.js";
import * as RulesWorker from "../runner/shacl-rules-worker.js";
import * as Report from "../utils/report.js";

dotenv.config();

/** Runs CLI, provides options. */
async function main() {
  // Provide command line arguments
  const args = await yargs(hideBin(process.argv))
    // command name '*' is the default
    .command("run", "Run a workflow", {
      cache: {
        type: "boolean",
        default: false,
        desc: "Cache each step's results locally",
      },
      config: {
        alias: "i",
        type: "string",
        desc: "Path to pipeline file",
        default: CONFIG_FILENAME_YAML,
      },
    })
    .command("rules", "Generate `sh:SPARQLRule`s from Construct steps", {
      config: {
        alias: "i",
        type: "string",
        desc: "Path to pipeline file",
        default: CONFIG_FILENAME_YAML,
      },
    })
    .demandCommand()
    .help()
    .usage("Run a workflow of SPARQL Construct or Update queries.")
    .parse();

  try {
    // Initialize configuration
    const config = await compileConfigData(args["config"] as string | string[]);

    if (args["_"].includes("rules")) {
      config.pipelines.forEach(async (p) => {
        // TODO: Alternative destinations for `sh:SPARQLRule`s
        await RulesWorker.start(p, process.stdout);
      });
    }

    PipelineSupervisor.runAll(config, {
      cacheIntermediateResults: args["cache"] as boolean,
    });
  } catch (error) {
    if (error instanceof Error) console.error(Report.ERROR + error.message);
    else console.error(Report.ERROR + error);
    process.exit(1);
  }
}

void main();
