import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { PassThrough } from "stream";
import { rdfTermSort } from "./rdf-term-sort.js";

export interface FilteredGraphOptions {
  graphs?: RDF.Quad_Graph[];
}

/** Filter graphs in RDF Dataset */
export function filteredDataset(
  dataset: RDF.DatasetCore,
  options: FilteredGraphOptions
): RDF.DatasetCore {
  if (!options?.graphs) return dataset;
  const graphs = options.graphs.sort(rdfTermSort);

  // This RDF.Store only contains the requested graphs
  const filteredStore = RdfStore.createDefault();
  const df = filteredStore.dataFactory;

  for (const g of graphs) {
    const stream = dataset.match(undefined, undefined, undefined, g);
    for (const { subject, predicate, object, graph } of stream)
      filteredStore.addQuad(df.quad(subject, predicate, object, graph));
  }

  return filteredStore.asDataset();
}

/** Filter graphs in RDF Store */
export async function filteredStore(
  store: RDF.Store,
  options?: FilteredGraphOptions
): Promise<RDF.Store> {
  if (!options?.graphs) return store;
  const graphs = options?.graphs?.sort(rdfTermSort);

  const filteredStore = RdfStore.createDefault();

  for (const g of graphs) {
    const stream = store.match(undefined, undefined, undefined, g);
    await new Promise((resolve, reject) => {
      filteredStore.import(stream).on("error", reject).once("end", resolve);
    });
  }

  return filteredStore;
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
