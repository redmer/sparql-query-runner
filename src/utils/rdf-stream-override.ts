import * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { PassThrough, Readable, Transform, TransformCallback } from "stream";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  intoGraph?: RDF.Quad_Graph;
}

export interface FilteredGraphOptions {
  /** Only output these specified graphs */
  graphs?: RDF.Quad_Graph[];
}

export function MatchStreamReadable2(stream: RDF.Stream): Readable & RDF.Stream {
  const streamOUT = new PassThrough({ objectMode: true });
  stream.on("error", (error) => streamOUT.emit("error", error));
  stream.on("end", () => streamOUT.push(null));
  stream.on("data", (quad: RDF.Quad) => streamOUT.push(quad));
  return streamOUT;
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
    return callback();
  }
}

export class FilteredStream extends Transform implements RDF.Stream {
  #onlyGraphs: RDF.Quad_Graph[];
  #DF: DataFactory<RDF.Quad>;
  #skippedGraphs: Set<string>;
  #printer: (message: string) => void;

  /** Filter out graphs in an RDF.Stream */
  constructor(options: FilteredGraphOptions, printer?: (message: string) => void) {
    super({ readableObjectMode: true, writableObjectMode: true });
    this.#onlyGraphs = options.graphs;
    this.#DF = new DataFactory();
    this.#skippedGraphs = new Set();
    this.#printer = printer;
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.#onlyGraphs && !this.#onlyGraphs.find((v) => v.equals(quad.graph))) {
      if (!this.#skippedGraphs.has(quad.graph.value) && this.#printer)
        this.#printer(`${this.constructor.name}: skipping graph ${quad.graph.value}`);
      this.#skippedGraphs.add(quad.graph.value);
      return callback();
    }

    this.push(this.#DF.quad(quad.subject, quad.predicate, quad.object, quad.graph));
    return callback();
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
    return callback();
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
    if (this.currentN > this.maxN) return callback();
    this.currentN += 1;
    return callback(null, quad);
  }
}
