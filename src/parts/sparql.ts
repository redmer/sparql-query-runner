import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowModuleExec, WorkflowPartTarget } from "../runner/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import * as Auth from "../utils/auth.js";

/**
 * This destination supports SPARQL Update queries.
 *
 * Does not support limitation of exported `graphs`.
 */
export class SPARQLTarget implements WorkflowPartTarget {
  id = () => "targets/sparql-update-endpoint";
  names = ["targets/sparql-update-endpoint"];

  staticQueryContext(data: IJobTargetData) {
    return {
      destination: { type: "sparql", value: data.access },
      httpAuth: Auth.httpSyntax(data.with?.credentials),
    };
  }

  staticAuthProxyHandler(data: IJobTargetData): AuthProxyHandler {
    return new AuthProxyHandler(data.with?.credentials, data.access);
  }

  exec(_data: IJobTargetData): WorkflowModuleExec<"asTarget"> {
    return async (_context: JobRuntimeContext) => {
      return {
        asTarget: async () => {
          // no-op: all done via staticQueryContext
        },
      };
    };
  }
}
