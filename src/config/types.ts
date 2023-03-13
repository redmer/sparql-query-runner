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
export type IPipeline = IConstructPipeline | IUpdatePipeline;

interface IBasePipeline {
  type: string;
  name: string;
  independent?: boolean;
  prefixes?: Record<string, string>;
}

export interface IConstructPipeline extends IBasePipeline {
  type: "construct-quads";
  sources?: ISource[];
  targets?: ITarget[];
  steps?: (IConstructStep | IValidateStep)[];
}

export interface IUpdatePipeline extends IBasePipeline {
  type: "direct-update";
  endpoint: IEndpoint[];
  steps: IUpdateStep[];
}

export interface IEndpoint {
  post: string;
  credentials?: ICredential;
}

export interface ISourceOrTarget {
  access: string;
  onlyGraphs?: string[];
  credentials?: ICredential;
  type: string;
}

export interface ISource extends ISourceOrTarget {
  type: "localfile" | "remotefile" | "sparql" | "auto" | "msaccess" | "msaccess-csv";
}

export interface ITarget extends ISourceOrTarget {
  type: "laces" | "localfile" | "sparql-graph-store" | "sparql-quad-store" | "sparql" | "triplydb";
}

export type ICredential = IAuthBasic | IAuthBearer;

export interface IAuthBasic {
  type: "Basic";
  username: string;
  password: string;
}

export interface IAuthBearer {
  type: "Bearer";
  token: string;
}

export interface IConstructStep {
  type: "sparql-construct";
  access?: string[];
  construct?: string;
  intoGraph?: string;
  targetClass: string;
}

export interface IUpdateStep {
  type: "sparql-update";
  access?: string[];
  update?: string;
}

export interface IValidateStep {
  type: "shacl-validate";
  access?: string[];
}
