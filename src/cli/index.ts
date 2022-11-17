#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import compileConfigData from "../config/configuration.js";
import { PipelineSupervisor } from "../runner/pipeline-supervisor.js";
import * as dotenv from "dotenv";

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
    .option("cache-intermediate-results", {
      alias: "i",
      type: "boolean",
      default: false,
      desc: "Cache each step's results locally",
    })
    .option("as-shacl-rule", {
      alias: "r",
      type: "boolean",
      default: false,
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

  const config = await compileConfigData();

  PipelineSupervisor.runAll(config, {
    abortOnError: args["abort-on-error"],
    cacheIntermediateResults: args["cache-intermediate-results"],
    outputShaclRulesToFilePath: args["as-shacl-rule"],
    shaclWarningsAsErrors: args["warnings-as-errors"],
  });
}

void main();
