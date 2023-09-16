function prefixPreamble(prefixes: Record<string, string>): string {
  return (
    Object.entries(prefixes)
      .map(([pfx, ns]) => `prefix ${pfx}: <${ns}>`)
      .join("\n") + "\n"
  );
}

/** Adds prefix definitions to a query body iff no prefixes have been defined */
export function addPrefixesToQuery(queryBody: string, prefixes: Record<string, string>): string {
  const hasPrefix = /^\s*prefix/gim;
  if (queryBody.match(hasPrefix) == null) return prefixPreamble(prefixes) + queryBody;
  return queryBody;
}
