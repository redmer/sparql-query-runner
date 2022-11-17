import fs from "fs/promises";
import { Store, WriterOptions, Writer, OTerm } from "n3";
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
