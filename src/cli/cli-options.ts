export interface ICliOptions {
  /** Make workflow and job execution even more verbose */
  verbosityLevel: number;
  /** Enable cache of each step results */
  cacheIntermediateResults: boolean;
  /** Add RDFa Intitial Context prefixes to workflow and prefix definitions */
  defaultPrefixes: boolean;

  /** Allow the exuction of shell script steps */
  allowShellScripts: boolean;
  /** Treat warnings as fatal */
  warningsAsErrors: boolean;
  /** Skip assert steps */
  skipAssertions: boolean;
  /** Skip reasoning steps */
  skipReasoning: boolean;
}
