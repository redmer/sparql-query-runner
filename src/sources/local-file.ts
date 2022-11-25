import fs from "fs";
import N3 from "n3";
import { ISource } from "../config/types.js";
import {
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
  SourcePartInfo,
} from "../runner/types.js";
import { basename, download } from "../utils/download-remote.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 *
 * Due to security concerns, `@comunica/query-sparql` does not support local file systems
 * as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
 */
export class LocalFileSource implements PipelinePart<ISource> {
  name = () => "sources/local-file";

  qualifies(data: ISource): boolean {
    // please try to keep in sync with <./auto.ts>
    if (data.type === "local-file") return true; // explicitely
    if (data.type === "auto" && !!data.url.match(/^https?:/)) return true; // or auto w/ a local file
    if (data.type === "auto" && data.onlyGraphs) return true; // or remote, w/ filtered graphs
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<SourcePartInfo> => {
      const store = new N3.Store();
      let inputFilePath: string;

      return {
        prepare: async () => {
          // if file is remote, download it
          if (data.url.match(/^https?:/)) {
            // Determine locally downloaded filename
            inputFilePath = `${context.tempdir}/${basename(data.url)}`;

            // Download and save that file at that location
            await download(data.url, inputFilePath, data.auth);
          } else {
            // The file is presumed local
            inputFilePath = data.url;
          }
        },
        start: async () => {
          const mimetype = getMediaTypeFromFilename(inputFilePath);
          const stream = fs.createReadStream(inputFilePath);
          const parser = new N3.StreamParser({ format: mimetype });
          const emitter = store.import(parser.import(stream));

          // Wait until the Store has loaded
          await new Promise((resolve, reject) => {
            emitter.on("end", resolve);
            emitter.on("error", reject);
          });

          // Filter on specified graphs
          for (const graph of store.getGraphs(null, null, null)) {
            if (!data.onlyGraphs?.includes(graph.id)) store.deleteGraph(graph);
          }
        },
        getQuerySource: store,
      };
    };
  }
}
