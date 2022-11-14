import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs-extra";
import N3 from "n3";
import os from "os";
import path from "path";
import type { ICliOptions } from "../config";
import type { IPipeline } from "../config/types";
import Destination from "../destinations/index.js";
import Endpoint from "../endpoints/index.js";
import Source from "../sources/index.js";
import Step from "../steps/index.js";
import type { PipelinePartInfo, RuntimeCtx } from "./types";

export namespace Workflow {
  /** Initialize and start a workflow runner */
  export async function start(data: IPipeline, options?: Partial<ICliOptions>) {
    // A workflow must process `endpoint`, `sources`, `steps`, `destinations`.
    // `prefixes` and `name` is configuration. `independent` is no longer relevant.

    const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "sqr-"), { encoding: "utf-8" });

    // Collect all pipeline parts
    const infos: PipelinePartInfo[] = [];
    const store = new N3.Store();
    const context: RuntimeCtx = {
      pipeline: data,
      options: options,
      tempdir: tempdir,
      quadStore: store,
      engine: new QueryEngine(),
      allSources: [],
      queryContext: {},
    };

    // endpoint -> Queryable Source
    for (const [i, endpoint] of data.endpoint.entries()) {
      const part = await Endpoint(endpoint);
      infos.push(await part(context));
    }

    // sources -> Queryable Source
    for (const [i, source] of data.sources.entries()) {
      const part = await Source(source);
      infos.push(await part(context));
    }

    // steps
    for (const [i, step] of data.steps.entries()) {
      const part = await Step(step);
      infos.push(await part(context));
    }

    // destinations
    for (const [i, dest] of data.destinations.entries()) {
      const part = await Destination(dest);
      infos.push(await part(context));
    }

    // Gather all sources and contexts from Queryable Source`s
    context.allSources = infos.map((i) => i.source);
    context.queryContext = infos.reduce((all, i) => Object.assign(all, i?.queryContext), {});

    await Promise.all(infos.map((i) => i?.preProcess));

    for (const [i, part] of infos.entries()) {
      await part?.start(); // TODO: moet hier nog iets komen met engine / queryContext
    }

    await Promise.all(infos.map((i) => i?.postProcess));

    console.info(`Done`);

    // name
    // prefixes
  }
}
