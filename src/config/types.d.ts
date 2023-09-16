import * as RDF from "@rdfjs/types";
import { JobSourceTypes, JobStepTypes, JobTargetTypes } from "./schema-types.js";

/** Represents a configuration file, that contains one or more {@link IPipeline}s. */
export interface IConfigurationData {
  version: string;
  prefixes?: Record<string, string>;
  jobs: Map<string, IJobData>;
}

/** A consecutively executed part of a workflow */
export interface IJobData {
  independent?: boolean;
  prefixes?: Record<string, string>;
  sources?: IJobSourceData[];
  steps?: IJobStepData[];
  targets?: IJobTargetData[];
}

export type IJobSourceKnownTypes = (typeof JobSourceTypes)[number];
export type IJobSourceData = {
  [key in IJobSourceKnownTypes]?: string;
} & {
  readonly type: `sources/${IJobSourceKnownTypes}`;
  readonly access: string;
  with?: {
    credentials?: ICredentialData;
    onlyGraphs?: RDF.Quad_Graph[];
    targetGraph?: RDF.Quad_Graph;
  };
};

export type IJobStepKnownTypes = (typeof JobStepTypes)[number];
export type IJobStepData = {
  [key in IJobStepKnownTypes]?: string;
} & {
  readonly type: `steps/${IJobStepKnownTypes}`;
  readonly access: string;
  with?: {
    targetGraph?: RDF.Quad_Graph;
  };
};

export type IJobTargetKnownTypes = (typeof JobTargetTypes)[number];
export type IJobTargetData = {
  [key in IJobTargetKnownTypes]?: string;
} & {
  readonly type: `targets/${IJobTargetKnownTypes}`;
  readonly access: string;
  with?: {
    credentials?: ICredentialData;
    onlyGraphs?: RDF.Quad_Graph[];
  };
};

export type ICredentialData = IAuthBasicData | IAuthBearerData | IAuthHeaderData;

export interface IAuthBasicData {
  readonly type: "Basic";
  username: string;
  password: string;
}

/** @deprecated */
export interface IAuthHeaderData {
  readonly type: "HTTP-Header";
  headers: Record<string, string>;
}

export interface IAuthBearerData {
  readonly type: "Bearer";
  token: string;
}
