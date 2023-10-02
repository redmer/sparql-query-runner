import type * as RDF from "@rdfjs/types";
import type { IJobSourceData, IJobTargetData } from "../config/types.js";
import type {
  JobRuntimeContext,
  WorkflowModuleExec,
  WorkflowPartSource,
  WorkflowPartTarget,
} from "../runner/types.js";
import { AuthProxyHandler } from "../utils/auth-proxy-handler.js";
import { serializeStream } from "../utils/graphs-to-file.js";
import * as Laces from "../utils/laces.js";
import { InfoUploadingTo } from "../utils/uploading-message.js";

class LacesHubCommon {
  async publ(data: IJobSourceData | IJobTargetData, context: JobRuntimeContext) {
    const [repoName, publName] = data.access.split("/").slice(-2);
    const repoFullPath = new URL(data.access).pathname.split("/").slice(1, -1).join("/");
    const publicationUri = new URL(data.access).pathname;

    const auth = data?.with?.credentials;
    if (auth === undefined) context.error(`Laces requires auth details`);

    // Check if repo and publication URL are correct
    const repos = await Laces.repositories(auth, repoName);
    const targetRepo = repos.find((r) => r.path == repoFullPath);
    if (!targetRepo) context.error(`Laces repository '${repoName}' not found`);

    const allPubls = await Laces.publications(targetRepo.id, auth);
    const publication = allPubls.find((p) => p.uri.startsWith(publicationUri));

    if (!publication)
      context.error(`Publication '${publName}' not found in repository '${repoName}'`);
    if (publication.versioningMode !== "NONE")
      context.error(
        `Unsupported versioning mode '${publication.versioningMode}' for publicaion '${publName}'`
      );

    return publication;
  }
}

/**
 * This step exports results to Laces Hub.
 *
 * The URL needs to be <https://hub.laces.tech/.../{repo}/{publication}>.
 * The publication needs to exist before it can be used as a destination.
 * Custom versioning mode is unsupported.
 */
export class LacesHubSource extends LacesHubCommon implements WorkflowPartSource {
  id = () => "laces-hub-source";
  names = ["sources/laces-hub"];

  isQualified(data: IJobSourceData): boolean {
    return data.access.match("^https?://hub.laces.tech/") !== null;
  }

  exec(data: IJobSourceData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      const publ = await this.publ(data, context);

      return {
        init: async (stream: RDF.Stream) => {
          InfoUploadingTo(context.info, data?.with?.onlyGraphs, data.access);

          // Save graphs to temp file, as we need to serialize to text/n-triples
          const tempFile = `${context.tempdir}/export.nt`;
          await serializeStream(stream, tempFile, { format: "application/n-triples" });

          // Update Laces publication with contents of temp file
          const response = await Laces.updatePublication(publ.id, tempFile, data.with.credentials);

          if (!response.ok)
            context.error(
              `Publication '${publ.name}': upload ${response.status} (${response.statusText}):\n` +
                JSON.stringify(await response.text(), undefined, 2)
            );
        },
      };
    };
  }
}

export class LacesHubTarget extends LacesHubCommon implements WorkflowPartTarget {
  id = () => "laces-hub-target";
  names = ["targets/laces-hub"];

  isQualified(data: IJobTargetData): boolean {
    return data.access.match("^https?://hub.laces.tech/") !== null;
  }

  staticAuthProxyHandler(data: IJobSourceData | IJobTargetData): AuthProxyHandler {
    return new AuthProxyHandler(data.with.credentials, data.access);
  }

  exec(data: IJobSourceData | IJobTargetData): WorkflowModuleExec {
    return async (_context: JobRuntimeContext) => {
      return {
        comunicaDataSources: () => {
          return [{ type: "sparql", value: data.access + `/sparql` }];
        },
      };
    };
  }
}

/** An error at the purview of the Laces Hub platform. */
export class LacesHubError extends Error {}
