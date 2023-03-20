#!/usr/bin/env node

import * as dotenv from "dotenv";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import compileConfigData, { CONFIG_FILENAME_YAML, ICliOptions } from "../config/validate.js";
import * as PipelineSupervisor from "../runner/pipeline-supervisor.js";
import { TEMPDIR } from "../runner/pipeline-worker.js";
import * as RulesWorker from "../runner/shacl-rules-worker.js";
import * as Report from "../utils/report.js";

dotenv.config();

/** Runs CLI, provides options. */
async function cli() {
  await yargs(hideBin(process.argv))
    .scriptName("sparql-query-runner")
    // command name '*' is the default
    .command({
      command: "run",
      describe: `Run a workflow to generate `,
      handler: async (argv) =>
        await runPipelines(argv["config"], {
          cacheIntermediateResults: argv["cache"],
          verbose: argv["verbose"],
          warningsAsErrors: argv["warnings-as-errors"],
        }),
      builder: {
        cache: {
          type: "boolean",
          default: false,
          desc: "Cache step results",
        },
        config: {
          alias: "i",
          type: "string",
          desc: "Path to pipeline file(s)",
          default: CONFIG_FILENAME_YAML,
        },
        verbose: {
          alias: "V",
          type: "boolean",
          desc: "Increase output verbosity",
          default: false,
        },
        "warnings-as-errors": {
          alias: "e",
          type: "boolean",
          desc: "Terminate on warnings",
          default: false,
        },
      },
    })
    .command({
      command: "rules",
      describe: "Generate SHACL SPARQL Rules to construct triples",
      builder: {
        config: {
          alias: "i",
          type: "string",
          desc: "Path to pipeline file",
          default: CONFIG_FILENAME_YAML,
        },
      },
      handler: async (argv) => await createShaclRules(argv["config"]),
    })
    .command({
      command: "clear-cache",
      describe: "Clear all workflow caches",
      builder: {
        force: {
          alias: "f",
          type: "boolean",
          desc: "Force deletion of the cache",
          default: false,
        },
      },
      handler: async (argv) => await clearCache(argv["force"]),
    })
    .demandCommand()
    .help()
    .usage("Run a workflow of SPARQL Construct or Update queries.")
    .parse();
}

async function clearCache({ force }: { force: boolean }) {
  await fs.rm(TEMPDIR, { recursive: true, force: force });
  console.info(`Cache dir ${TEMPDIR} cleaned` + Report.DONE);
  return;
}

async function runPipelines(
  configPaths: string[],
  { cacheIntermediateResults, verbose, warningsAsErrors }: ICliOptions
) {
  const config = await compileConfigData(configPaths);
  try {
    PipelineSupervisor.runAll(config, { cacheIntermediateResults, verbose, warningsAsErrors });
  } catch (error) {
    console.error(Report.ERROR + error.message ?? error);
    throw error;
  }
}

async function createShaclRules(configPaths: string[]) {
  const config = await compileConfigData(configPaths);

  try {
    config.pipelines.forEach(async (p) => {
      // TODO: Alternative destinations for `sh:SPARQLRule`s
      await RulesWorker.start(p, process.stdout);
    });
  } catch (error) {
    console.error(Report.ERROR + error.message ?? error);
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) void cli();
