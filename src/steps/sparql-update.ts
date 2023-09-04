import fs from "fs/promises";
import type { IUpdateStep } from "../config/types";
import { BaseModule } from "../runner/base-module";
import { IWorkflowModuleQueryDelegate, UpdateCtx } from "../runner/types";
import * as Report from "../utils/report.js";
import { IJobStepData } from "../config/types";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate implements WorkflowPart<IJobStepData> {
  id = () => "steps/update";

  

  async isQualified(data: IJobStepData): Promise<boolean> {
      if (data.access)
  }

  #queries: string[] = [];

  static qualifies(data: IUpdateStep): boolean {
    if (data.type === "sparql-update") return true;
    return false;
  }

  async willQuery() {
    if (this.data.access)
      for (const url of this.data.access) {
        const body = await fs.readFile(url, { encoding: "utf-8" });
        this.addCacheInput({ type: "path", value: url });
        this.#queries.push(body);
      }

    if (this.data.update) {
      this.#queries.push(this.data.update);
      this.addCacheInput({ type: "contents", value: this.data.update });
    }
  }

  async query(context: Readonly<UpdateCtx>) {
    for (const [j, q] of this.#queries.entries()) {
      console.info(
        `${this.constructor.name}: Executing query '${this.data.access?.[j] ?? j + 1}'...`
      );
      // There are no results from a QueryVoid (Update Query)
      await context.engine.queryVoid(q, context.queryContext);
      console.info(
        `${this.constructor.name}: Query '${this.data.access?.[j] ?? j + 1}' ` + Report.DONE
      );
    }
  }
}
