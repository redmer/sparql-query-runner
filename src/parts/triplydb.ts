import * as RDF from "@rdfjs/types";
import App from "@triply/triplydb";
import { exit } from "process";
import { storeStream } from "rdf-store-stream";
import type { IJobModuleData, IJobSourceData, IJobTargetData } from "../config/types.js";
import type {
  JobRuntimeContext,
  WorkflowModuleExec,
  WorkflowPartSource,
  WorkflowPartTarget,
} from "../runner/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import { convertStore } from "../utils/rdfjs-store-to-n3-store.js";
import { InfoUploadingTo } from "../utils/uploading-message.js";

class TriplyDBCommon {
  async dataset(data: IJobModuleData, context: JobRuntimeContext) {
    const [accountName, datasetName] = data.access.split("/").slice(-2);

    const Triply = await this.app(data, context);
    const account = await Triply.getAccount(accountName);
    const dataset = await account.ensureDataset(datasetName, {
      prefixes: context.jobData.prefixes,
    });
    return dataset;
  }

  async app(data: IJobModuleData, context?: JobRuntimeContext): Promise<App> {
    const messenger = context ? context.error : console.error;

    const auth = data.with.credentials;
    if (auth === undefined || auth.type !== "Bearer") {
      messenger(`TriplyDB requires auth with 'token:'`);
      exit(-1);
    }

    return App.get({ token: auth.token });
  }

  async tpf(data: IJobModuleData, context: JobRuntimeContext) {
    const [accountName, datasetName] = data.access.split("/").slice(-2);

    const Triply = await this.app(data, context);
    const apiUrl = (await Triply.getInfo()).apiUrl;
    return `${apiUrl}/datasets/${accountName}/${datasetName}/fragments`;
  }
}

export class TriplyDBSource extends TriplyDBCommon implements WorkflowPartSource {
  // Export a(ll) graph(s) to Laces
  id = () => "triplydb-source";
  names = ["sources/triplydb"];

  staticAuthProxyHandler(data: IJobModuleData): AuthProxyHandler {
    const url = new URL(data.access);
    url.hostname = "api." + url.hostname;
    return new AuthProxyHandler(data.with.credentials, url.href, { Accept: "application/ld+json" });
  }

  exec(data: IJobSourceData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      const tpfEndpoint = await this.tpf(data, context);
      return {
        comunicaDataSources: () => [{ type: "qpf", value: tpfEndpoint }],
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

          const rdfjsStore = await storeStream(stream);
          const store = await convertStore(rdfjsStore);
          await dataset.importFromStore(store, { overwriteAll: true, mergeGraphs: false });
        },
      };
    };
  }
}
