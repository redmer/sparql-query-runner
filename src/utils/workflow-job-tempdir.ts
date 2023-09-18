import { mkdir } from "fs/promises";
import stringify from "json-stable-stringify";
import path from "path";
import { IJobData, IJobModuleData } from "../config/types.js";
import { WorkflowPart } from "../runner/types.js";
import { digest } from "./digest.js";

/**
 * The cache directory for sparql-query-runner
 * Has lower-level directories for
 * - workflow-sha256/   "workflow-a239fa0"  (hashed filepath to .sqr.yaml)
 *   - job-jobname/     "job-kennisbank"
 *     - modulename     "source/"
 */
export const TEMPDIR = `.cache/sparql-query-runner`;

function jobTempDirName(job: IJobData) {
  return `job-${job.name}`;
}

function moduleTempDirName(module: WorkflowPart, moduleData: IJobModuleData): string[] {
  const [category, lname] = module.id().split("/");
  const hash = digest(stringify(moduleData));
  return [category, lname + hash.slice(0, 7)];
}

export function tempdir(job: IJobData, module: WorkflowPart, data: IJobModuleData) {
  const fullPath = path.join(TEMPDIR, jobTempDirName(job), ...moduleTempDirName(module, data));
  mkdir(fullPath, { recursive: true });
  return fullPath;
}
