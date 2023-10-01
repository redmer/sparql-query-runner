import * as RDF from "@rdfjs/types";
import App from "@triply/triplydb";
import { storeStream } from "rdf-store-stream";
import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { filteredStream } from "../utils/rdf-stream-filter.js";

export class TriplyDBTarget implements WorkflowPart<IJobTargetData> {
  // Export a(ll) graph(s) to Laces
  id = () => "targets/triplydb";

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const [accountName, datasetName] = data.access.split("/").slice(-2);

      const auth = data.with?.credentials;
      if (auth === undefined) context.error(`TriplyDB requires auth details <${data.access}>`);
      if (auth.type !== "Bearer") context.error(`TriplyDB requires auth with "token:" `);

      const Triply = App.default.get({ token: auth.token });
      // Get or create dataset (if create: no metadata)
      const dataset = await (
        await Triply.getAccount(accountName)
      ).ensureDataset(datasetName, { prefixes: context.jobData.prefixes });

      return {
        start: async () => {
          context.info(`Gathering ${data.with?.onlyGraphs ?? "all"} graphs for export...`);

          const dataStore: RDF.Store = data.with?.onlyGraphs?.length
            ? await storeStream(
                filteredStream(context.quadStore.match(), { graphs: data.with.onlyGraphs })
              )
            : context.quadStore;

          context.info(`Uploading to <${data.access}>...`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await dataset.importFromStore(dataStore as any, { overwriteAll: true });

          if ((await dataset.getInfo()).serviceCount > 0) {
            context.info(`Updating services...`);
            for await (const service of dataset.getServices()) {
              if (!(await service.isUpToDate())) service.update();
            }
          }
        },
      };
    };
  }
}
