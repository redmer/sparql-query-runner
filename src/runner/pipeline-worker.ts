import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs-extra";
import N3 from "n3";
import os from "os";
import path from "path";
import type { ICliOptions } from "../config";
import type { IPipeline } from "../config/types";
import { getPipelinePart } from "../modules/module";
import { notEmpty } from "../utils/array";
import { Report } from "../utils/report";
import type { PipelinePartInfo, RuntimeCtx } from "./types";

export namespace Workflow {
  interface WorkflowCache {
    info: PipelinePartInfo;
    name: string;
  }

  /** Initialize and start a workflow runner */
  export async function start(data: IPipeline, options?: Partial<ICliOptions>) {
    // A workflow must process `endpoint`, `sources`, `steps`, `destinations`.
    // `prefixes` and `name` is configuration. `independent` is no longer relevant.

    // Prepare running context
    const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "sqr-"), { encoding: "utf-8" });
    const store = new N3.Store();
    const context: RuntimeCtx = {
      pipeline: data,
      options: options ?? {},
      tempdir: tempdir,
      quadStore: store,
      engine: new QueryEngine(),
      querySources: [],
      queryContext: {},
    };

    // Prepare and gather all pipeline parts
    const infos: WorkflowCache[] = [];

    // endpoint -> Queryable Source
    // sources -> Queryable Source
    // steps
    // destinations
    const parts = [data.endpoint, data.sources, data.steps, data.destinations]
      .flat()
      .filter(notEmpty);

    for (const [_, partData] of parts.entries()) {
      console.group("module matching...");

      // Match on all modules
      const [name, part] = await getPipelinePart(partData);
      if ((!name || !part) && !process.env["TREAT_WARNINGS_AS_ERRORS"]) continue;
      const info = await part(context);
      infos.push({ info, name });

      console.groupEnd();
    }

    // Gather all Query Sources and Query Contexts
    context.querySources = infos.map((desc) => desc.info.getQuerySource).filter(notEmpty);
    context.queryContext = infos.reduce(
      (all, i) => Object.assign(all, i.info?.getQueryContext),
      {}
    );
    // Finalize context, make it readonly
    Object.freeze(context);

    // Start -preProcess
    console.group("prepare pipeline parts...");
    await Promise.allSettled(infos.map((i) => i?.info.prepare));
    console.groupEnd();

    for (const [i, part] of infos.entries()) {
      console.group(`start pipeline part ${i}: ${part.name}`);
      try {
        await part?.info.start();
      } catch (err) {
        Report.print("error", `${err}`);
      }
      console.groupEnd();
    }

    console.group("cleanup pipeline parts...");
    await Promise.allSettled(infos.map((i) => i?.info.cleanup));
    console.groupEnd();

    Report.print("info", `pipeline ${data.name} DONE`);

    // name
    // prefixes
  }
}
