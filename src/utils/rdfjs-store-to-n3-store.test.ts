import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { convertStore } from "./rdfjs-store-to-n3-store.js";

const DF = new DataFactory();

test("convertStore mirrors all quads into an n3.Store", async () => {
  const source = RdfStore.createDefault();
  source.addQuad(DF.quad(DF.namedNode("s1"), DF.namedNode("p"), DF.literal("o1")));
  source.addQuad(
    DF.quad(DF.namedNode("s2"), DF.namedNode("p"), DF.literal("o2"), DF.namedNode("g"))
  );

  const dest = await convertStore(source);

  expect(dest.size).toBe(2);
  expect(dest.getQuads(DF.namedNode("s1"), null, null, null)).toHaveLength(1);
  expect(dest.getQuads(DF.namedNode("s2"), null, null, DF.namedNode("g"))).toHaveLength(1);
});
