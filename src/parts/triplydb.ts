import * as RDF from "@rdfjs/types";
import App from "@triply/triplydb";
import { Store } from "n3";
import { storeStream } from "rdf-store-stream";
import type { IJobSourceData, IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowPartSource, WorkflowPartTarget } from "../runner/types.js";

export class TriplyDBTarget implements WorkflowPartTarget, WorkflowPartSource {
  // Export a(ll) graph(s) to Laces
  id = () => "targets/triplydb";
  names = ["targets/tripldb", "sources/triplydb"];

  exec(data: IJobSourceData | IJobTargetData) {
    return async (context: JobRuntimeContext) => {
      // Get account name and dataset name from access URL
      const [accountName, datasetName] = data.access.split("/").slice(-2);

      const auth = data.with?.credentials;
      if (auth === undefined) context.error(`TriplyDB requires auth details <${data.access}>`);
      if (auth.type !== "Bearer") context.error(`TriplyDB requires auth with "token:" `);

      const Triply = App.default.get({ token: auth.token });
      const account = await Triply.getAccount(accountName);
      const dataset = await account.ensureDataset(datasetName, {
        prefixes: context.jobData.prefixes,
      });

      return {
        asSource: async () => {
          return await dataset.graphsToStream("rdf-js");

          // const triplyStream = await dataset.graphsToStream("rdf-js");
          // const quadStream = triplyStream
          //   .pipe(new FilteredStream({ graphs: data?.with?.onlyGraphs }))
          //   .pipe(new SingleGraphStream({ graph: data?.with?.targetGraph }));

          // const emitter = context.quadStore.import(quadStream);

          // await new Promise((resolve, reject) => {
          //   emitter.on("end", resolve);
          //   emitter.on("error", reject);
          // });
        },

        asTarget: async (stream: RDF.Stream) => {
          // context.info(`Gathering ${data.with?.onlyGraphs ?? "all"} graphs for export...`);

          // const dataStore: RDF.Store = data.with?.onlyGraphs?.length
          //   ? await storeStream(
          //       filteredStream(context.quadStore.match(), { graphs: data.with.onlyGraphs })
          //     )
          //   : context.quadStore;

          context.info(
            `Uploading ${data?.with?.onlyGraphs?.length ?? "all"} graphs to <${data.access}>...`
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          // await dataset.importFromStore(dataStore as any, { overwriteAll: true });
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
