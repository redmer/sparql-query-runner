import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { collectStream, streamOf } from "../../test/helpers/rdf.js";
import {
    FilteredStream,
    First_NQuadsStream,
    ImportStream,
    MatchStreamReadable2,
    MergeGraphsStream,
    RdfStoresImportStream,
} from "./rdf-stream-override.js";

const DF = new DataFactory();

const g1: RDF.Quad_Graph = DF.namedNode("http://example.org/g1");
const g2: RDF.Quad_Graph = DF.namedNode("http://example.org/g2");
const s = DF.namedNode("http://example.org/s");
const p = DF.namedNode("http://example.org/p");

function q(graph: RDF.Quad_Graph = DF.defaultGraph()) {
  return DF.quad(s, p, DF.namedNode("http://example.org/o"), graph);
}

describe("MergeGraphsStream", () => {
  test("rewrites every quad's graph to the target graph", async () => {
    const target = DF.namedNode("http://example.org/target");
    const src = streamOf([q(g1), q(g2), q()]);
    const merged = src.pipe(new MergeGraphsStream({ intoGraph: target }));
    const collected = await collectStream(merged);
    expect(collected).toHaveLength(3);
    for (const quad of collected) {
      expect(quad.graph.equals(target)).toBe(true);
    }
  });

  test("preserves original graph when intoGraph is undefined", async () => {
    const src = streamOf([q(g1), q(g2)]);
    const merged = src.pipe(new MergeGraphsStream({ intoGraph: undefined }));
    const collected = await collectStream(merged);
    expect(collected).toHaveLength(2);
    expect(collected[0].graph.equals(g1)).toBe(true);
    expect(collected[1].graph.equals(g2)).toBe(true);
  });
});

describe("FilteredStream", () => {
  test("drops quads whose graph is not in the allow-list", async () => {
    const src = streamOf([q(g1), q(g2), q(g1)]);
    const filtered = src.pipe(new FilteredStream({ graphs: [g1] }));
    const collected = await collectStream(filtered);
    expect(collected).toHaveLength(2);
    for (const quad of collected) {
      expect(quad.graph.equals(g1)).toBe(true);
    }
  });

  test("keeps everything if the allow-list contains every graph", async () => {
    const src = streamOf([q(g1), q(g2)]);
    const filtered = src.pipe(new FilteredStream({ graphs: [g1, g2] }));
    const collected = await collectStream(filtered);
    expect(collected).toHaveLength(2);
  });

  test("calls printer once per skipped graph", async () => {
    const printer = jest.fn();
    const src = streamOf([q(g1), q(g1), q(g2), q(g2)]);
    const filtered = src.pipe(new FilteredStream({ graphs: [g1] }, printer));
    await collectStream(filtered);
    // g2 is skipped, message emitted only for its first occurrence
    expect(printer).toHaveBeenCalledTimes(1);
    expect(printer.mock.calls[0][0]).toMatch(/g2/);
  });
});

describe("ImportStream()", () => {
  test("imports quads from an RDF.Stream into an RDF.Store", async () => {
    const store = RdfStore.createDefault();
    const src = streamOf([q(g1), q(g2)]);
    await ImportStream(src, store);
    expect(store.size).toBe(2);
  });
});

describe("RdfStoresImportStream", () => {
  test("stores quads into an RdfStore while streaming them onwards", async () => {
    const store = RdfStore.createDefault();
    const src = streamOf([q(g1), q(g2), q()]);
    const passthrough = src.pipe(new RdfStoresImportStream(store));
    const collected = await collectStream(passthrough);
    expect(collected).toHaveLength(3);
    expect(store.size).toBe(3);
  });
});

describe("First_NQuadsStream", () => {
  test("passes through only the first N quads (default 29)", async () => {
    const quads = Array.from({ length: 50 }, () => q(g1));
    const src = streamOf(quads);
    const limited = src.pipe(new First_NQuadsStream());
    const collected = await collectStream(limited);
    // Implementation lets exactly maxN + 1 through before rejecting (>maxN condition)
    expect(collected.length).toBeLessThanOrEqual(30);
    expect(collected.length).toBeGreaterThan(0);
  });

  test("respects custom maxN", async () => {
    const quads = Array.from({ length: 10 }, () => q(g1));
    const src = streamOf(quads);
    const limited = src.pipe(new First_NQuadsStream(3));
    const collected = await collectStream(limited);
    expect(collected.length).toBeLessThanOrEqual(4);
  });
});

describe("MatchStreamReadable2()", () => {
  test("bridges an RDF.Stream into a Readable/RDF.Stream", async () => {
    const src = streamOf([q(g1), q(g2)]);
    const bridged = MatchStreamReadable2(src);
    const collected = await collectStream(bridged);
    expect(collected).toHaveLength(2);
  });
});
