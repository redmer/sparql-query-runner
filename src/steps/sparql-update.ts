import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import type { IStep } from "../config/types";
import type { PipelinePart, PipelinePartGetter, RuntimeCtx, StepPartInfo } from "../runner/types";
import { Report } from "../utils/report.js";

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate implements PipelinePart<IStep> {
  name = () => "sparql-update-step";

  qualifies(data: IStep): boolean {
    if (data.type !== "sparql-update") return false;
    if (data.url.find((url) => url.endsWith(".rq"))) return false;
    return false;
  }

  async info(data: IStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<StepPartInfo> => {
      const queries: string[] = [];
      let engine: QueryEngine;

      return {
        prepare: async () => {
          for (const url of data.url) {
            const body = await fs.readFile(url, { encoding: "utf-8" });
            queries.push(body);
          }
          engine = new QueryEngine();
        },
        start: async () => {
          for (const [i, q] of queries.entries()) {
            const msg = `Performing query ${data.url[i]}...\r`;
            Report.print("info", msg);

            // There are no results from a QueryVoid (Update Query)
            await engine.queryVoid(q, {
              sources: context.querySources as any,
              destination: context.queryContext.destination,
            });

            Report.done(msg);
          }
        },
      };
    };
  }
}
