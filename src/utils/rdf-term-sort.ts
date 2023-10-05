import type * as RDF from "@rdfjs/types";

export function rdfTermSort(a: RDF.Term, b: RDF.Term) {
  return a.value > b.value ? 1 : b.value > a.value ? -1 : 0;
}
