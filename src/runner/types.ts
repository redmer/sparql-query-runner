import type { QueryEngine } from "@comunica/query-sparql";
import type { QueryStringContext } from "@comunica/types/lib";
import type * as RDF from "@rdfjs/types";
import { RdfStore } from "rdf-stores";
import type { ICliOptions } from "../cli/cli-options";
import type { IConfigurationData, IJobData } from "../config/types";
import { AuthProxyHandler } from "../utils/auth-proxy-handler";

export type QueryContext = QueryStringContext;

/** Workflow context of the full configuration at runtime */
export interface WorkflowRuntimeContext {
  readonly data: IConfigurationData;
  /** The top-level CLI options */
  readonly options: Partial<ICliOptions>;
  /** The path to a temporary directory. */
  readonly tempdir: string;
}

/** Workflow context of the present Job at runtime */
export interface JobRuntimeContext {
  readonly context: WorkflowRuntimeContext;
  readonly data: IJobData;
  /** The path to a temporary directory. */
  readonly tempdir: string;
  /** Query engine */
  readonly engine: QueryEngine;
  /** Query context for Comunica query */
  queryContext: QueryContext;
  /** Register query context proxy handlers for non-Basic authentication */
  httpProxyHandler: AuthProxyHandler;
  /** The quad store for in-mem CONSTRUCTed quads */
  readonly quadStore: RDF.Store & RdfStore;
  /** The RDF data factory */
  readonly factory: RDF.DataFactory;

  /** Print an INFO level message */
  info(message: string): void;
  /** Print a WARNING level message */
  warning(message: string): void;
  /** Print an ERROR level message */
  error(message: string): void;
}

/** A Source, Step or Target is a workflow part */
export interface WorkflowPart<T = unknown> {
  /** The name or type of the workflow part */
  id(): string;

  /** True if this module can handle this data */
  isQualified?(data: T): boolean;

  /** True if the workflow supervisor must download an external file */
  shouldCacheAccess?(data: T): boolean;

  /** Return the awaitable part executable */
  info(data: T): (context: JobRuntimeContext) => Promise<WorkflowGetter>;
}

export interface WorkflowGetter {
  /** Get the Comuncia engine's query context */
  additionalQueryContext?(): Promise<Partial<QueryContext>>;

  /** Return a RDFJS Store or a list of Quads */
  data?(): Promise<RDF.Store | RDF.Quad[]>;

  /** Do something when the query is done */
  start?(): Promise<void>;
}

export interface Supervisor<T> {
  start(data: T): Promise<void>;
}
