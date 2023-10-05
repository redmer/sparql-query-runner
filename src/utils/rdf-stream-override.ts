import * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { Readable, Transform, TransformCallback } from "stream";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  intoGraph?: RDF.Quad_Graph;
}

export interface FilteredGraphOptions {
  /** Only output these specified graphs */
  graphs?: RDF.Quad_Graph[];
}

export class MatchStreamReadable extends Readable implements RDF.Stream {
  stream: RDF.Stream<RDF.Quad>;

  /** Consume an RDF.Stream as a Readable */
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

export class MergeGraphsStream extends Transform implements RDF.Stream {
  #targetGraph: RDF.Quad_Graph;
  #DF: RDF.DataFactory;

  /** Merge all quads in an RDF.Stream into a single graph */
  constructor(options: OverrideGraphOptions) {
    super({ readableObjectMode: true, writableObjectMode: true });
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

export class FilteredStream extends Transform implements RDF.Stream {
  #onlyGraphs: RDF.Quad_Graph[];
  #DF: DataFactory<RDF.Quad>;

  /** Filter out graphs in an RDF.Stream */
  constructor(options: FilteredGraphOptions) {
    super({ readableObjectMode: true, writableObjectMode: true });
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

export class RdfStoresImportStream extends Transform implements RDF.Stream {
  store: RdfStore;

  /** Import an RDF.Stream into a RDF.Store */
  constructor(store: RdfStore) {
    super({ readableObjectMode: true, writableObjectMode: true });
    this.store = store;
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    this.store.addQuad(quad);
    this.push(quad, encoding);
    callback();
  }
}

export class First_NQuadsStream extends Transform implements RDF.Stream {
  maxN: number;
  currentN: number;

  /**
   * Limit the amount of output `RDF.Quad`s. Useful for a gist of
   *
   * @param maxN Quad count limit
   */
  constructor(maxN = 29) {
    super({ readableObjectMode: true, writableObjectMode: true });
    this.maxN = maxN; //
    this.currentN = 0;
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.currentN > this.maxN) this.end();
    this.currentN += 1;
    callback(null, quad);
  }
}
