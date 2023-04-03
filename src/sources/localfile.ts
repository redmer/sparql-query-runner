import { QueryStringContext } from "@comunica/types";
import fs from "fs";
import N3 from "n3";
import { ISource } from "../config/types.js";
import { BaseModule } from "../runner/base-module.js";
import { ConstructCtx, WorkflowModule } from "../runner/types.js";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 *
 * Due to security concerns, `@comunica/query-sparql` does not support local file systems
 * as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
 */
export class LocalFileSource extends BaseModule<ISource> implements WorkflowModule<ISource> {
  static id = "sources/localfile";
  #store: N3.Store;

  qualifies(data: ISource): boolean {
    // please try to keep in sync with <./auto.ts>
    if (data.type === "localfile") return true; // explicitly
    if (data.type === "auto" && !data.access.startsWith("http")) return true; // or auto w/ a local file
    if (["remotefile", "auto"].includes(data.type) && data.onlyGraphs) return true; // or remote, w/ filtered graphs
    return false;
  }

  async willQuery(_context: Readonly<ConstructCtx>): Promise<void> {
    this.#store = new N3.Store();

    const mimetype = getMediaTypeFromFilename(this.data.access);
    const stream = fs.createReadStream(this.locateFile(this.data.access));
    this.addCacheDependent({ type: "path", value: this.data.access });

    const parser = new N3.StreamParser({ format: mimetype });
    const emitter = this.#store.import(parser.import(stream));

    // Wait until the Store has loaded
    await new Promise((resolve, reject) => {
      emitter.on("end", resolve);
      emitter.on("error", reject);
    });

    // Filter on specified graphs
    for (const graph of this.#store.getGraphs(null, null, null)) {
      if (!this.data.onlyGraphs?.includes(graph.id)) this.#store.deleteGraph(graph);
    }

    console.info(
      `${this.constructor.name}: Loaded ${this.#store.size} quads from <${this.data.access}>`
    );
  }

  queryContext(): Partial<QueryStringContext> {
    return { sources: [this.#store] };
  }
}
