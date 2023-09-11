import fs from "fs/promises";
import { storeStream } from "rdf-store-stream";
import type { IJobStepData } from "../config/types";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";
import { overrideStore } from "../utils/dataset-store-override";
import { fileExistsLocally } from "../utils/local-remote-file";

/** Run a SPARQL query (CONSTRUCT or DESCRIBE) */
export default class SparqlQuadQuery implements WorkflowPart<IJobStepData> {
  id = () => "steps/construct";

  info(data: IJobStepData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      let queryBody: string;

      if (fileExistsLocally(data.access))
        queryBody = await fs.readFile(data.access, { encoding: "utf-8" });
      else queryBody = data.access;

      return {
        start: async () => {
          context.info(`Executing query '${data.access.substring(0, 32)}'...`);
          const tripleStream = await context.engine.queryQuads(queryBody, context.queryContext);

          let store = await storeStream(tripleStream);
          store = await overrideStore(store, { graph: data?.with?.targetGraph });
          const emitter = context.quadStore.import(store.match());

          await new Promise((resolve, reject) => {
            emitter.on("end", resolve);
            emitter.on("error", reject);
          });
        },
      };
    };
  }
}
