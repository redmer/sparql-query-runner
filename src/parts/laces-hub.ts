import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowPart, WorkflowPartGetter } from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import type { LacesHubPublicationDesc } from "../utils/laces.js";
import * as Laces from "../utils/laces.js";

/**
 * This step exports results to Laces Hub.
 *
 * The URL needs to be <https://hub.laces.tech/.../{repo}/{publication}>.
 * The publication needs to exist before it can be used as a destination.
 * Custom versioning mode is unsupported.
 */
export class LacesHubTarget implements WorkflowPart<IJobTargetData> {
  id = () => "targets/laces-hub";

  isQualified(data: IJobTargetData): boolean {
    return data.access.match("^https?://hub.laces.tech/") !== null;
  }

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowPartGetter> {
    return async (context: JobRuntimeContext) => {
      const [repoName, publName] = data.access.split("/").slice(-2);
      const repoFullPath = new URL(data.access).pathname.split("/").slice(1, -1).join("/");
      const publicationUri = new URL(data.access).pathname;

      const tempFile = `${context.tempdir}/export.nt`;
      let metadata: LacesHubPublicationDesc;

      const auth = data.with.credentials;
      if (auth === undefined)
        context.error(`Laces requires auth details <${JSON.stringify(data)}>`);

      return {
        start: async () => {
          // Check if repo and publication URL are correct
          const repos = await Laces.repositories(auth);
          const targetRepo = repos.find((r) => r.fullPath == repoFullPath);
          if (!targetRepo) context.error(`Laces repository '${repoName}' not found`);

          const publs = await Laces.publications(targetRepo.id, auth);
          metadata = publs.find((p) => p.uri.startsWith(publicationUri));
          if (!metadata)
            context.error(`Publication '${publName}' not found in repository '${repoName}'`);
          if (metadata.versioningMode === "CUSTOM")
            context.error(`Publication '${publName}' versioning mode (CUSTOM) is not supported`);

          // Save graphs to temp file, as we need to serialize to text/turtle
          context.info(`Gathering ${data.with?.onlyGraphs ?? "all"} graphs for export...`);
          await serialize(context.quadStore, tempFile, {
            format: "application/n-triples",
            graphs: data.with?.onlyGraphs,
          });

          context.info(`Uploading to <${data.access}>...`);
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
            context.error(
              `Publication '${publName}': upload ${response.status} (${response.statusText}):\n` +
                JSON.stringify(await response.text(), undefined, 2)
            );
        },
      };
    };
  }
}

/** An error at the purview of the Laces Hub platform. */
export class LacesHubError extends Error {}
