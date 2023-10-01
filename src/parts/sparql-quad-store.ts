import fs from "fs/promises";
import fetch from "node-fetch";
import { IJobTargetData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import * as Auth from "../utils/auth.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

export class SPARQLQuadStoreTarget implements WorkflowPart<IJobTargetData> {
  // Export a(ll) graph(s) to a file
  id = () => "targets/sparql-quad-store";

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(".nq");
      const stepTempFile = `${context.tempdir}/sparql-quad-destination-${new Date().getTime()}.nq`;

      return {
        start: async () => {
          context.info(`Gathering ${data.with?.onlyGraphs?.length ?? "all"} graphs for export...`);
          await serialize(context.quadStore, stepTempFile, {
            format: mimetype,
            graphs: data.with.onlyGraphs,
            prefixes: context.jobData.prefixes,
          });

          const contents = await fs.readFile(stepTempFile, { encoding: "utf-8" });

          context.info(`Uploading to <${data.access}...>`);
          const response = await fetch(data.access, {
            headers: { ...Auth.asHeader(data.with.credentials), "Content-Type": mimetype },
            method: "POST",
            body: contents,
          });

          if (!response.ok)
            context.error(`Upload failed: ${response.status} ${response.statusText}`);
          context.info(`Uploaded quads to <${data.access}> ` + Report.DONE);
        },
      };
    };
  }
}
