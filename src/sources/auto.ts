import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";

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
export class AutoSource implements WorkflowPart<IJobSourceData> {
  id = () => "sources/comunica-auto";

  shouldCacheAccess(_data: IJobSourceData): boolean {
    return false; // this step should only have online sources
  }

  info(data: IJobSourceData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      context.httpProxyHandler.add(data?.with?.credentials, new URL(data.access));
      return {
        additionalQueryContext: async () => {
          return {
            sources: [{ type: "auto", value: data.access }],
          };
        },
      };
    };
  }
}
