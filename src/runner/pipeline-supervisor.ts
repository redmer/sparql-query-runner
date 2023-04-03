import type { IConfiguration, IPipeline } from "../config/types";
import type { ICliOptions } from "../config/validate";
import * as PipelineWorker from "./pipeline-worker.js";

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
  // Independent pipelines can run parallel
  await Promise.all(
    independentPipelines(data).map((p, i) => {
      console.info(`workflow ${i + 1}: start '${p.name}'`);
      return PipelineWorker.start(p, options);
    })
  );

  // Dependent pipelines must run consecutive
  for await (const [i, p] of Object.entries(dependentPipelines(data))) {
    console.group(`${Number(i) + 1}: workflow '${p.name}'`);
    await PipelineWorker.start(p, options);
    console.groupEnd();
  }
}
