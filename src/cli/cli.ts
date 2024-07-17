#!/usr/bin/env node

import * as dotenv from "dotenv";
import { glob } from "glob";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { mergeConfigurations } from "../config/merge.js";
import { CONFIG_EXT, CONFIG_FILENAME_YAML, configFromPath } from "../config/validate.js";
import { TEMPDIR } from "../runner/job-supervisor.js";
import { newPipelineTemplate } from "../runner/new-pipeline.js";
import { ShaclRulesWorker } from "../runner/shacl-rules-worker.js";
import { WorkflowSupervisor } from "../runner/workflow-supervisor.js";
import { ge1 } from "../utils/array.js";
import { Bye, Done } from "../utils/report.js";
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
        if (configFiles.length == 0) Bye(`Found 0 *.sqr.yaml workflows to run`);

        // Then pass them on to the executor
        await runPipelines(configFiles, {
          cacheIntermediateResults: argv["cache"] ?? false,
          defaultPrefixes: !argv["no-default-prefixes"] ?? false,
          verbosityLevel: argv["verbose"] > 5 ? 5 : argv["verbose"], // max 5 = trace
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
          type: "array",
          desc: "Path to workflow file(s)",
        },
        verbose: {
          alias: "V",
          type: "count",
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
        output: {
          alias: "o",
          type: "string",
          desc: "Path to output rules to",
        },
      },
      handler: async (argv) => await createShaclRules(argv["config"], argv["output"]),
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
  try {
    await fs.rm(TEMPDIR, { recursive: true, force: force });
    Done(`cleaned cache dir <${TEMPDIR}>`);
  } catch (error) {
    Bye(`when clearing cache:` + error);
  }
}

async function createNewPipelineFile(path: string) {
  try {
    const contents = newPipelineTemplate();
    await fs.writeFile(path, contents);
    Done(`created <${resolve(path)}>`);
  } catch (error) {
    Bye(`when creating a new pipeline:` + error);
  }
}

async function runPipelines(configPaths: string[], { defaultPrefixes, ...options }: ICliOptions) {
  try {
    for (const path of ge1(configPaths)) {
      const config = await configFromPath(path, { secrets: process.env, defaultPrefixes });
      // Run them all. The supervisor handles job dependencies.
      new WorkflowSupervisor(config).runAll({ defaultPrefixes, ...options });
    }
  } catch (error) {
    Bye(`during workflow execution (stopping all):` + error);
  }
}

async function createShaclRules(configPaths: string[], output: string) {
  try {
    const configs = [];
    for (const path of ge1(configPaths))
      configs.push(await configFromPath(path, { secrets: process.env, defaultPrefixes: false }));

    const config = mergeConfigurations(configs);
    new ShaclRulesWorker().start(config, output);
  } catch (error) {
    Bye(`during SHACL rule creation:` + error);
  }
}

void cli();
