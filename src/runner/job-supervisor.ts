import { LoggerPretty } from "@comunica/logger-pretty";
import { QueryEngine } from "@comunica/query-sparql";
import type * as RDF from "@rdfjs/types";
import { createWriteStream } from "fs";
import N3 from "n3";
import { RdfStore } from "rdf-stores";
import { createGzip } from "zlib";
import type { IJobData, IJobModuleData, IJobTargetData } from "../config/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import {
  FilteredStream,
  First_NQuadsStream,
  ImportStream,
  MatchStreamReadable,
  MergeGraphsStream,
  RdfStoresImportStream,
} from "../utils/rdf-stream-override.js";
import * as Report from "../utils/report.js";
import { tempdir } from "../utils/workflow-job-tempdir.js";
import { IExecutableJob, match } from "./module.js";
import type {
  JobRuntimeContext,
  QueryContext,
  Supervisor,
  WorkflowPart,
  WorkflowPartGetter,
  WorkflowRuntimeContext,
} from "./types.js";

export const TEMPDIR = `.cache/sparql-query-runner`;

export class JobSupervisionError extends Error {}

/** Report entering a module, and  */
async function EnterModule(
  ctx: Partial<JobRuntimeContext>,
  data: IJobModuleData,
  module: WorkflowPart,
  jobData: IJobData,
  workflowCtx: WorkflowRuntimeContext,
  iterN: number,
  closure: (ctx: JobRuntimeContext) => Promise<void>
) {
  const localname = data.type.split("/", 2)[1];

  const context: JobRuntimeContext = {
    ...(<JobRuntimeContext>ctx),
    tempdir: tempdir(jobData, module, data),
    ...Report.ctxMsgs(`- ${localname}`, 3, { fatal: workflowCtx.options.warningsAsErrors }),
  };

  context.info(``);
  try {
    await closure(context);
  } catch (err) {
    context.error(`inside ${module.id()}. Cause: ${err.message}` + err);
  }
  context.info(Report.DONE);
}

export class JobSupervisor implements Supervisor<IJobData> {
  #name: string;
  workflowCtx: WorkflowRuntimeContext;

  constructor(name: string, context: WorkflowRuntimeContext) {
    this.#name = name;
    this.workflowCtx = context;
  }

  async start(jobData: IJobData) {
    // A job must process the data `sources`, `steps`, `targets`.
    // `prefixes`, `independent` are already processed.
    Report.infoMsg(this.#name + `:`, 1)(`\n`);

    const engine = new QueryEngine();
    const quadStore = RdfStore.createDefault();

    // Prepare and gather all pipeline parts
    const modules = await match(jobData);
    if (this.workflowCtx.options.verbose) {
      const sources = modules.sources?.map((s) => s.module.id()).join(", ");
      const steps = modules.steps?.map((s) => s.module.id()).join(", ");
      const targets = modules.targets?.map((s) => s.module.id()).join(", ");
      console.info(`job ${jobData.name} matched modules:
        sources: ${sources}
        steps: ${steps}
        targets: ${targets}
      `);
    }

    const httpProxyHandler = new AuthProxyHandler();
    let queryContext: QueryContext = {
      sources: [{ type: "rdfjsSource", value: quadStore }],
      httpProxyHandler,
      lenient: true,
      log: new LoggerPretty({ level: "debug" }),
    };

    // Static properties can be gathered before execution
    modules.targets
      .filter((m) => m.module.staticQueryContext)
      .forEach(
        (m) =>
          (queryContext = {
            ...queryContext,
            ...m.module.staticQueryContext(<IJobTargetData>m.data),
          })
      );

    /**
     * Register staticHttpProxyHandler`s
     * @param modules Modules from which staticAuthProxyHandler`s should be gotten
     */
    const addHttpProxyHandlers = (modules: IExecutableJob["sources"] | IExecutableJob["targets"]) =>
      modules
        .filter((m) => m.module.staticAuthProxyHandler)
        .forEach((m) => httpProxyHandler.add(m.module.staticAuthProxyHandler(m.data)));

    const staticCtx: Partial<JobRuntimeContext> = {
      workflowContext: this.workflowCtx,
      jobData: jobData,
      engine,
      queryContext,
    };

    Report.infoMsg(`sources:`, 2)(`\n`);
    addHttpProxyHandlers(modules.sources);
    for (const [i, { data, module: m }] of modules.sources.entries()) {
      await EnterModule(staticCtx, data, m, jobData, this.workflowCtx, i, async (ctx) => {
        const info: Partial<WorkflowPartGetter> = await m.exec(data)(ctx);
        let quadsOUT: RDF.Stream | void;

        // Sources are independent, so no input stream is provided.
        if (info.comunicaDataSources)
          queryContext.sources = queryContext.sources.concat(...info.comunicaDataSources());
        if (info.init) quadsOUT = await info.init(undefined, quadStore);

        // Output quad stream is optionally void, therefore check if it's there
        if (!(quadsOUT instanceof Object)) return;

        const streamOUT = new MatchStreamReadable(quadsOUT)
          .pipe(new FilteredStream({ graphs: data.with.onlyGraphs }))
          .pipe(new MergeGraphsStream({ intoGraph: data.with.intoGraph }));

        streamOUT.pipe(new RdfStoresImportStream(quadStore));
        streamOUT
          .pipe(new N3.StreamWriter({ format: "application/n-quads" }))
          .pipe(createGzip())
          .pipe(createWriteStream(ctx.tempdir + `stream-quads-out.nq.gz`));
        streamOUT
          .pipe(new First_NQuadsStream(30))
          .pipe(new N3.StreamWriter({ format: "application/n-quads" }))
          .pipe(createWriteStream(ctx.tempdir + `stream-quads-out--head30.nq`));
      });
    }

    Report.infoMsg(`steps:`, 2)(`\n`);
    for (const { data, module: m } of modules.steps) {
      await EnterModule(staticCtx, data, m, jobData, this.workflowCtx, async (ctx) => {
        const info: Partial<WorkflowPartGetter> = await m.exec(data)(ctx);

        // Steps input quads are filtered with Only-Graphs
        const quadsIN = new MatchStreamReadable(quadStore.match()).pipe(
          new FilteredStream({ graphs: data.with.onlyGraphs })
        );

        // Get output quad stream and check if it's not void
        const quadsOUT = await info.init(quadsIN, quadStore);
        if (!(quadsOUT instanceof Object)) return;

        const streamOUT = new MatchStreamReadable(quadsOUT).pipe(
          new MergeGraphsStream({ intoGraph: data.with.intoGraph })
        );

        await ImportStream(streamOUT, quadStore);
      });
    }

    Report.infoMsg(`targets:`, 2)(`\n`);
    addHttpProxyHandlers(modules.targets);
    for (const { data, module: m } of modules.targets) {
      await EnterModule(staticCtx, data, m, jobData, this.workflowCtx, async (ctx) => {
        const info: Partial<WorkflowPartGetter> = await m.exec(data)(ctx);

        // Steps input quads are filtered with Only-Graphs
        const quadsIN = new MatchStreamReadable(quadStore.match())
          .pipe(new FilteredStream({ graphs: data.with.onlyGraphs }))
          .pipe(new MergeGraphsStream({ intoGraph: data.with.intoGraph }));

        // Get output quad stream and check if it's not void
        await info.init(quadsIN, quadStore);
      });
    }

    // TODO: Write state to cache (.nq.gz and .head-n-20.nq) if not --in-mem
    // TODO: Automatically GZip
  }
}
