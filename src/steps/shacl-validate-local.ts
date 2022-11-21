import fs from "fs";
import N3 from "n3";
import SHACLValidator from "rdf-validate-shacl";
import type { IBaseStep, IQueryStep, IUpdateStep } from "../config/types";
import type { PipelinePart, PipelinePartGetter, RuntimeCtx, StepPartInfo } from "../runner/types";
import { getMediaTypeFromFilename } from "../utils/rdf-extensions-mimetype.js";
import * as Report from "../utils/report.js";

export default class ShaclValidateLocal implements PipelinePart<IQueryStep | IUpdateStep> {
  name = () => "step/shacl-validate";

  qualifies(data: IQueryStep | IUpdateStep): boolean {
    if (data.type !== "shacl-validate") return false;
    if (data.url == undefined) return false;
    return true;
  }

  async info(data: IQueryStep | IUpdateStep): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>, i?: number): Promise<StepPartInfo> => {
      const shapesStore = new N3.Store();
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

            // Filter on specified graphs
            for (const graph of shapesStore.getGraphs(null, null, null)) {
              if (!data.graphs?.includes(graph.value)) shapesStore.deleteGraph(graph);
            }
          }
        },
        start: async () => {
          const validator = new SHACLValidator(shapesStore);
          try {
            const report = await validator.validate(context.quadStore);
            if (report.conforms) Report.print("info", `Conforms to shapes`);
            else {
              for (const r of report.results) {
                Report.print(
                  "warning",
                  `
 SHACL: ${r.severity}: ${r.message}
    at: ${r.focusNode} ${r.path} ${r.term}
source: ${r.sourceShape} / ${r.sourceConstraintComponent}`
                );
              }
            }
          } catch (err) {
            Report.print("error", `Could not validate using the shapes provided`);
          }
        },
      };
    };
  }
}
