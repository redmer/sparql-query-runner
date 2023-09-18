import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { DataFactory } from "rdf-data-factory";
import { storeStream } from "rdf-store-stream";
import { PassThrough } from "stream";
import { pipeline } from "stream/promises";
import type { SerializationFormat } from "./rdf-extensions-mimetype.js";
import { filteredStream } from "./rdf-stream-filter.js";
import { SingleGraphStream, StoreStream } from "./rdf-stream-override.js";

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

  return pipeline(
    new StoreStream(store.match()),
    inTriples
      ? new SingleGraphStream({ graph: DF.defaultGraph() })
      : new PassThrough({ objectMode: true }),
    streamWriter,
    fd
  );
}

/** Serialize a RDF.Store to a path with a blocking, pretty formatter */
export function serializePretty(store: RDF.Store, path: string, options?: GraphToFileOptions) {
  return new Promise((resolve, reject) => {
    // fs.mkdirSync(dirname(path), { recursive: true });
    const fd = fs.createWriteStream(path, { encoding: "utf-8" });
    const plainWriter = new N3.Writer(fd, options);

    const inTriples = ONLY_TRIPLES_NO_QUADS_FORMATS.includes(options.format);

    const quadStream = new StoreStream(store.match()).pipe(
      inTriples
        ? new SingleGraphStream({ graph: DF.defaultGraph() })
        : new PassThrough({ objectMode: true })
    );

    // plainWriter.end((error, result) => {
    //   if (error) return reject(error);
    //   resolve(result);
    // });

    quadStream.on("data", (quad: RDF.Quad) => plainWriter.addQuads([quad]));
    quadStream.on("end", () =>
      plainWriter.end((error, result) => {
        if (error) return reject(error);
        resolve(result);
      })
    );
  });
}
