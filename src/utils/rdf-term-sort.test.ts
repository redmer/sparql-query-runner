import { DataFactory } from "rdf-data-factory";
import { rdfTermSort } from "./rdf-term-sort.js";

const DF = new DataFactory();

test("rdfTermSort sorts by term.value", () => {
  const terms = [DF.namedNode("c"), DF.namedNode("a"), DF.namedNode("b")];
  const sorted = [...terms].sort(rdfTermSort).map((t) => t.value);
  expect(sorted).toEqual(["a", "b", "c"]);
});

test("rdfTermSort returns 0 for equal values", () => {
  expect(rdfTermSort(DF.namedNode("x"), DF.namedNode("x"))).toBe(0);
});
