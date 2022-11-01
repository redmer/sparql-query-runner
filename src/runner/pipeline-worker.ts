import chalk from "chalk";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { IPipeline, IStep } from "../config/types";
import Step from "../steps";
import { error } from "../utils/errors";
import { TempdirProvider } from "./types";

export namespace PipelineWorker2 {
  
}

/** Runs the a single pipeline */
export class PipelineWorker implements TempdirProvider {
  name: string;
  endpoint: string;
  tempdir: string;
  steps: IStep[];
  prefixes: Record<string, string>;

  constructor(config: IPipeline) {
    this.name = config.name;
    this.endpoint = config.endpoint;
    this.prefixes = config.prefixes;
    this.steps = config.steps;
    this.tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "sqr-"), { encoding: "utf-8" });
    if (process.env.DEBUG)
      console.info(chalk.inverse("\tDEBUG:") + `\tArtifacts in "${this.tempdir}"`);
  }

  async start() {
    for (const [i, stepConfig] of this.steps.entries()) {
      console.info(`\tStep ${i + 1}: ${stepConfig.type}`);
      const s = await Step(stepConfig);
      const info = await s(this);

      try {
        if (info.preProcess) await info.preProcess();
        await info.start();
        if (info.postProcess) await info.postProcess();
      } catch (err) {
        error(1001, `FAIL: ${(err as any)?.message}`);
      }
    }

    console.info(`Done`);
  }
}
