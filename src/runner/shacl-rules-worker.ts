import * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { DataFactory } from "rdf-data-factory";
import sparqljs from "sparqljs";
import { Readable, pipeline } from "stream";
import { WriteStream } from "tty";
import { IJobData, IJobStepData, IWorkflowData } from "../config/types.js";
import { RDFNS, SH, XSD } from "../utils/namespaces.js";
import { Supervisor } from "./types.js";
const { Generator, Parser } = sparqljs;

const { blankNode, namedNode, quad, literal } = new DataFactory();

/** This worker parses all construct steps with a sh:targetClass  */
export class ShaclRulesWorker implements Supervisor<IWorkflowData> {
  destination: WriteStream;

  constructor(destination: WriteStream) {
    this.destination = destination;
  }

  async start(data: IWorkflowData): Promise<void> {
    const stream = new ShaclRulesParser(data);
    const writer = new N3.StreamWriter({ format: "application/turtle", prefixes: data.prefixes });

    pipeline(stream, writer, this.destination);
  }
}

export class ShaclRulesParser extends Readable implements RDF.Stream {
  data: IWorkflowData;
  iterQuad: Generator<RDF.Quad>;
  shouldRead: boolean;

  constructor(data: IWorkflowData) {
    super({ objectMode: true });

    this.data = data;
    this.shouldRead = false;
  }

  _construct(callback: (error?: Error) => void): void {
    const steps = [];
    for (const job of this.data.jobs)
      steps.concat(
        job.steps
          .filter((s) => s.type === "steps/construct")
          .filter((s) => s.with["sh:targetClass"])
      );

    this.iterQuad = quadsForSteps(steps);
    callback();
  }

  _read(_size: number): void {
    // _read() manages backpressure: start pushing quads when _read() is called
    // but stop as soon as this.push() returns falsy. Then stop iteration and
    // simply wait until _read() is called again.
    this.shouldRead = true;

    let shouldContinue: boolean;
    while (this.shouldRead) {
      const iter = this.iterQuad.next();
      if (iter.value) shouldContinue = this.push(iter.value);
      if (iter.done) this.push(null); // EOF = push null chunk
      this.shouldRead = shouldContinue;
    }
  }
}

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

export function* quadsForSteps(steps: IJobStepData[]): Generator<RDF.Quad> {
  for (const [i, step] of steps.entries()) {
    yield* quadsForStep(step, i);
  }
}

export function* quadsForStep(step: IJobStepData, i: number): Generator<RDF.Quad> {
  const targetClass = step.with["target-class"];
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

    const query = fs.readFileSync(url, { encoding: "utf-8" });
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
    const constructStepsWithTargetClass = constructSteps.filter((s) => s.with["target-class"]);

    for (const [i, step] of constructStepsWithTargetClass.entries()) {
      for await (const quad of quadsForStep(step, i)) writer.addQuad(quad);

      writer.end();
    }
  }
}
