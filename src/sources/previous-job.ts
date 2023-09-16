import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";

export class PreviousJobSource implements WorkflowPart<IJobSourceData> {
  id = () => "sources/job";

  isQualified(_data: IJobSourceData): boolean {
    return true; // We can't check the whole workflow :(
  }

  info(data: IJobSourceData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const jobname = data.access;
      if (context.workflowContext.data.jobs[jobname] === undefined)
        context.error(`No job found named '${jobname}'`);

      return {};
    };
  }
}
