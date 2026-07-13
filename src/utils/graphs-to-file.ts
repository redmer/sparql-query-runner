import Serializer from "@rdfjs/serializer-turtle";
import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import fsp from "node:fs/promises";
import pathlib from "node:path";
import { finished } from "node:stream/promises";
import { DataFactory } from "rdf-data-factory";
import { PassThrough } from "stream";
import { Prefixes } from "../config/types.js";
import type { SerializationFormat } from "./rdf-extensions-mimetype.js";
import {
  MatchStreamReadable2,
  MergeGraphsStream,
} from "./rdf-stream-override.js";

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

export const PRETTY_FORMATS: SerializationFormat[] = ["text/turtle"];

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
  // Ensure that the output path exists
  await fsp.mkdir(pathlib.dirname(path), { recursive: true });
  // Pretty formats are tried first
  if (PRETTY_FORMATS.includes(options.format))
    return writeStreamRealPretty(stream, path, options);
  // If a pretty serialization isn't required, use streaming serializer
  if (STREAMABLE_FORMATS.includes(options.format))
    return writeStream(stream, path, options);

  return await writeStreamPretty(stream, path, options);
}

/** Serialize an RDF.Stream to a path formatted as NQ / NT.
 *
 * Historically this used `pipeline()` across
 *   `MatchStreamReadable2 -> [Merge|PassThrough] -> N3.StreamWriter -> fs write`,
 * but `N3.StreamWriter` extends `readable-stream`'s `Transform`. When Jest
 * runs with `--experimental-vm-modules`, `readable-stream` can end up
 * instantiated in a different realm than Node's builtin `stream`, and
 * `pipeline()` then never resolves ("Exporting..." prints but no `DONE`
 * follows). To eliminate that inter-realm coupling we drive the writer
 * manually with the plain Node `Readable`s we already control, and use
 * `finished()` on the file descriptor as the completion signal.
 */
export async function writeStream(
  stream: RDF.Stream,
  path: string,
  options: GraphToFileOptions
) {
  const inTriples = ONLY_TRIPLES_NO_QUADS_FORMATS.includes(options.format);
  const upstream = MatchStreamReadable2(stream).pipe(
    inTriples
      ? new MergeGraphsStream({ intoGraph: DF.defaultGraph() })
      : new PassThrough({ objectMode: true })
  );

  return new Promise<void>((resolve, reject) => {
    const fd = fs.createWriteStream(path, { encoding: "utf-8" });
    const writer = new N3.Writer(fd, options);

    let settled = false;
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) return reject(err);
      resolve();
    };

    upstream.on("error", done);
    fd.on("error", done);
    fd.on("close", () => done());

    upstream.on("data", (quad: RDF.Quad) => writer.addQuad(quad));
    upstream.on("end", () => {
      writer.end((err) => {
        if (err) return done(err);
        // `fd` will emit `close` once flushed; wait for it via `finished`.
        finished(fd).then(() => done(), done);
      });
    });
  });
}

/** Generate a Map that looks like an RDFJS PrefixMap (but isn't) */
function prefixMapFromPrefixes(prefixes: Prefixes): Map<string, RDF.NamedNode> {
  const array: [string, RDF.NamedNode][] = [];
  for (const [alias, ns] of Object.entries(prefixes)) {
    array.push([alias, DF.namedNode(ns)]);
  }
  return new Map(array);
}

/** Serialize an RDF.Stream to a path pretty formatted as Turtle. This is heavy on memory use. */
export async function writeStreamRealPretty(
  stream: RDF.Stream,
  path: string,
  options: GraphToFileOptions
) {
  // The `prefixes` option doesn't actually require a full PrefixMap; a Map suffices.
  // Cast via `unknown` to satisfy the strict PrefixMap type shape.
  const serializer = new Serializer({
    prefixes: prefixMapFromPrefixes(
      options.prefixes
    ) as unknown as ConstructorParameters<typeof Serializer>[0]["prefixes"],
  });
  const output = serializer.import(stream);
  // @ts-expect-error (The output stream can be piped.)
  output.pipe(fs.createWriteStream(path, { encoding: "utf-8" }));
}

/** Serialize an RDF.Stream to a path with a blocking, pretty formatter */
function writeStreamPretty(
  stream: RDF.Stream,
  path: string,
  options: GraphToFileOptions
) {
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
