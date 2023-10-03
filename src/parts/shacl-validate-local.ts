import type * as RDF from "@rdfjs/types";
import fs from "fs";
import N3 from "n3";
import { RdfStore } from "rdf-stores";
import SHACLValidator from "rdf-validate-shacl";
import { Validator } from "shacl-engine";
import type { IJobStepData } from "../config/types.js";
import type { InMemQuadStore, JobRuntimeContext, WorkflowPartStep } from "../runner/types.js";
import { getRDFMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";

export class ShaclValidateLocal implements WorkflowPartStep {
  id = () => "shacl-validate-local-step";
  names = ["steps/shacl"];

  exec(data: IJobStepData) {
    return async (context: JobRuntimeContext) => {
      return {
        init: async (_stream: RDF.Stream, quadStore: InMemQuadStore) => {
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
          else shapes = quadStore.asDataset();

          const validator = new SHACLValidator(shapes, {});
          const report = validator.validate(quadStore.asDataset());

          const validator2 = new Validator(shapes, { factory: quadStore.dataFactory });
          const report2 = await validator2.validate({ dataset: quadStore.asDataset() });

          if (report.conforms !== report2.conforms)
            context.warning(`Validator implementations do not evaluate identically`);

          // If the report conforms, the data is OK
          if (report.conforms && report2.conforms) {
            context.info(`OK: data conforms to shapes`);
            return;
          }

          const warnings: string[] = [];
          // Add to list of readable warnings
          for (const r of report.results)
            warnings.push(`
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} ${r.term}
source: ${r.sourceShape} / ${r.sourceConstraintComponent}`);

          const warnings2: string[] = [];
          for (const r of report2.results)
            warnings2.push(`
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} {r.value}
source: ${r.shape} / ${r.constraintComponent}`);

          context.warning(
            `${warnings.length} SHACL results (implementation: rdf-shacl-validate)` +
              "\n" +
              warnings.join("")
          );
          context.warning(
            `${warnings2.length} SHACL results (implementation: shacl-engine)` +
              "\n" +
              warnings2.join("")
          );
        },
      };
    };
  }
}
