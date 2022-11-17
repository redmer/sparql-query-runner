import type { ICliOptions } from "../config/configuration";
import type { IConfiguration, IPipeline } from "../config/types";
import { Workflow } from "./pipeline-worker.js";

/** PipelineRunner is responsible for kicking off the right pipeline in the right order. */
export namespace PipelineSupervisor {
  /** Find all independent pipelines */
  function independentPipelines(data: IConfiguration): IPipeline[] {
    return data.pipelines.filter((p) => p.independent);
  }

  /** Find all non-independent pipelines */
  function dependentPipelines(data: IConfiguration): IPipeline[] {
    return data.pipelines.filter((p) => !p.independent);
  }

  /** Run all pipelines, parallelizing independent ones and dependent ones serialized. */
  export async function runAll(data: IConfiguration, options: ICliOptions) {
    // Independent pipelines can run parallel
    await Promise.all(
      independentPipelines(data).map((p, i) => {
        console.group(`independent pipeline ${i}`);
        Workflow.start(p, options);
        console.groupEnd();
      })
    );

    // Dependent pipelines must run consecutive
    dependentPipelines(data).forEach(async (p, i) => {
      console.group(`pipeline ${i}`);
      await Workflow.start(p, options);
      console.groupEnd();
    });
  }
}
