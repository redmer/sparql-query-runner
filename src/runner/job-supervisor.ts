import { QueryEngine } from "@comunica/query-sparql";
import { RdfStore } from "rdf-stores";
import type {
  IJobData,
  IJobPhase,
  IJobSourceData,
  IJobStepData,
  IJobTargetData,
} from "../config/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import * as Report from "../utils/report.js";
import { tempdir } from "../utils/workflow-job-tempdir.js";
import { match } from "./module.js";
import type {
  JobRuntimeContext,
  QueryContext,
  Supervisor,
  WorkflowGetter,
  WorkflowRuntimeContext,
} from "./types.js";

export const TEMPDIR = `.cache/sparql-query-runner`;

export class JobSupervisionError extends Error {}

async function EnterModule(ctx: JobRuntimeContext, closure: () => Promise<void>) {
  ctx.info(``);
  await closure();
  ctx.info(Report.DONE);
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
    Report.infoMsg(this.#name, 1)(` `);

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
    const fatal = this.workflowCtx.options.warningsAsErrors;

    // Static properties can be gathered before execution
    modules.targets
      .filter((m) => m.module.staticQueryContext)
      .forEach((m) => (queryContext = { ...queryContext, ...m.module.staticQueryContext(m.data) }));
    [...modules.sources, ...modules.targets]
      .filter((m) => m.module.staticAuthProxyHandler)
      .forEach((m) => httpProxyHandler.add(m.module.staticAuthProxyHandler(m.data)));

    const phases: IJobPhase[] = ["sources", "steps", "targets"];
    for (const phase of phases) {
      Report.infoMsg("sources", 2)(` `); // Entering sources
      for (const { data, module: m } of modules[phase] ?? []) {
        const localname = data.type.split("/", 1)[1];

        const ctx: JobRuntimeContext = {
          workflowContext: this.workflowCtx,
          jobData: jobData,
          engine,
          quadStore,
          queryContext,
          tempdir: tempdir(jobData, m, data),
          ...Report.ctxMsgs(localname, 3, { fatal }),
        };

        await EnterModule(ctx, async () => {
          let info: WorkflowGetter;
          if (phase == "sources") info = await m.asSource(<IJobSourceData>data)(ctx);
          else if (phase == "steps") info = await m.asStep(<IJobStepData>data)(ctx);
          else if (phase == "targets") info = await m.asTarget(<IJobTargetData>data)(ctx);
          else throw new JobSupervisionError(`Module phase logic error`);

          if (info.dataSources)
            queryContext.sources = queryContext.sources.concat(...info.dataSources());
          if (info.start) await info.start();
        });
      }
    }

    // TODO: Filtering, override graphs
    // TODO: Write state to cache (.nq.gz and .head-n-20.nq) if not --in-mem
    // TODO: Automatically GZip
  }
}
