import type { ICliOptions } from "../cli/cli-options.js";
import type { IJobData, IWorkflowData } from "../config/types.js";
import * as Report from "../utils/report.js";
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
    const wfInfo = Report.infoMsg(`jobs`, 0);
    const context: WorkflowRuntimeContext = {
      data: this.data,
      options,
    };

    const indep = this.independentJobs();
    const dep = this.dependentJobs();

    if (indep.length && dep.length) wfInfo(`Starting independent jobs...`);
    else wfInfo(`Starting jobs...`);

    // Independent jobs can run parallel
    await Promise.all(
      indep.map(([name, j]) => {
        return new JobSupervisor(name, context).start(j);
      })
    );

    if (indep.length && dep.length) wfInfo(`Starting dependent jobs...`);

    // Dependent jobs must run consecutive: await them each
    for (const [name, j] of dep) {
      await new JobSupervisor(name, context).start(j);
    }

    wfInfo(Report.DONE);
  }
}
