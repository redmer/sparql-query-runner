export const ENV_VAR_RE = /ENV_\(\$(\S+)\)/g;

/**
 * Substitute env vars in a string. The key is found in ENV_($key).
 *
 * @param {string} contents String that contains stuff to be replaced
 * @param {Record<string, string>} lookup Dictionary of keys and values.
 * @returns {string} Replaced string
 */
export function substitute(contents: string, lookup: Record<string, string>): string {
  return contents.replace(ENV_VAR_RE, (match, p1) => lookup[p1] ?? "");
}
