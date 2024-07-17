import { IJobData, Prefixes, type IWorkflowData } from "./types.js";
import { ConfigurationError } from "./validate.js";

/** Merge configuration files: throws if job names aren't unique */
export function mergeConfigurations(configs: IWorkflowData[]): IWorkflowData {
  // Try to merge compatible prefixes
  const prefixes = mergePrefixes(configs.map((c) => c.prefixes));
  const jobs: Map<string, IJobData> = new Map();

  for (const c of configs) {
    for (const sep_job of c.jobs) {
      // The merge won't do namespacing of jobs. They simply have to be unique
      if (jobs.has(sep_job.name))
        throw new ConfigurationError(
          `Could not merge configurations: multiple seperate jobs named '${sep_job.name}'`
        );
      jobs.set(sep_job.name, sep_job);
    }
  }

  return {
    version: "v5.compiled",
    prefixes,
    jobs: [...jobs.values()],
  };
}

/** Merge prefix definitions: throws if the same prefix has different target namespaces. */
export function mergePrefixes(prefixObjects: Prefixes[]): Prefixes {
  const providedPrefixes = prefixObjects.map((m) => Object.entries(m)).flat();
  const compiledPrefixes = new Map();

  // Iterate thru the list of [prefix, namespace], check if they're already in the compiled list,
  // then check if they're not identical, then add them to the compiled list. An empty list returns
  // undefined for .get()
  for (const [pfx, ns] of providedPrefixes) {
    const currentValue = compiledPrefixes.get(pfx) ?? ns;
    if (currentValue !== ns)
      throw new ConfigurationError(`Multiple values for prefix '${pfx}:' across configurations.`);
    compiledPrefixes.set(pfx, ns);
  }
  return Object.fromEntries(compiledPrefixes.entries());
}
