/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "@jest/globals";
import type * as RDF from "@rdfjs/types";
import { makeJobRuntimeContext } from "../../test/helpers/job-context.js";
import {
  collectStream,
  parseRdfFile,
  streamOf,
} from "../../test/helpers/rdf.js";
import type { IJobStepData } from "../config/types.js";
import { SparqlConstructQuery } from "./sparql-construct-query.js";

function stepData(overrides: Partial<IJobStepData> = {}): IJobStepData {
  return {
    type: "construct",
    access: "",
    with: {
      credentials: undefined,
      onlyGraphs: [],
      intoGraph: undefined,
    },
    prefixes: {},
    ...overrides,
  } as IJobStepData;
}

describe("SparqlConstructQuery", () => {
  test("runs a query from a local file against seeded store", async () => {
    const ctx = makeJobRuntimeContext();
    // seed the store used by ctx.queryContext
    const quads = await parseRdfFile("test/fixtures/data/people.ttl");
    for (const q of quads) ctx.store.addQuad(q);

    const step = new SparqlConstructQuery();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/queries/uppercase-names.rq" })
    )(ctx);
    const out = (await getter.init!(streamOf([]), ctx.store)) as RDF.Stream;
    const results = await collectStream(out);
    expect(results.length).toBe(2);
    const literals = results.map((q) => q.object.value).sort();
    expect(literals).toEqual(["ALICE", "BOB"]);
  });

  test("runs an inline query with prefix expansion", async () => {
    const ctx = makeJobRuntimeContext();
    const quads = await parseRdfFile("test/fixtures/data/people.ttl");
    for (const q of quads) ctx.store.addQuad(q);
    ctx.jobData.prefixes = { schema: "http://schema.org/" };

    const step = new SparqlConstructQuery();
    const getter = await step.exec(
      stepData({
        access: "CONSTRUCT { ?s schema:name ?n } WHERE { ?s schema:name ?n }",
      })
    )(ctx);
    const out = (await getter.init!(streamOf([]), ctx.store)) as RDF.Stream;
    const results = await collectStream(out);
    expect(results.length).toBe(2);
  });
});
