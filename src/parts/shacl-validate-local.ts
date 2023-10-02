import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { RdfStore } from "rdf-stores";
import SHACLValidator from "rdf-validate-shacl";
import type { IJobStepData } from "../config/types.js";
import type { JobRuntimeContext, WorkflowModuleExec, WorkflowPartStep } from "../runner/types.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

export class ShaclValidateLocal implements WorkflowPartStep {
  id = () => "steps/shacl";
  names = ["steps/shacl"];

  exec(data: IJobStepData): WorkflowModuleExec<"steps"> {
    return async (context: JobRuntimeContext) => {
      if (data.with.targetGraph)
        context.warning(`Target-Graph ignored: Only shapes in the default graph are used`);

      let shapes: RDF.DatasetCore;
      if (data.access.length > 0) {
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

        // Set shapes dataset to the loaded shapes
        shapes = shapesStore.asDataset();
      }
      // set shapes dataset to the default quadstore
      else shapes = context.quadStore.asDataset();

      return {
        asStep: async () => {
          const validator = new SHACLValidator(shapes, {});
          const report = validator.validate(context.quadStore.asDataset());

          // If the report conforms, the data is OK
          if (report.conforms) return context.info(`OK: data conforms to shapes`);

          const warnings: string[] = [];
          // Add to list of readable warnings
          for (const r of report.results)
            warnings.push(`
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} ${r.term}
source: ${r.sourceShape} / ${r.sourceConstraintComponent}`);

          context.warning(`${report.results.length} SHACL results\n${warnings.join("")}`);
        },
      };
    };
  }
}
