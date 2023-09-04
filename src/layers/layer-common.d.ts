import { QueryEngine } from "@comunica/query-sparql";
import { QueryStringContext } from "@comunica/types";
import N3 from "n3";
import { ICliOptions } from "../cli/cli-options";
import {
  IConfigurationData,
  IJobData,
  IJobSourceData,
  IJobStepData,
  IJobTargetData,
} from "../config/types";

export type AnyLayerData =
  | IConfigurationData
  | IJobData
  | IJobSourceData
  | IJobStepData
  | IJobTargetData;

export interface CacheLayer {
  id: string;
  dependsOn: CacheLayer[];
}

export type ConfigurationContext = { data: IConfigurationData; cliOptions: ICliOptions };
export type JobContext = { configuration: ConfigurationContext; data: IJobData; cacheDir: string };
export type _SourceStepTargetContext<T> = { job: JobContext; data: T; cacheFile: string };
export type SourceContext = _SourceStepTargetContext<IJobSourceData>;
export type StepContext = _SourceStepTargetContext<IJobStepData>;
export type TargetContext = _SourceStepTargetContext<IJobTargetData>;

export type JobRuntimeContext = JobContext & {
  engine: QueryEngine;
  comunicaQueryContext: QueryStringContext;
};
export type _SourceStepTargetRuntimeContext = { quadstore: N3.Store };
export type SourceRuntimeContext = SourceContext & _SourceStepTargetRuntimeContext;
export type StepRuntimeContext = StepContext & _SourceStepTargetRuntimeContext;
export type TargetRuntimeContext = TargetContext & _SourceStepTargetRuntimeContext;

export type AnyLayerContext =
  | ConfigurationContext
  | JobContext
  | SourceContext
  | StepContext
  | TargetContext;
export type AnyLayerRuntimeContext =
  | ConfigurationContext
  | JobRuntimeContext
  | SourceRuntimeContext
  | StepRuntimeContext
  | TargetRuntimeContext;

export interface LayerSelector<T extends AnyLayerContext> {
  id: string;
  info(context: T): Promise<LayerGetter>;
}

export type LayerGetter = (layerContext: AnyLayerContext) => Promise<Layer>;

export interface Layer<T extends AnyLayerRuntimeContext> {
  toQueryContext?(): Partial<QueryStringContext>;
  execute?(runtimeContext: Readonly<T>): Promise<void>;
}
