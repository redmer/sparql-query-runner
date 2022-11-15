import type { IEndpoint } from "../config/types.js";
import type {
  EndpointPartInfo,
  PipelinePart,
  PipelinePartGetter,
  RuntimeCtx,
} from "../runner/types.js";
import { Auth } from "../utils/authentication.js";

export class SPARQLEndpoint implements PipelinePart<IEndpoint> {
  name = () => "sparql-endpoint";

  match(data: IEndpoint): boolean {
    return !!data.get || !!data.post;
  }

  async info(data: IEndpoint): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<EndpointPartInfo> => {
      let source: any;
      let destination: any;

      if (data.get)
        source = { type: "sparql", value: Auth.addToUrl(data.get, data.authentication) };
      if (data.post) {
        destination = { type: "sparql", value: Auth.addToUrl(data.post, data.authentication) };
      } else {
        destination = { type: "rdfjsStore", value: context.quadStore };
      }
      return {
        getQueryContext: { destination },
        getQuerySource: source,
        start: async () => {},
      };
    };
  }
}
