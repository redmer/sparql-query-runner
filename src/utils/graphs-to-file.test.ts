import fs from "node:fs/promises";
import path from "node:path";
import { DataFactory } from "rdf-data-factory";
import { streamOf } from "../../test/helpers/rdf.js";
import { withTempDir } from "../../test/helpers/tempdir.js";
import { serializeStream } from "./graphs-to-file.js";

const DF = new DataFactory();

function samplePersonQuads() {
  return [
    DF.quad(
      DF.namedNode("https://example.org/alice"),
      DF.namedNode("http://schema.org/name"),
      DF.literal("Alice")
    ),
    DF.quad(
      DF.namedNode("https://example.org/alice"),
      DF.namedNode("http://schema.org/age"),
      DF.literal("30", DF.namedNode("http://www.w3.org/2001/XMLSchema#integer"))
    ),
  ];
}

describe("serializeStream()", () => {
  test("writes N-Quads", async () => {
    await withTempDir("serialize-nq", async (dir) => {
      const out = path.join(dir, "out.nq");
      await serializeStream(streamOf(samplePersonQuads()), out, {
        format: "application/n-quads",
      });
      const contents = await fs.readFile(out, "utf-8");
      expect(contents).toContain("https://example.org/alice");
      expect(contents).toContain("Alice");
    });
  });

  test("writes N-Triples (drops graph)", async () => {
    await withTempDir("serialize-nt", async (dir) => {
      const out = path.join(dir, "out.nt");
      const quads = [
        DF.quad(
          DF.namedNode("https://example.org/alice"),
          DF.namedNode("http://schema.org/name"),
          DF.literal("Alice"),
          DF.namedNode("https://example.org/g")
        ),
      ];
      await serializeStream(streamOf(quads), out, { format: "application/n-triples" });
      const contents = await fs.readFile(out, "utf-8");
      expect(contents).toContain("Alice");
      // ntriples must not mention the graph URI
      expect(contents).not.toContain("https://example.org/g");
    });
  });

  test("writes Turtle with prefixes", async () => {
    await withTempDir("serialize-ttl", async (dir) => {
      const out = path.join(dir, "out.ttl");
      await serializeStream(streamOf(samplePersonQuads()), out, {
        format: "text/turtle",
        prefixes: { schema: "http://schema.org/", ex: "https://example.org/" },
      });
      // Give any async pipe a moment to flush (writeStreamRealPretty is fire-and-forget)
      await new Promise((r) => setTimeout(r, 100));
      const contents = await fs.readFile(out, "utf-8");
      expect(contents.length).toBeGreaterThan(0);
      expect(contents).toMatch(/Alice/);
    });
  });
});
