import { QueryStringContext } from "@comunica/types";
import { ISource } from "../config/types.js";
import { BaseModule } from "../runner/base-module.js";
import { WorkflowModule } from "../runner/types.js";
import { BasicBearerAuthProxyHandler } from "../utils/auth-proxy-handler.js";

/**
 * These sources are automatically supported by Comunica.
 *
 * - `file` (plain RDF in any RDF serialization), as well as `hdtFile` (HDT) and `ostrichFile`.
 *   These source MUST be remote, unsupported via local filesystem in @comunica/query-sparql.
 * - `sparql`
 * - `hypermedia` (Triple/Quad Pattern Fragments)
 * - `rdfjsSource` (not available via sparql-query-runner.yaml)
 *
 * Source: <https://comunica.dev/docs/query/advanced/source_types/#supported-source-types>
 * */
export class AutoSource extends BaseModule<ISource> implements WorkflowModule<ISource> {
  static id = "sources/comunica-auto";

  static qualifies(data: ISource): boolean {
    if (data.onlyGraphs) return false; // no graph limitations supported
    if (!data.access.startsWith("http")) return false; // only remote files supported
    if (["auto", "sparql", "remotefile"].includes(data.type)) return true; // explicit types
    return false;
  }

  queryContext(): Partial<QueryStringContext> {
    const handler = this.data.credentials
      ? new BasicBearerAuthProxyHandler(this.data.credentials)
      : undefined;
    return {
      sources: [{ type: "auto", value: this.data.access }],
      // TODO: AuthProxyHandler should be isolated to a single source/destination
      httpProxyHandler: handler,
    };
  }
}
