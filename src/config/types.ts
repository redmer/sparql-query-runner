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
type IPipeline = IConstructPipeline | IUpdatePipeline;

interface IBasePipeline {
  type: string;
  name: string;
  independent?: boolean;
  prefixes?: Record<string, string>;
}

export interface IConstructPipeline extends IBasePipeline {
  type: "construct-quads";
  sources?: ISource[];
  destinations?: IDest[];
  steps?: (IConstructStep | IValidateStep)[];
}

export interface IUpdatePipeline extends IBasePipeline {
  type: "direct-update";
  endpoint: IEndpoint[];
  updates: IUpdateStep[];
}

export interface IEndpoint {
  post: string;
  authentication: IAuth;
}

export interface ISourceOrDest {
  url: string;
  onlyGraphs?: string[];
  authentication?: IAuth;
  type: string;
}

export interface ISource extends ISourceOrDest {
  type: "local-file" | "sparql" | "auto" | "msaccess";
}

export interface IDest extends ISourceOrDest {
  type: "file" | "sparql" | "auto" | "sparql-graph-store" | "sparql-quad-store" | "laces";
}

export type IAuth = IAuthBasic | IAuthBearer;

export interface IAuthBasic {
  type: "Basic";
  user_env: string;
  password_env: string;
}

export interface IAuthBearer {
  type: "Bearer";
  token_env: string;
}

export interface IBaseStep {
  type: string;
  url: string[];
}

export interface IConstructStep extends IBaseStep {
  type: "sparql-construct";
  intoGraph?: string[];
  targetClass: string[];
}

export interface IUpdateStep extends IBaseStep {
  type: "sparql-update";
}

export interface IValidateStep extends IBaseStep {
  type: "shacl-validate";
}
