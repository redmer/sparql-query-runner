import { describe, expect, test } from "@jest/globals";
import fs from "node:fs/promises";
import path from "node:path";
import type { ICliOptions } from "../../src/cli/cli-options.js";
import { configFromString } from "../../src/config/validate.js";
import { WorkflowSupervisor } from "../../src/runner/workflow-supervisor.js";
import { parseRdfFile } from "../helpers/rdf.js";
import { withTempDir } from "../helpers/tempdir.js";

const MINIMAL_WORKFLOW = path.resolve(
  "test/fixtures/workflows/minimal.sqr.yaml"
);

function defaultCliOptions(overrides: Partial<ICliOptions> = {}): ICliOptions {
  return {
    verbosityLevel: 0,
    warningsAsErrors: false,
    defaultPrefixes: false,
    allowShellScripts: false,
    skipAssertions: false,
    skipReasoning: false,
    cacheIntermediateResults: false,
    ...overrides,
  };
}

describe("WorkflowSupervisor (local end-to-end)", () => {
  test("loads a workflow fixture, executes it, and writes the CONSTRUCT output to disk", async () => {
    await withTempDir("local-pipeline", async (dir) => {
      const outPath = path.join(dir, "out.nq");

      // Load the fixture workflow and substitute the output-path placeholder.
      const rawTemplate = await fs.readFile(MINIMAL_WORKFLOW, "utf-8");
      const substituted = rawTemplate.replace(
        "OUTPUT_PATH_PLACEHOLDER",
        outPath
      );

      const config = await configFromString(substituted, {
        secrets: {},
        defaultPrefixes: false,
      });
      expect(config.jobs).toHaveLength(1);

      const supervisor = new WorkflowSupervisor(config);
      await supervisor.runAll(defaultCliOptions());

      // Output file should exist and contain the CONSTRUCT-derived UCASE names.
      const stat = await fs.stat(outPath);
      expect(stat.isFile()).toBe(true);

      const quads = await parseRdfFile(outPath);
      const names = quads
        .filter((q) => q.predicate.value === "http://schema.org/name")
        .map((q) => q.object.value)
        .sort();

      // Must include the original names AND the UCASE-derived names.
      expect(names).toEqual(expect.arrayContaining(["Alice", "Bob"]));
      expect(names).toEqual(expect.arrayContaining(["ALICE", "BOB"]));
    });
  }, 30_000);

  test("runs two independent local jobs in parallel via runAll", async () => {
    await withTempDir("local-pipeline-multi", async (dir) => {
      const out1 = path.join(dir, "one.nq");
      const out2 = path.join(dir, "two.nq");

      const template = `
version: v5
prefixes:
  ex: https://example.org/
  schema: http://schema.org/
jobs:
  job-one:
    independent: true
    sources:
      - file: test/fixtures/data/people.ttl
    targets:
      - file: ${out1}
  job-two:
    independent: true
    sources:
      - file: test/fixtures/data/people.ttl
    targets:
      - file: ${out2}
`.trim();

      const config = await configFromString(template, {
        secrets: {},
        defaultPrefixes: false,
      });
      expect(config.jobs).toHaveLength(2);

      const supervisor = new WorkflowSupervisor(config);
      await supervisor.runAll(defaultCliOptions());

      const q1 = await parseRdfFile(out1);
      const q2 = await parseRdfFile(out2);
      expect(q1.length).toBeGreaterThan(0);
      expect(q2.length).toBeGreaterThan(0);
    });
  }, 30_000);
});
