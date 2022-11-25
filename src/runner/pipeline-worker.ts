import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import N3 from "n3";
import type { ICliOptions } from "../config/configuration";
import type { IPipeline } from "../config/types";
import { matchPipelineParts, MatchResult } from "../modules/module.js";
import { arrayFromGenerator, notEmpty } from "../utils/array.js";
import * as Report from "../utils/report.js";
import { KeysOfUnion } from "../utils/types";
import type { ConstructRuntimeCtx, PipelinePartInfo } from "./types";

interface WorkflowCache {
  name: string;
  info: PipelinePartInfo;
}

async function provideTempDir(): Promise<string> {
  const tempdir = `.cache/sparql-query-runner`;
  await fs.mkdir(tempdir, { recursive: true });
  return tempdir;
}

/** Initialize and start a workflow runner */
export async function start(data: IPipeline, options?: Partial<ICliOptions>) {
  // A workflow must process `endpoint`, `sources`, `steps`, `destinations`.
  // `prefixes` and `name` is configuration. `independent` is no longer relevant.

  // Prepare running context
  const tempdir = provideTempDir();

  const store = new N3.Store(undefined, { factory: N3.DataFactory });
  const context: ConstructRuntimeCtx = {
    pipeline: data,
    options: options ?? {},
    tempdir: await tempdir,
    quadStore: store,
    engine: new QueryEngine(),
    querySources: [],
    queryContext: {},
  };

  // Prepare and gather all pipeline parts
  Report.group("Matching modules...");
  const matchedParts = orderPipelineParts(await arrayFromGenerator(matchPipelineParts(data)));
  Report.groupEnd();

  Report.group("Initializing modules...");
  const initializedParts: WorkflowCache[] = [];

  let i = 0;
  for await (const [key, name, part] of matchedParts) {
    i++;
    const info = await part(context, i);
    initializedParts.push({ name, info });
  }

  Report.log(`All modules: ${JSON.stringify(initializedParts.map((i) => i.name))}`);
  Report.groupEnd();

  // Gather all Query Sources and Query Contexts
  context.querySources = initializedParts.map((desc) => desc.info.getQuerySource).filter(notEmpty);
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
      Report.error(`${err}`);
    }
    Report.groupEnd();
  }
  Report.groupEnd();

  Report.group("cleanup...");
  await Promise.allSettled(initializedParts.map((i) => i?.info.cleanup));
  Report.groupEnd();

  Report.info(`pipeline ${data.name} DONE`);

  // name
  // prefixes
}

function orderPipelineParts(data: MatchResult[]) {
  const order: Record<KeysOfUnion<IPipeline>, number> = {
    // Inconsequential to execution order
    type: 1,
    name: 2,
    independent: 4,
    prefixes: 8,
    // order meaningful
    endpoint: 16,
    sources: 32,
    steps: 64,
    // comes last
    destinations: 128,
  };
  return data.sort((A, B) => order[A[0]] - order[B[0]]);
}
