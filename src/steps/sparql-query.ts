import { QueryEngine } from "@comunica/query-sparql";
import type { IDataSource } from "@comunica/types";
import fs from "fs/promises";
import { Quad } from "n3";
import type { IConstructStep } from "../config/types";
import type {
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
  StepPartInfo,
} from "../runner/types";
import * as Report from "../utils/report.js";

/** Run a SPARQL query (CONSTRUCT or DESCRIBE) */
export default class SparqlQuadQuery implements PipelinePart<IConstructStep> {
  name = () => "steps/sparql-query";

  qualifies(data: IConstructStep): boolean {
    if (data.type === "sparql-construct") return true;
    if (data.url.some((url) => url.endsWith(".ru"))) return false;
    return true;
  }

  async info(data: IConstructStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<StepPartInfo> => {
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
              sources: context.querySources as [IDataSource, ...IDataSource[]],
            });

            let i = 0;

            quadStream.on("data", (quad: Quad) => {
              context.quadStore.addQuad(quad.subject, quad.predicate, quad.object, quad.graph);
              i++;
            });

            await new Promise((resolve, reject) => {
              Report.info(`Processed ${i} quads`);
              quadStream.on("end", resolve);
              quadStream.on("error", reject);
            });
          }
        },
      };
    };
  }
}
