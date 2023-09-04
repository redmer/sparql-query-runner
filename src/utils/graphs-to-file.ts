import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { dirname } from "path";
import { RdfStore } from "rdf-stores";
import type { SerializationFormat } from "./rdf-extensions-mimetype.js";

export interface FilteredGraphOptions {
  graphs?: RDF.Quad_Graph[];
}

export interface GraphToFileOptions {
  prefixes?: Record<string, string>;
  format?: SerializationFormat;
}

/**
 * Streamable formats do not use () or [] that may have other references.
 * They are also line-sortable.
 */
export const STREAMABLE_FORMATS: SerializationFormat[] = [
  "application/n-quads",
  "application/n-triples",
];

/** Serialize all or specified graphs of a RDF.Store to a path */
export async function serialize(
  store: RDF.Store,
  path: string,
  options?: GraphToFileOptions & FilteredGraphOptions
) {
  const filteredStore = await filter(store, options);
  // If a pretty serialization isn't required, use streaming serializer
  if (STREAMABLE_FORMATS.includes(options.format))
    return await serializeStreamingly(filteredStore, path, options);
  return await serializePretty(filteredStore, path, options);
}

/** Serialize a RDF.Store to a path formatted as NQ / NT */
export function serializeStreamingly(store: RDF.Store, path: string, options?: GraphToFileOptions) {
  // Output sinks
  const fd = fs.createWriteStream(path, { encoding: "utf-8" });
  const streamWriter = new N3.StreamWriter(options);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore-next-line
  return store.match().pipe(streamWriter).pipe(fd);
}

/** Serialize a RDF.Store to a path with a blocking, pretty formatter */
export function serializePretty(store: RDF.Store, path: string, options?: GraphToFileOptions) {
  fs.mkdirSync(dirname(path), { recursive: true });
  const fd = fs.createWriteStream(path, { encoding: "utf-8" });
  const plainWriter = new N3.Writer(fd, options);

  return new Promise((resolve, reject) => {
    plainWriter.end((error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    const stream = store.match();
    stream.on("data", (quad: RDF.Quad) => plainWriter.addQuads([quad]));
    stream.on("end", () => plainWriter.end());
  });
}

export async function filter(store: RDF.Store, options: FilteredGraphOptions): Promise<RDF.Store> {
  // Sort filtered graphs. If there are none, return the original store
  if (!options.graphs) return store;
  const graphs = options.graphs.sort(graphSorter);

  // This RDF.Store only contains the requested graphs
  const filteredStore = RdfStore.createDefault();

  for (const g of graphs) {
    void (await new Promise((resolve, _reject) => {
      const task = filteredStore.import(store.match(undefined, undefined, undefined, g));
      task.on("end", () => resolve(undefined));
    }));
  }

  return filteredStore;
}

export function graphSorter(a: RDF.Quad_Graph, b: RDF.Quad_Graph) {
  return a.value > b.value ? 1 : b.value > a.value ? -1 : 0;
}
