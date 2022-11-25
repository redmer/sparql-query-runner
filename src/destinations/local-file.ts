import { IDest } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

/** Export the CONSTRUCTed quads to a local file */
export class LocalFileDestination implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => "destinations/local-file";

  qualifies(data: IDest): boolean {
    if (data.url.match(/^https?:/)) return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(data.url);
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      return {
        start: async () => {
          await serialize(context.quadStore, data.url, {
            format: mimetype,
            graphs: data.onlyGraphs,
            prefixes: context.pipeline.prefixes,
          });
        },
      };
    };
  }
}
