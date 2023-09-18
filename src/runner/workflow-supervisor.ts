import type { ICliOptions } from "../cli/cli-options.js";
import type { IJobData, IWorkflowData } from "../config/types.js";
import { JobSupervisor } from "./job-supervisor.js";
import { WorkflowRuntimeContext } from "./types.js";

export class WorkflowSupervisor {
  data: IWorkflowData;

  constructor(data: IWorkflowData) {
    this.data = data;
  }

  /** Find all independent jobs */
  independentJobs(): [string, IJobData][] {
    return [...this.data.jobs].filter(([_name, job]) => job.independent);
  }

  /** Find all non-independent jobs */
  dependentJobs(): [string, IJobData][] {
    return [...this.data.jobs].filter(([_name, job]) => !job.independent);
  }

  /** Run all jobs, parallelizing independent ones and dependent ones in the right order. */
  async runAll(options: ICliOptions) {
    const context: WorkflowRuntimeContext = {
      data: this.data,
      options,
    };

    // Independent jobs can run parallel
    await Promise.all(
      this.independentJobs().map(([name, j], i) => {
        console.info(`workflow ${i + 1}: start '${name}'`);
        return new JobSupervisor(name, context).start(j);
      })
    );

    // Dependent jobs must run consecutive
    for (const [i, [name, j]] of Object.entries(this.dependentJobs())) {
      console.info(`workflow ${i + 1}: start '${name}'`);
      await new JobSupervisor(name, context).start(j);
    }
  }
}
