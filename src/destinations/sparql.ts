import type { IDest } from "../config/types.js";
import type {
  EndpointPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";

const name = "destinations/comunica-sparql";

/**
 * This destination supports SPARQL Update queries.
 *
 * Does not support limitation of exported `graphs`.
 */
export class SPARQLDestination implements PipelinePart<IDest> {
  name = () => name;

  qualifies(data: IDest): boolean {
    if (data.type === "sparql") return true;
    if (!data.url.match(/https?:/)) return false;
    if (data.onlyGraphs) return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<EndpointPartInfo> => {
      return {
        getQueryContext: {
          destination: { type: "sparql", value: data.url },
          httpAuth: Auth.httpSyntax(data.auth),
        },
      };
    };
  }
}
