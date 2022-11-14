import N3 from "n3";
import fs from "fs";

export interface GraphToFileOptions {
  graphs?: string[];
  prefixes?: Record<string, string>;
  format?: string;
}

/** Serialize all or specified graphs of a N3.Store to a path */
export async function serialize(store: N3.Store, path: string, options?: GraphToFileOptions) {
  const fd = fs.createWriteStream(path, { encoding: "utf-8" });
  const writer = new N3.StreamWriter(fd, {
    prefixes: options.prefixes,
    format: options.format,
  });

  if (options.graphs) {
    // Write streams per-graph
    for (const g of options.graphs.sort()) {
      const graph = new N3.NamedNode(g);
      writer.write(store.match(null, null, null, graph));
    }
  } else {
    // All graphs
    writer.write(store.match());
  }

  await new Promise((resolve, reject) => {
    writer.on("end", resolve);
    writer.on("error", reject);
  });
}
