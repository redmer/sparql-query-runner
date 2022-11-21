import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import N3 from "n3";
import os from "os";
import path from "path";
import type { ICliOptions } from "../config/configuration";
import type { IPipeline } from "../config/types";
import { matchPipelineParts, MatchResult } from "../modules/module.js";
import { arrayFromGenerator, notEmpty } from "../utils/array.js";
import * as Report from "../utils/report.js";
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
    // const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), "sqr-"), { encoding: "utf-8" });
    const tempdir = `.cache/sparql-query-runner`;
    await fs.mkdir(tempdir, { recursive: true });

    const store = new N3.Store(undefined, { factory: N3.DataFactory });
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
    Report.group("Matching modules...");
    let matchedParts = orderPipelineParts(await arrayFromGenerator(matchPipelineParts(data)));
    Report.groupEnd();

    Report.group("Initializing modules...");
    const initializedParts: WorkflowCache[] = [];

    let i = 0;
    for await (const [key, name, part] of matchedParts) {
      i++;
      if ((!name || !part) && !process.env["TREAT_WARNINGS_AS_ERRORS"]) continue;
      const info = await part(context, i);
      initializedParts.push({ name, info });
    }

    Report.log(`All modules: ${JSON.stringify(initializedParts.map((i) => i.name))}`);
    Report.groupEnd();

    // Gather all Query Sources and Query Contexts
    context.querySources = initializedParts
      .map((desc) => desc.info.getQuerySource)
      .filter(notEmpty);
    context.queryContext = initializedParts.reduce(
      (all, i) => Object.assign(all, i.info?.getQueryContext),
      {}
    );
    // Finalize context, make it readonly
    Object.freeze(context);

    // Start -preProcess
    Report.group("preparing...");
    await Promise.allSettled(
      initializedParts
        .map((i) => i.info?.prepare)
        .filter(notEmpty)
        .map((i) => i())
    );
    Report.groupEnd();

    Report.group("starting...");
    for (const [i, part] of initializedParts.entries()) {
      Report.group(`${i}: ${part.name}`);
      try {
        await part?.info.start();
      } catch (err) {
        Report.print("error", `${err}`);
      }
      Report.groupEnd();
    }
    Report.groupEnd();

    Report.group("cleanup...");
    await Promise.allSettled(initializedParts.map((i) => i?.info.cleanup));
    Report.groupEnd();

    Report.print("info", `pipeline ${data.name} DONE`);

    // name
    // prefixes
  }

  function orderPipelineParts(data: MatchResult[]) {
    const order: Record<keyof IPipeline, number> = {
      // Inconsequential to execution order
      name: 1,
      engine: 1,
      independent: 1,
      prefixes: 1,
      // order meaningful
      sources: 2,
      queries: 3,
      updates: 4,
      rules: 5, // not executed, unless?
      // comes last
      destinations: 6,
    };
    return data.sort(([keyA, _, __], [keyB, ___, ____]) => order[keyA] - order[keyB]);
  }
}
