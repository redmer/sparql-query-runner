import { IStep } from "../config/types";
import { PipelineWorker } from "../runner/pipeline-worker";
import { error } from "../utils/errors";
import Delay from "./delay";
import DownloadFile from "./download-file";
import ImportMsAccess from "./import-msaccess";
import LocalFileToLaces from "./local-file-to-laces";
import SetPrefixes from "./set-prefixes";
import ShaclValidateLocal from "./shacl-validate-local";
import SparqlUpdateQuery from "./sparql-update";

/** Get appropriate module for {@link IStep} provided. */
export default async (source: IStep): Promise<StepGetter> => {
  const modules: Step[] = [
    new Delay(),
    new DownloadFile(),
    new ImportMsAccess(),
    new LocalFileToLaces(),
    new SetPrefixes(),
    new ShaclValidateLocal(),
    new SparqlUpdateQuery(),
  ];
  const step = modules.find((module) => module.identifier() === source.type);
  if (!step) error(4101, `Step/type '${source.type}' not found.`);
  return await step.info(source);
};

export interface StepInfo {
  /** Called before running the pipeline, possibly not in sequence */
  preProcess?: () => Promise<void>;
  /** Runs the pipeline step, in defined order. */
  start: () => Promise<void>;
  /** Called after running the pipeline, possibly not in sequence */
  postProcess?: () => Promise<void>;
}

export type StepGetter = (app: PipelineWorker) => Promise<StepInfo>;

export interface Step {
  identifier(): string;
  info(config: IStep): Promise<StepGetter>;
}
