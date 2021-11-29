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
import { PipelineSupervisor } from "../runner";
import { SQRWarning } from "../utils/errors";
import { csvns, XSD } from "../utils/namespaces";
import { graphsToFile } from "../utils/quads";

export default class ImportMsAccess implements Step {
  identifier = () => "import-msaccess";

  async info(config: IStep): Promise<StepGetter> {
    return async (app: PipelineSupervisor) => {
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
          for (const url of config.url) {
            const db = await fs.readFile(url);
            const mdb = new MDBReader(db);

            for (const tableName of mdb.getTableNames()) {
              const context = csvns(`table/${tableName}`);
              let i = 1;
              for (const record of mdb.getTable(tableName).getData()) {
                for (const [column, value] of Object.entries(record)) {
                  if (!value && !config["keep-nulls"]) continue;

                  const subject = csvns(`table/${tableName}/row/${i}`);
                  const predicate = csvns(column);
                  const object = valueToObject(value);

                  tableStore.addQuad(subject, predicate, object, context);
                }
                i++;
              }
            }

            // export to tempfile, ready to be uploaded...
            const exportFile = path.join(app.tempdir, `${randomUUID()}.nq`);
            tempFiles.push(exportFile);

            await graphsToFile(tableStore, exportFile, undefined, {
              format: "application/n-quads",
            });

            tableStore = new Store(); // delete all triples
          }

          tempFiles.every(async (tempFile) => {
            await fetch(app.endpoint, {
              method: "PUT",
              headers: { "Content-Type": "text/x-nquads" },
              body: await fs.readFile(tempFile, { encoding: "utf-8" }),
            });
          });
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
