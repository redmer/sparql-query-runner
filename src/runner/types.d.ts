/* eslint-disable @typescript-eslint/no-empty-interface */
import type { QueryEngine } from "@comunica/query-sparql";
import type { QueryStringContext } from "@comunica/types/lib";
import N3 from "n3";
import type { IPipeline } from "../config/types";
import type { ICliOptions } from "../config/validate";

export type QueryContext = QueryStringContext; // & { source?: IDataSource | SourceType };
// export type QueryContext = { sources?: IDataSource[] } & IQueryContextCommon & QueryStringContext;

/** Maximal pipeline context at runtime */
export interface WorkflowRuntimeContext {
  readonly pipeline: IPipeline;
  /** The top-level CLI options */
  readonly options: Partial<ICliOptions>;
  /** The path to a temporary directory. */
  readonly tempdir: string;
  /** Query engine */
  readonly engine: QueryEngine;
  /** Query context for Comunica query */
  queryContext: QueryContext;
}

export interface UpdateCtx extends WorkflowRuntimeContext {
  /** The remote query endpoint */
  readonly endpoint: string;
}

export interface ConstructCtx extends WorkflowRuntimeContext {
  /** The quad store for in-mem CONSTRUCTed quads */
  readonly quadStore: N3.Store;
}

export class WorkflowModule<T> {
  /** True if this module can handle this data */
  static abstract qualifies(data: T): boolean | string;

  /** A reference name */
  static abstract id: string;

  /** Get the Comuncia engine's query context */
  abstract async queryContext?(): Partial<QueryContext>;

  /** Called before the query, e.g. get contents/quads */
  abstract async willQuery?(context: Readonly<ConstructCtx | UpdateCtx>): Promise<void>;

  /** Do something when the query is done */
  abstract async query?(context: Readonly<ConstructCtx | UpdateCtx>): Promise<void>;

  /** Called after running the pipeline, e.g. to save results */
  abstract async didQuery?(): Promise<void>;
}

export interface WorkflowModuleInfo {
  /** Called before the query, e.g. get contents/quads */
  beforeQuery?: () => Promise<void>;

  /** Query context for when executing Comunica query */
  queryContext?: () => Partial<QueryContext>;

  /** Called after running the pipeline, e.g. to save results */
  afterQuery?: () => Promise<void>;
}

export interface Worker {
  start: (data: IPipeline, options?: Partial<ICliOptions>) => Promise<void>;
}
