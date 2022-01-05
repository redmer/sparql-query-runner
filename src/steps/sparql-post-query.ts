import chalk from "chalk";
import fs from "fs-extra";
import fetch from "node-fetch";
import { Step, StepGetter } from ".";
import { IStep } from "../config/types";
import { PipelineSupervisor } from "../runner";
import { SQRInfo, SQRWarning } from "../utils/errors";

/** Run a SPARQL update query (using a POST-enabled endpoint) */
export default class SparqlPostQuery implements Step {
  identifier = () => "sparql";

  async info(config: IStep): Promise<StepGetter> {
    return async (app: PipelineSupervisor) => {
      const queries: string[] = [];

      return {
        preProcess: async () => {
          for (const url of config.url) {
            const body = await fs.readFile(url, { encoding: "utf-8" });
            queries.push(body);
          }
        },
        start: async () => {
          for (const q of queries) {
            const result = await fetch(app.endpoint, {
              method: "POST",
              body: q,
              headers: {
                "Content-Type": "application/sparql-update",
              },
            });
            if (result.ok) {
              SQRInfo("\t\t" + chalk.green("OK") + "\t" + `${config.url[queries.indexOf(q)]}`);
            } else {
              SQRWarning(
                8001,
                `\t\t${chalk.red(result.status)}\t${
                  config.url[queries.indexOf(q)]
                }\n${await result.text()}`
              );
            }
          }
        },
      };
    };
  }
}
