import { MSAccess } from "@rdmr-eu/rdfjs-source-msaccess";
import fs from "fs/promises";
import { pathToFileURL } from "node:url";
import type { IJobSourceData } from "../config/types";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";

export class MsAccessSource implements WorkflowPart<IJobSourceData> {
  id = () => "sources/msaccess";

  knownModels = ["facade-x", "csv"];

  isQualified(data: IJobSourceData): boolean {
    return this.knownModels.includes(data.with?.["model"]);
  }

  shouldCacheAccess(data: IJobSourceData): boolean {
    // Assume that HTTP accessed resources are cacheable
    return data.access.match(/^https?:/) !== null;
  }

  info(data: IJobSourceData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const quadMode = data.with?.["model"] ?? "facade-x";
      // let inputFilePath: string;

      if (data.with?.onlyGraphs) context.warning(`'onlyGraphs' not supported`);

      // // if file is remote, download it
      // if (data.access.match(/https?:/)) {
      //   // Determine locally downloaded filename
      //   inputFilePath = `${context.tempdir}/${basename(data.access)}`;

      //   // Download and save that file at that location
      //   await download(data.access, inputFilePath, data.with?.credentials);
      // } else {
      //   // The file is presumed local
      //   inputFilePath = data.access;
      // }

      const db = await fs.readFile(data.access);
      const mdb = new MSAccess(db, {
        quadMode,
        baseIRI: pathToFileURL(data.access).href + "#",
      });

      return {
        data: async () => mdb.store(),
      };
    };
  }
}
