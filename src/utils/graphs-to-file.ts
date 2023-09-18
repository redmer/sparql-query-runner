import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { dirname } from "path";
import { DataFactory } from "rdf-data-factory";
import { storeStream } from "rdf-store-stream";
import { filteredStream } from "./dataset-store-filter.js";
import { overrideStream } from "./dataset-store-override.js";
import type { SerializationFormat } from "./rdf-extensions-mimetype.js";

const DF = new DataFactory();

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

/** Formats that cannot serialize quads, only triples. */
export const ONLY_TRIPLES_NO_QUADS_FORMATS: SerializationFormat[] = [
  "application/n-triples",
  "application/rdf+xml",
  "text/n3",
  "text/turtle",
];

/** Serialize all or specified graphs of a RDF.Store to a path */
export async function serialize(
  store: RDF.Store,
  path: string,
  options?: GraphToFileOptions & FilteredGraphOptions
) {
  const filteredStore = await storeStream(filteredStream(store.match(), options));

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

  const inTriples = ONLY_TRIPLES_NO_QUADS_FORMATS.includes(options.format);
  const dataStream = inTriples
    ? overrideStream(store.match(), { graph: DF.defaultGraph() })
    : store.match();

  // @ts-ignore-next-line
  return dataStream.pipe(streamWriter).pipe(fd);
}

/** Serialize a RDF.Store to a path with a blocking, pretty formatter */
export function serializePretty(store: RDF.Store, path: string, options?: GraphToFileOptions) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(dirname(path), { recursive: true });
    const fd = fs.createWriteStream(path, { encoding: "utf-8" });
    const plainWriter = new N3.Writer(fd, options);

    const inTriples = ONLY_TRIPLES_NO_QUADS_FORMATS.includes(options.format);
    const dataStream = inTriples
      ? overrideStream(store.match(), { graph: DF.defaultGraph() })
      : store.match();

    plainWriter.end((error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    dataStream.on("data", (quad: RDF.Quad) => plainWriter.addQuads([quad]));
    dataStream.on("end", () => plainWriter.end());
  });
}

export function graphSorter(a: RDF.Quad_Graph, b: RDF.Quad_Graph) {
  return a.value > b.value ? 1 : b.value > a.value ? -1 : 0;
}
