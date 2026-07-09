import type { InMemQuadStore, JobRuntimeContext } from "../../src/runner/types.js";
export interface TestJobRuntimeContext extends JobRuntimeContext {
    /** The store backing this context's queryContext (exposed for test setup). */
    store: InMemQuadStore;
}
/** Build a minimal JobRuntimeContext for unit-testing individual parts. */
export declare function makeJobRuntimeContext(overrides?: Partial<JobRuntimeContext> & {
    store?: InMemQuadStore;
}): TestJobRuntimeContext;
