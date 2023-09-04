import type { ICliOptions } from "../cli/cli-options.js";
import type { IConfigurationData, IJobData } from "../config/types.js";
import { CacheLayerJob } from "../utils/layer-cache.js";
import * as JobWorker from "./job-supervisor.js";

/** Find all independent jobs */
function independentJobs(data: IConfigurationData): [string, IJobData][] {
  return [...data.jobs].filter(([_name, job]) => job.independent);
}

/** Find all non-independent jobs */
function dependentJobs(data: IConfigurationData): [string, IJobData][] {
  return [...data.jobs].filter(([_name, job]) => !job.independent);
}

/** Run all jobs, parallelizing independent ones and dependent ones in the right order. */
export async function runAll(data: IConfigurationData, options: ICliOptions) {
  // Independent jobs can run parallel
  await Promise.all(
    independentJobs(data).map(([name, j], i) => {
      console.info(`workflow ${i + 1}: start '${name}'`);
      return JobWorker.start(name, j, options, data, []);
    })
  );

  const precedingJobs: CacheLayerJob[] = [];
  // Dependent jobs must run consecutive
  for (const [i, [name, j]] of Object.entries(dependentJobs(data))) {
    console.group(`${Number(i) + 1}: workflow '${name}'`);
    const layer = await JobWorker.start(name, j, options, data, precedingJobs);
    precedingJobs.push(layer);
    console.groupEnd();
  }
}
