import { QueryStringContext } from "@comunica/types";
import fs from "fs/promises";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowModuleExec, WorkflowPartStep } from "../runner/types.js";
import { addPrefixesToQuery } from "../utils/add-prefixes-to-query.js";
import { fileExistsLocally } from "../utils/local-remote-file.js";

/** Run a SPARQL update query (using a POST-enabled endpoint).
 *
 * Update steps are either URLs or complete SPARQL Update queries.
 */
export class SparqlUpdate implements WorkflowPartStep {
  id = () => "steps/update";
  names = ["steps/update"];

  asStep(data: IJobStepData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = addPrefixesToQuery(data.access, context.jobData.prefixes);

      return {
        start: async () => {
          context.info(`Executing query '${data.access}'...`);
          await context.engine.queryVoid(queryBody, <QueryStringContext>context.queryContext);
        },
      };
    };
  }
}
