import App from "@triply/triplydb";
import type Dataset from "@triply/triplydb/lib/Dataset.js";
import type { ITarget } from "../config/types.js";
import { ConfigurationError } from "../config/validate.js";
import type {
  ConstructCtx,
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
} from "../runner/types.js";
import { filter } from "../utils/graphs-to-file.js";
import * as Report from "../utils/report.js";

const name = "targets/triplydb";

export class TriplyDBTarget implements PipelinePart<ITarget> {
  // Export a(ll) graph(s) to Laces
  name = () => name;

  qualifies(data: ITarget): boolean {
    if (data.type === "triplydb") return true;
    return false;
  }

  async info(data: ITarget): Promise<PipelinePartGetter> {
    const [accountName, datasetName] = data.access.split("/").slice(-1);

    return async (context: Readonly<ConstructCtx>): Promise<DestinationPartInfo> => {
      let dataset: Dataset;

      const auth = data.credentials;
      if (auth === undefined)
        throw new ConfigurationError(`${name}: TriplyDB requires auth details <${data.access}>`);

      return {
        prepare: async () => {
          const Triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
          // Get or create dataset (if create: no metadata)
          dataset = await (
            await Triply.getAccount(accountName)
          ).ensureDataset(datasetName, { prefixes: context.pipeline.prefixes });
        },
        start: async () => {
          console.info(
            `${name}: Gathering ${
              data.onlyGraphs ? data.onlyGraphs.length : "all"
            } graphs for export...`
          );

          const dataStore = data.onlyGraphs.length
            ? await filter(context.quadStore, { graphs: data.onlyGraphs })
            : context.quadStore;

          await dataset.importFromStore(dataStore, { overwriteAll: true });
          console.info(`${name}: Uploaded to <${(await dataset.getInfo()).id}>` + Report.DONE);

          console.info(`${name}: Updating services...`);
          for await (const service of dataset.getServices()) {
            if (!(await service.isUpToDate())) service.update();
          }
          console.info(`${name}: All services are up-to-date` + Report.DONE);
        },
      };
    };
  }
}
