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

  qualifies(data: IDestination): boolean {
    if (data.type !== "rdf") return false;
    if (data.url.match(/^https?:/)) return false;
    return true;
  }

  async info(data: IDestination): Promise<PipelinePartGetter> {
    const mimetype = data.mediatype ?? getMediaTypeFromExtension(data.url);
    return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
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
