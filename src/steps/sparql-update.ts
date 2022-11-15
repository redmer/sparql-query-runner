import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import { Quad } from "n3";
import type { IStep } from "../config/types";
import type { PipelinePart, PipelinePartGetter, RuntimeCtx, StepPartInfo } from "../runner/types";
import { Report } from "../utils/report.js";

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate implements PipelinePart<IStep> {
  name = () => "sparql-update-step";

  match(data: IStep): boolean {
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
/** Run a SPARQL query (CONSTRUCT or DESCRIBE) */
export class SparqlQuadQuery implements PipelinePart<IStep> {
  name = () => "sparql-quads-query-step";

  match(data: IStep): boolean {
    if (data.type !== "sparql-query") return false;
    if (data?.url.find((url) => url.endsWith(".ru"))) return false;
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
          for (const q of queries) {
            const quadStream = await engine.queryQuads(q, {
              sources: context.querySources as any,
            });

            quadStream.on("data", (quad: Quad) =>
              context.quadStore.addQuad(quad.subject, quad.predicate, quad.object, quad.graph)
            );

            await new Promise((resolve, reject) => {
              quadStream.on("end", resolve);
              quadStream.on("error", reject);
            });
          }
        },
      };
    };
  }
}
