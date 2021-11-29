import ParserN3 from "@rdfjs/parser-n3";
import fs from "fs-extra";
import { Store } from "n3";
import factory from "rdf-ext";
import SHACLValidator from "rdf-validate-shacl";
import { Step, StepGetter } from ".";
import { IStep } from "../config/types";
import { PipelineSupervisor } from "../runner";
import { SQRError, SQRInfo } from "../utils/errors";

/**
 * A SHACL validator (shacl-validate-local).
 *
 * @param type string "shacl-validate-local"
 * @param url string[] path to files with statements to be validated
 * @param shapeFiles string[] path to files with SHACL classes
 */
export default class ShaclValidateLocal implements Step {
  identifier = () => "shacl-validate-local";

  async info(config: IStep): Promise<StepGetter> {
    return async (app: PipelineSupervisor) => {
      return {
        start: async () => {
          const shapes = factory.dataset();
          const store = new Store();

          for (const url of config["shapeFiles"]) {
            const stream = fs.createReadStream(url);
            const parser = new ParserN3({ factory });
            try {
              await shapes.import(parser.import(stream));
            } catch (err) {
              SQRError(6192, `Could not import ${url}`);
            }
          }

          for (const url of config.url) {
            const stream = fs.createReadStream(url);
            const parser = new ParserN3({ factory });
            try {
              await store.import(parser.import(stream));
            } catch (err) {
              SQRError(6192, `Could not import ${url}`);
            }
          }

          const validator = new SHACLValidator(shapes, { factory });
          try {
            const report = await validator.validate(store);
            if (report.conforms) {
              SQRInfo(`Conforms`);
            }
            for (const r of report.results) {
              console.warn(
                `${r.severity}: ${r.message}
\t$    On: {r.focusNode} ${r.path} ${r.term}
\t$  From: {r.sourceShape} / ${r.sourceConstraintComponent}`
              );
            }
          } catch (err) {
            SQRError(6191, `Could not validate using the shapes provided.`);
          }
        },
      };
    };
  }
}
