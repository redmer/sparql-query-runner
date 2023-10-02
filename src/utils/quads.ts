import type * as RDF from "@rdfjs/types";

/** List the graphs in the RDF.Store */
export function getGraphs(store: RDF.Store): Promise<RDF.Quad_Graph[]> {
  return graphsInStream(store.match());
}

export async function graphsInStream(stream: RDF.Stream): Promise<RDF.Quad_Graph[]> {
  return new Promise((resolve, reject) => {
    const graphs: Set<RDF.Quad_Graph> = new Set();

    stream.on("data", (quad: RDF.Quad) => graphs.add(quad.graph));
    stream.once("end", () => resolve([...graphs]));
    stream.once("error", reject);
  });
}
