import { type IConfigurationData } from "./types";
import { ConfigurationError } from "./validate.js";

/** Merge configuration files: throws if job names aren't unique */
export function mergeConfigurations(configs: IConfigurationData[]): IConfigurationData {
  // Try to merge compatible prefixes
  const prefixes = mergePrefixes(configs.map((c) => c.prefixes));
  const jobs = new Map();

  for (const c of configs) {
    for (const [name, sep_job] of c.jobs) {
      // The merge won't do namespacing of jobs. They simply have to be unique
      if (jobs.has(name))
        throw new ConfigurationError(
          `Could not merge configurations: multiple seperate jobs named '${name}'`
        );
      jobs.set(name, sep_job);
    }
  }

  return {
    version: "v5.compiled",
    prefixes,
    jobs,
  };
}

/** Merge prefix definitions: throws if the same prefix has different target namespaces. */
export function mergePrefixes(prefixObjects: Record<string, string>[]): Record<string, string> {
  const providedPrefixes = prefixObjects.map((m) => Object.entries(m)).flat();
  const compiledPrefixes = new Map();

  // Iterate thru the list of [prefix, namespace], check if they're already in the compiled list,
  // then check if they're not identical, then add them to the compiled list. An empty list returns
  // undefined for .get()
  for (const [pfx, ns] of providedPrefixes) {
    const currentValue = compiledPrefixes.get(pfx);
    if (currentValue !== ns)
      throw new ConfigurationError(`Multiple values for prefix '${pfx}:' across configurations.`);
    compiledPrefixes.set(pfx, ns);
  }
  return Object.fromEntries(compiledPrefixes.entries());
}
