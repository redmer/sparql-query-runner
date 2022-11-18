import { ArrayOrSingle } from "../utils/types.js";

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
  pipelines: IPipeline[];
}

/** Represents a single sequence of data-operations, on a single endpoint. */
export interface IPipeline {
  name: string;
  independent?: boolean;
  prefixes?: Record<string, string>;
  sources?: ISource[];
  destinations?: IDest[];
  queries?: IQueryStep[];
  updates?: IUpdateStep[];
  rules?: IRuleStep[];
  engine?: {
    [subsystem: string]: {
      [key: string]: any;
    };
  };
}

export interface ISourceOrDestination {
  url: string;
  graphs?: string[];
  authentication?: IAuthentication;
  type: string;
}

export interface ISource extends ISourceOrDestination {
  type: "file" | "sparql" | "auto" | "msaccess";
}

export interface IDest extends ISourceOrDestination {
  type: "file" | "sparql" | "auto" | "sparql-graph-store" | "sparql-quad-store" | "laces";
}

export type IAuthentication = IAuthenticationBasic | IAuthenticationBearer;

export interface IAuthenticationBasic {
  type: "Basic";
  user_env: string;
  password_env: string;
}

export interface IAuthenticationBearer {
  type: "Bearer";
  token_env: string;
}

export interface IBaseStep {
  type: string;
  url: string[];
}

export interface IQueryStep extends IBaseStep {
  type: "sparql-query" | "shacl-validate";
  graph?: string[];
}

export interface IUpdateStep extends IBaseStep {
  type: "sparql-update" | "shacl-validate";
}

export interface IRuleStep extends IBaseStep {
  type: "sparql-query";
  targetClass: string[];
}
