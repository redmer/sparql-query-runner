#!/usr/bin/env node

import * as dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import compileConfigData from "../config/configuration.js";
import * as PipelineSupervisor from "../runner/pipeline-supervisor.js";

dotenv.config();

/** Runs CLI, provides options. */
async function main() {
  // Provide command line arguments
  const args = await yargs(hideBin(process.argv))
    .option("abort-on-error", {
      alias: "ci",
      default: false,
      type: "boolean",
      desc: "Abort on HTTP error.",
    })
    .option("config-file", {
      alias: "p",
      type: "string",
      desc: "Path to alternative configuration file",
    })
    .option("cache-intermediate-results", {
      alias: "i",
      type: "boolean",
      default: false,
      desc: "Cache each step's results locally",
    })
    .option("shacl-rules-out", {
      alias: "r",
      type: "string",
      requiresArg: true,
      desc: "Generate SHACL Rules from CONSTRUCT steps",
    })
    .option("warnings-as-errors", {
      alias: "e",
      type: "boolean",
      default: false,
      desc: "SHACL warnings are treated as fatal errors",
    })
    .usage("Run a sparql-query-runner.json pipeline")
    .parse();

  const config = await compileConfigData(args["config-file"]);

  PipelineSupervisor.runAll(config, {
    abortOnError: args["abort-on-error"],
    cacheIntermediateResults: args["cache-intermediate-results"],
    outputShaclRulesToFilePath: args["shacl-rules-out"],
    shaclWarningsAsErrors: args["warnings-as-errors"],
  });
}

void main();
