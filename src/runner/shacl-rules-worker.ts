import fs from "fs/promises";
import type { Quad } from "n3";
import N3, { DataFactory } from "n3";
import { Generator, Parser } from "sparqljs";
import { ICliOptions } from "../config/configuration.js";
import { IBaseStep, IPipeline } from "../config/types.js";
import { RDF, SH, XSD } from "../utils/namespaces.js";

declare type Triple = [Quad["subject"], Quad["predicate"], Quad["object"]];

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

export function* quadsForQuery(
  query: string,
  subject: Quad["subject"],
  i: number
): Generator<Triple> {
  const parser = new Parser();
  const results = parser.parse(query);

  yield [subject, RDF("type"), SH("SPARQLRule")];
  yield [subject, SH("order"), DataFactory.literal(i)];
  // ?subject a sh:SPARQLRule ;
  //   sh:order ?i .  # ordinal from .yaml

  // ↓↓ << ?subject sh:prefixes __ . >>
  for (const [, val] of Object.entries(results.prefixes))
    yield [subject, SH("prefixes"), DataFactory.namedNode(val)];

  yield* quadsForNamespaces(results.prefixes);

  const generator = new Generator();
  let body = generator.stringify(results);
  body = body.replace(/PREFIX [^:]+: <[^>]+>\n/gi, "");

  yield [subject, SH("construct"), DataFactory.literal(body)];
  // ?subject sh:construct """CONSTRUCT {} WHERE {}""" ;
}

export async function* quadsForStep(step: IBaseStep, i: number): AsyncGenerator<Triple> {
  const targetClass = step["targetClass"];
  if (!targetClass || Array.isArray(targetClass)) return;

  for (const url of step.url) {
    const subject = DataFactory.namedNode(
      new URL(url, "https://rdmr.eu/ns/sparql-query-runner/rule/id/").href
    );
    const object = DataFactory.blankNode();

    yield [subject, RDF("type"), SH("NodeShape")];
    yield [subject, SH("targetClass"), DataFactory.namedNode(targetClass)];
    yield [subject, SH("rule"), object];

    // ?subject a sh:NodeShape ;
    //   sh:targetClass ?targetClass ;
    //   sh:rule ?object .

    const query = await fs.readFile(url, { encoding: "utf-8" });
    yield* quadsForQuery(query, object, i);
  }
}

export async function start(data: IPipeline, options?: Partial<ICliOptions>) {
  const writer = new N3.Writer(process.stdout, {
    format: "text/turtle",
    prefixes: data.prefixes,
  });
  for (const [i, step] of Array.from([data.rules].flat(1)).entries())
    for await (const [subject, predicate, object] of quadsForStep(step, i))
      writer.addQuad(subject, predicate, object);

  writer.end();
}
