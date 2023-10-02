import * as RDF from "@rdfjs/types";
import App from "@triply/triplydb";
import { Store } from "n3";
import { storeStream } from "rdf-store-stream";
import type { IJobModuleData, IJobSourceData, IJobTargetData } from "../config/types.js";
import type {
  JobRuntimeContext,
  WorkflowModuleExec,
  WorkflowPartSource,
  WorkflowPartTarget,
} from "../runner/types.js";
import { InfoUploadingTo } from "../utils/uploading-message.js";

class TriplyDBCommon {
  async dataset(data: IJobModuleData, context: JobRuntimeContext) {
    const [accountName, datasetName] = data.access.split("/").slice(-2);

    const auth = data.with.credentials;
    if (auth === undefined) context.error(`TriplyDB requires auth details <${data.access}>`);
    if (auth.type !== "Bearer") context.error(`TriplyDB requires auth with "token:" `);

    const Triply = App.default.get({ token: auth.token });
    const account = await Triply.getAccount(accountName);
    const dataset = await account.ensureDataset(datasetName, {
      prefixes: context.jobData.prefixes,
    });
    return dataset;
  }

  async tpf(data: IJobModuleData, context: JobRuntimeContext) {
    const [accountName, datasetName] = data.access.split("/").slice(-2);
    const auth = data.with.credentials;
    if (auth === undefined) context.error(`TriplyDB requires auth details <${data.access}>`);
    if (auth.type !== "Bearer") context.error(`TriplyDB requires auth with "token:" `);

    const Triply = App.default.get({ token: auth.token });
    const apiUrl = (await Triply.getInfo()).apiUrl;
    return `${apiUrl}/datasets/${accountName}/${datasetName}/fragments`;
  }
}

export class TriplyDBSource extends TriplyDBCommon implements WorkflowPartSource {
  // Export a(ll) graph(s) to Laces
  id = () => "triplydb-source";
  names = ["sources/triplydb"];

  exec(data: IJobSourceData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      const tpfEndpoint = await this.tpf(data, context);
      return {
        comunicaDataSources: () => [{ type: "hypermedia", value: tpfEndpoint }],
      };
    };
  }
}

export class TriplyDBTarget extends TriplyDBCommon implements WorkflowPartTarget {
  // Export a(ll) graph(s) to Laces
  id = () => "triplydb-target";
  names = ["targets/triplydb"];

  exec(data: IJobTargetData) {
    return async (context: JobRuntimeContext) => {
      const dataset = await this.dataset(data, context);

      return {
        init: async (stream: RDF.Stream) => {
          InfoUploadingTo(context.info, data.with.onlyGraphs, data.access);

          const store = await storeStream(stream);
          await dataset.importFromStore(<Store>store, { overwriteAll: true, mergeGraphs: false });

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
