import { ArrayOrSingle } from "../utils/types";

export type PartialOneOrMore<T> = {
  [P in keyof T]?: ArrayOrSingle<T[P]>;
};
export type RecursivePartialOneOrMore<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartialOneOrMore<U>
    : T[P] extends object
    ? RecursivePartialOneOrMore<T[P]>
    : ArrayOrSingle<T[P]>;
};

/** Represents a configuration file, that contains one or more {@link IPipeline}s. */
export interface IConfiguration {
  version: string;
  pipelines: ArrayOrSingle<IPipeline>;
}

/** Represents a single sequence of data-operations, on a single endpoint. */
export interface IPipeline {
  name?: string;
  endpoint?: ArrayOrSingle<IEndpoint>;
  sources?: ArrayOrSingle<ISource>;
  destinations?: ArrayOrSingle<IDestination>;
  prefixes?: Record<string, string>;
  steps?: Array<IStep | string>;
}
export interface IEndpoint {
  authentication?: IAuthentication;
  get?: string;
  post?: string;
}

export interface ISourceOrDestination {
  url: string;
  graphs?: ArrayOrSingle<string>;
  authentication?: IAuthentication;
  type?: string;
  mediatype?: string;
}

export interface ISource extends ISourceOrDestination {
  type: "rdf" | "msaccess";
}

export interface IDestination extends ISourceOrDestination {
  type: "rdf" | "sparql-graph-store" | "sparql-quad-store";
}

export interface IAuthentication {
  type: "Bearer" | "Basic";
  token_env?: string;
  password_env?: string;
  user_env?: string;
}

/** Represents a step in the {@link IPipeline}. */
export interface IStep {
  type: "shacl-validate" | "sparql-update" | "sparql-query";
  url?: ArrayOrSingle<string>;
}
