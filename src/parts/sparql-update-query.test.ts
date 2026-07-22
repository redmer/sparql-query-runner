/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "@jest/globals";
import { DataFactory } from "rdf-data-factory";
import { makeJobRuntimeContext } from "../../test/helpers/job-context.js";
import { streamOf } from "../../test/helpers/rdf.js";
import type { IJobStepData } from "../config/types.js";
import { SparqlUpdateQuery } from "./sparql-update-query.js";

const DF = new DataFactory();

function stepData(overrides: Partial<IJobStepData> = {}): IJobStepData {
  return {
    type: "update",
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

describe("SparqlUpdateQuery", () => {
  test("executes an inline INSERT DATA update", async () => {
    const ctx = makeJobRuntimeContext();
    ctx.jobData.prefixes = { schema: "http://schema.org/" };

    const step = new SparqlUpdateQuery();
    const getter = await step.exec(
      stepData({
        access: "INSERT DATA { <https://example.org/blog> a schema:Blog }",
      })
    )(ctx);
    // The init function should not throw
    await getter.init!(streamOf([]), ctx.store);

    // Verify update landed in the underlying store
    const found = ctx.store.getQuads(
      DF.namedNode("https://example.org/blog"),
      DF.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DF.namedNode("http://schema.org/Blog"),
      null
    );
    expect(found.length).toBe(1);
  });

  test("executes an update from a local file", async () => {
    const ctx = makeJobRuntimeContext();

    const step = new SparqlUpdateQuery();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/queries/insert-blog.ru" })
    )(ctx);
    await getter.init!(streamOf([]), ctx.store);

    const found = ctx.store.getQuads(
      DF.namedNode("https://example.org/blog"),
      null,
      null,
      null
    );
    expect(found.length).toBeGreaterThan(0);
  });
});
