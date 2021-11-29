#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import getConfiguration from "../config";
import { PipelineSupervisor } from "../runner";
import { SQRInfo } from "../utils/errors";

async function main() {
  // Provide command line arguments
  const args = yargs(hideBin(process.argv))
    .alias("c", "config")
    .describe("c", "Path to configuration file")
    .usage("Runs a Pipeline")
    .parse();

  const config = await getConfiguration({ customConfigurationFilePath: args["c"] as string });

  config.pipeline.forEach((p, i) => {
    SQRInfo(`Pipeline ${i + 1}:\t${p.name}`);

    const runner = new PipelineSupervisor(p);
    runner.start();
  });
}

void main();
