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
export class SparqlUpdateQuery implements WorkflowPartStep {
  id = () => "sparql-update-query";
  names = ["steps/update"];

  exec(data: IJobStepData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = addPrefixesToQuery(data.access, context.jobData.prefixes);

      return {
        init: async () => {
          await context.engine.queryVoid(queryBody, <QueryStringContext>context.queryContext);
        },
      };
    };
  }
}
