import N3 from "n3";
import { IEndpoint } from "../config/types.js";
import destinations from "../destinations/index.js";
import { EndpointPartInfo, PipelinePart, PipelinePartGetter, RuntimeCtx } from "../runner/types.js";
import { authAsContext, authAsDictionary, addAuthToUrl } from "../utils/authentication.js";

export class SPARQLEndpoint implements PipelinePart<IEndpoint> {
  name = () => "sparql-endpoint";

  match(data: IEndpoint): boolean {
    return !!data.get || !!data.post;
  }

  async info(data: IEndpoint): Promise<PipelinePartGetter> {
    return async (context: RuntimeCtx): Promise<EndpointPartInfo> => {
      let source: any;
      let destination: any;

      if (data.get) source = { type: "sparql", value: addAuthToUrl(data.get, data.authentication) };
      if (data.post)
        destination = { type: "sparql", value: addAuthToUrl(data.post, data.authentication) };

      return {
        queryContext: { destination },
        source: source,
        start: async () => {},
      };
    };
  }
}
