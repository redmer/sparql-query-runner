import fs from "fs/promises";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { addPrefixesToQuery } from "../utils/add-prefixes-to-query.js";
import { fileExistsLocally } from "../utils/local-remote-file.js";

/** Run a SPARQL update query (using a POST-enabled endpoint).
 *
 * Update steps are either URLs or complete SPARQL Update queries.
 */
export default class SparqlUpdate implements WorkflowPart<IJobStepData> {
  id = () => "steps/update";

  info(data: IJobStepData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = addPrefixesToQuery(data.access, context.data.prefixes);

      return {
        start: async () => {
          context.info(`Executing query '${data.access}'...`);
          await context.engine.queryVoid(queryBody, context.queryContext);
        },
      };
    };
  }
}
