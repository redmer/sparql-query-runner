import { IDestination } from "../config/types.js";
import {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  RuntimeCtx,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import { Laces, LacesPublicationDesc } from "../utils/laces.js";

export default class LacesDestination implements PipelinePart<IDestination> {
  // Export a(ll) graph(s) to Laces
  name = () => "laces-destination";

  qualifies(data: IDestination): boolean {
    return data.type === "laces" && !!data.url.match("^https?://hub.laces.tech/");
  }

  async info(data: IDestination): Promise<PipelinePartGetter> {
    const [repoName, publName] = data.url.split("/").slice(-2);

    return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
      const tempFile = `${context.tempdir}/laces-export-${new Date().getTime()}.ttl`;
      let metadata: LacesPublicationDesc;

      const auth = data.authentication;
      if (auth === undefined) throw new Error(`Laces repositories require auth details`);

      return {
        prepare: async () => {
          // Check if repo and publication URL are correct
          const repos = await Laces.repositories(auth);
          const targetRepo = repos.find((r) => r.name == repoName);
          if (!targetRepo) throw new Error(`Laces repository ${repoName} (${data.url}) not found`);

          const publs = await Laces.publications(targetRepo.id, auth);
          //@ts-ignore
          metadata = publs.find((p) => p.name == publName);
          if (!metadata) throw new Error(`Laces publication ${publName} (${data.url}) not found`);
          if (metadata.versioningMode === "CUSTOM")
            throw new Error(
              `Laces publication ${publName} (${data.url}) versioning mode is unsupported (${metadata.versioningMode})`
            );

          // Save graphs to temp file, as we need to serialize to text/turtle
          await serialize(context.quadStore, data.url, {
            format: "text/turtle",
            graphs: data.graphs,
            prefixes: context.pipeline.prefixes,
          });
        },
        start: async () => {
          // Update Laces publication with contents of temp file
          await Laces.updatePublication(
            metadata.id,
            tempFile,
            {
              owner: metadata.owner,
              publisher: metadata.publisher,
              schemaURIs: metadata.schemaURIs,
            },
            auth
          );
        },
      };
    };
  }
}
