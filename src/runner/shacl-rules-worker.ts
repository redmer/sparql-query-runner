import * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import N3 from "n3";
import { DataFactory } from "rdf-data-factory";
import sparqljs from "sparqljs";
import { IJobData, IJobStepData, IWorkflowData } from "../config/types.js";
import { RDFNS, SH, XSD } from "../utils/namespaces.js";
const { Generator, Parser } = sparqljs;

const { blankNode, namedNode, quad, literal } = new DataFactory();

/** Yield quads for SHACL namespace declaration. */
export function* quadsForNamespaces(data: Record<string, string>): Generator<RDF.Quad> {
  for (const [abbr, val] of Object.entries(data)) {
    //* ?val sh:declare [
    //*   sh:namespace "..."^^xsd:anyURI ;
    //*   sh:prefix "?abbr" ;
    //* ] .
    const bnode = blankNode();
    yield quad(namedNode(val), SH("declare"), bnode);
    yield quad(bnode, SH("namespace"), literal(val, XSD("anyURI")));
    yield quad(bnode, SH("prefix"), literal(abbr));
  }
}

export function* quadsForQuery(
  query: string,
  rule: RDF.Quad_Subject,
  i: number
): Generator<RDF.Quad> {
  const parser = new Parser();
  const results = parser.parse(query);

  //* ?rule a sh:SPARQLRule ;
  //*   sh:order ?i .  # ordinal from .yaml
  yield quad(rule, RDFNS("type"), SH("SPARQLRule"));
  yield quad(rule, SH("order"), literal(i.toFixed(0), XSD("decimal")));

  // ↓↓ ?rule sh:prefixes __ .
  for (const [, val] of Object.entries(results.prefixes))
    yield quad(rule, SH("prefixes"), namedNode(val));

  yield* quadsForNamespaces(results.prefixes);

  const generator = new Generator();
  let body = generator.stringify(results);
  body = body.replace(/PREFIX [^:]+: <[^>]+>\n/gi, "");

  // ?rule sh:construct """CONSTRUCT {} WHERE {}""" ;
  yield quad(rule, SH("construct"), literal(body));
}

export async function* quadsForStep(step: IJobStepData, i: number): AsyncGenerator<RDF.Quad> {
  const targetClass = step?.with?.["target-class"];
  if (!targetClass) return;

  for (const url of step.access) {
    const shape = namedNode(new URL(url, "https://rdmr.eu/ns/sparql-query-runner/rule/id/").href);
    const rule = blankNode();

    //* ?shape a sh:NodeShape ;
    //*   sh:targetClass ?targetClass ;
    //*   sh:rule ?rule .

    yield quad(shape, RDFNS("type"), SH("NodeShape"));
    yield quad(shape, SH("targetClass"), namedNode(targetClass));
    yield quad(shape, SH("rule"), rule);

    const query = await fs.readFile(url, { encoding: "utf-8" });
    yield* quadsForQuery(query, rule, i);
  }
}

export async function start(data: IWorkflowData, out: NodeJS.WritableStream) {
  const writer = new N3.Writer(out, {
    format: "text/turtle",
    prefixes: data.prefixes,
  });

  for (const name of Object.keys(data.jobs)) {
    const job: IJobData = data.jobs[name];
    const constructSteps = job.steps.filter((s) => s.type == "steps/construct");
    const constructStepsWithTargetClass = constructSteps.filter((s) => s?.with?.["target-class"]);

    for (const [i, step] of constructStepsWithTargetClass.entries()) {
      for await (const quad of quadsForStep(step, i)) writer.addQuad(quad);

      writer.end();
    }
  }
}
