import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { IJobSourceData, IJobTargetData } from "../config/types.js";
import { JobRuntimeContext, WorkflowPartSource, WorkflowPartTarget } from "../runner/types.js";
import { serializeStream } from "../utils/graphs-to-file.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import { InfoUploadingTo } from "../utils/uploading-message.js";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 *
 * Due to security concerns, `@comunica/query-sparql` does not support local file systems
 * as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
 */
export class LocalFileSource implements WorkflowPartSource {
  id = () => "local-file-source";
  names = ["sources/file"];

  isQualified(data: IJobSourceData): boolean {
    // please try to keep in sync with <./comunica-auto-datasource.ts>
    // Local files are not supported by the `auto` Comunica source.
    if (!data.access.startsWith("http")) return true;
    // Filtered graphs aren't supported by the `auto` Comunica source
    if (data.access.startsWith("http") && data.with.onlyGraphs) return true;
    if (data.access.startsWith("http") && data.with.intoGraph) return true;
    return false;
  }

  shouldCacheAccess(_data: IJobSourceData): boolean {
    return true;
  }

  exec(data: IJobSourceData | IJobTargetData) {
    return async (_context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(data.access);

      return {
        init: async () => {
          const quadStream = fs
            .createReadStream(data.access)
            .pipe(new N3.StreamParser({ format: mimetype }));

          return quadStream;
        },
      };
    };
  }
}

export class LocalFileTarget implements WorkflowPartTarget {
  id = () => "local-file-target";
  names = ["targets/file"];

  exec(data: IJobTargetData) {
    return async (context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(data.access);

      return {
        init: async (stream: RDF.Stream) => {
          InfoUploadingTo(context.info, data.with.onlyGraphs, data.access);

          await serializeStream(stream, data.access, {
            format: mimetype,
            prefixes: context.jobData.prefixes,
          });
        },
      };
    };
  }
}
