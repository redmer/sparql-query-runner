import { QueryEngine } from "@comunica/query-sparql";
import { RdfStore } from "rdf-stores";
import type { IJobData, IJobModuleData, IJobSourceData, IJobTargetData } from "../config/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import { download } from "../utils/download-remote.js";
import * as Report from "../utils/report.js";
import { tempdir } from "../utils/workflow-job-tempdir.js";
import { match } from "./module.js";
import type {
  JobRuntimeContext,
  QueryContext,
  Supervisor,
  WorkflowPart,
  WorkflowRuntimeContext,
} from "./types.js";
export const TEMPDIR = `.cache/sparql-query-runner`;

export class JobSupervisor implements Supervisor<IJobData> {
  #name: string;
  workflowCtx: WorkflowRuntimeContext;

  constructor(name: string, context: WorkflowRuntimeContext) {
    this.#name = name;
    this.workflowCtx = context;
  }

  async start(data: IJobData) {
    // A job must process the data `sources`, `steps`, `destinations`.
    // `prefixes`, `independent` are already processed.
    const jobInfo = Report.infoMsg(this.#name, 1);
    jobInfo(`Starting...`);

    const engine = new QueryEngine();
    const quadStore = RdfStore.createDefault();

    // Prepare and gather all pipeline parts
    const modules = await match(data);
    if (this.workflowCtx.options.verbose) {
      const sources = modules.sources?.map((s) => s.module.id()).join(", ");
      const steps = modules.steps?.map((s) => s.module.id()).join(", ");
      const targets = modules.targets?.map((s) => s.module.id()).join(", ");
      console.info(`job ${data.name} matched modules:
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
      .forEach((m) => {
        queryContext = Object.assign(queryContext, m.module.staticQueryContext(m.data));
      });
    [...modules.sources, ...modules.targets]
      .filter((m) => m.module.staticAuthProxyHandler)
      .forEach((m) => {
        //@ts-expect-error: not compatible types...
        httpProxyHandler.add(m.module.staticAuthProxyHandler(m.data));
      });

    let previousPart: keyof IJobData = "name";

    for (const { data: moduleData, module: m } of [
      ...modules.sources,
      ...modules.steps,
      ...modules.targets,
    ]) {
      // Stats
      const oldQuadsCount = quadStore.countQuads();
      // cache and rewrite data
      const shouldCacheInput = this.workflowCtx.options.cacheIntermediateResults
        ? m.shouldCacheAccess
          ? // @ts-expect-error: IJobXData are not compatible with eachother...
            m.shouldCacheAccess(moduleData)
          : false
        : false;
      if (shouldCacheInput) moduleData.access = await this.cacheAccess(data, m, moduleData);

      // Indicate
      const currentPart = m.id().split("/", 1)[0];
      if (currentPart !== previousPart) Report.infoMsg(currentPart, 2)(``);
      previousPart = currentPart as keyof IJobData;

      const ctx: JobRuntimeContext = {
        workflowContext: this.workflowCtx,
        data,
        engine,
        quadStore,
        queryContext,
        tempdir: tempdir(data, m, moduleData),
        error: Report.errorMsg(m.id(), 3),
        info: Report.infoMsg(m.id(), 3),
        warning: Report.warningMsg(m.id(), 3, { fatal: this.workflowCtx.options.warningsAsErrors }),
      };

      //@ts-expect-error: IJob{Source|Step|Target}Data are not compatible with eachother...
      const runnable = await m.info(moduleData)(ctx);
      if (runnable.dataSources)
        //@ts-expect-error: IJob{Source|Step|Target}Data are not compatible with eachother...
        queryContext.sources = queryContext.sources.concat(...runnable.dataSources());
      if (runnable.start) await runnable.start();

      const newQuadsCount = quadStore.countQuads();
      const diff = newQuadsCount - oldQuadsCount;
      const sign = diff > 0 ? "+" : "";
      ctx.info(Report.DONE + ` (diff: ${sign}${diff} quads)`);
    }

    const finalQuadCount = quadStore.countQuads();
    jobInfo(Report.DONE + ` (total: ${finalQuadCount} quads)`);
  }

  /** Returns the path of the locally cached file */
  async cacheAccess(
    job: IJobData,
    module: WorkflowPart,
    moduleData: IJobModuleData
  ): Promise<string> {
    if (moduleData.access.match(/^https?:/) === null) return moduleData.access;
    const targetPath = tempdir(job, module, moduleData);
    await download(
      moduleData.access,
      targetPath,
      (moduleData as IJobSourceData | IJobTargetData)?.with?.credentials
    );
    return targetPath;
  }
}
