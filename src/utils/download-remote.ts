import fs from "fs";
import fetch from "node-fetch";
import type { IAuthentication } from "../config/types";
import * as Auth from "./authentication.js";

/** Extract basename from a filepath or a external URL */
export function basename(url: string) {
  const segments = new URL(url, "http://example.org").pathname.split("/");
  return segments.pop() || segments.pop();
}

/** Download a remote file, with optional auth headers to path */
export async function download(url: string, path: string, auth?: IAuthentication) {
  const auhorizationHeader = auth ? Auth.asHeader(auth) : null;
  // I checked that: { ...null } => { }
  const response = await fetch(url, { method: "GET", headers: { ...auhorizationHeader } });
  const stream = fs.createWriteStream(path);

  await new Promise((resolve, reject) => {
    response.body?.pipe(stream) ?? reject();
    response.body?.on("error", reject) ?? reject();
    stream.on("finish", resolve);
  });
}
