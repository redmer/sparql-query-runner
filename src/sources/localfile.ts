import fs from "fs";
import N3 from "n3";
import { ISource } from "../config/types.js";
import {
  ConstructRuntimeCtx,
  PipelinePart,
  PipelinePartGetter,
  SourcePartInfo,
} from "../runner/types.js";
import { basename, download } from "../utils/download-remote.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

const name = "sources/localfile";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 *
 * Due to security concerns, `@comunica/query-sparql` does not support local file systems
 * as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
 */
export class LocalFileSource implements PipelinePart<ISource> {
  name = () => name;

  qualifies(data: ISource): boolean {
    // please try to keep in sync with <./auto.ts>
    if (data.type === "localfile") return true; // explicitly
    if (data.type === "auto" && !data.access.startsWith("http")) return true; // or auto w/ a local file
    if (["remotefile", "auto"].includes(data.type) && data.onlyGraphs) return true; // or remote, w/ filtered graphs
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<SourcePartInfo> => {
      const store = new N3.Store();
      let inputFilePath: string;

      return {
        prepare: async () => {
          // if file is remote, download it
          if (data.access.match(/^https?:/)) {
            // Determine locally downloaded filename
            inputFilePath = `${context.tempdir}/${basename(data.access)}`;

            // Download and save that file at that location
            await download(data.access, inputFilePath, data.credentials);
          } else {
            // The file is presumed local
            inputFilePath = data.access;
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

          console.info(`${name}: Loaded ${store.size} quads from <${data.access}>`);
        },
        getQueryContext: { sources: [store] },
      };
    };
  }
}
