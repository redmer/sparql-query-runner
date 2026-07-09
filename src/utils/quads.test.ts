import { RdfStore } from "rdf-stores";
import { DataFactory } from "rdf-data-factory";
import { getGraphs, graphsInStream } from "./quads.js";
import { streamOf } from "../../test/helpers/rdf.js";

const DF = new DataFactory();

test("getGraphs lists distinct graphs in a store", async () => {
  const store = RdfStore.createDefault();
  store.addQuad(DF.quad(DF.namedNode("s1"), DF.namedNode("p"), DF.literal("o"), DF.namedNode("g1")));
  store.addQuad(DF.quad(DF.namedNode("s2"), DF.namedNode("p"), DF.literal("o"), DF.namedNode("g2")));
  store.addQuad(DF.quad(DF.namedNode("s3"), DF.namedNode("p"), DF.literal("o"), DF.namedNode("g1")));

  const graphs = await getGraphs(store);
  const values = graphs.map((g) => g.value).sort();
  expect(values).toEqual(["g1", "g2"]);
});

test("graphsInStream reads graphs from an RDF.Stream", async () => {
  const q1 = DF.quad(DF.namedNode("s"), DF.namedNode("p"), DF.literal("o"), DF.namedNode("g1"));
  const q2 = DF.quad(DF.namedNode("s"), DF.namedNode("p"), DF.literal("o"), DF.namedNode("g1"));
  const q3 = DF.quad(DF.namedNode("s"), DF.namedNode("p"), DF.literal("o"), DF.defaultGraph());

  const stream = streamOf([q1, q2, q3]);
  const graphs = await graphsInStream(stream);

  // Deduplication is by reference in the current implementation, but distinct values
  // should be present.
  const values = new Set(graphs.map((g) => g.value));
  expect(values.has("g1")).toBe(true);
  expect(values.has("")).toBe(true);
});
