/* eslint-disable @typescript-eslint/no-empty-interface */
import type { QueryEngine } from "@comunica/query-sparql";
import type { IDataSource, IQueryContextCommon } from "@comunica/types/lib";
import type * as RDF from "@rdfjs/types";
import N3 from "n3";
import type { ICliOptions } from "../config/configuration";
import type { IPipeline } from "../config/types";

/** A PipelinePart is a Source, Endpoint, Destination or Step.
 *
 * Endpoint: a remote or local SPARQL 1.1 endpoint
 * Source: a source of RDF quads, as a remote or local file or via plugins
 * Destination: an RDF file that is exporter, remote or local
 * Step: a SPARQL update query, a construct query or a SHACL validation request
 */
export interface PipelinePartInfo {
  /** Called before running the pipeline, use to initialize the pipeline part. */
  prepare?: () => Promise<void>;

  /** Runs the pipeline part, in defined order. */
  start?: () => Promise<Iterable<RDF.Quad> | void>;

  /** Called after running the pipeline, to clean up artifacts. */
  cleanup?: () => Promise<void>;

  /** Query context for Comunica query */
  getQueryContext?: QueryContext;

  /** An added source for a Comunica query */
  getQuerySource?: IDataSource;

  /** Local file paths that are used by this PipelinePart */
  filepaths?: () => Promise<string[]>;
}

export type QueryContext = { sources?: IDataSource[] } & IQueryContextCommon;

export interface QueryContextInfo {}

export interface CacheableInfo {}

// Specific PipelinePartInfo's
export interface EndpointPartInfo extends PipelinePartInfo, QueryContextInfo {}
export interface SourcePartInfo extends PipelinePartInfo, QueryContextInfo, CacheableInfo {}
export interface DestinationPartInfo extends PipelinePartInfo {}
export interface StepPartInfo extends PipelinePartInfo, CacheableInfo {}

// Maximal pipeline context at runtime
export interface RuntimeCtx {
  readonly pipeline: IPipeline;
  readonly options: Partial<ICliOptions>;

  /** The path to a temporary directory. */
  readonly tempdir: string;
}

export interface UpdateRuntimeCtx extends RuntimeCtx {
  readonly endpoint: string;
}
export interface ConstructRuntimeCtx extends RuntimeCtx {
  /** The quad store for CONSTRUCTed quads */
  readonly quadStore: N3.Store;

  /** Query engine */
  readonly engine: QueryEngine;

  /** All Comunica data sources */
  querySources: IDataSource[];

  /** Query context for Comunica query */
  queryContext: QueryContext;
}

// Base
export type PipelinePartGetter = (
  context: Readonly<ConstructRuntimeCtx>,
  i?: number
) => Promise<PipelinePartInfo>;

export interface PipelinePart<T> {
  /** Return true if the PipelinePart can handle this data. */
  qualifies(data: T): boolean;

  /** A reference name for the PipelinePart */
  name(): string;

  /** Return runtime info for the PipelinePart */
  info(data: T): Promise<PipelinePartGetter>;
}

export interface Worker {
  start: (data: IPipeline, options?: Partial<ICliOptions>) => Promise<void>;
}
