import type { IDest } from "../config/types.js";
import type {
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
  RuntimeCtx,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import type { LacesPublicationDesc } from "../utils/laces.js";
import * as Laces from "../utils/laces.js";
import * as Report from "../utils/report.js";

/**
 * This step exports results to Laces Hub.
 *
 * The URL needs to be <https://hub.laces.tech/.../repo/publication>.
 * The publication needs to exist before it can be used as a destination.
 * Custom versioning mode is unsupported.
 */
export default class LacesDestination implements PipelinePart<IDest> {
  // Export a(ll) graph(s) to Laces
  name = () => "destination/laces";

  qualifies(data: IDest): boolean {
    if (data.type != "laces") return false;
    if (!data.url.match("^https?://hub.laces.tech/")) return false;
    return true;
  }

  async info(data: IDest): Promise<PipelinePartGetter> {
    const [repoName, publName] = data.url.split("/").slice(-2);

    return async (context: Readonly<RuntimeCtx>): Promise<DestinationPartInfo> => {
      const tempFile = `${context.tempdir}/laces-export-${new Date().getTime()}.ttl`;
      let metadata: LacesPublicationDesc;

      const auth = data.authentication;
      if (auth === undefined) Report.error(`Laces repositories require auth details`);

      return {
        prepare: async () => {
          // Check if repo and publication URL are correct
          const repos = await Laces.repositories(auth);
          const targetRepo = repos.find((r) => r.name == repoName);
          if (!targetRepo) Report.error(`Laces repository ${repoName} (${data.url}) not found`);

          const publs = await Laces.publications(targetRepo.id, auth);
          metadata = publs.find((p) => p.name == publName);
          if (!metadata) Report.error(`Laces publication ${publName} (${data.url}) not found`);
          if (metadata.versioningMode === "CUSTOM")
            Report.error(
              `Laces publication ${publName} (${data.url}) versioning mode is unsupported (${metadata.versioningMode})`
            );

          // Save graphs to temp file, as we need to serialize to text/turtle
          await serialize(context.quadStore, tempFile, {
            format: "text/turtle",
            graphs: data.graphs,
            prefixes: context.pipeline.prefixes,
          });
        },
        start: async () => {
          const msg = `Uploading to '${data.url}'`;
          Report.start(msg);

          // Update Laces publication with contents of temp file
          const response = await Laces.updatePublication(
            metadata.id,
            tempFile,
            {
              owner: metadata.owner,
              publisher: metadata.publisher,
              schemaURIs: metadata.schemaURIs,
            },
            auth
          );

          if (response.ok) {
            Report.success(msg);
          } else {
            Report.fail(msg);
          }
        },
      };
    };
  }
}
