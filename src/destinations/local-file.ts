import fetch from "node-fetch";
import { IDest } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  RuntimeCtx,
} from "../runner/types.js";
import * as Auth from "../utils/authentication.js";
import { serialize } from "../utils/graphs-to-file.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import fs from "fs/promises";
import * as Report from "../utils/report.js";
import N3 from "n3";

/** Export the CONSTRUCTed quads to a local file */
export class LocalFileDestination implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => "destination/file";

  qualifies(data: IDest): boolean {
    if (data.url.match(/^https?:/)) return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(data.url);
    return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
      return {
        start: async () => {
          await serialize(context.quadStore, data.url, {
            format: mimetype,
            graphs: data.graphs,
            prefixes: context.pipeline.prefixes,
          });
        },
      };
    };
  }
}

export class SPARQLQuadStore implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => "destination/sparql-quad-store";

  qualifies(data: IDest): boolean {
    if (data.type !== "sparql-quad-store") return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    const mimetype = getMediaTypeFromFilename(".nq");
    return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
      const tempFile = `${context.tempdir}/sparql-quad-destination-${new Date().getTime()}.nq`;

      return {
        prepare: async () => {
          await serialize(context.quadStore, tempFile, {
            format: mimetype,
            graphs: data.graphs,
            prefixes: context.pipeline.prefixes,
          });
        },
        start: async () => {
          const contents = await fs.readFile(tempFile, { encoding: "utf-8" });

          const msg = `Uploading to '${data.url}'`;
          Report.start(msg);
          const response = await fetch(data.url, {
            headers: { ...Auth.asHeader(data.authentication), "Content-Type": mimetype },
            method: "POST",
            body: contents,
          });

          if (response.ok) {
            Report.success(msg);
          } else {
            Report.fail(msg);
          }
        },
      };
    };
  }
}

export class SPARQLGraphStore implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to a file
  name = () => "destination/sparql-graph-store";

  qualifies(data: IDest): boolean {
    if (data.type !== "sparql-graph-store") return false;
    return true;
  }

  /** Exported graphs are specified or implicit */
  graphCount(data: IDest, store: N3.Store): string[] {
    if (data.graphs) return data.graphs;
    const implicit = [];
    for (const g of store.getGraphs(null, null, null)) implicit.push(g.id);
    return implicit;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    // Export to n-triples
    const mimetype = getMediaTypeFromFilename(".nt");

    return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
      // The issue here is that SPARQL 1.1 GRaph Store HTTP Protocol only supports
      // triples and not quads. Therefore, a loop over graphs in data.store is
      // necessary.
      // <https://www.w3.org/TR/sparql11-http-rdf-update/#http-post>

      const graphs = this.graphCount(data, context.quadStore).entries();
      const tempDir = `${context.tempdir}/sparql-graph-destination-${new Date().getTime()}`;

      return {
        prepare: async () => {
          for (const [i, graph] of graphs) {
            const tempFile = `${tempDir}/${i}.nq`;
            await serialize(context.quadStore, tempFile, {
              format: mimetype,
              graphs: [graph],
              prefixes: context.pipeline.prefixes,
            });
          }
        },
        start: async () => {
          for (const [i, graph] of graphs) {
            const tempFile = `${tempDir}/${i}.nq`;
            const contents = await fs.readFile(tempFile, { encoding: "utf-8" });

            const destination = new URL(data.url);
            const graphName = graph == "" ? "default" : graph;
            destination.search = `graph=${graphName}`;

            const msg = `Uploading graph '${graphName}' to '${destination}'`;
            Report.start(msg);
            const response = await fetch(destination.href, {
              headers: { ...Auth.asHeader(data.authentication), "Content-Type": mimetype },
              method: "POST",
              body: contents,
            });

            if (response.ok) {
              Report.success(msg);
            } else {
              Report.fail(msg);
            }
          }
        },
      };
    };
  }
}
