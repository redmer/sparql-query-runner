import { QueryEngine } from "@comunica/query-sparql";
import fs from "fs/promises";
import stringify from "json-stable-stringify";
import path from "path";
import { RdfStore } from "rdf-stores";
import type { ICliOptions } from "../cli/cli-options";
import type { IConfigurationData, IJobData } from "../config/types";
import { authfetch } from "../utils/authfetch.js";
import { CacheLayerJob } from "../utils/layer-cache";
import * as Report from "../utils/report.js";
import { KeysOfUnion } from "../utils/types";
import { ExecutablePipeline, match } from "./module.js";
import type { JobRuntimeContext, Supervisor, WorkflowRuntimeContext } from "./types";
export const TEMPDIR = `.cache/sparql-query-runner`;

export class JobSupervisor implements Supervisor<IJobData> {
  #name: string;
  #configuration: IConfigurationData;
  #options: ICliOptions;

  constructor(name: string, configuration: IConfigurationData, options: ICliOptions) {
    this.#name = name;
    this.#options = options;
    this.#configuration = configuration;
  }

  async tempdir(sub: string) {
    const jobTempDir = path.join(TEMPDIR, sub);
    await fs.mkdir(jobTempDir, { recursive: true });
    return jobTempDir;
  }

  async start(data: IJobData) {
    // A job must process the data `sources`, `steps`, `destinations`.
    // `prefixes`, `independent` are already processed.
    const workflowCtx: WorkflowRuntimeContext = {
      data: this.#configuration,
      options: this.#options,
      tempdir: await this.tempdir(undefined),
    };

    const engine = new QueryEngine();
    const quadStore = RdfStore.createDefault();

    const jobCtx: JobRuntimeContext = {
      context: workflowCtx,
      data,
      engine,
      quadStore,
      queryContext: {} as never,
      tempdir: await this.tempdir(this.#name),
    };

    // TODO: REWRITE STOPS HERE

    // Prepare and gather all pipeline parts
    console.info(`Preparing modules...`);
    const matchedModules = await match(job);

    if (cliOptions.verbose)
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
}

/** Initialize and start a job runner */
export async function start(
  name: string,
  job: IJobData,
  cliOptions: Partial<ICliOptions>,
  configContext: Readonly<IConfigurationData>,
  dependsOn: CacheLayerJob[]
): Promise<CacheLayerJob> {
  // A job must process `endpoint`, `sources`, `steps`, `destinations`.
  // `prefixes` and `name` is configuration. `independent` is irrelevant for a single layer.
  // Its dependencies determine whether this job uses cached parts.

  const jobLayer: CacheLayerJob = { grp: "job", typ: name, dep: [stringify(job), ...dependsOn] };

  // Prepare running context
  const tempdir = provideTempDir();

  const store = RdfStore.createDefault(); //  new N3.Store(undefined, { factory: N3.DataFactory });
  const context: ConstructCtx = {
    configuration: job,
    cliOptions: cliOptions ?? {},
    tempdir: await tempdir,
    quadStore: store,
    engine: new QueryEngine(),
    queryContext: {} as never,
  };

  // Prepare and gather all pipeline parts
  console.info(`Preparing modules...`);
  const matchedModules = await match(job);

  if (cliOptions.verbose)
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

  return jobLayer;
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
  const order: Record<KeysOfUnion<IJobData>, number> = {
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
