import fs from "fs/promises";
import { DataFactory, Term } from "n3";
import { IBaseStep } from "../config/types.js";
import { RDF, SH, XSD } from "../utils/namespaces.js";
import { Parser, Generator } from "sparqljs";

declare type Triple = [Term, Term, Term];

/** Yield quads for SHACL namespace declaration. */
export function* quadsForNamespaces(data: Record<string, string>): Generator<Triple> {
  for (const [abbr, val] of Object.entries(data)) {
    const bnode = DataFactory.blankNode();
    yield [DataFactory.namedNode(val), SH("declare"), bnode];
    yield [bnode, SH("namespace"), DataFactory.literal(val, XSD("anyURI"))];
    yield [bnode, SH("prefix"), DataFactory.literal(abbr)];
  }
  // ?val sh:declare [
  //   sh:namespace "..."^^xsd:anyURI ;
  //   sh:prefix "?abbr" ;
  // ] .
}

export function* distillPrefixes(query: string, subject: Term): Generator<Triple> {
  const parser = new Parser();
  const results = parser.parse(query);

  yield* quadsForNamespaces(results.prefixes);
  // ↓↓ << ?subject sh:prefixes __ . >>
  for (const [, val] of Object.entries(results.prefixes))
    yield [subject, SH("prefixes"), DataFactory.namedNode(val)];

  // results.prefixes = {};
  const generator = new Generator();
  let body = generator.stringify(results);
  body = body.replace(/PREFIX [^:]+: <[^>]+>\n/gi, "");
}

export function body(query: string) {
  return query.replace(/^\s*prefix\s+([^:]+):\s+<[^>]+>\n/gim, "replaceValue");
}

export function* quadsForQuery(query: string, subject: Term, i: number): Generator<Triple> {
  yield [subject, RDF("type"), SH("SPARQLRule")];
  yield [subject, SH("order"), DataFactory.literal(i)];
  yield* distillPrefixes(query, subject);

  yield [subject, SH("construct"), DataFactory.literal(body(query))];
  // ?subject a sh:SPARQLRule ;
  //   sh:order __ ; # ordinal uit .yaml
  //   sh:prefixes __ , __ ; # values moeten gedestilleerd worden uit querytekst
  //   sh:construct """CONSTRUCT {} WHERE {}""" ;
}

export async function* quadsForStep(step: IBaseStep, i: number): Generator<Triple> {
  const targetClass = step["targetClass"];
  if (!targetClass || Array.isArray(targetClass)) return;

  for (const url of step.url) {
    const subject = DataFactory.namedNode(new URL(url, "http://example.org/rule/").href);
    const object = DataFactory.blankNode();

    yield [subject, RDF("type"), SH("NodeShape")];
    yield [subject, SH("targetClass"), DataFactory.namedNode(targetClass)];
    yield [subject, SH("rule"), object];

    // ?subject a sh:NodeShape ;
    //   sh:targetClass ?targetClass ;
    //   sh:rule ?object .

    const query = await fs.readFile(url, { encoding: "utf-8" });
    yield* quadsForQuery(query, object, i);
    yield [object];
  }
}

/*
# What is required for the SHACL Rule`s?

[] a sh:NodeShape ;
  sh:targetClass __ ; # whence this value? .yaml -> this: ?
  sh:rule [
    a sh:SPARQLRule ;
    sh:order __ ; # ordinal uit .yaml
    sh:prefixes __ , __ ; # values moeten gedestilleerd worden uit querytekst
    sh:construct """CONSTRUCT {} WHERE {}""" ;
  ] .


*/
