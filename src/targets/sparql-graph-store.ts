import fs from "fs/promises";
import fetch from "node-fetch";
import { IJobTargetData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import * as Auth from "../utils/auth.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getGraphs } from "../utils/quads.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

/** Export a(ll) graph(s) to a SPARQL Graph Store (Not a Quad Store™) */
export class SPARQLGraphStoreTarget implements WorkflowPart<IJobTargetData> {
  id = () => "targets/sparql-graph-store";

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      // The issue here is that SPARQL 1.1 GRaph Store HTTP Protocol only supports
      // triples and not quads.
      // <https://www.w3.org/TR/sparql11-http-rdf-update/#http-post>
      // Therefore, we export to n-triples and loop over graphs in data.quadStore

      const mimetype = getRDFMediaTypeFromFilename(".nt");
      const graphs = data.with?.onlyGraphs ?? (await getGraphs(context.quadStore));
      const stepTempDir = `${context.tempdir}/sparql-graph-destination-${Date.now()}`;

      return {
        start: async () => {
          context.info(`Gathering ${graphs.length} graphs for export...`);

          for (const [i, graph] of graphs.entries()) {
            const tempFile = `${stepTempDir}/${i}.nq`;
            await serialize(context.quadStore, tempFile, {
              format: mimetype,
              graphs: [graph],
              prefixes: context.data.prefixes,
            });
          }

          context.info(`Uploading to <${data.access}>...`);
          for (const [i, graph] of graphs.entries()) {
            const tempFile = `${stepTempDir}/${i}.nq`;
            const contents = await fs.readFile(tempFile, { encoding: "utf-8" });

            const destination = new URL(data.access);
            const graphName = graph.value == "" ? "default" : graph.value;
            destination.search = `graph=${encodeURIComponent(graphName)}`;

            const response = await fetch(destination.href, {
              headers: { ...Auth.asHeader(data.with?.credentials), "Content-Type": mimetype },
              method: "POST",
              body: contents,
            });

            if (!response.ok)
              context.error(`Upload failed: ${response.status} ${response.statusText}`);
            context.info(`Uploaded triples to <${data.access}> ` + Report.DONE);
          }
        },
      };
    };
  }
}
