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

  match(data: ISource): boolean {
    return (
      data.type === "rdf" && // Only RDF files
      !!data.url.match(/^https?:/) && // Only remote files
      data.authentication?.type == "Basic" && // If auth, only Basic auth
      !!data.graphs // Not only specific graphs
    );
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

  match(data: ISource): boolean {
    return (
      data.type === "rdf" && // RDF file that is either
      (!data.url.match(/^https?:/) || // non-remote
        data.authentication?.type !== "Basic" || // with a non-basic auth
        !!data.graphs) // with a specific graph
    );
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
          data.graphs?.forEach((graph) => {
            store.deleteGraph(graph);
          });
        },
        getQuerySource: store,
      };
    };
  }
}
