#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import getConfiguration from "../config";
import { PipelineSupervisor } from "../runner";
import { SQRInfo } from "../utils/errors";

async function main() {
  // Provide command line arguments
  const args = yargs(hideBin(process.argv))
    .option("config", { alias: "c", type: "string", desc: "Path to configuration file" })
    .option("abort-on-error", {
      alias: "ci",
      default: false,
      type: "boolean",
      desc: "Abort on error. Overrides env var TREAT_WARNINGS_AS_ERRORS.",
    })
    .usage("Run a sparql-query-runner.json pipeline")
    .parse();

  const config = await getConfiguration({
    customConfigurationFilePath: args["config"],
    abortOnError: args["abort-on-error"],
  });

  config.pipeline.forEach((p, i) => {
    SQRInfo(`Pipeline ${i + 1}:\t${p.name}`);

    const runner = new PipelineSupervisor(p);
    runner.start();
  });
}

void main();
