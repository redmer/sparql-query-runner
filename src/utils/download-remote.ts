import fetch from "node-fetch";
import { IAuthentication } from "../config/types";
import { authenticationAsHeader } from "./authentication";
import fs from "fs";

/** Extract basename from a filepath or a external URL */
export function basename(url: string) {
  const segments = new URL(url, "http://example.org").pathname.split("/");
  return segments.pop() || segments.pop();
}

/** Download a remote file, with optional auth headers to path */
export async function download(url: string, path: string, auth?: IAuthentication) {
  const auhorizationHeader = auth ? authenticationAsHeader(auth) : null;
  // I checked that: { ...null } => { }
  const response = await fetch(url, { headers: { ...auhorizationHeader } });
  const stream = fs.createWriteStream(path);

  await new Promise((resolve, reject) => {
    response.body.pipe(stream);
    response.body.on("error", reject);
    stream.on("finish", resolve);
  });
}
