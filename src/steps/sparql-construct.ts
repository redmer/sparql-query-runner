import type { Quad } from "@rdfjs/types";
import fs from "fs/promises";
import { NamedNode } from "n3";
import type { IConstructStep } from "../config/types";
import type { ConstructCtx, PipelinePart, PipelinePartGetter, StepPartInfo } from "../runner/types";
import * as Report from "../utils/report.js";

const name = "steps/sparql-construct";

/** Run a SPARQL query (CONSTRUCT or DESCRIBE) */
export default class SparqlQuadQuery implements PipelinePart<IConstructStep> {
  name = () => name;

  qualifies(data: IConstructStep): boolean {
    if (data.type === "sparql-construct") return true;
    return false;
  }

  async info(data: IConstructStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructCtx>): Promise<StepPartInfo> => {
      const queries: string[] = [];
      // let engine: QueryEngine;

      return {
        prepare: async () => {
          if (data.access)
            for (const url of data.access) {
              const body = await fs.readFile(url, { encoding: "utf-8" });
              queries.push(body);
            }
          if (data.construct) queries.push(data.construct);
        },
        start: async () => {
          const targetGraph = data.intoGraph ? new NamedNode(data.intoGraph) : undefined;

          for (const [j, q] of queries.entries()) {
            console.info(`${name}: Executing query '${data.access?.[j] ?? j + 1}'...`);
            const quadStream = await context.engine.queryQuads(q, context.queryContext);
            console.info(`${name}: Query '${data.access?.[j] ?? j + 1}' ` + Report.DONE);

            let i = 0;

            quadStream.on("data", (quad: Quad) => {
              context.quadStore.addQuad(
                quad.subject,
                quad.predicate,
                quad.object,
                targetGraph ?? quad.graph
              );
              i++;
            });

            await new Promise((resolve, reject) => {
              console.info(`${name}: processed ${i} quads`);
              quadStream.on("end", resolve);
              quadStream.on("error", reject);
            });
          }
        },
      };
    };
  }
}
