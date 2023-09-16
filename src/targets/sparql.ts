import type { IJobTargetData } from "../config/types.js";
import type { WorkflowPart } from "../runner/types.js";
import * as Auth from "../utils/auth.js";

/**
 * This destination supports SPARQL Update queries.
 *
 * Does not support limitation of exported `graphs`.
 */
export class SPARQLTarget implements WorkflowPart<IJobTargetData> {
  id = () => "targets/sparql";

  additionalQueryContext(data: IJobTargetData) {
    return {
      destination: { type: "sparql", value: data.access },
      httpAuth: Auth.httpSyntax(data.with?.credentials),
    };
  }

  info(_data: IJobTargetData) {
    return async () => {
      return {};
    };
  }
}
