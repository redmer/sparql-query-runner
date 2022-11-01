import { IConfiguration, IPipeline } from "../config/types";
import { PipelineWorker } from "./pipeline-worker";

/** PipelineRunner is responsible for kicking off the right pipeline in the right order. */
export namespace PipelineSupervisor {
  function independentPipelines(data: IConfiguration): IPipeline[] {
    return data.pipelines.filter((p) => p.independent);
  }

  function dependentPipelines(data: IConfiguration): IPipeline[] {
    return data.pipelines.filter((p) => !p.independent);
  }

  /** Run all pipelines, parallelizing independent ones and dependent ones serialized. */
  export async function runAll(data: IConfiguration) {
    // Independent pipelines can run parallel
    await Promise.all(independentPipelines(data).map((p) => new PipelineWorker(p).start()));

    // Dependent pipelines must run consecutive
    dependentPipelines(data).forEach(async (p) => {
      const runner = new PipelineWorker(p);
      await runner.start();
    });
  }
}
