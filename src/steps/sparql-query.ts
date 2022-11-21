import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import { Quad } from "n3";
import type { IBaseStep } from "../config/types";
import type { PipelinePart, PipelinePartGetter, RuntimeCtx, StepPartInfo } from "../runner/types";
import * as Report from "../utils/report.js";

/** Run a SPARQL query (CONSTRUCT or DESCRIBE) */
export default class SparqlQuadQuery implements PipelinePart<IBaseStep> {
  name = () => "step/sparql-query";

  qualifies(data: IBaseStep): boolean {
    if (data.type !== "sparql-query") return false;
    if (data.url.some((url) => url.endsWith(".ru"))) return false;
    return true;
  }

  async info(data: IBaseStep): Promise<PipelinePartGetter> {
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
          for (const q of queries) {
            const quadStream = await engine.queryQuads(q, {
              sources: context.querySources as any,
            });

            let i = 0;

            quadStream.on("data", (quad: Quad) => {
              context.quadStore.addQuad(quad.subject, quad.predicate, quad.object, quad.graph);
              i++;
            });

            await new Promise((resolve, reject) => {
              Report.print("info", `Processed ${i} quads`);
              quadStream.on("end", resolve);
              quadStream.on("error", reject);
            });
          }
        },
      };
    };
  }
}
