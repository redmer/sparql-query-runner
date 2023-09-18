import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { PassThrough } from "stream";

export interface FilteredGraphOptions {
  graphs?: RDF.Quad_Graph[];
}

export function filteredStream(stream: RDF.Stream, options?: FilteredGraphOptions): RDF.Stream {
  if (!options?.graphs) return stream;
  const out = new PassThrough({ objectMode: true });
  const DF = new DataFactory();

  stream.on("error", (error) => out.emit("error", error));
  stream.on("data", (quad: RDF.Quad) => {
    if (options.graphs.includes(quad.graph))
      out.push(DF.quad(quad.subject, quad.predicate, quad.object, quad.graph));
  });
  stream.on("end", () => out.push(null));

  return out;
}
