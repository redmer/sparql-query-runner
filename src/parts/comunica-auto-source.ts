import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowModuleExec, WorkflowPartSource } from "../runner/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";

/**
 * These sources are automatically supported by Comunica.
 *
 * - `file` (plain RDF in any RDF serialization), `hdt` (HDT) and `ostrichFile` (OSTRICH archive).
 *   These source MUST be remote, unsupported via local filesystem in @comunica/query-sparql.
 * - `sparql`
 * - `hypermedia`, `qpf`, `brtpf` (Triple/Quad Pattern Fragments)
 * - `rdfjs` (not available via workflow.sqr.yaml)
 *
 * Source: <https://comunica.dev/docs/query/advanced/source_types/#supported-source-types>
 * */
export class ComunicaAutoSource implements WorkflowPartSource {
  id = () => "comunica-auto-source";
  names = ["sources/sparql", "sources/file"];

  isQualified(data: IJobSourceData): boolean {
    return data.access.match(/^https?:\/\//) !== null;
  }

  shouldCacheAccess(_data: IJobSourceData): boolean {
    return false; // this step should only have online sources
  }

  staticAuthProxyHandler(data: IJobSourceData): AuthProxyHandler {
    return new AuthProxyHandler(data.with.credentials, data.access);
  }

  exec(data: IJobSourceData): WorkflowModuleExec {
    return async (_context: JobRuntimeContext) => {
      const sourceType = data.with["source-type"] ?? data.type.split("/").at(-1);
      return {
        comunicaDataSources: () => [{ type: sourceType, value: data.access }],
      };
    };
  }
}
