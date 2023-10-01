import type { QueryEngine } from "@comunica/query-sparql";
import type {
  IDataSourceExpanded,
  IDataSourceSerialized,
  QueryStringContext,
  SourceType,
} from "@comunica/types/lib";
import type * as RDF from "@rdfjs/types";
import { RdfStore } from "rdf-stores";
import type { ICliOptions } from "../cli/cli-options.js";
import type {
  IJobData,
  IJobModuleData,
  IJobPhase,
  IJobSourceData,
  IJobStepData,
  IJobTargetData,
  IWorkflowData,
} from "../config/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";

export type QueryContext = Omit<QueryStringContext, "sources"> & {
  sources: SourceType[]; // There should be at least 1 sources at execution time
};

/** Workflow context of the full configuration at runtime */
export interface WorkflowRuntimeContext {
  readonly data: IWorkflowData;
  /** The top-level CLI options */
  readonly options: Partial<ICliOptions>;
}

/** Workflow context of the present Job at runtime */
export interface JobRuntimeContext {
  /** Find the context of the full workflow */
  readonly workflowContext: WorkflowRuntimeContext;
  /** The data of the Job */
  readonly jobData: IJobData;
  /** The path to a temporary directory. */
  readonly tempdir: string;
  /** Query engine */
  readonly engine: QueryEngine;
  /** Query context for Comunica query */
  queryContext: QueryContext;
  // /** Register query context proxy handlers for non-Basic authentication */
  // httpProxyHandler: AuthProxyHandler;
  /** The quad store for in-mem CONSTRUCTed quads */
  readonly quadStore: RDF.Store & RdfStore;

  /** Print an INFO level message */
  info(message: string): void;
  /** Print a WARNING level message */
  warning(message: string): void | never;
  /** Print an ERROR level message */
  error(message: string): never;
}

export type WorkflowModuleInfo = (context: JobRuntimeContext) => Promise<WorkflowGetter>;

/** A Source, Step or Target is a workflow part */
export interface WorkflowPart<P extends IJobPhase> {
  /** The canonical name of the workflow part */
  id(): string;

  /** The names this workflow module can occur. (e.g., `targets/sparql-update`, `source/sparql`) */
  names: string[];

  /** True if this module can handle this data */
  isQualified?(data: IJobModuleData): boolean;

  /** True if the workflow supervisor must download an external file */
  shouldCacheAccess?(data: IJobSourceData | IJobStepData): boolean;

  /**
   * Set the Comuncia engine's query context. This is called before info()
   * and can only be based on static information in the module's data.
   */
  staticQueryContext?(data: IJobTargetData): Partial<JobRuntimeContext["queryContext"]>;

  /**
   * Set the AuthProxyHandler details. This is called before info() and
   * can only be based on static information in the module's data.
   */
  staticAuthProxyHandler?(data: IJobSourceData | IJobTargetData): AuthProxyHandler;

  /** Return the awaitable workflow source module executable */
  asSource?(data: IJobSourceData): P extends "sources" ? WorkflowModuleInfo : never;

  /** Return the awaitable workflow step module executable */
  asStep?(data: IJobStepData): P extends "steps" ? WorkflowModuleInfo : never;

  /** Return the awaitable workflow target module executable */
  asTarget?(data: IJobTargetData): P extends "targets" ? WorkflowModuleInfo : never;
}

export interface WorkflowGetter {
  /** Return an RDFJS Store or a Comunica Source */
  dataSources?(): [IDataSourceExpanded | IDataSourceSerialized];

  /** Do something when the query is done */
  start?(): Promise<void>;
}

export interface Supervisor<T> {
  start(data: T): Promise<void>;
}
