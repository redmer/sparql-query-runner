import type { ITarget } from "../config/types.js";
import type {
  EndpointPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";

const name = "targets/comunica-sparql";

/**
 * This destination supports SPARQL Update queries.
 *
 * Does not support limitation of exported `graphs`.
 */
export class SPARQLTarget implements PipelinePart<ITarget> {
  name = () => name;

  qualifies(data: ITarget): boolean {
    if (data.type === "sparql") return true;
    if (!data.access.match(/https?:/)) return false;
    if (data.onlyGraphs) return false;
    return true;
  }

  async info(data: ITarget): Promise<PipelinePartGetter> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<EndpointPartInfo> => {
      return {
        getQueryContext: {
          destination: { type: "sparql", value: data.access },
          httpAuth: Auth.httpSyntax(data.credentials),
        },
      };
    };
  }
}
