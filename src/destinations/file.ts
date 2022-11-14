import { IDestination } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  RuntimeCtx,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromExtension } from "../utils/rdf-extensions-mimetype.js";

export default class LocalFileDestination implements PipelinePart<IDestination> {
  // Export a(ll) graph(s) to a file
  name = () => "file-destination";

  match(data: IDestination): boolean {
    return data.type === "rdf" && !data.url.match(/^https?:/);
  }

  async info(data: IDestination): Promise<PipelinePartGetter> {
    const mimetype = data.mediatype ?? getMediaTypeFromExtension(data.url);
    return async (context: RuntimeCtx): Promise<DestinationPartInfo> => {
      return {
        start: async () => {
          await serialize(context.quadStore, data.url, {
            format: mimetype,
            graphs: data.graphs,
            prefixes: context.pipeline.prefixes,
          });
        },
      };
    };
  }
}
