import { prefix, RDFNS, SH, XSD } from "./namespaces.js";

describe("prefix()", () => {
  test("returns a helper that produces NamedNodes with concatenated IRI", () => {
    const ex = prefix("https://example.org/");
    const node = ex("alice");
    expect(node.termType).toBe("NamedNode");
    expect(node.value).toBe("https://example.org/alice");
  });
});

describe("well-known namespaces", () => {
  test("RDFNS", () => {
    expect(RDFNS("type").value).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  });
  test("SH", () => {
    expect(SH("NodeShape").value).toBe("http://www.w3.org/ns/shacl#NodeShape");
  });
  test("XSD", () => {
    expect(XSD("string").value).toBe("http://www.w3.org/2001/XMLSchema#string");
  });
});
