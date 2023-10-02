import { QueryStringContext } from "@comunica/types";
import fs from "fs/promises";
import { PassThrough } from "stream";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowModuleExec, WorkflowPartStep } from "../runner/types.js";
import { addPrefixesToQuery } from "../utils/add-prefixes-to-query.js";
import { fileExistsLocally } from "../utils/local-remote-file.js";

/** Run a SPARQL update query (using a POST-enabled endpoint).
 *
 * Update steps are either URLs or complete SPARQL Update queries.
 */
export class AskAssertStep implements WorkflowPartStep {
  id = () => "assert-with-sparql-ask";
  names = ["steps/assert"];

  exec(data: IJobStepData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = addPrefixesToQuery(data.access, context.jobData.prefixes);

      return {
        init: async () => {
          if (context.workflowContext.options.skipAssertions) return;

          const result = await context.engine.queryBoolean(
            queryBody,
            <QueryStringContext>context.queryContext
          );
          if (!result) context.error(`${data?.with?.["message"]}`);
        },
      };
    };
  }
}
