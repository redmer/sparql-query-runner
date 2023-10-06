import * as RDF from "@rdfjs/types";
import fs, { createWriteStream } from "fs";
import N3 from "n3";
import { stdout } from "process";
import { DataFactory } from "rdf-data-factory";
import sparqljs from "sparqljs";
import { Readable, pipeline } from "stream";
import { fileURLToPath } from "url";
import { IJobData, IJobStepData, IWorkflowData, Prefixes } from "../config/types.js";
import { expandCURIE } from "../config/validate.js";
import { addPrefixesToQuery } from "../utils/add-prefixes-to-query.js";
import { fileExistsLocally } from "../utils/local-remote-file.js";
import { RDFNS, SH, XSD } from "../utils/namespaces.js";
import { moduleDataDigest } from "../utils/workflow-job-tempdir.js";
import { Supervisor } from "./types.js";
const { Generator, Parser } = sparqljs;

const { blankNode, namedNode, quad, literal } = new DataFactory();

/** This worker parses all construct steps with a sh:targetClass  */
export class ShaclRulesWorker implements Supervisor<IWorkflowData> {
  async start(data: IWorkflowData, output?: string): Promise<void> {
    pipeline(
      new ShaclRulesParser(data),
      new N3.StreamWriter({ format: "application/turtle", prefixes: data.prefixes }),
      output ? createWriteStream(output, { encoding: "utf-8" }) : stdout
    );
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
    let steps = [];
    for (const job of this.data.jobs)
      steps = [
        ...steps,
        ...job.steps
          .filter((s) => s.type === "steps/construct")
          .filter((s) => s.with["sh:targetClass"])
          .filter((s) => typeof s.with["sh:targetClass"] == "string"),
      ];

    this.iterQuad = quadsForSteps(steps);
    callback();
  }

  _read(_size: number): void {
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

/**
 * Yield quads for SHACL namespace declaration.
 *
 * ```turtle
 * <ns> sh:declare [
 *   sh:namespace "ns"^^xsd:anyURI ;
 *   sh:prefix "abbr" ;
 * ] .
 * ```
 *
 * @param data Prefix definitions
 */
export function* quadsForNamespaces(data: Prefixes): Generator<RDF.Quad> {
  for (const [abbr, val] of Object.entries(data)) {
    const bnode = blankNode();
    yield quad(namedNode(val), SH("declare"), bnode);
    yield quad(bnode, SH("namespace"), literal(val, XSD("anyURI")));
    yield quad(bnode, SH("prefix"), literal(abbr));
  }
}

/**
 * Generate SHACL rule quads describing a Construct query body.
 *
 * ```turtle
 * $rule a sh:SPARQLRule ;
 *    sh:order $i ;
 *    sh:prefixes rdf: , sh: , ...
 *    sh:construct """CONSTRUCT {..."""
 * ```
 *
 * @param query Query body string
 * @param rule The rule subject to generate quads with
 * @param i Index in list of steps
 */
export function* quadsForQuery(
  query: string,
  rule: RDF.Quad_Subject,
  i: number
): Generator<RDF.Quad> {
  const parser = new Parser();

  yield quad(rule, RDFNS("type"), SH("SPARQLRule"));
  yield quad(rule, SH("order"), literal(i.toFixed(0), XSD("decimal")));

  const parsedQuery = parser.parse(query);
  for (const [, val] of Object.entries(parsedQuery.prefixes))
    yield quad(rule, SH("prefixes"), namedNode(val));
  yield* quadsForNamespaces(parsedQuery.prefixes);

  const generator = new Generator();
  let generatedBody = generator.stringify(parsedQuery);
  generatedBody = generatedBody.replace(/PREFIX [^:]+: <[^>]+>\n/gi, "");

  yield quad(rule, SH("construct"), literal(generatedBody));
}

export function* quadsForSteps(steps: IJobStepData[]): Generator<RDF.Quad> {
  for (const [i, step] of steps.entries()) {
    yield* quadsForStep(step, i);
  }
}

/**
 * Generate SHACL rule quads from a Construct step.
 *
 * ```turtle
 * ?shape a sh:NodeShape ;
 *   sh:targetClass ?targetClass ;
 *   sh:rule ?rule .
 * ```
 *
 * @param data Step data
 * @param i Index in list of steps
 */
export function* quadsForStep(data: IJobStepData, i: number): Generator<RDF.Quad> {
  let queryBody: string;
  let shape: RDF.NamedNode;
  const targetClassNode = expandCURIE(data.with["sh:targetClass"], data.prefixes);

  if (fileExistsLocally(data.access)) {
    queryBody = fs.readFileSync(data.access, { encoding: "utf-8" });
    shape = namedNode(fileURLToPath(data.access));
  } else {
    queryBody = addPrefixesToQuery(data.access, data.prefixes);
    shape = namedNode(`urn:shacl:rule:id:${moduleDataDigest(data)}`);
  }

  const rule = blankNode();

  yield quad(shape, RDFNS("type"), SH("NodeShape"));
  yield quad(shape, SH("targetClass"), namedNode(targetClassNode));
  yield quad(shape, SH("rule"), rule);

  yield* quadsForQuery(queryBody, rule, i);
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
    }
  }
  writer.end();
}
