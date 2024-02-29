import * as RDF from "@rdfjs/types";
import { PartShorthandSource, PartShorthandStep, PartShorthandTarget } from "./schema-types.js";

export type Prefixes = Record<string, string>;

/** Represents a configuration file, that contains one or more {@link IPipeline}s. */
export interface IWorkflowData {
  version: string;
  prefixes?: Prefixes;
  jobs: IJobData[];
}

/** A consecutively executed part of a workflow */
export interface IJobData {
  name: string;
  independent?: boolean;
  prefixes?: Prefixes;
  sources?: IJobSourceData[];
  steps?: IJobStepData[];
  targets?: IJobTargetData[];
}

export type IJobSourceKnownTypes = (typeof PartShorthandSource)[number];
export type IJobStepKnownTypes = (typeof PartShorthandStep)[number];
export type IJobTargetKnownTypes = (typeof PartShorthandTarget)[number];
export type IJobModuleData = {
  [key in IJobSourceKnownTypes | IJobStepKnownTypes | IJobTargetKnownTypes]?: string;
} & {
  type: string;
  access: string;
  with: {
    credentials: ICredentialData | undefined;
    onlyGraphs: RDF.Quad_Graph[];
    intoGraph: RDF.Quad_Graph | undefined;
  };
  prefixes: Prefixes;
};

export type IJobSourceData = IJobModuleData;
export type IJobStepData = IJobModuleData;
export type IJobTargetData = IJobModuleData;

export type IJobDataExecutable = Omit<IJobData, "name" | "independent" | "prefixes">;
export type IJobPhase = keyof IJobDataExecutable;
export type ICredentialData = IAuthBasicData | IAuthBearerData | IAuthHeaderData;

export interface IAuthBasicData {
  readonly type: "Basic";
  username: string;
  password: string;
}

export interface IAuthHeaderData {
  readonly type: "HTTP-Header";
  headers: Map<string, string>;
}

export interface IAuthBearerData {
  readonly type: "Bearer";
  token: string;
}
