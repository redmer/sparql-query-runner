import type * as RDF from "@rdfjs/types";
import N3 from "n3";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { IJobSourceData, IJobTargetData } from "../config/types.js";
import {
  JobRuntimeContext,
  WorkflowPartSource,
  WorkflowPartTarget,
  type WorkflowModuleExec,
} from "../runner/types.js";
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
    if (!data.access.match(/^https?:\/\//)) return true;
    // Filtered graphs aren't supported by the `auto` Comunica source
    if (data.access.startsWith("http") && data.with.onlyGraphs) return true;
    if (data.access.startsWith("http") && data.with.intoGraph) return true;
    return false;
  }

  shouldCacheAccess(_data: IJobSourceData): boolean {
    return true;
  }

  exec(data: IJobSourceData | IJobTargetData): WorkflowModuleExec {
    return async (_context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(data.access);

      return {
        init: async () => {
          // Read + parse the file synchronously and emit the resulting quads
          // through a native `Readable` object stream.
          //
          // Why not stream directly through `fs.createReadStream().pipe(N3.StreamParser)`?
          // N3's stream classes extend `readable-stream`'s `Transform`. Under
          // Jest's `--experimental-vm-modules` mode, `readable-stream` can be
          // instantiated in a different module realm than Node's builtin
          // `stream`, which produces the intermittent CI hangs we observed
          // (the parser never emitted `end`, and downstream `pipeline()`
          // therefore never resolved). Using the synchronous `N3.Parser` +
          // `Readable.from(...)` sidesteps that interop entirely and keeps
          // fixture files (which are always small) in memory — perfectly
          // acceptable for a config-driven CLI runner.
          const contents = await fsp.readFile(data.access, {
            encoding: "utf-8",
          });
          const quads = new N3.Parser({ format: mimetype }).parse(contents);
          return Readable.from(quads, { objectMode: true }) as RDF.Stream;
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
