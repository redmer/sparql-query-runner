// import { parseStream } from "@fast-csv/parse";
// import fetch from "node-fetch";
// import { Step, StepGetter } from ".";
// import { IStep } from "../config/types";
// import { PipelineWorker } from "../runner/pipeline-worker.js";
// import { error } from "../utils/errors.js";

// type GraphDbNamespaceRow = {
//   prefix: string;
//   namespace: string;
// };

// async function currentPrefixes(namespacesUrl: string): Promise<Record<string, string>> {
//   const currentPrefixesResp = await fetch(namespacesUrl, {
//     headers: { Accept: "text/csv" },
//   });

//   return new Promise((resolve, reject) => {
//     const prefixes: Record<string, string> = {};
//     parseStream(currentPrefixesResp.body, { headers: true })
//       .on("error", reject)
//       .on("data", (row: GraphDbNamespaceRow) => {
//         prefixes[row.prefix] = row.namespace;
//       })
//       .on("end", () => resolve(prefixes));
//   });
// }

// /** Set the list of known prefixes  */
// export default class SetPrefixes implements Step {
//   identifier = () => "set-prefixes";

//   async info(config: IStep): Promise<StepGetter> {
//     return async (app: PipelineWorker) => {
//       return {
//         preProcess: async () => {
//           // export quads to temp file
//         },
//         start: async () => {
//           if (config.url.length !== 1)
//             error(`Step[type='set-prefixes']/url count must be one`);
//           const repositoriesBase = config.url[0];

//           // get all current used prefixes
//           const currentPfxNs = await currentPrefixes(`${repositoriesBase}/namespaces`);

//           // delete all current used prefixes
//           for (const [p, __] of Object.entries(currentPfxNs)) {
//             await fetch(`${repositoriesBase}/namespaces/${p}`, { method: "DELETE" });
//           }

//           // then, re-add those from app.prefixes
//           for (const [p, ns] of Object.entries(app.prefixes)) {
//             await fetch(`${repositoriesBase}/namespaces/${p}`, { method: "PUT", body: ns });
//           }
//         },
//       };
//     };
//   }
// }
