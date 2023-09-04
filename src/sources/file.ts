import N3 from "n3";
import { IJobSourceData } from "../config/types.js";
import {
  Layer,
  LayerGetter,
  LayerSelector,
  SourceContext,
  SourceRuntimeContext,
  _SourceStepTargetRuntimeContext,
} from "../layers/layer-common.js";

/**
 * Use a local file as a query source, a non-local file with filtered graphs.
 * This source only supports plain RDF serializations (i.e., not `hdtFile`/`ostrichFile`).
 */
export class File implements LayerSelector<SourceContext> {
  id = "sources/file";

  info(context: SourceContext): Promise<LayerGetter> {
    // Due to security concerns, `@comunica/query-sparql` does not support local file systems
    // as sources. This class loads the file into a `rdfjsSource`, which _is_ supported.
    if (context.data.onlyGraphs) return this.filteredGraphs(context);
    if (!/^https?:\/\//.test(context.data.file)) return this.localFile(context);
    return; // TODO: de rest moet naar Comunica
  }

  async filteredGraphs(context: SourceContext): Promise<LayerGetter> {
    return async (): Promise<Layer<SourceContext & _SourceStepTargetRuntimeContext>> => {
      return {};
    };
  }
  async localFile(context: SourceContext): Promise<LayerGetter> {
    return async (): Promise<Layer<SourceContext & _SourceStepTargetRuntimeContext>> => {
      const store = new N3.Store();
      return {
        execute: async (runtimeContext: SourceRuntimeContext) => {
          void runtimeContext.cacheFile;
        },
        toQueryContext: () => {
          return {
            sources: [store],
          };
        },
      };
    };
  }
}

const FileFilteredGraphs: LayerGetter = async (layerContext: SourceStepTargetContext) => {
  console.log("hi");
};
const FileLocal: LayerGetter = async (data: IJobSourceData) => {
  queryContext: 12;
};
