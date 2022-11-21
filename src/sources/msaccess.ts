import fs from "fs/promises";
import MDBReader from "mdb-reader";
import type { Value } from "mdb-reader/lib/types";
import N3, { DataFactory } from "n3";
import type { ISource } from "../config/types";
import type { PipelinePart, PipelinePartGetter, RuntimeCtx, SourcePartInfo } from "../runner/types";
import { basename, download } from "../utils/download-remote.js";
import { CSVNS, XSD } from "../utils/namespaces.js";
import * as Report from "../utils/report.js";

export class MsAccessSource implements PipelinePart<ISource> {
  name = () => "source/msaccess";

  qualifies(data: ISource): boolean {
    if (data.type === "msaccess") return true;
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<RuntimeCtx>): Promise<SourcePartInfo> => {
      const store = new N3.Store();
      let inputFilePath: string;

      if (data.graphs) Report.info(`${this.name()} does not support data.graphs`);

      return {
        prepare: async () => {
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
          const msg = `Reading ${data.url}...`;
          const db = await fs.readFile(inputFilePath);
          const mdb = new MDBReader(db);

          Report.start(msg);
          for (const tableName of mdb.getTableNames()) {
            const context = CSVNS(`table/${encodeURI(tableName)}`);
            let i_row = 1;
            for (const record of mdb.getTable(tableName).getData()) {
              for (const [column, value] of Object.entries(record)) {
                if (!value) continue; // falsy values not imported

                const subject = CSVNS(`table/${encodeURI(tableName)}/row/${i_row}`);
                const predicate = CSVNS(encodeURI(column));
                const object = valueToObject(value);

                store.addQuad(subject, predicate, object, context);
              }
              i_row++;
            }
          }
          Report.success(msg);
          Report.info(`${data.url}: ${store.countQuads(null, null, null, null)} quads`);
        },
        getQuerySource: store,
      };
    };
  }
}

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
