/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "@jest/globals";
import { makeJobRuntimeContext } from "../../test/helpers/job-context.js";
import { parseRdfFile, streamOf } from "../../test/helpers/rdf.js";
import type { IJobStepData } from "../config/types.js";
import { ShaclValidateLocal } from "./shacl-validate-local.js";

function stepData(overrides: Partial<IJobStepData> = {}): IJobStepData {
  return {
    type: "shacl",
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

describe("ShaclValidateLocal", () => {
  test("passes conforming data (people.ttl vs person-shape.ttl)", async () => {
    const warnings: string[] = [];
    const infos: string[] = [];
    const ctx = makeJobRuntimeContext({
      warning: (m: string) => {
        warnings.push(m);
      },
      info: (m: string) => {
        infos.push(m);
      },
    });
    await seedPeople(ctx);

    const step = new ShaclValidateLocal();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/shapes/person-shape.ttl" })
    )(ctx);
    await getter.init!(streamOf([]), ctx.store);
    expect(infos.some((m) => /OK.*conforms/.test(m))).toBe(true);
    expect(warnings.length).toBe(0);
  });

  test("emits warnings when data does not conform (strict shape)", async () => {
    const warnings: string[] = [];
    const ctx = makeJobRuntimeContext({
      warning: (m: string) => {
        warnings.push(m);
      },
    });
    await seedPeople(ctx);

    const step = new ShaclValidateLocal();
    const getter = await step.exec(
      stepData({ access: "test/fixtures/shapes/strict-shape.ttl" })
    )(ctx);
    await getter.init!(streamOf([]), ctx.store);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((m) => /SHACL/.test(m))).toBe(true);
  });
});
