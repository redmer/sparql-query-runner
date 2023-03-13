import { ConfigurationError } from "../config/validate.js";
import type { ITarget } from "../config/types.js";
import type {
  ConstructRuntimeCtx,
  DestinationPartInfo,
  PipelinePart,
  PipelinePartGetter,
} from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import type { LacesHubPublicationDesc } from "../utils/laces.js";
import * as Laces from "../utils/laces.js";
import * as Report from "../utils/report.js";

const name = "targets/laces-hub";

/**
 * This step exports results to Laces Hub.
 *
 * The URL needs to be <https://hub.laces.tech/.../repo/publication>.
 * The publication needs to exist before it can be used as a destination.
 * Custom versioning mode is unsupported.
 */
export class LacesHubTarget implements PipelinePart<ITarget> {
  // Export a(ll) graph(s) to Laces
  name = () => name;

  qualifies(data: ITarget): boolean {
    if (data.type === "laces") return true;
    if (data.access.match("^https?://hub.laces.tech/")) return true;
    return false;
  }

  async info(data: ITarget): Promise<PipelinePartGetter> {
    const [repoName, publName] = data.access.split("/").slice(-1);
    const repoFullPath = new URL(data.access).pathname.split("/").slice(1, -1).join("/");

    return async (context: Readonly<ConstructRuntimeCtx>): Promise<DestinationPartInfo> => {
      const tempFile = `${context.tempdir}/laces-export-${new Date().getTime()}.ttl`;
      let metadata: LacesHubPublicationDesc;

      const auth = data.credentials;
      if (auth === undefined)
        throw new ConfigurationError(`${name}: Laces requires auth details <${data.access}>`);

      return {
        prepare: async () => {
          // Check if repo and publication URL are correct
          const repos = await Laces.repositories(auth);
          const targetRepo = repos.find((r) => r.fullPath == repoFullPath);
          if (!targetRepo)
            throw new LacesHubError(`${name}: Laces repository '${repoName}' not found`);

          const publs = await Laces.publications(targetRepo.id, auth);
          metadata = publs.find((p) => p.name == publName);
          if (!metadata)
            throw new LacesHubError(
              `${name}: Laces publication '${publName}' not found in repository '${repoName}'`
            );
          if (metadata.versioningMode === "CUSTOM")
            throw new Error(
              `${name}: Laces publication '${publName}' versioning mode (CUSTOM) is unsupported (GH-5)`
            );
        },
        start: async () => {
          // Save graphs to temp file, as we need to serialize to text/turtle
          console.info(
            `${name}: Gathering ${
              data.onlyGraphs ? data.onlyGraphs.length : "all"
            } graphs for export...`
          );
          await serialize(context.quadStore, tempFile, {
            format: "text/turtle",
            graphs: data.onlyGraphs,
            prefixes: context.pipeline.prefixes,
          });

          console.info(`${name}: Uploading to <${data.access}>...`);
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

          if (!response.ok)
            throw new LacesHubError(
              `Upload ${response.status} (${response.statusText}):\n` + response.body
            );
          console.info(`${name}: Uploaded to <${data.access}>` + Report.DONE);
        },
      };
    };
  }
}

/** An error at the purview of the Laces Hub platform. */
export class LacesHubError extends Error {}
