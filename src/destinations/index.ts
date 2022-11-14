import { IDestination } from "../config/types";
import { PipelinePart, PipelinePartGetter } from "../runner/types";
import LocalFileDestination from "./file";
import LacesDestination from "./laces";

export default async (data: IDestination): Promise<PipelinePartGetter> => {
  const modules: PipelinePart<IDestination>[] = [
    new LocalFileDestination(),
    new LacesDestination(),
  ];
  const step = modules.find((module) => module.match(data));
  if (!step) throw new Error(`No appropriate endpoint module found for: ${JSON.stringify(data)}`);
  return await step.info(data);
};
