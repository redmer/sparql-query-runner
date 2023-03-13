import fs from "fs/promises";
import fetch from "node-fetch";
import { ITarget } from "../config/types.js";
import {
  ConstructRuntimeCtx,
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

const name = "targets/sparql-quad-store";

export class SPARQLQuadStoreTarget implements PipelinePart<ITarget> {
  // Export a(ll) graph(s) to a file
  name = () => name;

  qualifies(data: ITarget): boolean {
    if (data.type !== "sparql-quad-store") return false;
    return true;
  }

  async info(data: ITarget): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(".nq");
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      const stepTempFile = `${context.tempdir}/sparql-quad-destination-${new Date().getTime()}.nq`;

      return {
        start: async () => {
          console.info(
            `${name}: Gathering ${
              data.onlyGraphs ? data.onlyGraphs.length : "all"
            } graphs for export...`
          );
          await serialize(context.quadStore, stepTempFile, {
            format: mimetype,
            graphs: data.onlyGraphs,
            prefixes: context.pipeline.prefixes,
          });

          const contents = await fs.readFile(stepTempFile, { encoding: "utf-8" });

          console.info(`${name}: Uploading to <${data.access}...>`);
          const response = await fetch(data.access, {
            headers: { ...Auth.asHeader(data.credentials), "Content-Type": mimetype },
            method: "POST",
            body: contents,
          });

          if (!response.ok)
            throw new Error(`${name}: Upload failed: ${response.status} ${response.statusText}`);
          console.info(`${name}: Uploaded quads to <${data.access}> ` + Report.DONE);
        },
      };
    };
  }
}
