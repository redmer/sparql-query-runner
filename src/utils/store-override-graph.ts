import type * as RDF from "@rdfjs/types";
import type { AsyncIterator } from "asynciterator";
import { DataFactory } from "rdf-data-factory";

/**
 * Make a new Quad Stream that overrides its quads to a single value.
 *
 * @param inStream The input Stream
 * @param targetGraph The quad's graph to be overridden. Else, keep input quad's graph
 * @param factory Override the default RDFJS DataFactory
 * @deprecated
 */
export function overrideGraphQuadStream(
  inStream: AsyncIterator<RDF.Quad> & RDF.ResultStream<RDF.Quad>,
  targetGraph?: RDF.Quad_Graph,
  factory?: RDF.DataFactory
): AsyncIterator<RDF.Quad> & RDF.ResultStream<RDF.Quad> {
  const f = factory ?? new DataFactory();

  return inStream.map((quad) =>
    f.quad(quad.subject, quad.predicate, quad.object, targetGraph ?? quad.graph)
  );
}
