import { ITarget } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import { DONE } from "../utils/report.js";

const name = "targets/local-file";

/** Export the CONSTRUCTed quads to a local file */
export class LocalFileTarget implements PipelinePart<ITarget> {
  // Export a(ll) graph(s) to a file
  name = () => name;

  qualifies(data: ITarget): boolean {
    if (data.access.match(/^https?:/)) return false;
    return true;
  }

  async info(data: ITarget): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(data.access);
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      return {
        start: async () => {
          console.info(
            `${name}: Exporting ${data.onlyGraphs ? data.onlyGraphs.length : "all"} graphs to ${
              data.access
            }...`
          );
          await serialize(context.quadStore, data.access, {
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
