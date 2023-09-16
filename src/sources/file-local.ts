import fs from "fs";
import rdfParser from "rdf-parse";
import { storeStream } from "rdf-store-stream";
import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { filteredStore } from "../utils/dataset-store-filter.js";
import { overrideStore } from "../utils/dataset-store-override.js";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 *
 * Due to security concerns, `@comunica/query-sparql` does not support local file systems
 * as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
 */
export class LocalFileSource implements WorkflowPart<IJobSourceData> {
  id = () => "sources/file-local";

  isQualified(data: IJobSourceData): boolean {
    // please try to keep in sync with <./auto.ts>
    // Local files are not supported by the `auto` Comunica source.
    if (!data.access.startsWith("http")) return true;
    // Filtered graphs aren't supported by the `auto` Comunica source
    if (data.access.startsWith("http") && data?.with?.onlyGraphs) return true;
    if (data.access.startsWith("http") && data?.with?.targetGraph) return true;
    return false;
  }

  info(data: IJobSourceData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (_context: JobRuntimeContext) => {
      const mimetype = rdfParser.getContentTypeFromExtension(data.access);
      const stream = fs.createReadStream(data.access);
      const importer = rdfParser.parse(stream, { contentType: mimetype });

      let store = await storeStream(importer);
      store = await filteredStore(store, { graphs: data?.with?.onlyGraphs });
      store = await overrideStore(store, { graph: data?.with?.targetGraph });

      return {
        dataSources: async () => store,
      };
    };
  }
}
