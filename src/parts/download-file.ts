import { createWriteStream } from "fs";
import fs from "fs/promises";
import type { ReadableStream } from "node:stream/web";
import pathlib from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { IJobSourceData, type IJobStepData } from "../config/types.js";
import {
  JobRuntimeContext,
  type WorkflowModuleExec,
  type WorkflowPartStep,
} from "../runner/types.js";

/** Download a remote file to a local destination. */
export class HttpRequestStep implements WorkflowPartStep {
  id = () => "http-request-step";
  names = ["steps/download-file", "steps/http-request"];

  isQualified(data: IJobSourceData): boolean {
    if (data.access.match(/^https?:\/\//)) return true;
    return false;
  }

  exec(data: IJobStepData): WorkflowModuleExec {
    return async (context: JobRuntimeContext) => {
      const filename =
        data.with?.["destination"] ?? `${context.tempdir}/${pathlib.basename(data.access)}`;

      // body-file prevails over body
      let payload: Buffer;

      if (data.with?.["body"]) payload = Buffer.from(data.with["body"], "utf-8");
      if (data.with?.["body-file"]) payload = await fs.readFile(data.with["body-file"]);

      return {
        init: async () => {
          const response = await fetch(data.access, {
            method: data?.with?.["method"] ?? "GET",
            body: payload,
            headers: data?.with?.["headers"] ?? {},
          });

          if (response.ok && response.body != null) {
            const destination = pathlib.resolve(filename);
            const fileStream = createWriteStream(destination, { flags: "w" });
            await finished(
              Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(fileStream)
            );
          }
        },
      };
    };
  }
}
