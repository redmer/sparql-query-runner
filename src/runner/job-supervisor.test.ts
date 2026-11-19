import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { DataFactory } from "rdf-data-factory";
import { parseRdfFile } from "../../test/helpers/rdf.js";
import { withTempDir } from "../../test/helpers/tempdir.js";
import type { ICliOptions } from "../cli/cli-options.js";
import type { IJobData, IJobModuleData, IWorkflowData } from "../config/types.js";
import { JobSupervisor } from "./job-supervisor.js";
import type { WorkflowRuntimeContext } from "./types.js";

const PEOPLE_TTL = path.resolve("test/fixtures/data/people.ttl");
const GRAPHS_TRIG = path.resolve("test/fixtures/data/graphs.trig");
const ASSERT_HAS_PERSONS = path.resolve("test/fixtures/queries/assert-has-persons.rq");
// Sanity: fail fast if fixtures are missing (e.g. wrong cwd).
if (!fs.existsSync(PEOPLE_TTL)) throw new Error(`Fixture missing: ${PEOPLE_TTL}`);
if (!fs.existsSync(GRAPHS_TRIG)) throw new Error(`Fixture missing: ${GRAPHS_TRIG}`);
if (!fs.existsSync(ASSERT_HAS_PERSONS)) throw new Error(`Fixture missing: ${ASSERT_HAS_PERSONS}`);

const DF = new DataFactory();

// Per-test timeout arguments override Jest's global/CLI timeout settings.
// CI runners can be significantly slower for this stream-heavy end-to-end
// supervisor path, so use a larger timeout there to avoid false negatives.
const TEST_TIMEOUT_MS = process.env.CI ? 8 * 60_000 : 30_000;

function moduleData(overrides: Partial<IJobModuleData> = {}): IJobModuleData {
  return {
    type: "sources/file",
    access: "test/fixtures/data/people.ttl",
    with: {
      credentials: undefined,
      onlyGraphs: undefined,
      intoGraph: undefined,
    },
    prefixes: {},
    ...overrides,
  } as IJobModuleData;
}

function silentOptions(overrides: Partial<ICliOptions> = {}): Partial<ICliOptions> {
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

describe("JobSupervisor.start (local-only pipeline)", () => {
  // These tests exercise the full JobSupervisor path (match → sources → steps → targets)
  // using only local modules. They print progress to stdout/stderr; that's acceptable.

  test(
    "runs source → construct → target pipeline and writes N-Quads output",
    async () => {
      await withTempDir("job-supervisor", async (dir) => {
        const outPath = path.join(dir, "out.nq");

        const jobData: IJobData = {
          name: "local-job",
          sources: [
            moduleData({
              type: "sources/file",
              access: PEOPLE_TTL,
            }),
          ],
          steps: [
            moduleData({
              type: "steps/construct",
              access:
                "PREFIX schema: <http://schema.org/>\nCONSTRUCT { ?s schema:name ?u } WHERE { ?s schema:name ?n . BIND(UCASE(?n) AS ?u) }",
            }),
          ],
          targets: [
            moduleData({
              type: "targets/file",
              access: outPath,
            }),
          ],
        };

        const workflowData: IWorkflowData = {
          version: "v5",
          prefixes: {},
          jobs: [jobData],
        };
        const context: WorkflowRuntimeContext = {
          data: workflowData,
          options: silentOptions(),
        };

        const supervisor = new JobSupervisor("local-job", context);
        await supervisor.start(jobData);

        // out.nq contains the CONSTRUCT result plus the source quads (target
        // reads from the shared store), so length >= 2 (two UCASE names).
        const roundTrip = await parseRdfFile(outPath);
        const names = roundTrip
          .filter((q) => q.predicate.value === "http://schema.org/name")
          .map((q) => q.object.value)
          .sort();
        expect(names).toContain("ALICE");
        expect(names).toContain("BOB");
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "runs assert step successfully when the assertion holds",
    async () => {
      const jobData: IJobData = {
        name: "assert-job",
        sources: [
          moduleData({
            type: "sources/file",
            access: PEOPLE_TTL,
          }),
        ],
        steps: [
          moduleData({
            type: "steps/assert",
            access: ASSERT_HAS_PERSONS,
          }),
        ],
        targets: [],
      };

      const context: WorkflowRuntimeContext = {
        data: { version: "v5", prefixes: {}, jobs: [jobData] },
        options: silentOptions(),
      };

      const supervisor = new JobSupervisor("assert-job", context);
      await expect(supervisor.start(jobData)).resolves.toBeUndefined();
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "only-graphs on a source keeps only quads from the listed graphs",
    async () => {
      await withTempDir("job-supervisor", async (dir) => {
        const outPath = path.join(dir, "out.nq");

        const jobData: IJobData = {
          name: "only-graphs-job",
          sources: [
            moduleData({
              type: "sources/file",
              access: GRAPHS_TRIG,
              with: {
                credentials: undefined,
                onlyGraphs: [DF.namedNode("https://example.org/g1")],
                intoGraph: undefined,
              },
            }),
          ],
          steps: [],
          targets: [
            moduleData({
              type: "targets/file",
              access: outPath,
            }),
          ],
        };

        const context: WorkflowRuntimeContext = {
          data: { version: "v5", prefixes: {}, jobs: [jobData] },
          options: silentOptions(),
        };

        const supervisor = new JobSupervisor("only-graphs-job", context);
        await supervisor.start(jobData);

        const roundTrip = await parseRdfFile(outPath);
        const names = roundTrip
          .filter((q) => q.predicate.value === "http://schema.org/name")
          .map((q) => q.object.value);
        expect(names).toEqual(["Alice"]);
      });
    },
    TEST_TIMEOUT_MS,
  );
});
