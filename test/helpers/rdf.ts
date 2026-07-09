import type * as RDF from "@rdfjs/types";
import fs from "node:fs";
import fsp from "node:fs/promises";
import N3 from "n3";
import { PassThrough, Readable } from "node:stream";

/** Parse a Turtle/TriG/NQuads string into an array of quads. */
export function parseRdf(source: string, format = "text/turtle"): RDF.Quad[] {
  const parser = new N3.Parser({ format });
  return parser.parse(source) as unknown as RDF.Quad[];
}

/** Parse a Turtle/TriG file on disk into an array of quads. */
export async function parseRdfFile(path: string, format?: string): Promise<RDF.Quad[]> {
  const contents = await fsp.readFile(path, { encoding: "utf-8" });
  const guessed =
    format ??
    (path.endsWith(".trig")
      ? "application/trig"
      : path.endsWith(".nq") || path.endsWith(".nquads")
      ? "application/n-quads"
      : path.endsWith(".nt")
      ? "application/n-triples"
      : "text/turtle");
  return parseRdf(contents, guessed);
}

/** Load an RDF file into an in-memory N3.Store. */
export async function loadStore(path: string): Promise<N3.Store> {
  const store = new N3.Store();
  const quads = await parseRdfFile(path);
  store.addQuads(quads);
  return store;
}

/** Collect an RDF.Stream to an array. */
export function collectStream(stream: RDF.Stream): Promise<RDF.Quad[]> {
  return new Promise((resolve, reject) => {
    const acc: RDF.Quad[] = [];
    // Some sources may not emit 'end'/'error' unless piped through a passthrough
    const pt = new PassThrough({ objectMode: true });
    stream.on("data", (q: RDF.Quad) => pt.write(q));
    stream.on("end", () => pt.end());
    stream.on("error", (e) => pt.destroy(e));

    pt.on("data", (q: RDF.Quad) => acc.push(q));
    pt.on("end", () => resolve(acc));
    pt.on("error", reject);
  });
}

/** Turn an array of quads into a Readable RDF.Stream. */
export function streamOf(quads: RDF.Quad[]): Readable & RDF.Stream {
  return Readable.from(quads, { objectMode: true }) as Readable & RDF.Stream;
}

export function fileExists(path: string): boolean {
  return fs.existsSync(path);
}
