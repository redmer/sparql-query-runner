import chalk from "chalk";
import { randomUUID } from "crypto";
import fs from "fs-extra";
import MDBReader from "mdb-reader";
import { Value } from "mdb-reader/lib/data";
import { Store } from "n3";
import fetch from "node-fetch";
import path from "path";
import factory from "rdf-ext";
import { Step, StepGetter } from ".";
import { IStep } from "../config/types";
import { PipelineWorker } from "../runner/pipeline-worker";
import { error, console.info, SQRWarning } from "../utils/errors";
import { csvns, XSD } from "../utils/namespaces";
import { graphsToFile } from "../utils/quads";

export default class ImportMsAccess implements Step {
  identifier = () => "import-msaccess";

  async info(config: IStep): Promise<StepGetter> {
    return async (app: PipelineWorker) => {
      const tempFiles: string[] = [];
      let tableStore = new Store();
      const files = [];

      return {
        preProcess: async () => {
          for (const url of config.url) {
            const exists = await fs.pathExists(url);
            if (!exists) {
              SQRWarning(1010, `File ${url} not found`);
              continue;
            }
            files.push(url);
          }
        },
        start: async () => {
          const quads: number[] = [];

          for (const url of config.url) {
            const db = await fs.readFile(url);
            const mdb = new MDBReader(db);
            let j = 0;

            for (const tableName of mdb.getTableNames()) {
              const context = csvns(`table/${encodeURI(tableName)}`);
              let i = 1;
              for (const record of mdb.getTable(tableName).getData()) {
                for (const [column, value] of Object.entries(record)) {
                  if (!value && !config["keep-nulls"]) continue;

                  const subject = csvns(`table/${encodeURI(tableName)}/row/${i}`);
                  const predicate = csvns(encodeURI(column));
                  const object = valueToObject(value);

                  j++;
                  tableStore.addQuad(subject, predicate, object, context);
                }
                i++;
              }
            }

            quads.push(j);

            // export to tempfile, ready to be uploaded...
            const exportFile = path.join(app.tempdir, `${randomUUID()}.nq`);
            tempFiles.push(exportFile);

            await graphsToFile(tableStore, exportFile, undefined, {
              format: "application/n-quads",
            });

            tableStore = new Store(); // delete all triples
          }

          for (const [index, tempFile] of tempFiles.entries()) {
            const result = await fetch(app.endpoint, {
              method: "PUT",
              headers: { "Content-Type": "text/x-nquads" },
              body: await fs.readFile(tempFile, { encoding: "utf-8" }),
            });
            if (result.ok) {
              console.info(
                "\t\t" +
                  chalk.green("OK") +
                  `\tUploaded ${quads[index].toLocaleString()} quads from ${config.url[index]}`
              );
            } else {
              error(
                5171,
                `\t\t${chalk.red(result.status)}\t${config.url[index]}\n${await result.text()}`
              );
            }
          }
        },
      };
    };
  }
}

function valueToObject(value: Value) {
  if (value instanceof Date) {
    return factory.literal(value.toISOString(), XSD("dateTime"));
  }
  if (typeof value === "number") {
    if (value % 1 === 0) return factory.literal(value.toFixed(0), XSD("integer"));
    return factory.literal(value.toString(), XSD("decimal"));
  }
  if (typeof value === "boolean") {
    if (value === true) return factory.literal("true", XSD("boolean"));
    return factory.literal("false", XSD("boolean"));
  }
  if (value === null) {
    return csvns("None");
  }
  return factory.literal(value as string);
}
