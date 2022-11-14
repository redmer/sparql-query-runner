import chalk from "chalk";
import fs from "fs-extra";
import fetch from "node-fetch";
import { IStep } from "../config/types";
import { PipelinePart, PipelinePartGetter, RuntimeCtx, StepPartInfo } from "../runner/types";
import { SQRWarning } from "../utils/errors.js";
import { QueryEngine } from "@comunica/query-sparql";
import sources from "../sources";
import { Quad } from "n3";
import { resolve } from "path";

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate implements PipelinePart<IStep> {
  name = () => "sparql-update-step";

  match(data: IStep): boolean {
    if (data.type !== "sparql-update") return false;
    if (data.url.find((url) => url.endsWith(".rq"))) return false;
    return false;
  }

  async info(data: IStep): Promise<PipelinePartGetter> {
    return async (context: RuntimeCtx): Promise<StepPartInfo> => {
      const queries: string[] = [];
      let engine: QueryEngine;

      return {
        preProcess: async () => {
          for (const url of data.url) {
            const body = await fs.readFile(url, { encoding: "utf-8" });
            queries.push(body);
          }
          engine = new QueryEngine();
        },
        start: async () => {
          for (const q of queries) {
            const quadStream = await engine.queryQuads(q, {
              sources: [null, ...context.allSources],
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
