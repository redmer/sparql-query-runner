import fs from "fs/promises";
import type { Quad } from "n3";
import N3, { DataFactory } from "n3";
import sparqljs from "sparqljs";
import { RDF, SH, XSD } from "../utils/namespaces.js";
const { Generator, Parser } = sparqljs;

declare type Triple = [Quad["subject"], Quad["predicate"], Quad["object"]];

/** Yield quads for SHACL namespace declaration. */
export function* quadsForNamespaces(data: Record<string, string>): Generator<Triple> {
  for (const [abbr, val] of Object.entries(data)) {
    //* ?val sh:declare [
    //*   sh:namespace "..."^^xsd:anyURI ;
    //*   sh:prefix "?abbr" ;
    //* ] .
    const bnode = DataFactory.blankNode();
    yield [DataFactory.namedNode(val), SH("declare"), bnode];
    yield [bnode, SH("namespace"), DataFactory.literal(val, XSD("anyURI"))];
    yield [bnode, SH("prefix"), DataFactory.literal(abbr)];
  }
}

export function* quadsForQuery(query: string, rule: Quad["subject"], i: number): Generator<Triple> {
  const parser = new Parser();
  const results = parser.parse(query);

  //* ?rule a sh:SPARQLRule ;
  //*   sh:order ?i .  # ordinal from .yaml
  yield [rule, RDF("type"), SH("SPARQLRule")];
  yield [rule, SH("order"), DataFactory.literal(i)];

  // ↓↓ ?rule sh:prefixes __ .
  for (const [, val] of Object.entries(results.prefixes))
    yield [rule, SH("prefixes"), DataFactory.namedNode(val)];

  yield* quadsForNamespaces(results.prefixes);

  const generator = new Generator();
  let body = generator.stringify(results);
  body = body.replace(/PREFIX [^:]+: <[^>]+>\n/gi, "");

  // ?rule sh:construct """CONSTRUCT {} WHERE {}""" ;
  yield [rule, SH("construct"), DataFactory.literal(body)];
}

export async function* quadsForStep(step: IConstructStep, i: number): AsyncGenerator<Triple> {
  const targetClass = step.targetClass;
  if (!targetClass) return;

  for (const url of step.access) {
    const shape = DataFactory.namedNode(
      new URL(url, "https://rdmr.eu/ns/sparql-query-runner/rule/id/").href
    );
    const rule = DataFactory.blankNode();

    //* ?shape a sh:NodeShape ;
    //*   sh:targetClass ?targetClass ;
    //*   sh:rule ?rule .

    yield [shape, RDF("type"), SH("NodeShape")];
    yield [shape, SH("targetClass"), DataFactory.namedNode(targetClass)];
    yield [shape, SH("rule"), rule];

    const query = await fs.readFile(url, { encoding: "utf-8" });
    yield* quadsForQuery(query, rule, i);
  }
}

export async function start(data: IPipeline, out: NodeJS.WritableStream) {
  if (data.type !== "construct-quads") return;

  const writer = new N3.Writer(out, {
    format: "text/turtle",
    prefixes: data.prefixes,
  });

  const stepWithTargetClass = data.steps.filter((s) =>
    Object.hasOwn(s, "targetClass")
  ) as IConstructStep[];

  for (const [i, step] of stepWithTargetClass.entries())
    for await (const [subject, predicate, object] of quadsForStep(step, i))
      writer.addQuad(subject, predicate, object);

  writer.end();
}
