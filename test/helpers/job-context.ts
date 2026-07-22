import { QueryEngine } from "@comunica/query-sparql";
import { RdfStore } from "rdf-stores";
import type { ICliOptions } from "../../src/cli/cli-options.js";
import type { IJobData } from "../../src/config/types.js";
import type { InMemQuadStore, JobRuntimeContext, QueryContext } from "../../src/runner/types.js";

export interface TestJobRuntimeContext extends JobRuntimeContext {
  /** The store backing this context's queryContext (exposed for test setup). */
  store: InMemQuadStore;
}

/** Build a minimal JobRuntimeContext for unit-testing individual parts. */
export function makeJobRuntimeContext(
  overrides: Partial<JobRuntimeContext> & { store?: InMemQuadStore } = {}
): TestJobRuntimeContext {
  const jobData: IJobData = overrides.jobData ?? {
    name: "test-job",
    prefixes: {},
    sources: [],
    steps: [],
    targets: [],
  };
  const options: Partial<ICliOptions> = overrides.workflowContext?.options ?? {
    verbosityLevel: 0,
    warningsAsErrors: false,
    defaultPrefixes: false,
    allowShellScripts: false,
    skipAssertions: false,
    skipReasoning: false,
    cacheIntermediateResults: false,
  };
  const engine = overrides.engine ?? new QueryEngine();
  const store: InMemQuadStore = (overrides.store ?? RdfStore.createDefault()) as InMemQuadStore;
  const queryContext: QueryContext = overrides.queryContext ?? {
    sources: [{ type: "rdfjs", value: store }],
    unionDefaultGraph: true,
    lenient: true,
  };

  const noop = () => void 0;
  const throwErr = ((message: string) => {
    throw new Error(message);
  }) as (message: string) => never;

  return {
    workflowContext: overrides.workflowContext ?? {
      data: { version: "v5", prefixes: {}, jobs: [jobData] },
      options,
    },
    jobData,
    tempdir: overrides.tempdir ?? ".cache/sparql-query-runner/test",
    engine,
    queryContext,
    debug: overrides.debug ?? noop,
    info: overrides.info ?? noop,
    warning: overrides.warning ?? noop,
    error: overrides.error ?? throwErr,
    store,
  };
}
