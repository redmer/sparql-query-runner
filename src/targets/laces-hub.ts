import type { IJobTargetData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { serialize } from "../utils/graphs-to-file.js";
import type { LacesHubPublicationDesc } from "../utils/laces.js";
import * as Laces from "../utils/laces.js";
import * as Report from "../utils/report.js";

/**
 * This step exports results to Laces Hub.
 *
 * The URL needs to be <https://hub.laces.tech/.../repo/publication>.
 * The publication needs to exist before it can be used as a destination.
 * Custom versioning mode is unsupported.
 */
export class LacesHubTarget implements WorkflowPart<IJobTargetData> {
  // Export a(ll) graph(s) to Laces
  id = () => "targets/laces-hub";

  isQualified(data: IJobTargetData): boolean {
    return data.access.match("^https?://hub.laces.tech/") !== null;
  }

  info(data: IJobTargetData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      const [repoName, publName] = data.access.split("/").slice(-2);
      const repoFullPath = new URL(data.access).pathname.split("/").slice(1, -1).join("/");
      const publicationUri = new URL(data.access).pathname;

      const tempFile = `${context.tempdir}/laces-export-${new Date().getTime()}.ttl`;
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
            format: "text/turtle",
            graphs: data.with.onlyGraphs,
            prefixes: context.data.prefixes,
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
                response.body
            );
          context.info(`Uploaded to <${data.access}>` + Report.DONE);
        },
      };
    };
  }
}

/** An error at the purview of the Laces Hub platform. */
export class LacesHubError extends Error {}
