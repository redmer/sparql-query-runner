import * as RDF from "@rdfjs/types";
import { PartShorthandSource, PartShorthandStep, PartShorthandTarget } from "./schema-types.js";

/** Represents a configuration file, that contains one or more {@link IPipeline}s. */
export interface IWorkflowData {
  version: string;
  prefixes?: Record<string, string>;
  jobs: Map<string, IJobData>;
}

/** A consecutively executed part of a workflow */
export interface IJobData {
  name: string;
  independent?: boolean;
  prefixes?: Record<string, string>;
  sources?: IJobSourceData[];
  steps?: IJobStepData[];
  targets?: IJobTargetData[];
}

export type IJobSourceKnownTypes = (typeof PartShorthandSource)[number];
// export type IJobSourceData = {
//   [key in IJobSourceKnownTypes]?: string;
// } & {
//   readonly type: // `sources/${IJobSourceKnownTypes}`;
//   access: string;
//   with?: {
//     credentials?: ICredentialData;
//     onlyGraphs?: RDF.Quad_Graph[];
//     targetGraph?: RDF.Quad_Graph;
//   };
// };

export type IJobStepKnownTypes = (typeof PartShorthandStep)[number];
// export type IJobStepData = {
//   [key in IJobStepKnownTypes]?: string;
// } & {
//   readonly type: // `steps/${IJobStepKnownTypes}`;
//   access: string;
//   with?: {
//     targetGraph?: RDF.Quad_Graph;
//   };
// };

export type IJobTargetKnownTypes = (typeof PartShorthandTarget)[number];
// export type IJobTargetData = {
//   [key in IJobTargetKnownTypes]?: string;
// } & {
//   readonly type: // `targets/${IJobTargetKnownTypes}`;
//   access: string;
//   with?: {
//     credentials?: ICredentialData;
//     onlyGraphs?: RDF.Quad_Graph[];
//     targetGraph?: RDF.Quad_Graph;
//   };
// };

export type IJobModuleData = {
  [key in IJobSourceKnownTypes | IJobStepKnownTypes | IJobTargetKnownTypes]?: string;
} & {
  type: string;
  access: string;
  with?: {
    credentials?: ICredentialData;
    onlyGraphs?: RDF.Quad_Graph[];
    targetGraph?: RDF.Quad_Graph;
  };
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
  headers: Record<string, string>;
}

export interface IAuthBearerData {
  readonly type: "Bearer";
  token: string;
}
