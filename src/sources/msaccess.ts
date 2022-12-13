import fs from "fs/promises";
import MDBReader from "mdb-reader";
import type { Value } from "mdb-reader/lib/types";
import N3, { BlankNode, DataFactory, Util } from "n3";
import type { ISource } from "../config/types";
import type {
  PipelinePart,
  PipelinePartGetter,
  ConstructRuntimeCtx,
  SourcePartInfo,
} from "../runner/types";
import { basename, download } from "../utils/download-remote.js";
import { CSVNS, FX, RDF, XSD, XYZ } from "../utils/namespaces.js";

const name = "sources/msaccess";

export class MsAccessSource implements PipelinePart<ISource> {
  name = () => name;

  qualifies(data: ISource): boolean {
    if (data.type === "msaccess") return true;
    if (data.type === "msaccess-xyz") return true;
    return false;
  }

  async info(data: ISource): Promise<PipelinePartGetter> {
    return async (context: Readonly<ConstructRuntimeCtx>): Promise<SourcePartInfo> => {
      const store = new N3.Store();
      let inputFilePath: string;

      return {
        prepare: async () => {
          // if file is remote, download it
          if (data.url.match(/https?:/)) {
            // Determine locally downloaded filename
            inputFilePath = `${context.tempdir}/${basename(data.url)}`;

            // Download and save that file at that location
            await download(data.url, inputFilePath, data.auth);
          } else {
            // The file is presumed local
            inputFilePath = data.url;
          }
        },
        // The start promise either returns quads or void
        start: async () => {
          const db = await fs.readFile(inputFilePath);
          const mdb = new MDBReader(db);

          console.info(`${name}: Reading <${data.url}>...`);

          // There are 2 implementations:
          // 1. <csv:> namespace, ideosyncratic
          // 2. xyz: (Facade-X) namespace, graphs similar to SPARQL-Anything
          if (data.type === "msaccess") {
            if (data.onlyGraphs) console.warn(`${name}: 'onlyGraphs' is ignored`);

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
          } else if (data.type === "msaccess-xyz") {
            const TABLE = Util.prefix(data.url + "#");
            for (const tableName of mdb.getTableNames()) {
              const graph = TABLE(encodeURI(tableName));
              const table = new BlankNode(encodeURI(tableName));
              store.addQuad(table, RDF("type"), FX("root"), graph);

              let i_row = 1;
              for (const record of mdb.getTable(tableName).getData()) {
                const row = new BlankNode(encodeURI(tableName) + i_row);
                store.addQuad(table, RDF(`_${i_row}`), row, graph);

                for (const [column, value] of Object.entries(record)) {
                  if (value == null) continue;

                  const predicate = XYZ(encodeURI(column));
                  const object = valueToObject(value);

                  store.addQuad(row, predicate, object, graph);
                }
                i_row++;
              }
            }
          }
          console.info(`${name}: Generated ${store.countQuads(null, null, null, null)} quads`);
        },
        getQueryContext: { sources: [store] },
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
