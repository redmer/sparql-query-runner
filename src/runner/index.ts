import fs from "fs-extra";
import os from "os";
import path from "path";
import { IPipeline, IStep } from "../config/types";
import Step from "../steps";
import { SQRError, SQRInfo } from "../utils/errors";
import { TempdirProvider } from "./types";

/** Runs the a single pipeline */
export class PipelineSupervisor implements TempdirProvider {
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
    SQRInfo(`\tDEBUG:\tRun artifacts in "${this.tempdir}"`);
  }

  async start() {
    for (const [i, stepConfig] of this.steps.entries()) {
      SQRInfo(`\tStep ${i + 1}: ${stepConfig.type}`);
      const s = await Step(stepConfig);
      const info = await s(this);

      try {
        if (info.preProcess) await info.preProcess();
        await info.start();
        if (info.postProcess) await info.postProcess();
      } catch (error) {
        SQRError(1001, `FAIL: ${(error as any).message}`);
      }
    }

    SQRInfo(`Done`);
  }
}
