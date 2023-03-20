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

export class UpdateStepError extends Error {}

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate implements PipelinePart<IUpdateStep> {
  name = () => name;

  qualifies(data: IUpdateStep): boolean {
    if (data.type === "sparql-update") return true;
    return false;
  }

  async info(data: IUpdateStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<StepPartInfo> => {
      const queries: string[] = [];
      // let engine: QueryEngine;
      if (data.access)
        for (const url of data.access) {
          const body = await fs.readFile(url, { encoding: "utf-8" });
          queries.push(body);
        }
      if (data.update) queries.push(data.update);

      return {
        start: async () => {
          for (const [j, q] of queries.entries()) {
            console.info(`${name}: Executing query '${data.access?.[j] ?? j + 1}'...`);
            // There are no results from a QueryVoid (Update Query)
            await context.engine.queryVoid(q, context.queryContext);
            console.info(`${name}: Query '${data.access?.[j] ?? j + 1}' ` + Report.DONE);
          }
        },
      };
    };
  }
}
