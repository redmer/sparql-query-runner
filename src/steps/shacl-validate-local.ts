import fs from "fs";
import N3 from "n3";
import { RdfStore } from "rdf-stores";
import SHACLValidator from "rdf-validate-shacl";
import type { IJobStepData } from "../config/types";
import type { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

export default class ShaclValidateLocal implements WorkflowPart<IJobStepData> {
  id = () => "steps/shacl";

  info(data: IJobStepData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      if (data.with.targetGraph)
        context.warning(`Target-Graph ignored: Only shapes in the default graph are used`);

      const shapesStore = RdfStore.createDefault();
      const mimetype = getRDFMediaTypeFromFilename(data.access);
      const stream = fs.createReadStream(data.access);
      const parser = new N3.StreamParser({ format: mimetype });
      const shapeQuads = parser.import(stream);
      const emitter = shapesStore.import(shapeQuads);

      // Wait until the Store has loaded
      await new Promise((resolve, reject) => {
        emitter.on("end", resolve);
        emitter.on("error", reject);
      });

      return {
        start: async () => {
          const validator = new SHACLValidator(shapesStore.asDataset(), {});
          const report = validator.validate(context.quadStore.asDataset());

          // If the report conforms, the data is OK
          if (report.conforms) return context.info(`OK: data conforms to shapes`);

          const warnings: string[] = [];
          for (const r of report.results) {
            warnings.push(`
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} ${r.term}
source: ${r.sourceShape} / ${r.sourceConstraintComponent}`);
          }
          context.warning(`${report.results.length} SHACL results\n${warnings.join("")}`);
        },
      };
    };
  }
}
