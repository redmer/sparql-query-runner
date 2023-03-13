#!/usr/bin/env node

import * as dotenv from "dotenv";
import fs from "fs/promises";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import compileConfigData, { CONFIG_FILENAME_YAML } from "../config/validate.js";
import * as PipelineSupervisor from "../runner/pipeline-supervisor.js";
import { TEMPDIR } from "../runner/pipeline-worker.js";
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
    .command("clear-cache", "Clear all workflow caches", {
      force: {
        alias: "f",
        type: "boolean",
        desc: "Force deletion of the cache",
        default: false,
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

    if (args["_"].includes("clear-cache")) {
      await fs.rm(TEMPDIR, { recursive: true, force: args["force"] as boolean });
    }

    PipelineSupervisor.runAll(config, {
      cacheIntermediateResults: args["cache"] as boolean,
    });
  } catch (error) {
    console.error(Report.ERROR + error.message ?? error);
    throw error;
  }
}

void main();
