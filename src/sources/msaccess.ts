import fs from "fs-extra";
import MDBReader from "mdb-reader";
import { Value } from "mdb-reader/lib/types";
import RDF, { DataFactory } from "n3";
import N3 from "n3";
import { ISource } from "../config/types";
import { PipelinePart, PipelinePartGetter, RuntimeCtx, SourcePartInfo } from "../runner/types";
import { basename, download } from "../utils/download-remote";
import { CSVNS, XSD } from "../utils/namespaces.js";

export class MsAccessSource implements PipelinePart<ISource> {
  name = () => "msaccess-store-source";

  match(data: ISource): boolean {
    if (data.type === "msaccess") return true;
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: RuntimeCtx): Promise<SourcePartInfo> => {
      let store: N3.Store;
      let inputFilePath: string;

      return {
        preProcess: async () => {
          // if file is remote, download it
          if (data.url.match(/https?:/)) {
            // Determine locally downloaded filename
            inputFilePath = `${context.tempdir}/${basename(data.url)}`;

            // Download and save that file at that location
            await download(data.url, inputFilePath, data.authentication);
          } else {
            // The file is presumed local
            inputFilePath = data.url;
          }
        },
        // The start promise either returns quads or void
        start: async () => {
          const db = await fs.readFile(inputFilePath);
          const mdb = new MDBReader(db);

          for (const tableName of mdb.getTableNames()) {
            const context = CSVNS(`table/${encodeURI(tableName)}`);
            let i_row = 1;
            for (const record of mdb.getTable(tableName).getData()) {
              for (const [column, value] of Object.entries(record)) {
                if (!value) continue;

                const subject = CSVNS(`table/${encodeURI(tableName)}/row/${i_row}`);
                const predicate = CSVNS(encodeURI(column));
                const object = valueToObject(value);

                store.addQuad(subject, predicate, object, context);
              }
              i_row++;
            }
          }
        },
        source: store,
      };
    };
  }
}

// export default class ImportMsAccess implements Step {
//   identifier = () => "import-msaccess";

//   async info(config: IStep): Promise<StepGetter> {
//     return async (app: PipelineWorker) => {
//       const tempFiles: string[] = [];
//       let tableStore = new Store();
//       const files = [];

//       return {
//         preProcess: async () => {
//           for (const url of config.url) {
//             const exists = await fs.pathExists(url);
//             if (!exists) {
//               SQRWarning(1010, `File ${url} not found`);
//               continue;
//             }
//             files.push(url);
//           }
//         },
//         start: async () => {
//           const quads: number[] = [];

//           for (const url of config.url) {
//             const db = await fs.readFile(url);
//             const mdb = new MDBReader(db);
//             let j = 0;

//             for (const tableName of mdb.getTableNames()) {
//               const context = csvns(`table/${encodeURI(tableName)}`);
//               let i = 1;
//               for (const record of mdb.getTable(tableName).getData()) {
//                 for (const [column, value] of Object.entries(record)) {
//                   if (!value && !config["keep-nulls"]) continue;

//                   const subject = csvns(`table/${encodeURI(tableName)}/row/${i}`);
//                   const predicate = csvns(encodeURI(column));
//                   const object = valueToObject(value);

//                   j++;
//                   tableStore.addQuad(subject, predicate, object, context);
//                 }
//                 i++;
//               }
//             }

//             quads.push(j);

//             // export to tempfile, ready to be uploaded...
//             const exportFile = path.join(app.tempdir, `${randomUUID()}.nq`);
//             tempFiles.push(exportFile);

//             await graphsToFile(tableStore, exportFile, undefined, {
//               format: "application/n-quads",
//             });

//             tableStore = new Store(); // delete all triples
//           }

//           for (const [index, tempFile] of tempFiles.entries()) {
//             const result = await fetch(app.endpoint, {
//               method: "PUT",
//               headers: { "Content-Type": "text/x-nquads" },
//               body: await fs.readFile(tempFile, { encoding: "utf-8" }),
//             });
//             if (result.ok) {
//               console.info(
//                 "\t\t" +
//                   chalk.green("OK") +
//                   `\tUploaded ${quads[index].toLocaleString()} quads from ${config.url[index]}`
//               );
//             } else {
//               error(
//                 `\t\t${chalk.red(result.status)}\t${config.url[index]}\n${await result.text()}`
//               );
//             }
//           }
//         },
//       };
//     };
//   }
// }

function valueToObject(value: Value) {
  if (value instanceof Date) {
    return DataFactory.literal(value.toISOString(), XSD("dateTime"));
  }
  if (typeof value === "number") {
    if (value % 1 === 0) return DataFactory.literal(value.toFixed(0), XSD("integer"));
    return DataFactory.literal(value.toString(), XSD("decimal"));
  }
  if (typeof value === "boolean") {
    if (value === true) return DataFactory.literal("true", XSD("boolean"));
    return DataFactory.literal("false", XSD("boolean"));
  }
  if (value === null) {
    return CSVNS("None");
  }
  return DataFactory.literal(value as string);
}
