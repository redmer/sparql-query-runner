/**
 * This regex finds environment variable references, with the `${env_var}` syntax.
 *
 * (?<!\\)     - negative lookbehind: do not match if escaped
 * \$\{ ... \} - literally ${ ... }
 * (\S{1,}?)   - group 1: at least 1 non-whitespace char, as few times as possible
 * /g          - Globally (i.e., not just once)
 */
export const ENV_VAR_RE = /(?<!\\)\$\{(\S{1,}?)\}/g;

/**
 * Substitute env vars in a string. The key is found in `${key}`.
 *
 * If there is no record matching the key, the
 *
 * @param {string} contents String that contains stuff to be replaced
 * @param {Record<string, string>} lookup Dictionary of keys and values.
 * @returns {string} Replaced string
 */
export function substituteVars(contents: string, lookup: Record<string, string>): string {
  return contents.replace(ENV_VAR_RE, (match, p1) => lookup[p1] ?? match);
}
