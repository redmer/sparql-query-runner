import stringify from "json-stable-stringify";
import { IJobModuleData } from "../config/types.js";
import { digest } from "./digest.js";

/**
 * The cache directory for sparql-query-runner
 * Has lower-level directories for
 * - job-jobname/     "job-kennisbank"
 *   - modulename     "source/"
 */
export const TEMPDIR = `.cache/sparql-query-runner`;

/** Calculate deterministic digest of a job module data object */
export function moduleDataDigest(data: IJobModuleData) {
  return digest(stringify(data));
}
