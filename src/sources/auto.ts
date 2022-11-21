import { ISource } from "../config/types.js";
import { PipelinePart, PipelinePartGetter, RuntimeCtx, SourcePartInfo } from "../runner/types.js";
import * as Auth from "../utils/authentication.js";

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
export default class AutoSource implements PipelinePart<ISource> {
  name = () => "source/comunica-auto";

  qualifies(data: ISource): boolean {
    if (data.type !== "auto") return false;
    if (data.graphs) return false;
    if (!data.url.match(/^https:/)) return false;
    return true;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (context: Readonly<RuntimeCtx>): Promise<SourcePartInfo> => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        start: async () => {},
        // We only need to insert Basic authentication between URL schema and rest...
        // Source: <https://comunica.dev/docs/query/advanced/basic_auth/>
        getQuerySource: { type: "auto", value: Auth.addToUrl(data.url, data.authentication) },
      };
    };
  }
}
