import fs from "fs/promises";
import type { IUpdateStep } from "../config/types";
import type {
  ConstructRuntimeCtx,
  PipelinePart,
  PipelinePartGetter,
  StepPartInfo,
} from "../runner/types";
import * as Report from "../utils/report.js";

const name = "steps/sparql-update";

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate implements PipelinePart<IUpdateStep> {
  name = () => name;

  qualifies(data: IUpdateStep): boolean {
    if (data.type === "sparql-update") return true;
    if (data.url.find((url) => url.endsWith(".rq"))) return false;
    return false;
  }

  async info(data: IUpdateStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<StepPartInfo> => {
      const queries: string[] = [];
      // let engine: QueryEngine;

      return {
        prepare: async () => {
          for (const url of data.url) {
            const body = await fs.readFile(url, { encoding: "utf-8" });
            queries.push(body);
          }
          // engine = new QueryEngine();
        },
        start: async () => {
          for (const [i, q] of queries.entries()) {
            console.info(`${name}: Executing query '${data.url[i]}'...`);
            // There are no results from a QueryVoid (Update Query)
            await context.engine.queryVoid(q, context.queryContext);
            console.info(`${name}: Query '${data.url[i]}' ` + Report.DONE);
          }
        },
      };
    };
  }
}
