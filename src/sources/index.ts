import { ISource } from "../config/types";
import { PipelinePart, PipelinePartGetter } from "../runner/types";
import { MsAccessSource } from "./msaccess";
import { CustomFileSource, RemoteBasicFileSource } from "./rdf";

export default async (data: ISource): Promise<PipelinePartGetter> => {
  const modules: PipelinePart<ISource>[] = [
    new MsAccessSource(),
    new RemoteBasicFileSource(),
    new CustomFileSource(),
  ];
  const step = modules.find((module) => module.match(data));
  if (!step) throw new Error(`No appropriate source module found for: ${JSON.stringify(data)}`);
  return await step.info(data);
};
