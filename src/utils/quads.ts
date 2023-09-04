import type * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import { OTerm, Store, Writer, WriterOptions } from "n3";
import path from "path";

/**
 * Write contents of Store to file.
 * @param store Source N3 Store
 * @param filepath Destination file path
 * @param includeGraphs Specify included graphs. Default: all
 * @param options Further writer options
 */
export function graphsToFile(
  store: Store,
  filepath: string,
  includeGraphs?: OTerm[],
  options?: WriterOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = new Writer(options);

    if (includeGraphs == undefined) {
      writer.addQuads(store.getQuads(null, null, null, null));
    } else {
      for (const g of includeGraphs) {
        writer.addQuads(store.getQuads(null, null, null, g));
      }
    }

    writer.end(async (error, result: string) => {
      if (error) reject(error);

      await fs.writeFile(path.resolve(filepath), result, { encoding: "utf-8" });
      resolve();
    });
  });
}

/** List the graphs in the RDF.Store */
export async function getGraphs(store: RDF.Store): Promise<RDF.Quad_Graph[]> {
  return new Promise((resolve, _reject) => {
    const graphs: Set<RDF.Quad_Graph> = new Set();
    const stream = store.match(undefined, undefined, undefined, undefined);

    stream.on("data", (quad: RDF.Quad) => {
      graphs.add(quad.graph);
    });

    stream.on("end", () => {
      return resolve([...graphs]);
    });
  });
}
