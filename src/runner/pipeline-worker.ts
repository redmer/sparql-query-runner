import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import N3 from "n3";
import type { IConstructPipeline, IPipeline, IUpdatePipeline } from "../config/types";
import type { ICliOptions } from "../config/validate";
import { authfetch } from "../utils/authfetch.js";
import * as Report from "../utils/report.js";
import { KeysOfUnion } from "../utils/types";
import { ExecutablePipeline, match } from "./module.js";
import type { ConstructCtx } from "./types";

export const TEMPDIR = `.cache/sparql-query-runner`;

async function provideTempDir(): Promise<string> {
  await fs.mkdir(TEMPDIR, { recursive: true });
  return TEMPDIR;
}

/** Initialize and start a workflow runner */
export async function start(data: IPipeline, options?: Partial<ICliOptions>) {
  // A workflow must process `endpoint`, `sources`, `steps`, `destinations`.
  // `prefixes` and `name` is configuration. `independent` is irrelevant for a single worker.

  // Prepare running context
  const tempdir = provideTempDir();

  const store = new N3.Store(undefined, { factory: N3.DataFactory });
  const context: ConstructCtx = {
    pipeline: data,
    options: options ?? {},
    tempdir: await tempdir,
    quadStore: store,
    engine: new QueryEngine(),
    queryContext: {} as never,
  };

  // Prepare and gather all pipeline parts
  console.info(`Preparing modules...`);
  const matchedModules = await match(data);

  if (options.verbose)
    console.info(
      `Matched modules:\n\t-${Object.entries(matchedModules)
        .map(
          ([topLevelKey, modules]) =>
            topLevelKey + ": " + modules.map(([name, __]) => name).join(", ")
        )
        .join("\n\t-")}`
    );

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

  for (const [j, part] of initializedParts.entries())
    try {
      part.info.prepare && (await part.info.prepare());
    } catch (e) {
      console.error(Report.ERROR + `prepare ${part.name} (${j + 1}):`, e);
      throw e;
    }

  for (const [i, part] of initializedParts.filter((i) => i.info.start != undefined).entries()) {
    console.group(`(${i + 1}) ${part.name}...`);
    await part.info?.start();
    console.groupEnd();
  }

  try {
    console.info(`Post-workflow cleanup...`);
    await Promise.all(
      initializedParts.filter((i) => i.info.cleanup != undefined).map((i) => i.info.cleanup())
    );
  } catch (e) {
    console.error(Report.ERROR + `Error during cleanup() stage`);
    throw e;
  }
}

async function runModuleOfType(
  executablePipeline: ExecutablePipeline,
  type: keyof IConstructPipeline | keyof IUpdatePipeline
) {
  for (const [name, module] of executablePipeline[type]) {
    const info = await module.info(context);
    await info?.beforeQuery();
    await info?.queryContext;
    await info?.afterQuery();
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
