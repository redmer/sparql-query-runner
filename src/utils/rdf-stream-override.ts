import type * as RDF from "@rdfjs/types";
import { DataFactory } from "rdf-data-factory";
import { PassThrough, Readable, Transform, TransformCallback } from "stream";

export interface OverrideGraphOptions {
  /** Override the context/graph of the quad into */
  graph?: RDF.Quad_Graph;
}

export interface FilteredGraphOptions {
  graphs?: RDF.Quad_Graph[];
}

/**
 * @deprecated Replace with SingleGraphStream
 */
export function overrideStream(stream: RDF.Stream, options: OverrideGraphOptions): RDF.Stream {
  if (!options?.graph) return stream;
  const out = new PassThrough({ objectMode: true });
  const DF = new DataFactory();

  stream.on("error", (error) => out.emit("error", error));
  stream.on("data", (quad: RDF.Quad) =>
    out.push(DF.quad(quad.subject, quad.predicate, quad.object, options.graph))
  );
  stream.on("end", () => out.push(null));
  return out;
}

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

export class SingleGraphStream extends Transform implements RDF.Stream {
  targetGraph: RDF.Quad_Graph;
  DF: RDF.DataFactory;

  constructor(options: OverrideGraphOptions) {
    super({ objectMode: true });
    this.targetGraph = options.graph;
    this.DF = new DataFactory();
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    this.push(
      this.DF.quad(quad.subject, quad.predicate, quad.object, this.targetGraph ?? quad.graph)
    );
    callback();
  }
}

export class FilteredStream extends Transform implements RDF.Stream {
  graphs: RDF.Quad_Graph[];
  DF: DataFactory<RDF.Quad>;

  constructor(options: FilteredGraphOptions) {
    super({ objectMode: true });
    this.graphs = options.graphs;
    this.DF = new DataFactory();
  }

  _transform(quad: RDF.Quad, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.graphs && !this.graphs.includes(quad.graph)) return;

    this.push(this.DF.quad(quad.subject, quad.predicate, quad.object, quad.graph));
    callback();
  }
}
