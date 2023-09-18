export interface ICliOptions {
  /** Make workflow and job execution even more verbose */
  verbose?: boolean;
  /** Enable cache of each step results */
  cacheIntermediateResults?: boolean;
  /** Treat warnings as fatal */
  warningsAsErrors?: boolean;
  /** Add RDFa Intitial Context prefixes to workflow and prefix definitions */
  defaultPrefixes?: boolean;
  /** Allow the exuction of shell script steps */
  allowShellScripts?: boolean;
}
