import type * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import fetch from "node-fetch";
import { IJobTargetData } from "../config/types.js";
import { JobRuntimeContext, WorkflowModuleExec, WorkflowPartTarget } from "../runner/types.js";
import * as Auth from "../utils/auth.js";
import { serializeStream } from "../utils/graphs-to-file.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import { InfoUploadingTo } from "../utils/uploading-message.js";

/** Upload NQuads to a SPARQL Quad Store (non-standard) */
export class QuadStoreTarget implements WorkflowPartTarget {
  id = () => "sparql-quad-store-target";
  names = ["targets/sparql-quad-store"];

  exec(data: IJobTargetData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(".nq");
      const stepTempFile = `${context.tempdir}/sparql-quad-destination-${new Date().getTime()}.nq`;

      return {
        init: async (stream: RDF.Stream) => {
          InfoUploadingTo(context.info, data?.with?.onlyGraphs, data.access);

          await serializeStream(stream, stepTempFile, { format: mimetype });
          const contents = await fs.readFile(stepTempFile, { encoding: "utf-8" });

          const response = await fetch(data.access, {
            headers: { ...Auth.asHeader(data?.with?.credentials), "Content-Type": mimetype },
            method: "POST",
            body: contents,
          });

          if (!response.ok)
            context.error(`Upload failed: ${response.status} ${response.statusText}`);
        },
      };
    };
  }
}
