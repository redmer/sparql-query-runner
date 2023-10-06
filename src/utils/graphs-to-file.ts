import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { DataFactory } from "rdf-data-factory";
import { PassThrough } from "stream";
import { pipeline } from "stream/promises";
import { Prefixes } from "../config/types.js";
import type { SerializationFormat } from "./rdf-extensions-mimetype.js";
import { MatchStreamReadable2, MergeGraphsStream } from "./rdf-stream-override.js";

const DF = new DataFactory();

export interface GraphToFileOptions {
  prefixes?: Prefixes;
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

export async function serializeStream(
  stream: RDF.Stream,
  path: string,
  options?: GraphToFileOptions
) {
  // If a pretty serialization isn't required, use streaming serializer
  if (STREAMABLE_FORMATS.includes(options.format)) return writeStream(stream, path, options);

  return await writeStreamPretty(stream, path, options);
}

/** Serialize an RDF.Stream to a path formatted as NQ / NT */
export function writeStream(stream: RDF.Stream, path: string, options: GraphToFileOptions) {
  const inTriples = ONLY_TRIPLES_NO_QUADS_FORMATS.includes(options.format);

  return pipeline(
    MatchStreamReadable2(stream),
    inTriples
      ? new MergeGraphsStream({ intoGraph: DF.defaultGraph() })
      : new PassThrough({ objectMode: true }),
    new N3.StreamWriter(options),
    fs.createWriteStream(path, { encoding: "utf-8" })
  );
}

/** Serialize an RDF.Stream to a path with a blocking, pretty formatter */
export function writeStreamPretty(stream: RDF.Stream, path: string, options: GraphToFileOptions) {
  return new Promise((resolve, reject) => {
    const fd = fs.createWriteStream(path, { encoding: "utf-8" });
    const plainWriter = new N3.Writer(fd, options);

    const inTriples = ONLY_TRIPLES_NO_QUADS_FORMATS.includes(options.format);

    const quadStream = MatchStreamReadable2(stream).pipe(
      inTriples
        ? new MergeGraphsStream({ intoGraph: DF.defaultGraph() })
        : new PassThrough({ objectMode: true })
    );

    quadStream.on("error", reject);
    quadStream.on("end", () =>
      plainWriter.end((error, result) => {
        if (error) return reject(error);
        resolve(result);
      })
    );
    quadStream.on("data", (quad: RDF.Quad) => {
      plainWriter.addQuads([quad]);
    });
  });
}
