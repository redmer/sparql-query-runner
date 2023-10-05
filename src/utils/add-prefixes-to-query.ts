import { Prefixes } from "../config/types.js";

function prefixPreamble(prefixes: Prefixes): string {
  return (
    Object.entries(prefixes)
      .map(([pfx, ns]) => `prefix ${pfx}: <${ns}>`)
      .join("\n") + "\n\n"
  );
}

/** Adds prefix definitions to a query body iff no prefixes have been defined */
export function addPrefixesToQuery(queryBody: string, prefixes: Prefixes): string {
  const hasPrefix = /PREFIX [^:]+: <[^>]+>\n/gim;
  if (queryBody.match(hasPrefix) == null) return prefixPreamble(prefixes) + queryBody;
  return queryBody;
}
