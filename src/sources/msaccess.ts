import { MSAccess } from "@rdmr-eu/rdfjs-source-msaccess";
import fs from "fs/promises";
import { pathToFileURL } from "node:url";
import type { ISource } from "../config/types";
import type {
  ConstructCtx,
  PipelinePart,
  PipelinePartGetter,
  SourcePartInfo,
} from "../runner/types";
import { basename, download } from "../utils/download-remote.js";

const name = "sources/msaccess";

export class MsAccessSource implements PipelinePart<ISource> {
  name = () => name;

  qualifies(data: ISource): boolean {
    if (data.type === "msaccess") return true;
    if (data.type === "msaccess-csv") return true;
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructCtx>): Promise<SourcePartInfo> => {
      const quadMode = data.type == "msaccess" ? "facade-x" : "csv";
      let inputFilePath: string;

      if (data.onlyGraphs) console.warn(`${name}: 'onlyGraphs' is not supported`);

      // if file is remote, download it
      if (data.access.match(/https?:/)) {
        // Determine locally downloaded filename
        inputFilePath = `${context.tempdir}/${basename(data.access)}`;

        // Download and save that file at that location
        await download(data.access, inputFilePath, data.credentials);
      } else {
        // The file is presumed local
        inputFilePath = data.access;
      }

      const db = await fs.readFile(inputFilePath);
      const mdb = new MSAccess(db, {
        quadMode,
        baseIRI: pathToFileURL(data.access).href + "#",
      });

      return {
        getQueryContext: { sources: [mdb.store()] },
      };
    };
  }
}
