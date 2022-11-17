import fs from "fs";
import N3 from "n3";
import { ISource } from "../config/types.js";
import { PipelinePart, PipelinePartGetter, RuntimeCtx, SourcePartInfo } from "../runner/types.js";
import { Auth } from "../utils/authentication.js";
import { basename, download } from "../utils/download-remote.js";
import { getMediaTypeFromExtension } from "../utils/rdf-extensions-mimetype.js";

export class RemoteBasicFileSource implements PipelinePart<ISource> {
  // Remote files are a valid Source for @comunica/query-sparql
  name = () => "remote-file-store-source";

  qualifies(data: ISource): boolean {
    if (data.type !== "rdf") return false;
    if (!data.url.match(/^https?:/)) return false;
    if (data.authentication && data.authentication.type !== "Basic") return false;
    if (data.graphs) return false;

    return true;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<SourcePartInfo> => {
      // We need to insert Basic authentication between URL schema and rest...
      // Source: <https://comunica.dev/docs/query/advanced/basic_auth/>
      return {
        start: async () => {},
        getQuerySource: { type: "file", value: Auth.addToUrl(data.url, data.authentication) },
      };
    };
  }
}

export class CustomFileSource implements PipelinePart<ISource> {
  // Local files are not valid Source for @comunica/query-sparql, but a N3.Store is
  name = () => "local-file-store-source";

  qualifies(data: ISource): boolean {
    if (data.type !== "rdf") return false;

    return true;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<SourcePartInfo> => {
      const store = new N3.Store();
      let inputFilePath: string;

      return {
        prepare: async () => {
          // if file is remote, download it
          if (data.url.match(/https?:/)) {
            // Determine locally downloaded filename
            inputFilePath = `${context.tempdir}/${basename(data.url)}`;

            // Download and save that file at that location
            await download(data.url, inputFilePath, data.authentication);
          } else {
            // The file is presumed local
            inputFilePath = data.url;
          }
        },
        start: async () => {
          const mimetype = data.mediatype ?? getMediaTypeFromExtension(inputFilePath);
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
            if (!data.graphs?.includes(graph.value)) store.deleteGraph(graph);
          }
        },
        getQuerySource: store,
      };
    };
  }
}
