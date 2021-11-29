import commandExists from "command-exists";
import { randomUUID } from "crypto";
import fs from "fs-extra";
import fetch from "node-fetch";
import path from "path";
import util from "util";
import { Step, StepGetter } from ".";
import { IStep } from "../config/types";
import { PipelineSupervisor } from "../runner";
import { SQRError, SQRInfo } from "../utils/errors";

const exec = util.promisify(require("child_process").exec);

/** Export to file. Optionally limit the graphs, default: all graphs in store. */
export default class DownloadFile implements Step {
  identifier = () => "download-file";

  async info(config: IStep): Promise<StepGetter> {
    return async (app: PipelineSupervisor) => {
      // enumerate graphs
      let queryParams = "";
      if (config["graphs"]) {
        if (!(config["graphs"] instanceof Array) || config["graphs"].length < 1)
          SQRError(1991, `Step[type='download-file']/graphs needs to be a list.`);

        const asTriple = (url: string | undefined) => `<${url}>`;

        const graphs: string[] = config["graphs"];
        queryParams = `?context=${encodeURIComponent(asTriple(graphs.pop()))}`;
        for (const g of graphs) {
          queryParams += `&context=${encodeURIComponent(asTriple(g))}`;
        }
      }

      const formats = [
        // extension, register mime, graphdb mime, serdi
        [".nq", "application/n-quads", "text/x-nquads", "NQuads", "NQUADS"],
        [".nt", "application/n-triples", "text/rdf+n3", "NTriples", "NTRIPLES"],
        [".trig", "application/trig", "application/x-trig", "TriG", "TRIG"],
        [".ttl", "text/turtle", "text/turtle", "Turtle", "TURTLE"],
        [".xml", "application/rdf+xml", "application/rdf+xml", null, "RDFXML"],
      ];

      let prefFormat: any = formats.find(([_, mime, ...__]) => mime === config["format"]);
      if (!prefFormat)
        prefFormat = formats.find(([ext, ...__]) => ext === path.parse(config.url[0]).ext);
      if (!prefFormat) SQRError(3218, `Step[type='download-file']: supply '/format'.`);

      return {
        start: async () => {
          const result = await fetch(app.endpoint + queryParams, {
            headers: { Accept: prefFormat[2] },
          });
          for (const url of config.url) {
            // await fs.writeFile(url, await result.text(), { flag: "w" });
            await new Promise<void>((resolve, reject) => {
              const target = fs.createWriteStream(url);
              result.body.pipe(target);
              result.body.on("end", resolve);
              result.body.on("error", reject);
              target.on("end", resolve);
              target.on("error", reject);
            });
            SQRInfo(`\t\tCreated:\t${url}`);
          }
        },
        postProcess: async () => {
          if (!(await commandExists("riot"))) return;
          for (const url of config.url) {
            const temp = path.join(app.tempdir, randomUUID() + prefFormat[0]);
            await exec(`mv ${url} ${temp}`);
            await exec(
              `riot --nocheck --quiet --syntax=${prefFormat[4]} --formatted=${prefFormat[4]} ${temp} > ${url}`
            );
          }
        },
      };
    };
  }
}
