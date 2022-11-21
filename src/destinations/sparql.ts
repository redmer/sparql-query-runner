import type { IDest } from "../config/types.js";
import type {
  EndpointPartInfo,
  PipelinePart,
  PipelinePartGetter,
  RuntimeCtx,
} from "../runner/types.js";
import * as Auth from "../utils/authentication.js";

/**
 * This destination supports SPARQL Update queries.
 *
 * Does not support limitation of exported `graphs`.
 */
export class SPARQLDestination implements PipelinePart<IDest> {
  name = () => "destination/comunica-sparql";

  qualifies(data: IDest): boolean {
    if (data.type !== "sparql") return false;
    if (!data.url.match(/https?:/)) return false;
    if (data.graphs) return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<EndpointPartInfo> => {
      const destination = { type: "sparql", value: Auth.addToUrl(data.url, data.authentication) };
      return {
        getQueryContext: { destination },
        start: async () => {},
      };
    };
  }
}
