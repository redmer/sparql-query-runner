/// <reference types="node" resolution-mode="require"/>
import type * as RDF from "@rdfjs/types";
import N3 from "n3";
import { Readable } from "node:stream";
/** Parse a Turtle/TriG/NQuads string into an array of quads. */
export declare function parseRdf(source: string, format?: string): RDF.Quad[];
/** Parse a Turtle/TriG file on disk into an array of quads. */
export declare function parseRdfFile(path: string, format?: string): Promise<RDF.Quad[]>;
/** Load an RDF file into an in-memory N3.Store. */
export declare function loadStore(path: string): Promise<N3.Store>;
/** Collect an RDF.Stream to an array. */
export declare function collectStream(stream: RDF.Stream): Promise<RDF.Quad[]>;
/** Turn an array of quads into a Readable RDF.Stream. */
export declare function streamOf(quads: RDF.Quad[]): Readable & RDF.Stream;
export declare function fileExists(path: string): boolean;
