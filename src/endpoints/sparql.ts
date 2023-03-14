import { IEndpoint } from "../config/types.js";
import {
  ConstructRuntimeCtx,
  PipelinePart,
  PipelinePartGetter,
  SourcePartInfo,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";

const name = "endpoints/comunica-sparql";

/**
 * This destination is automatically supported by Comunica.
 *
 * Source: <https://comunica.dev/docs/query/advanced/destination_types/>
 * */
export class SparqlEndpoint implements PipelinePart<IEndpoint> {
  name = () => name;

  qualifies(data: IEndpoint): boolean {
    if (data.post) return true;
    return false;
  }

  async info(data: IEndpoint): Promise<PipelinePartGetter> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<SourcePartInfo> => {
      // const destination = { type: "sparql", value: Auth.addToUrl(data.post, data.auth) };
      return {
        // We only need to insert Basic authentication between URL schema and rest...
        // Source: <https://comunica.dev/docs/query/advanced/basic_auth/>
        getQueryContext: {
          destination: { type: "sparql", value: data.post },
          httpAuth: Auth.httpSyntax(data.credentials),
        },
      };
    };
  }
}
