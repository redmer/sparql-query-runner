import { mergeConfigurations, mergePrefixes } from "./merge.js";
import { ConfigurationError } from "./validate.js";
import type { IWorkflowData } from "./types.js";

function workflow(overrides: Partial<IWorkflowData>): IWorkflowData {
  return {
    version: "v5",
    prefixes: {},
    jobs: [],
    ...overrides,
  } as IWorkflowData;
}

describe("mergePrefixes()", () => {
  test("merges disjoint prefix sets", () => {
    const out = mergePrefixes([
      { ex: "http://example.org/" },
      { schema: "http://schema.org/" },
    ]);
    expect(out).toEqual({
      ex: "http://example.org/",
      schema: "http://schema.org/",
    });
  });

  test("accepts identical duplicate prefixes", () => {
    const out = mergePrefixes([
      { ex: "http://example.org/" },
      { ex: "http://example.org/" },
    ]);
    expect(out).toEqual({ ex: "http://example.org/" });
  });

  test("throws on conflicting values for the same prefix", () => {
    expect(() =>
      mergePrefixes([
        { ex: "http://example.org/" },
        { ex: "http://other.example/" },
      ])
    ).toThrow(ConfigurationError);
  });

  test("returns {} for an empty list", () => {
    expect(mergePrefixes([])).toEqual({});
  });
});

describe("mergeConfigurations()", () => {
  test("merges jobs from multiple configurations", () => {
    const a = workflow({
      prefixes: { ex: "http://example.org/" },
      jobs: [{ name: "job-a", sources: [], steps: [], targets: [] } as any],
    });
    const b = workflow({
      prefixes: { schema: "http://schema.org/" },
      jobs: [{ name: "job-b", sources: [], steps: [], targets: [] } as any],
    });
    const merged = mergeConfigurations([a, b]);
    expect(merged.version).toBe("v5.compiled");
    expect(merged.prefixes).toEqual({
      ex: "http://example.org/",
      schema: "http://schema.org/",
    });
    expect(merged.jobs.map((j) => j.name)).toEqual(["job-a", "job-b"]);
  });

  test("throws on duplicate job names across configurations", () => {
    const a = workflow({
      jobs: [{ name: "dup", sources: [] } as any],
    });
    const b = workflow({
      jobs: [{ name: "dup", sources: [] } as any],
    });
    expect(() => mergeConfigurations([a, b])).toThrow(/multiple.*'dup'/);
  });

  test("throws on conflicting prefixes across configurations", () => {
    const a = workflow({ prefixes: { ex: "http://example.org/" }, jobs: [] });
    const b = workflow({ prefixes: { ex: "http://other.example/" }, jobs: [] });
    expect(() => mergeConfigurations([a, b])).toThrow(ConfigurationError);
  });

  test("returns an empty compiled workflow for an empty list", () => {
    const merged = mergeConfigurations([]);
    expect(merged.version).toBe("v5.compiled");
    expect(merged.prefixes).toEqual({});
    expect(merged.jobs).toEqual([]);
  });
});
