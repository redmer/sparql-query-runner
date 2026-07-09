import { describe, expect, test } from "@jest/globals";
import { makeJobRuntimeContext } from "../../test/helpers/job-context.js";
import { parseRdfFile, streamOf } from "../../test/helpers/rdf.js";
import type { IJobStepData } from "../config/types.js";
import { AskAssertStep } from "./ask-assert.js";

function stepData(overrides: Partial<IJobStepData> = {}): IJobStepData {
  return {
    type: "assert",
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

async function seedPeople(ctx: ReturnType<typeof makeJobRuntimeContext>) {
  const quads = await parseRdfFile("test/fixtures/data/people.ttl");
  for (const q of quads) ctx.store.addQuad(q);
}

describe("AskAssertStep", () => {
  test("passes when the assertion holds (from file)", async () => {
    const ctx = makeJobRuntimeContext();
    await seedPeople(ctx);

    const step = new AskAssertStep();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/queries/assert-has-persons.rq" })
    )(ctx);

    await expect(getter.init!(streamOf([]), ctx.store)).resolves.toBeUndefined();
  });

  test("fails via context.error when assertion is false", async () => {
    let errored = "";
    const ctx = makeJobRuntimeContext({
      error: ((m: string) => {
        errored = m;
        throw new Error(m);
      }) as (m: string) => never,
    });

    const step = new AskAssertStep();
    const data = stepData({ access: "test/fixtures/queries/assert-never.rq" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data.with as any).message = "must have things";
    const getter = await step.exec(data)(ctx);

    await expect(getter.init!(streamOf([]), ctx.store)).rejects.toThrow();
    expect(errored).toMatch(/must have things|assertion not met/);
  });

  test("is a no-op when skipAssertions=true", async () => {
    let errored = false;
    const ctx = makeJobRuntimeContext({
      workflowContext: {
        data: { version: "v5", prefixes: {}, jobs: [] },
        options: { skipAssertions: true },
      },
      error: ((m: string) => {
        errored = true;
        throw new Error(m);
      }) as (m: string) => never,
    });

    const step = new AskAssertStep();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/queries/assert-never.rq" })
    )(ctx);
    await expect(getter.init!(streamOf([]), ctx.store)).resolves.toBeUndefined();
    expect(errored).toBe(false);
  });
});
