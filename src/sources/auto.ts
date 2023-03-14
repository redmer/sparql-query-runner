import { ISource } from "../config/types.js";
import {
  ConstructRuntimeCtx,
  PipelinePart,
  PipelinePartGetter,
  SourcePartInfo,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";

const name = "sources/comunica-auto";

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
export class AutoSource implements PipelinePart<ISource> {
  name = () => name;

  qualifies(data: ISource): boolean {
    if (data.onlyGraphs) return false;
    if (!data.access.startsWith("http")) return false;
    if (["auto", "sparql", "remotefile"].includes(data.type)) return true;
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<SourcePartInfo> => {
      const httpAuth = data.credentials ? Auth.httpSyntax(data.credentials) : undefined;

      return {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        start: async () => {},
        getQueryContext: { sources: [{ type: "auto", value: data.access }], httpAuth },
      };
    };
  }
}
