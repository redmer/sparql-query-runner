import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { Readable, Transform, TransformCallback } from "stream";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  intoGraph?: RDF.Quad_Graph;
}

export interface FilteredGraphOptions {
  graphs?: RDF.Quad_Graph[];
}

/** Consume an RDF.Stream as a Readable */
export class MatchStreamReadable extends Readable implements RDF.Stream {
  stream: RDF.Stream<RDF.Quad>;

  constructor(stream: RDF.Stream) {
    super({ objectMode: true });
    this.stream = stream;
  }

  _read(_size: number): void {
    let shouldContinue: boolean;
    do {
      const quad = this.stream.read();
      shouldContinue = this.push(quad);
    } while (shouldContinue);
  }
}

/** Merge all quads in an RDF.Stream into a single graph */
export class MergeGraphsStream extends Transform implements RDF.Stream {
  #targetGraph: RDF.Quad_Graph;
  #DF: RDF.DataFactory;

  constructor(options: OverrideGraphOptions) {
    super({ objectMode: true });
    this.#targetGraph = options.intoGraph;
    this.#DF = new DataFactory();
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    this.push(
      this.#DF.quad(quad.subject, quad.predicate, quad.object, this.#targetGraph ?? quad.graph)
    );
    callback();
  }
}

/** Filter out graphs in an RDF.Stream */
export class FilteredStream extends Transform implements RDF.Stream {
  #onlyGraphs: RDF.Quad_Graph[];
  #DF: DataFactory<RDF.Quad>;

  constructor(options: FilteredGraphOptions) {
    super({ objectMode: true });
    this.#onlyGraphs = options.graphs;
    this.#DF = new DataFactory();
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.#onlyGraphs && !this.#onlyGraphs.includes(quad.graph)) callback();

    this.push(this.#DF.quad(quad.subject, quad.predicate, quad.object, quad.graph));
    callback();
  }
}

/** Import and consume an RDF.Stream into an RDF.Store asynchronously */
export async function ImportStream(stream: RDF.Stream, store: RDF.Store) {
  return new Promise((resolve, reject) => {
    const emitter = store.import(stream);
    emitter.once("end", resolve);
    emitter.once("error", reject);
  });
}
