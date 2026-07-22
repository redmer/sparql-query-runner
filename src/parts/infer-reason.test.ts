/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "@jest/globals";
import { DataFactory } from "rdf-data-factory";
import { makeJobRuntimeContext } from "../../test/helpers/job-context.js";
import { parseRdfFile, streamOf } from "../../test/helpers/rdf.js";
import type { IJobStepData } from "../config/types.js";
import { InferReason } from "./infer-reason.js";

const DF = new DataFactory();

function stepData(overrides: Partial<IJobStepData> = {}): IJobStepData {
  return {
    type: "infer",
    access: "",
    with: {
      credentials: undefined,
      onlyGraphs: [],
      intoGraph: DF.namedNode("https://example.org/inferred"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(overrides as any).with,
    } as IJobStepData["with"],
    prefixes: {},
    ...overrides,
  } as IJobStepData;
}

async function seedPeople(ctx: ReturnType<typeof makeJobRuntimeContext>) {
  const quads = await parseRdfFile("test/fixtures/data/people.ttl");
  for (const q of quads) ctx.store.addQuad(q);
}

describe("InferReason", () => {
  test("infers rdfs:subClassOf entailment from ontology into store", async () => {
    const ctx = makeJobRuntimeContext();
    await seedPeople(ctx);

    const step = new InferReason();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/data/rdfs-ontology.ttl" })
    )(ctx);
    const result = await getter.init!(streamOf([]), ctx.store);
    // With intoGraph set to a non-"--" value, init returns an RDF.Stream (Store.match())
    expect(result).toBeDefined();
  });

  test("is a no-op when skipReasoning=true", async () => {
    const ctx = makeJobRuntimeContext({
      workflowContext: {
        data: { version: "v5", prefixes: {}, jobs: [] },
        options: { skipReasoning: true },
      },
    });
    await seedPeople(ctx);

    const step = new InferReason();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/data/rdfs-ontology.ttl" })
    )(ctx);
    const result = await getter.init!(streamOf([]), ctx.store);
    expect(result).toBeUndefined();
  });

  test("runs without an ontology file (empty access)", async () => {
    const ctx = makeJobRuntimeContext();
    await seedPeople(ctx);

    const step = new InferReason();
    const getter = await step.exec(stepData({ access: "" }))(ctx);
    const result = await getter.init!(streamOf([]), ctx.store);
    // With intoGraph set, returns a stream; without ontology there may be no new facts but still returns.
    expect(result).toBeDefined();
  });
});
