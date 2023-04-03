import fs from "fs";
import { default as fetch } from "node-fetch";
import path from "path";
import type { ICredential } from "../config/types";
import * as Auth from "./auth.js";

/** Extract basename from a filepath or a external URL */
export function basename(url: string) {
  const segments = new URL(url, "http://example.org").pathname.split("/");
  return segments.pop() || segments.pop();
}

/** Download a remote file, with optional auth headers to path */
export async function download(url: string, path: string, auth?: ICredential) {
  // Syntax: { ...null } => { }
  const auhorizationHeader = auth ? Auth.asHeader(auth) : null;
  const response = await fetch(url, { method: "GET", headers: { ...auhorizationHeader } });
  const stream = fs.createWriteStream(path);

  await new Promise((resolve, reject) => {
    response.body?.pipe(stream) ?? reject();
    response.body?.on("error", reject) ?? reject();
    stream.on("finish", resolve);
  });
}

export type IFetchContentOptions = {
  cachedir?: string;
  auth?: ICredential;
  encoding?: BufferEncoding;
};

export async function fetchContent(
  path_url: string,
  { cachedir, auth, encoding }: IFetchContentOptions
) {
  if (!path_url.startsWith("http")) return fs.readFileSync(path_url, { encoding });

  const response = await fetch(path_url, { method: "GET", headers: Auth.asHeader(auth) });
  const contents = await response.text();
  fs.writeFileSync(path.join(cachedir, basename(path_url)), contents);
  return contents;
}

export async function streamContent(
  path_url: string,
  { cachedir, auth, encoding }: IFetchContentOptions
) {
  if (!path_url.startsWith("http")) return fs.readFileSync(path_url, { encoding });

  const response = await fetch(path_url, { method: "GET", headers: Auth.asHeader(auth) });
  const contents = await response.text();
  fs.writeFileSync(path.join(cachedir, basename(path_url)), contents);
  return contents;
}
