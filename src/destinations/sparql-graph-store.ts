import fs from "fs/promises";
import N3 from "n3";
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

const name = "destinations/sparql-graph-store";

export class SPARQLGraphStore implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => name;

  qualifies(data: IDest): boolean {
    if (data.type !== "sparql-graph-store") return false;
    return true;
  }

  /** Exported graphs are specified or implicit */
  graphCount(data: IDest, store: N3.Store): string[] {
    if (data.onlyGraphs) return data.onlyGraphs;
    const implicit = [];
    for (const g of store.getGraphs(null, null, null)) implicit.push(g.id);
    return implicit;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    // Export to n-triples
    const mimetype = getMediaTypeFromFilename(".nt");

    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      // The issue here is that SPARQL 1.1 GRaph Store HTTP Protocol only supports
      // triples and not quads. Therefore, a loop over graphs in data.store is
      // necessary.
      // <https://www.w3.org/TR/sparql11-http-rdf-update/#http-post>

      const graphs = this.graphCount(data, context.quadStore);
      const stepTempDir = `${context.tempdir}/sparql-graph-destination-${new Date().getTime()}`;

      return {
        start: async () => {
          console.info(`${name}: Gathering ${graphs.length} graphs for export...`);

          for (const [i, graph] of graphs.entries()) {
            const tempFile = `${stepTempDir}/${i}.nq`;
            await serialize(context.quadStore, tempFile, {
              format: mimetype,
              graphs: [graph],
              prefixes: context.pipeline.prefixes,
            });
          }

          console.info(`${name}: Uploading to <${data.url}>...`);
          for (const [i, graph] of graphs.entries()) {
            const tempFile = `${stepTempDir}/${i}.nq`;
            const contents = await fs.readFile(tempFile, { encoding: "utf-8" });

            const destination = new URL(data.url);
            const graphName = graph == "" ? "default" : graph;
            destination.search = `graph=${encodeURIComponent(graphName)}`;

            const response = await fetch(destination.href, {
              headers: { ...Auth.asHeader(data.auth), "Content-Type": mimetype },
              method: "POST",
              body: contents,
            });

            if (!response.ok)
              throw new Error(`${name}: Upload failed: ${response.status} ${response.statusText}`);
            console.info(`${name}: Uploaded triples to <${data.url}> ` + Report.DONE);
          }
        },
      };
    };
  }
}
