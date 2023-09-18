#!/usr/bin/env node

import * as dotenv from "dotenv";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { mergeConfigurations } from "../config/merge.js";
import { IWorkflowData } from "../config/types.js";
import { CONFIG_FILENAME_YAML, configFromPath } from "../config/validate.js";
import { TEMPDIR } from "../runner/job-supervisor.js";
import { newPipelineTemplate } from "../runner/new-pipeline.js";
import * as RulesWorker from "../runner/shacl-rules-worker.js";
import { WorkflowSupervisor } from "../runner/workflow-supervisor.js";
import { ge1 } from "../utils/array.js";
import * as Report from "../utils/report.js";
import { ICliOptions } from "./cli-options.js";

dotenv.config();

/** Runs CLI, provides options. */
async function cli() {
  await yargs(hideBin(process.argv))
    .scriptName("sparql-query-runner")
    .command({
      command: "run",
      describe: `Run a workflow to generate quads or execute SPARQL queries`,
      handler: async (argv) =>
        await runPipelines(argv["config"] ?? [CONFIG_FILENAME_YAML], {
          cacheIntermediateResults: argv["cache"],
          defaultPrefixes: !argv["no-default-prefixes"],
          verbose: argv["verbose"],
          warningsAsErrors: argv["warnings-as-errors"],
          allowShellScripts: argv["exec-shell"],
        }),
      builder: {
        cache: {
          type: "boolean",
          desc: "Cache step results",
        },
        config: {
          alias: "i",
          type: "string",
          desc: "Path to workflow file(s)",
        },
        verbose: {
          alias: "V",
          type: "boolean",
          desc: "Increase output verbosity",
        },
        "exec-shell": {
          type: "boolean",
          desc: "Execute shell job steps",
        },
        "warnings-as-errors": {
          alias: "e",
          type: "boolean",
          desc: "Terminate on warnings",
        },
        "no-default-prefixes": {
          type: "boolean",
          desc: "Do not supplement RDFa 1.1 default context namespace prefixes",
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
          desc: "Path to workflow file",
        },
      },
      handler: async (argv) => await createShaclRules(argv["config"]),
    })
    .command({
      command: "new",
      describe: "Create a new workflow declaration file",
      builder: {
        output: {
          alias: "o",
          type: "string",
          desc: "Output path to workflow file",
          default: CONFIG_FILENAME_YAML,
        },
      },
      handler: async (argv) => await createNewPipelineFile(argv["output"]),
    })
    .command({
      command: "clear-cache",
      describe: "Clear all workflow caches",
      builder: {
        force: {
          alias: "f",
          type: "boolean",
          desc: "Force deletion of the cache",
        },
      },
      handler: async (argv) => await clearCache(argv["force"]),
    })
    .demandCommand() // require a "command" verb
    .help()
    .usage("Run a workflow of SPARQL Construct or Update queries.")
    .parse();
}

async function clearCache({ force }: { force: boolean }) {
  await fs.rm(TEMPDIR, { recursive: true, force: force });
  console.info(`Cache dir ${TEMPDIR} cleaned` + Report.DONE);
  return;
}

async function createNewPipelineFile(path: string) {
  const contents = newPipelineTemplate();
  await fs.writeFile(path, contents);
  console.info(`Created ${resolve(path)}`);
}

async function runPipelines(
  configPaths: string[],
  {
    cacheIntermediateResults,
    verbose,
    warningsAsErrors,
    defaultPrefixes,
    allowShellScripts,
  }: ICliOptions
) {
  try {
    // Gather all configurations
    const configs: IWorkflowData[] = [];
    for (const path of ge1(configPaths))
      configs.push(await configFromPath(path, { secrets: process.env, defaultPrefixes }));
    const config = mergeConfigurations(configs);

    // Run them all. The supervisor handles dependencies.
    new WorkflowSupervisor(config).runAll({
      cacheIntermediateResults,
      verbose,
      warningsAsErrors,
      allowShellScripts,
    });
  } catch (error) {
    console.error(Report.ERROR + error.message ?? error);
    throw error;
  }
}

async function createShaclRules(configPaths: string[]) {
  try {
    const configs = [];
    for (const path of ge1(configPaths))
      configs.push(await configFromPath(path, { secrets: process.env, defaultPrefixes: false }));
    const config = mergeConfigurations(configs);

    Object.entries(config.jobs).forEach(async ([_name, p]) => {
      // TODO: Alternative destinations for `sh:SPARQLRule`s
      await RulesWorker.start(p, process.stdout);
    });
  } catch (error) {
    console.error(Report.ERROR + error.message ?? error);
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) void cli();
