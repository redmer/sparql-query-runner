import fs from "fs";
import N3 from "n3";
import SHACLValidator from "rdf-validate-shacl";
import type { IValidateStep } from "../config/types";
import type {
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
  StepPartInfo,
} from "../runner/types";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

export default class ShaclValidateLocal implements PipelinePart<IValidateStep> {
  name = () => "steps/shacl-validate";

  qualifies(data: IValidateStep): boolean {
    if (data.type !== "shacl-validate") return false;
    if (data.url === undefined) return false;
    return true;
  }

  async info(data: IValidateStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>, i?: number): Promise<StepPartInfo> => {
      const shapesStore = new N3.Store();
      if (Object.hasOwn(data, "onlyGraphs"))
        Report.info(`${this.name()} (${i}) only processes shapes in the default graph.`);

      return {
        prepare: async () => {
          for (const [j, url] of data.url.entries()) {
            const mimetype = getMediaTypeFromFilename(url);
            const stream = fs.createReadStream(url);
            const parser = new N3.StreamParser({ format: mimetype });
            const emitter = shapesStore.import(parser.import(stream));

            // Wait until the Store has loaded
            await new Promise((resolve, reject) => {
              emitter.on("end", resolve);
              emitter.on("error", reject);
            });
          }
        },
        start: async () => {
          const validator = new SHACLValidator(shapesStore);
          try {
            const report = validator.validate(context.quadStore);
            if (report.conforms) Report.info(`Conforms to shapes`);
            else {
              for (const r of report.results) {
                Report.warning(
                  `
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} ${r.term}
source: ${r.sourceShape} / ${r.sourceConstraintComponent}`
                );
              }
            }
          } catch (err) {
            Report.error(`Could not validate using the shapes provided`);
          }
        },
      };
    };
  }
}
