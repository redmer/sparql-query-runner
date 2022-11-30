import fs from "fs/promises";
import fetch from "node-fetch";
import { IDest } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
} from "../runner/types.js";
import * as Auth from "../utils/authentication.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

export class SPARQLQuadStore implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => "destinations/sparql-quad-store";

  qualifies(data: IDest): boolean {
    if (data.type !== "sparql-quad-store") return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(".nq");
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      const tempFile = `${context.tempdir}/sparql-quad-destination-${new Date().getTime()}.nq`;

      return {
        prepare: async () => {
          await serialize(context.quadStore, tempFile, {
            format: mimetype,
            graphs: data.onlyGraphs,
            prefixes: context.pipeline.prefixes,
          });
        },
        start: async () => {
          const contents = await fs.readFile(tempFile, { encoding: "utf-8" });

          const msg = `Uploading to '${data.url}'`;
          Report.start(msg);
          const response = await fetch(data.url, {
            headers: { ...Auth.asHeader(data.auth), "Content-Type": mimetype },
            method: "POST",
            body: contents,
          });

          if (!response.ok && context.options.abortOnError) Report.fail(msg);
          Report.success(msg);
        },
      };
    };
  }
}