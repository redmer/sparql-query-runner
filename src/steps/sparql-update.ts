import fs from "fs/promises";
import type { IUpdateStep } from "../config/types";
import { BaseModule } from "../runner/base-module";
import { UpdateCtx, WorkflowModule } from "../runner/types";
import * as Report from "../utils/report.js";

export class UpdateStepError extends Error {}

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlUpdate
  extends BaseModule<IUpdateStep>
  implements WorkflowModule<IUpdateStep>
{
  static id = "steps/sparql-update";
  #queries: string[] = [];

  static qualifies(data: IUpdateStep): boolean {
    if (data.type === "sparql-update") return true;
    return false;
  }

  async willQuery() {
    if (this.data.access)
      for (const url of this.data.access) {
        const body = await fs.readFile(url, { encoding: "utf-8" });
        this.addCacheDependent({ type: "path", value: url });
        this.#queries.push(body);
      }

    if (this.data.update) {
      this.#queries.push(this.data.update);
      this.addCacheDependent({ type: "contents", value: this.data.update });
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
