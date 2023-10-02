import { QueryEngine } from "@comunica/query-sparql";
import type * as RDF from "@rdfjs/types";
import { RdfStore } from "rdf-stores";
import type { IJobData, IJobModuleData, IJobSourceData, IJobTargetData } from "../config/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import {
  FilteredStream,
  ImportStream,
  MatchStreamReadable,
  SingleGraphStream,
} from "../utils/rdf-stream-override.js";
import * as Report from "../utils/report.js";
import { tempdir } from "../utils/workflow-job-tempdir.js";
import { match } from "./module.js";
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
    [...modules.sources, ...modules.targets]
      .filter((m) => m.module.staticAuthProxyHandler)
      .forEach((m) =>
        httpProxyHandler.add(
          m.module.staticAuthProxyHandler(<IJobSourceData | IJobTargetData>m.data)
        )
      );

    const staticCtx: Partial<JobRuntimeContext> = {
      workflowContext: this.workflowCtx,
      jobData: jobData,
      engine,
      queryContext,
    };

    Report.infoMsg(`sources:`, 2)(`\n`);
    for (const { data, module: m } of modules.sources) {
      await EnterModule(staticCtx, data, m, jobData, this.workflowCtx, async (ctx) => {
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
          .pipe(new SingleGraphStream({ graph: data.with.intoGraph }));

        await ImportStream(streamOUT, quadStore);
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
          new SingleGraphStream({ graph: data.with.intoGraph })
        );

        await ImportStream(streamOUT, quadStore);
      });
    }

    Report.infoMsg(`targets:`, 2)(`\n`);
    for (const { data, module: m } of modules.targets) {
      await EnterModule(staticCtx, data, m, jobData, this.workflowCtx, async (ctx) => {
        const info: Partial<WorkflowPartGetter> = await m.exec(data)(ctx);

        // Steps input quads are filtered with Only-Graphs
        const quadsIN = new MatchStreamReadable(quadStore.match())
          .pipe(new FilteredStream({ graphs: data.with.onlyGraphs }))
          .pipe(new SingleGraphStream({ graph: data.with.intoGraph }));

        // Get output quad stream and check if it's not void
        await info.init(quadsIN, quadStore);
      });
    }

    // TODO: Write state to cache (.nq.gz and .head-n-20.nq) if not --in-mem
    // TODO: Automatically GZip
  }
}
