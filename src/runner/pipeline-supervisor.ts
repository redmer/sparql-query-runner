import type { ICliOptions } from "../config/configuration";
import type { IConfiguration, IPipeline } from "../config/types";
import * as Report from "../utils/report.js";
import * as PipelineWorker from "./pipeline-worker.js";
import * as RulesWorker from "./shacl-rules-worker.js";
import type { Worker } from "./types";

/** Find all independent pipelines */
function independentPipelines(data: IConfiguration): IPipeline[] {
  return data.pipelines.filter((p) => p.independent);
}

/** Find all non-independent pipelines */
function dependentPipelines(data: IConfiguration): IPipeline[] {
  return data.pipelines.filter((p) => !p.independent);
}

/** Run all pipelines, parallelizing independent ones and dependent ones in the right order. */
export async function runAll(data: IConfiguration, options: ICliOptions) {
  if (options.outputShaclRulesToFilePath)
    return data.pipelines.forEach(async (p) => {
      await RulesWorker.start(p, options);
    });

  // Independent pipelines can run parallel
  await Promise.all(
    independentPipelines(data).map((p, i) => {
      Report.group(`independent pipeline ${i}`);
      PipelineWorker.start(p, options);
      Report.groupEnd();
    })
  );

  // Dependent pipelines must run consecutive
  dependentPipelines(data).forEach(async (p, i) => {
    Report.group(`pipeline ${i}`);
    await PipelineWorker.start(p, options);
    Report.groupEnd();
  });
}
