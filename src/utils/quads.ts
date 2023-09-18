import type * as RDF from "@rdfjs/types";

/** List the graphs in the RDF.Store */
export async function getGraphs(store: RDF.Store): Promise<RDF.Quad_Graph[]> {
  return new Promise((resolve, _reject) => {
    const graphs: Set<RDF.Quad_Graph> = new Set();
    const stream = store.match(undefined, undefined, undefined, undefined);

    stream.on("data", (quad: RDF.Quad) => {
      graphs.add(quad.graph);
    });

    stream.on("end", () => {
      return resolve([...graphs]);
    });
  });
}
