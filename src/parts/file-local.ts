import fs from "fs";
import { StreamParser } from "n3";
import { IJobSourceData } from "../config/types.js";
import { JobRuntimeContext, WorkflowModuleInfo, WorkflowPart } from "../runner/types.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import { FilteredStream, SingleGraphStream } from "../utils/rdf-stream-override.js";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 *
 * Due to security concerns, `@comunica/query-sparql` does not support local file systems
 * as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
 */
export class LocalFileSource implements WorkflowPart<"sources"> {
  id = () => "local-file-source";
  names = ["sources/file"];

  isQualified(data: IJobSourceData): boolean {
    // please try to keep in sync with <./comunica-auto-datasource.ts>
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

  asSource(data: IJobSourceData): WorkflowModuleInfo {
    return async (context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(data.access);

      const quadStream = fs
        .createReadStream(data.access)
        .pipe(new StreamParser({ format: mimetype }))
        .pipe(new FilteredStream({ graphs: data?.with?.onlyGraphs }))
        .pipe(new SingleGraphStream({ graph: data?.with?.targetGraph }));

      const emitter = context.quadStore.import(quadStream);

      await new Promise((resolve, reject) => {
        emitter.on("end", resolve);
        emitter.on("error", reject);
      });

      return {};
    };
  }
}
