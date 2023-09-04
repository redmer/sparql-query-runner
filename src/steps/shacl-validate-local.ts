import fs from "fs";
import N3 from "n3";
import SHACLValidator from "rdf-validate-shacl";
import type { IValidateStep } from "../config/types";
import type { ConstructCtx, PipelinePart, PipelinePartGetter, StepPartInfo } from "../runner/types";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

const name = "steps/shacl-validate-local";

export default class ShaclValidateLocal implements PipelinePart<IValidateStep> {
  name = () => name;

  qualifies(data: IValidateStep): boolean {
    if (data.type !== "shacl-validate") return false;
    if (data.access === undefined) return false;
    return true;
  }

  async info(data: IValidateStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructCtx>): Promise<StepPartInfo> => {
      const shapesStore = new N3.Store();
      if (Object.hasOwn(data, "onlyGraphs"))
        console.warn(`${name}: Only shapes in the default graph are used`);

      return {
        prepare: async () => {
          for (const url of data.access) {
            const mimetype = getRDFMediaTypeFromFilename(url);
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
          const validator = new SHACLValidator(shapesStore, {});
          try {
            const report = validator.validate(context.quadStore);
            if (report.conforms) console.info(`${name}: Data conforms to shapes`);
            else {
              for (const r of report.results) {
                console.warn(
                  `
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} ${r.term}
source: ${r.sourceShape} / ${r.sourceConstraintComponent}`
                );
              }
              if (context.cliOptions.warningsAsErrors)
                throw Error(`${name}: ${report.results.length} SHACL results`);
            }
          } catch (err) {
            console.error(`${name}: Could not validate, due to:` + err);
          }
        },
      };
    };
  }
}
