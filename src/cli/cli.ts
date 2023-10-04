#!/usr/bin/env node

import * as dotenv from "dotenv";
import { glob } from "glob";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { stdout } from "node:process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { mergeConfigurations } from "../config/merge.js";
import { IWorkflowData } from "../config/types.js";
import { CONFIG_EXT, CONFIG_FILENAME_YAML, configFromPath } from "../config/validate.js";
import { TEMPDIR } from "../runner/job-supervisor.js";
import { newPipelineTemplate } from "../runner/new-pipeline.js";
import { ShaclRulesWorker } from "../runner/shacl-rules-worker.js";
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
      handler: async (argv) => {
        // Get passed config files or glob them in pwd
        let configFiles = argv["config"];
        if (!configFiles) configFiles = (await glob(`*.${CONFIG_EXT}`)).sort();
        if (configFiles.length == 0)
          console.error(Report.ERROR + `Found 0 *.sqr.yaml workflows to run`);

        await runPipelines(configFiles, {
          cacheIntermediateResults: argv["cache"] ?? false,
          defaultPrefixes: !argv["no-default-prefixes"] ?? false,
          verbose: argv["verbose"] ?? false,
          warningsAsErrors: argv["warnings-as-errors"] ?? false,
          allowShellScripts: argv["exec-shell"] ?? false,
          skipAssertions: argv["skip-assertions"] ?? false,
          skipReasoning: argv["skip-reasoning"] ?? false,
        });
      },
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
        "skip-assertions": {
          type: "boolean",
          desc: "Skip assert job steps",
        },
        "skip-reasoning": {
          type: "boolean",
          desc: "Skip reasoning job steps",
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

async function runPipelines(configPaths: string[], { defaultPrefixes, ...options }: ICliOptions) {
  try {
    // Gather all configurations
    const configs: IWorkflowData[] = [];
    for (const path of ge1(configPaths))
      configs.push(await configFromPath(path, { secrets: process.env, defaultPrefixes }));
    const config = mergeConfigurations(configs);

    // Run them all. The supervisor handles dependencies.
    new WorkflowSupervisor(config).runAll({ defaultPrefixes, ...options });
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
    new ShaclRulesWorker(stdout).start(config);
    // await RulesWorker.start(config, process.stdout);
  } catch (error) {
    console.error(Report.ERROR + error.message ?? error);
    throw error;
  }
}

void cli();
