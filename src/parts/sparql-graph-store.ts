import type * as RDF from "@rdfjs/types";
import fs from "fs/promises";
import fetch from "node-fetch";
import { IJobTargetData } from "../config/types.js";
import {
  InMemQuadStore,
  JobRuntimeContext,
  WorkflowModuleExec,
  WorkflowPartTarget,
} from "../runner/types.js";
import * as Auth from "../utils/auth.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getGraphs } from "../utils/quads.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

/** Export a(ll) graph(s) to a SPARQL Graph Store (Not a Quad Store™) */
export class GraphStoreTarget implements WorkflowPartTarget {
  id = () => "sparql-graph-store-target";
  names = ["targets/sparql-graph-store"];

  exec(data: IJobTargetData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      // The issue here is that SPARQL 1.1 GRaph Store HTTP Protocol only supports
      // triples and not quads.
      // <https://www.w3.org/TR/sparql11-http-rdf-update/#http-post>
      // Therefore, we export to n-triples and loop over graphs in data.quadStore

      return {
        init: async (_stream: RDF.Stream, quadStore: InMemQuadStore) => {
          const ntriples = getRDFMediaTypeFromFilename(".nt");
          const graphs = data.with?.onlyGraphs ?? (await getGraphs(quadStore));
          const stepTempDir = `${context.tempdir}/sparql-graph-destination-${Date.now()}`;

          for (const [i, graph] of graphs.entries()) {
            context.info(`Uploading ${i + 1}/${graphs.length} to <${data.access}>...`);

            // First, write-out a single N-Triples file per graph
            await serialize(quadStore, `${stepTempDir}/${i}.nt`, {
              format: ntriples,
              graphs: [graph],
            });
            // And then read that file in-mem
            const contents = await fs.readFile(`${stepTempDir}/${i}.nq`, { encoding: "utf-8" });

            // Set in the URL query part which graph this represents
            const destination = new URL(data.access);
            destination.search =
              graph.value == "" ? `default` : `graph=${encodeURIComponent(graph.value)}`;

            const response = await fetch(destination.href, {
              headers: { ...Auth.asHeader(data.with?.credentials), "Content-Type": ntriples },
              method: "PUT", // Drop and replace, not: update and merge (which is POST)
              body: contents,
            });

            if (!response.ok)
              context.error(`Upload failed: ${response.status} ${response.statusText}`);
          }
        },
      };
    };
  }
}
