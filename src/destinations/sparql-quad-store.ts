import fs from "fs/promises";
import fetch from "node-fetch";
import { IDest } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

const name = "destinations/sparql-quad-store";

export class SPARQLQuadStore implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => name;

  qualifies(data: IDest): boolean {
    if (data.type !== "sparql-quad-store") return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
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

          console.info(`${name}: Uploading to <${data.url}...>`);
          const response = await fetch(data.url, {
            headers: { ...Auth.asHeader(data.auth), "Content-Type": mimetype },
            method: "POST",
            body: contents,
          });

          if (!response.ok)
            throw new Error(`${name}: Upload failed: ${response.status} ${response.statusText}`);
          console.info(`${name}: Uploaded quads to <${data.url}> ` + Report.DONE);
        },
      };
    };
  }
}
