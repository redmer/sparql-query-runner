import { getRDFMediaTypeFromFilename } from "./rdf-extensions-mimetype.js";

describe("getRDFMediaTypeFromFilename()", () => {
  test.each([
    ["a.ttl", "text/turtle"],
    ["a.turtle", "text/turtle"],
    ["a.trig", "application/trig"],
    ["a.nq", "application/n-quads"],
    ["a.nquads", "application/n-quads"],
    ["a.nt", "application/n-triples"],
    ["a.jsonld", "application/ld+json"],
    ["a.rdf", "application/rdf+xml"],
    ["a.n3", "text/n3"],
  ])("%s -> %s", (input, expected) => {
    expect(getRDFMediaTypeFromFilename(input)).toBe(expected);
  });

  test("supports gzip-suffixed filenames", () => {
    expect(getRDFMediaTypeFromFilename("a.ttl.gz")).toBe("text/turtle");
  });

  test("returns undefined for unknown extension", () => {
    expect(getRDFMediaTypeFromFilename("a.exe")).toBeUndefined();
  });
});
