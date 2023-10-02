import type * as RDF from "@rdfjs/types";
import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowModuleExec, WorkflowPartTarget } from "../runner/types.js";
import { serializeStream } from "../utils/graphs-to-file.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

/** Export the CONSTRUCTed quads to a local file */
export class LocalFileTarget implements WorkflowPartTarget {
  id = () => "local-file-target";
  names = [];

  isQualified(data: IJobTargetData): boolean {
    return data.access.match(/^https?:/) === null;
  }

  exec(data: IJobTargetData): WorkflowModuleExec<"asTarget"> {
    return async (context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(data.access);
      return {
        asTarget: async (stream: RDF.Stream) => {
          context.info(
            `Exporting ${data?.with?.onlyGraphs?.length ?? "all"} graphs to ${data.access}...`
          );

          await serializeStream(stream, data.access, {
            format: mimetype,
            prefixes: context.jobData.prefixes,
          });
        },
      };
    };
  }
}
