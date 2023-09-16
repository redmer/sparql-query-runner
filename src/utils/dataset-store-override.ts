import type * as RDF from "@rdfjs/types";
import { RdfStore } from "rdf-stores";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  graph?: RDF.Quad_Graph;
}

/** Override the context/graph of all quads in a RDF Dataset */
export function overrideDataset(
  dataset: RDF.DatasetCore,
  options: OverrideGraphOptions
): RDF.DatasetCore {
  if (!options.graph) return dataset;

  const store = RdfStore.createDefault();
  const df = store.dataFactory;

  for (const { subject, predicate, object } of dataset.match())
    store.addQuad(df.quad(subject, predicate, object, options.graph));

  return dataset.match();
}

/** Override the context/graph of all quads in a RDF Store */
export async function overrideStore<T extends RDF.Store>(
  store: T,
  options: OverrideGraphOptions
): Promise<RDF.Store> {
  if (!options.graph) return store;

  const overriddenStore = RdfStore.createDefault();
  const df = overriddenStore.dataFactory;

  const stream = store.match();
  stream.on("data", (quad) => {
    overriddenStore.addQuad(df.quad(quad.subject, quad.predicate, quad.object, options.graph));
  });
  await new Promise((resolve, reject) => {
    stream.on("error", reject).once("end", resolve);
  });
  return overriddenStore;
}
