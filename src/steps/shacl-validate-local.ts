// import ParserN3 from "@rdfjs/parser-n3";
// import fs from "fs-extra";
// import { Store } from "n3";
// import factory from "rdf-ext";
// import SHACLValidator from "rdf-validate-shacl";
// import { Step, StepGetter } from ".";
// import { IStep } from "../config/types";
// import { PipelineWorker } from "../runner/pipeline-worker.js";
// import { error, SQRWarning } from "../utils/errors.js";

import { IStep } from "../config/types";
import { PipelinePart, PipelinePartGetter, RuntimeCtx, StepPartInfo } from "../runner/types";

export default class SparqlQuadQuery implements PipelinePart<IStep> {
  name = () => "sparql-quads-query-step";

  match(data: IStep): boolean {
    if (data.type !== "sparql-query") return false;
    if (data.url.find((url) => url.endsWith(".ru"))) return false;
    return false;
  }

  async info(data: IStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<StepPartInfo> => {
      return {
        start: async () => {},
      };
    };
  }
}

// /**
//  * A SHACL validator (shacl-validate-local).
//  *
//  * @param type string "shacl-validate-local"
//  * @param url string[] path to files with statements to be validated
//  * @param shapeFiles string[] path to files with SHACL classes
//  */
// export default class ShaclValidateLocal implements Step {
//   identifier = () => "shacl-validate-local";

//   async info(config: IStep): Promise<StepGetter> {
//     return async (app: PipelineWorker) => {
//       return {
//         start: async () => {
//           const shapes = factory.dataset();
//           const store = new Store();

//           for (const url of config["shapeFiles"]) {
//             const stream = fs.createReadStream(url);
//             const parser = new ParserN3({ factory });
//             try {
//               await shapes.import(parser.import(stream));
//             } catch (err) {
//               error( `Could not import ${url}`);
//             }
//           }

//           for (const url of config.url) {
//             const stream = fs.createReadStream(url);
//             const parser = new ParserN3({ factory });
//             try {
//               await store.import(parser.import(stream));
//             } catch (err) {
//               error(`Could not import ${url}`);
//             }
//           }

//           const validator = new SHACLValidator(shapes, { factory });
//           try {
//             const report = await validator.validate(store);
//             if (report.conforms) {
//               console.info(`Conforms`);
//             }
//             for (const r of report.results) {
//               SQRWarning(
//                 6194,
//                 `\n${r.severity}: ${r.message}
// \t$    On: {r.focusNode} ${r.path} ${r.term}
// \t$  From: {r.sourceShape} / ${r.sourceConstraintComponent}`
//               );
//             }
//           } catch (err) {
//             error(`Could not validate using the shapes provided.`);
//           }
//         },
//       };
//     };
//   }
// }
