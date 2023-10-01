import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowModuleInfo, WorkflowPart } from "../runner/types.js";

export class PreviousJobSource implements WorkflowPart<"sources"> {
  id = () => "previous-job-source";
  names = ["sources/job"];

  isQualified(_data: IJobSourceData): boolean {
    return true; // We can't check the whole workflow :(
  }

  asSource(data: IJobSourceData): WorkflowModuleInfo {
    return async (context: JobRuntimeContext) => {
      const jobname = data.access;
      if (context.workflowContext.data.jobs[jobname] === undefined)
        context.error(`No job found named '${jobname}'`);

      return {};
    };
  }
}
