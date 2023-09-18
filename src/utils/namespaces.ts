import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";

const MyDataFactory = new DataFactory();

/** A namespace prefix helper function */
export function prefix(namespace: string): (localname: string) => RDF.NamedNode {
  return (localname) => MyDataFactory.namedNode(namespace + localname);
}

export const RDFNS = prefix("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
export const SH = prefix("http://www.w3.org/ns/shacl#");
export const XSD = prefix("http://www.w3.org/2001/XMLSchema#");
