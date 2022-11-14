import { IEndpoint } from "../config/types";
import { PipelinePart, PipelinePartGetter } from "../runner/types";
import { SPARQLEndpoint } from "./sparql";

export default async (data: IEndpoint): Promise<PipelinePartGetter> => {
  const modules: PipelinePart<IEndpoint>[] = [new SPARQLEndpoint()];
  const step = modules.find((module) => module.match(data));
  if (!step) throw new Error(`No appropriate endpoint module found for: ${JSON.stringify(data)}`);
  return await step.info(data);
};
