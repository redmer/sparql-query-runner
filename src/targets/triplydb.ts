import App from "@triply/triplydb";
import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { filter } from "../utils/graphs-to-file.js";
import * as Report from "../utils/report.js";

export class TriplyDBTarget implements WorkflowPart<IJobTargetData> {
  // Export a(ll) graph(s) to Laces
  id = () => "targets/triplydb";

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const [accountName, datasetName] = data.access.split("/").slice(-1);

      const auth = data.with?.credentials;
      if (auth === undefined) context.error(`TriplyDB requires auth details <${data.access}>`);
      if (auth.type !== "Bearer") context.error(`TriplyDB requires auth with "token:" `);

      const Triply = App.default.get({ token: auth.token });
      // Get or create dataset (if create: no metadata)
      const dataset = await (
        await Triply.getAccount(accountName)
      ).ensureDataset(datasetName, { prefixes: context.data.prefixes });

      return {
        start: async () => {
          context.info(`Gathering ${data.with?.onlyGraphs ?? "all"} graphs for export...`);

          const dataStore = data.with?.onlyGraphs?.length
            ? await filter(context.quadStore, { graphs: data.with.onlyGraphs })
            : context.quadStore;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await dataset.importFromStore(dataStore as any, { overwriteAll: true });
          context.info(`Uploaded to <${(await dataset.getInfo()).id}>` + Report.DONE);

          context.info(`Updating services...`);
          for await (const service of dataset.getServices()) {
            if (!(await service.isUpToDate())) service.update();
          }
          context.info(`All services are up-to-date` + Report.DONE);
        },
      };
    };
  }
}
