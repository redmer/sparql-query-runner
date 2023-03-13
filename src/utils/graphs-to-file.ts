import fs from "fs";
import N3 from "n3";

export interface GraphToFileOptions {
  graphs?: string[];
  prefixes?: Record<string, string>;
  format?: string;
}

export type FilteredGraphOptions = Omit<GraphToFileOptions, "prefixes" | "format">;

/** Serialize all or specified graphs of a N3.Store to a path */
export async function serialize(store: N3.Store, path: string, options?: GraphToFileOptions) {
  const fd = fs.createWriteStream(path, { encoding: "utf-8" });
  const writer = new N3.StreamWriter(fd, options);

  if (options?.graphs) {
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

export async function filter(store: N3.Store, options: FilteredGraphOptions) {
  const filteredStore = new N3.Store();

  for (const g of options.graphs.sort()) {
    const graph = new N3.NamedNode(g);

    await new Promise((resolve, reject) => {
      const importer = filteredStore.import(store.match(null, null, null, graph));
      importer.on("end", resolve);
      importer.on("error", reject);
    });
  }

  return filteredStore;
}
