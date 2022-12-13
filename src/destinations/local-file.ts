import { IDest } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import { DONE } from "../utils/report.js";

const name = "destinations/local-file";

/** Export the CONSTRUCTed quads to a local file */
export class LocalFileDestination implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => name;

  qualifies(data: IDest): boolean {
    if (data.url.match(/^https?:/)) return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(data.url);
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      return {
        start: async () => {
          console.info(
            `${name}: Exporting ${data.onlyGraphs ? data.onlyGraphs.length : "all"} graphs to ${
              data.url
            }...`
          );
          await serialize(context.quadStore, data.url, {
            format: mimetype,
            graphs: data.onlyGraphs,
            prefixes: context.pipeline.prefixes,
          });
          console.info(`${name}: Exporting ` + DONE);
        },
      };
    };
  }
}
