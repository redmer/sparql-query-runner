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
  pipeline: IPipeline[];
}
/** Represents a single sequence of data-operations, on a single endpoint. */
export interface IPipeline {
  name: string;
  endpoint: string;
  prefixes: Record<string, string>;
  steps: IStep[];
}
/** Represents a step in the {@link IPipeline}. */
export interface IStep {
  type: string;
  url: string[];
  [customProperty: string]: any;
}
