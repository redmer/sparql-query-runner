import { default as LacesAPI } from "@stichting-crow/laces-hub-js";
import { NewPublicationMetadata } from "@stichting-crow/laces-hub-js/dist/resource/publication/types";
import { VersionedRdfPublication } from "@stichting-crow/laces-hub-js/dist/resource/publication/versioned";
import fs from "fs-extra";
import { Step, StepGetter } from ".";
import { IStep } from "../config/types";
import { PipelineSupervisor } from "../runner";
import { oneOrMore } from "../utils/array";
import { SQRError } from "../utils/errors";

/** Upload a local file to Laces.
 *
 * @param target string[] List of target publication urls
 *
 * Note that only one source file `url` is supported.
 */
export default class LocalFileToLaces implements Step {
  identifier = () => "local-file-to-laces";

  async info(config: IStep): Promise<StepGetter> {
    const targets = oneOrMore(config["target"]);

    return async (app: PipelineSupervisor) => {
      return {
        start: async () => {
          for (const publicationUrl of targets) {
            const pub = await LacesAPI.Publication(publicationUrl);
            await pub.getInfo();
            if (pub.isVersioned && (pub as VersionedRdfPublication).versioningMode === "CUSTOM") {
              SQRError(
                2100,
                `Can’t update ${publicationUrl}: only automated versioning modes are supported.`
              );
            }
            try {
              await pub.update(
                pub.cache as NewPublicationMetadata,
                await fs.readFile(config.url[0])
              );
            } catch (err) {
              SQRError(2101, `Can't update ${publicationUrl}: ${err}`);
            }
          }
        },
      };
    };
  }
}
