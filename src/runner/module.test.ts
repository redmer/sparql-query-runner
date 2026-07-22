import { describe, expect, test } from "@jest/globals";
import type { IJobData, IJobModuleData } from "../config/types.js";
import { KNOWN_MODULES, ModuleMatcherError, match } from "./module.js";

/** Build a module-shaped payload with sensible defaults. */
function moduleData(overrides: Partial<IJobModuleData> = {}): IJobModuleData {
  return {
    type: "sources/file",
    access: "test/fixtures/data/people.ttl",
    with: {
      credentials: undefined,
      onlyGraphs: [],
      intoGraph: undefined,
    },
    prefixes: {},
    ...overrides,
  } as IJobModuleData;
}

describe("match()", () => {
  test("selects LocalFileSource for a plain local .ttl access", async () => {
    const job: IJobData = {
      name: "j",
      sources: [moduleData({ type: "sources/file", access: "./data.ttl" })],
      steps: [],
      targets: [],
    };
    const result = await match(job);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].module.id()).toBe("local-file-source");
    expect(result.steps).toHaveLength(0);
    expect(result.targets).toHaveLength(0);
  });

  test("selects LocalFileTarget for targets/file", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [],
      targets: [moduleData({ type: "targets/file", access: "out.ttl" })],
    };
    const result = await match(job);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].module.id()).toBe("local-file-target");
  });

  test("selects SparqlConstructQuery for steps/construct", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [
        moduleData({
          type: "steps/construct",
          access: "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
        }),
      ],
      targets: [],
    };
    const result = await match(job);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].module.id()).toBe("sparql-construct-query-step");
  });

  test("selects SparqlUpdateQuery for steps/update", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [
        moduleData({
          type: "steps/update",
          access: "INSERT DATA { <urn:a> <urn:b> <urn:c> }",
        }),
      ],
      targets: [],
    };
    const result = await match(job);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].module.id()).toBe("sparql-update-query");
  });

  test("selects AskAssertStep for steps/assert", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [moduleData({ type: "steps/assert", access: "ASK { ?s ?p ?o }" })],
      targets: [],
    };
    const result = await match(job);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].module.id()).toBe("assert-with-sparql-ask");
  });

  test("selects InferReason for steps/infer", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [moduleData({ type: "steps/infer", access: "" })],
      targets: [],
    };
    const result = await match(job);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].module.id()).toBe("hylar-entailment-step");
  });

  test("selects ShaclValidateLocal for steps/shacl", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [
        moduleData({
          type: "steps/shacl",
          access: "test/fixtures/shapes/person-shape.ttl",
        }),
      ],
      targets: [],
    };
    const result = await match(job);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].module.id()).toBe("shacl-validate-local-step");
  });

  test("preserves the order of steps as declared", async () => {
    const job: IJobData = {
      name: "j",
      sources: [],
      steps: [
        moduleData({ type: "steps/infer", access: "" }),
        moduleData({
          type: "steps/construct",
          access: "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
        }),
        moduleData({ type: "steps/assert", access: "ASK { ?s ?p ?o }" }),
      ],
      targets: [],
    };
    const result = await match(job);
    expect(result.steps.map((s) => s.module.id())).toEqual([
      "hylar-entailment-step",
      "sparql-construct-query-step",
      "assert-with-sparql-ask",
    ]);
  });

  test("throws ModuleMatcherError for an unknown type", async () => {
    const job: IJobData = {
      name: "j",
      sources: [
        moduleData({ type: "sources/does-not-exist", access: "whatever" }),
      ],
      steps: [],
      targets: [],
    };
    await expect(match(job)).rejects.toBeInstanceOf(ModuleMatcherError);
    await expect(match(job)).rejects.toThrow(/sources\/does-not-exist/);
  });

  test("returns empty phase arrays when phase is omitted", async () => {
    const job: IJobData = { name: "empty" };
    const result = await match(job);
    expect(result.sources).toEqual([]);
    expect(result.steps).toEqual([]);
    expect(result.targets).toEqual([]);
  });
});

describe("KNOWN_MODULES registry", () => {
  test("every known module has an id() and at least one name", () => {
    for (const m of KNOWN_MODULES) {
      expect(typeof m.id()).toBe("string");
      expect(m.id().length).toBeGreaterThan(0);
      expect(Array.isArray(m.names)).toBe(true);
      expect(m.names.length).toBeGreaterThan(0);
    }
  });

  test("module ids are unique", () => {
    const ids = KNOWN_MODULES.map((m) => m.id());
    expect(new Set(ids).size).toBe(ids.length);
  });
});
