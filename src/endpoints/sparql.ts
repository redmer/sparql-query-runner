import { IEndpoint } from "../config/types.js";
import { BaseModule } from "../runner/base-module";
import {
  ICacheableModule,
  IWorkflowModuleQueryDelegate,
  IWorkflowModuleStatic,
  UpdateCtx,
} from "../runner/types.js";
import { BasicBearerAuthProxyHandler } from "../utils/auth-proxy-handler.js";

/**
 * A SPARQL endpoint is automatically supported by Comunica.
 *
 * Source: <https://comunica.dev/docs/query/advanced/destination_types/>
 * */
export class SparqlEndpoint
  extends BaseModule<IEndpoint>
  implements
    ICacheableModule,
    IWorkflowModuleQueryDelegate<UpdateCtx>,
    IWorkflowModuleStatic<IEndpoint>
{
  static id = "endpoints/comunica-sparql";

  static qualifies(data: IEndpoint): boolean {
    if (data.access) return true;
    return false;
  }

  hash() {
    return null; // An external endpoint cannot be cached
  }

  async queryContext() {
    return {
      source: { type: "sparql", value: this.data.access },
      // `httpAuth:` only supports Basic Auth, so instead use a proxy.
      // Source: <https://comunica.dev/docs/query/advanced/basic_auth/>
      httpProxyHandler: new BasicBearerAuthProxyHandler(this.data.credentials),
    };
  }
}
