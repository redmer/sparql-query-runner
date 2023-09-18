import fs from "fs";
import rdfParser from "rdf-parse";
import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { filteredStream } from "../utils/dataset-store-filter.js";
import { overrideStream } from "../utils/dataset-store-override.js";

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

  shouldCacheAccess(_data: IJobSourceData): boolean {
    return true;
  }

  info(data: IJobSourceData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const mimetype = rdfParser.getContentTypeFromExtension(data.access);

      // if (!data?.with?.onlyGraphs && !data?.with?.targetGraph) {
      //   const value = await readFile(data.access, { encoding: "utf-8" });
      //   return {
      //     dataSources: () => [{ type: "stringSource", value, mediaType: mimetype }],
      //   };
      // }

      const fileStream = fs.createReadStream(data.access);
      const quadStream = rdfParser.parse(fileStream, { contentType: mimetype });

      const emitter = context.quadStore.import(
        overrideStream(filteredStream(quadStream, { graphs: data?.with?.onlyGraphs }), {
          graph: data?.with?.targetGraph,
        })
      );

      await new Promise((resolve, reject) => {
        emitter.on("end", resolve);
        emitter.on("error", reject);
      });

      return {};
    };
  }
}
