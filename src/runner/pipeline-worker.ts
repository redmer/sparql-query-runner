import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import N3 from "n3";
import type { IPipeline } from "../config/types";
import type { ICliOptions } from "../config/validate";
import { arrayFromGenerator } from "../utils/array.js";
import { authfetch } from "../utils/authfetch.js";
import * as Report from "../utils/report.js";
import { KeysOfUnion } from "../utils/types";
import { matchPipelineParts, MatchResult } from "./module.js";
import type { ConstructRuntimeCtx, PipelinePartInfo } from "./types";

interface WorkflowCache {
  name: string;
  info: PipelinePartInfo;
}

export const TEMPDIR = `.cache/sparql-query-runner`;

async function provideTempDir(): Promise<string> {
  await fs.mkdir(TEMPDIR, { recursive: true });
  return TEMPDIR;
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
    queryContext: {} as never,
  };

  // Prepare and gather all pipeline parts
  console.info(`Preparing modules...`);
  const matchedParts = orderPipelineParts(await arrayFromGenerator(matchPipelineParts(data)));
  const initializedParts: WorkflowCache[] = [];

  let i = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const [key, name, part] of matchedParts) {
    try {
      i++;
      const info = await part(context, i);
      initializedParts.push({ name, info });
    } catch (e) {
      console.error(Report.ERROR + `Error during info() of ${name} (${key}[${i}])`);
      throw e;
    }
  }

  // Gather and combine all query context for the QueryEngine
  context.queryContext = { fetch: authfetch, sources: [] as never };
  initializedParts
    .filter((i) => i.info.getQueryContext != undefined)
    .forEach((part) => {
      if (part.info.getQueryContext.sources) {
        context.queryContext.sources.push(...part.info.getQueryContext.sources);
        delete part.info.getQueryContext.sources;
      }

      Object.assign(context.queryContext, part.info.getQueryContext);
    });
  // Finalize context, make it readonly
  Object.freeze(context);

  try {
    await Promise.allSettled(
      initializedParts.filter((i) => i.info.prepare != undefined).map((i) => i.info.prepare())
    );
  } catch (e) {
    console.error(Report.ERROR + `Error during prepare() stage`);
    throw e;
  }

  for (const [i, part] of initializedParts.filter((i) => i.info.start != undefined).entries()) {
    console.group(`${i + 1}: ${part.name}`);
    await part?.info?.start();
    console.groupEnd();
  }

  try {
    console.info(`Post-workflow cleanup...`);
    await Promise.allSettled(
      initializedParts.filter((i) => i.info.cleanup != undefined).map((i) => i.info.cleanup())
    );
  } catch (e) {
    console.error(Report.ERROR + `Error during cleanup() stage`);
    throw e;
  }
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
    targets: 128,
  };
  return data.sort((A, B) => order[A[0]] - order[B[0]]);
}
