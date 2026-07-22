import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { filteredStream, overrideStream } from "./rdf-stream-filter.js";
import { collectStream, streamOf } from "../../test/helpers/rdf.js";

const DF = new DataFactory();

const g1: RDF.Quad_Graph = DF.namedNode("http://example.org/g1");
const g2: RDF.Quad_Graph = DF.namedNode("http://example.org/g2");
const s = DF.namedNode("http://example.org/s");
const p = DF.namedNode("http://example.org/p");

function q(graph: RDF.Quad_Graph = DF.defaultGraph()) {
  return DF.quad(s, p, DF.namedNode("http://example.org/o"), graph);
}

describe("filteredStream()", () => {
  test("returns the original stream unchanged when no graphs option is supplied", () => {
    const src = streamOf([q(g1)]);
    expect(filteredStream(src)).toBe(src);
  });

  test("returns the original stream unchanged when options.graphs is undefined", () => {
    const src = streamOf([q(g1)]);
    expect(filteredStream(src, {})).toBe(src);
  });

  test("filters quads by graph when graphs are specified (identity match)", async () => {
    // Note: the deprecated filteredStream uses Array.includes, which requires reference equality.
    const gGraph = g1;
    const gOther = g2;
    const src = streamOf([q(gGraph), q(gOther), q(gGraph)]);
    const filtered = filteredStream(src, { graphs: [gGraph] });
    const collected = await collectStream(filtered);
    // Same reference used, so both matches pass. Non-matches are dropped.
    expect(collected).toHaveLength(2);
    for (const quad of collected) {
      expect(quad.graph.equals(gGraph)).toBe(true);
    }
  });
});

describe("overrideStream()", () => {
  test("returns the original stream unchanged when no intoGraph option is supplied", () => {
    const src = streamOf([q(g1)]);
    expect(overrideStream(src, {})).toBe(src);
  });

  test("rewrites every quad's graph to intoGraph", async () => {
    const target = DF.namedNode("http://example.org/target");
    const src = streamOf([q(g1), q(g2), q()]);
    const overridden = overrideStream(src, { intoGraph: target });
    const collected = await collectStream(overridden);
    expect(collected).toHaveLength(3);
    for (const quad of collected) {
      expect(quad.graph.equals(target)).toBe(true);
    }
  });
});
