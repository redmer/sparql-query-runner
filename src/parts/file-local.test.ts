import { describe, expect, test } from "@jest/globals";
import type * as RDF from "@rdfjs/types";
import path from "node:path";
import { DataFactory } from "rdf-data-factory";
import { makeJobRuntimeContext } from "../../test/helpers/job-context.js";
import { collectStream, parseRdfFile, streamOf } from "../../test/helpers/rdf.js";
import { withTempDir } from "../../test/helpers/tempdir.js";
import type { IJobSourceData, IJobTargetData } from "../config/types.js";
import type { WorkflowPartGetter } from "../runner/types.js";
import { LocalFileSource, LocalFileTarget } from "./file-local.js";

const DF = new DataFactory();

function sourceData(overrides: Partial<IJobSourceData> = {}): IJobSourceData {
  return {
    type: "file",
    access: "test/fixtures/data/people.ttl",
    with: {
      credentials: undefined,
      onlyGraphs: [],
      intoGraph: undefined,
    },
    prefixes: {},
    ...overrides,
  } as IJobSourceData;
}

function targetData(overrides: Partial<IJobTargetData> = {}): IJobTargetData {
  return {
    type: "file",
    access: "out.ttl",
    with: {
      credentials: undefined,
      onlyGraphs: [],
      intoGraph: undefined,
    },
    prefixes: {},
    ...overrides,
  } as IJobTargetData;
}

describe("LocalFileSource.isQualified", () => {
  const src = new LocalFileSource();

  test("qualifies a plain local path", () => {
    expect(src.isQualified(sourceData({ access: "./data.ttl" }))).toBe(true);
    expect(src.isQualified(sourceData({ access: "/tmp/data.ttl" }))).toBe(true);
    expect(src.isQualified(sourceData({ access: "data.ttl" }))).toBe(true);
  });

  test("qualifies an http URL with onlyGraphs filter", () => {
    const g: RDF.Quad_Graph = DF.namedNode("http://example.org/g");
    expect(
      src.isQualified(
        sourceData({
          access: "https://example.org/data.ttl",
          with: { credentials: undefined, onlyGraphs: [g], intoGraph: undefined },
        })
      )
    ).toBe(true);
  });

  test("qualifies an http URL with intoGraph filter", () => {
    const g: RDF.Quad_Graph = DF.namedNode("http://example.org/into");
    expect(
      src.isQualified(
        sourceData({
          access: "https://example.org/data.ttl",
          with: { credentials: undefined, onlyGraphs: [], intoGraph: g },
        })
      )
    ).toBe(true);
  });

  test("shouldCacheAccess returns true", () => {
    expect(src.shouldCacheAccess(sourceData())).toBe(true);
  });
});

describe("LocalFileSource.exec", () => {
  test("parses a local Turtle file into an RDF.Stream", async () => {
    const src = new LocalFileSource();
    const ctx = makeJobRuntimeContext();
    const getter: WorkflowPartGetter = await src.exec(sourceData())(ctx);
    expect(getter.init).toBeDefined();
    const stream = (await getter.init!(streamOf([]), null as never)) as RDF.Stream;
    const quads = await collectStream(stream);
    // people.ttl: alice (a, name, age) + bob (a, name, age) = 6 quads
    expect(quads.length).toBe(6);
  });
});

describe("LocalFileTarget.exec", () => {
  test("serializes an RDF.Stream to a file (round-trip) as N-Quads", async () => {
    await withTempDir("file-local-target", async (dir) => {
      const outPath = path.join(dir, "out.nq");
      const input = await parseRdfFile("test/fixtures/data/people.ttl");
      const target = new LocalFileTarget();
      const ctx = makeJobRuntimeContext();
      const getter: WorkflowPartGetter = await target.exec(targetData({ access: outPath }))(ctx);
      await getter.init!(streamOf(input), null as never);

      const roundTrip = await parseRdfFile(outPath);
      expect(roundTrip.length).toBe(input.length);
    });
  });
});
