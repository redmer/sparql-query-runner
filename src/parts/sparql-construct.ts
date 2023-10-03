import { QueryStringContext } from "@comunica/types";
import type * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import type { IJobStepData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowModuleExec, WorkflowPartStep } from "../runner/types.js";
import { addPrefixesToQuery } from "../utils/add-prefixes-to-query.js";
import { fileExistsLocally } from "../utils/local-remote-file.js";

/** Run a SPARQL query (CONSTRUCT or DESCRIBE) -- always locally */
export class SparqlConstructQuery implements WorkflowPartStep {
  id = () => "sparql-construct-query-step";
  names = ["steps/construct"];

  exec(data: IJobStepData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = addPrefixesToQuery(data.access, context.jobData.prefixes);

      return {
        init: async (_stream: RDF.Stream): Promise<RDF.Stream> => {
          return await context.engine.queryQuads(
            queryBody,
            <QueryStringContext>context.queryContext
          );
        },
      };
    };
  }
}
