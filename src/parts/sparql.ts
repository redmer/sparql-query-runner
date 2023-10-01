import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import * as Auth from "../utils/auth.js";

/**
 * This destination supports SPARQL Update queries.
 *
 * Does not support limitation of exported `graphs`.
 */
export class SPARQLTarget implements WorkflowPart<IJobTargetData> {
  id = () => "targets/sparql";

  staticQueryContext(data: IJobTargetData) {
    return {
      destination: { type: "sparql", value: data.access },
      httpAuth: Auth.httpSyntax(data.with?.credentials),
    };
  }

  staticAuthProxyHandler(data: IJobTargetData): AuthProxyHandler {
    return new AuthProxyHandler(data.with?.credentials, data.access);
  }

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      return {};
    };
  }
}
