import type { Prefixes } from "../config/types.js";
import { addPrefixesToQuery } from "./add-prefixes-to-query.js";

test("add prefixes to query", () => {
  const queryWithout = `construct { ?s ?p ?o } WHERE { ?s ?p ?o }`;
  const queryWithStringPrefix = `# PREFIX schema: <look this up>
  CONSTRUCT { ?s ?p ?o }
  `;
  const queryWithPrefix = `prefix schema: <http://schema.org/>

construct { ?s ?p ?o } WHERE { ?s ?p ?o }`;

  const prefixes: Prefixes = {
    schema: "http://schema.org/",
  };

  expect(addPrefixesToQuery(queryWithout, prefixes)).toEqual(queryWithPrefix);
  expect(addPrefixesToQuery(queryWithStringPrefix, prefixes)).toEqual(queryWithStringPrefix);
  expect(addPrefixesToQuery(queryWithPrefix, prefixes)).toEqual(queryWithPrefix);
});
