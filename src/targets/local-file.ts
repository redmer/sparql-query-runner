import type { IJobTargetData } from "../config/types";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";
import { serialize } from "../utils/graphs-to-file.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import { DONE } from "../utils/report.js";

/** Export the CONSTRUCTed quads to a local file */
export class LocalFileTarget implements WorkflowPart<IJobTargetData> {
  id = () => "targets/file";

  isQualified(data: IJobTargetData): boolean {
    return data.access.match(/^https?:/) === null;
  }

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const mimetype = getRDFMediaTypeFromFilename(data.access);
      return {
        start: async () => {
          const count = data.with?.onlyGraphs?.length ?? "all";
          context.info(`Exporting ${count} graphs to ${data.access}...`);

          await serialize(context.quadStore, data.access, {
            format: mimetype,
            graphs: data.with?.onlyGraphs,
            prefixes: context.data.prefixes,
          });

          console.info(`Exporting ` + DONE);
        },
      };
    };
  }
}
