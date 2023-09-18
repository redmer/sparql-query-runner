import fs from "fs/promises";
import type { IJobStepData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { addPrefixesToQuery } from "../utils/add-prefixes-to-query.js";
import { overrideStream } from "../utils/dataset-store-override.js";
import { fileExistsLocally } from "../utils/local-remote-file.js";

/** Run a SPARQL query (CONSTRUCT or DESCRIBE) -- always locally */
export class SparqlQuadQuery implements WorkflowPart<IJobStepData> {
  id = () => "steps/construct";

  info(data: IJobStepData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = addPrefixesToQuery(data.access, context.data.prefixes);

      return {
        start: async () => {
          context.info(`Executing query '${data.access.substring(0, 32)}'...`);
          const tripleStream = await context.engine.queryQuads(queryBody, context.queryContext);

          // let store = await storeStream(tripleStream);
          // store = await overrideStore(store, { graph: data?.with?.targetGraph });
          // const emitter = context.quadStore.import(store.match());

          const emitter = context.quadStore.import(
            overrideStream(tripleStream, { graph: data?.with?.targetGraph })
          );

          await new Promise((resolve, reject) => {
            emitter.on("end", resolve);
            emitter.on("error", reject);
          });
        },
      };
    };
  }
}
