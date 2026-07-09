import type { IJobModuleData } from "../config/types.js";
import { moduleDataDigest } from "./workflow-job-tempdir.js";

function makeData(overrides: Partial<IJobModuleData> = {}): IJobModuleData {
  return {
    type: "sources/file",
    access: "test.ttl",
    with: { credentials: undefined, onlyGraphs: undefined, intoGraph: undefined },
    prefixes: {},
    ...overrides,
  } as IJobModuleData;
}

describe("moduleDataDigest()", () => {
  test("is deterministic for equal input", () => {
    expect(moduleDataDigest(makeData())).toEqual(moduleDataDigest(makeData()));
  });

  test("is stable across object-key ordering", () => {
    const a = makeData({ type: "sources/file", access: "a.ttl" });
    const b = { access: "a.ttl", type: "sources/file" } as unknown as IJobModuleData;
    // Assign remaining required fields in reversed order
    (b as IJobModuleData).with = a.with;
    (b as IJobModuleData).prefixes = a.prefixes;
    expect(moduleDataDigest(a)).toEqual(moduleDataDigest(b));
  });

  test("differs when access changes", () => {
    expect(moduleDataDigest(makeData({ access: "a.ttl" }))).not.toEqual(
      moduleDataDigest(makeData({ access: "b.ttl" }))
    );
  });
});
