import fs from "fs";
import N3 from "n3";

export interface GraphToFileOptions {
  graphs?: string[];
  prefixes?: Record<string, string>;
  format?: string;
}

export type FilteredGraphOptions = Omit<GraphToFileOptions, "prefixes" | "format">;

export function serializeStreamingly(store: N3.Store, path: string, options?: GraphToFileOptions) {
  const fd = fs.createWriteStream(path, { encoding: "utf-8" });
  const streamWriter = new N3.StreamWriter(options);
  if (options?.graphs) {
    // Write streams per-graph
    for (const g of options.graphs.sort()) {
      const graph = new N3.NamedNode(g);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      return store.match(null, null, null, graph).pipe(streamWriter).pipe(fd);
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore-next-line
    return store.match(null, null, null, null).pipe(streamWriter).pipe(fd);
  }
}

/** Serialize all or specified graphs of a N3.Store to a path */
export function serialize(store: N3.Store, path: string, options?: GraphToFileOptions) {
  return new Promise((resolve, reject) => {
    // If a pretty serialization isn't required, use a more efficient streaming serializer
    if (["application/n-quads", "application/n-triples"].includes(options.format))
      resolve(serializeStreamingly(store, path, options));

    // Else, use a blocking, pretty writer
    const fd = fs.createWriteStream(path, { encoding: "utf-8" });
    const plainWriter = new N3.Writer(fd, options);

    if (options?.graphs) {
      // Write streams per-graph
      for (const g of options.graphs.sort()) {
        const graph = new N3.NamedNode(g);
        plainWriter.addQuads(store.getQuads(null, null, null, graph));
      }
    } else {
      // All graphs
      plainWriter.addQuads(store.getQuads(null, null, null, null));
    }

    plainWriter.end((error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
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
