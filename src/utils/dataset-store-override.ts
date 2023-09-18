import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { PassThrough } from "stream";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  graph?: RDF.Quad_Graph;
}

export function overrideStream(stream: RDF.Stream, options: OverrideGraphOptions): RDF.Stream {
  if (!options?.graph) return stream;

  const out = new PassThrough({ objectMode: true });
  const DF = new DataFactory();

  stream.on("error", (error) => out.emit("error", error));
  stream.on("data", (quad: RDF.Quad) =>
    out.push(DF.quad(quad.subject, quad.predicate, quad.object, options.graph))
  );
  stream.on("end", () => out.push(null));
  return out;
}
