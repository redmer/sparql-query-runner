import { IStep } from "../config/types";
import { PipelinePart, PipelinePartGetter } from "../runner/types";
import { error } from "../utils/errors.js";
import ShaclValidateLocal from "./shacl-validate-local.js";
import SparqlConstructQuery from "./sparql-query";
import SparqlUpdate from "./sparql-update.js";

/** Get appropriate module for {@link IStep} provided. */
export default async (data: IStep): Promise<PipelinePartGetter> => {
  const modules: PipelinePart<IStep>[] = [
    new ShaclValidateLocal(),
    new SparqlUpdate(),
    new SparqlConstructQuery(),
  ];
  const step = modules.find((module) => module.match(data));
  if (!step) throw new Error(`No appropriate step found for: ${JSON.stringify(data)}`);
  return await step.info(data);
};
