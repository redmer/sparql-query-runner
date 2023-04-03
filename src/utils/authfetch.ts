import type { RequestInfo, RequestInit, Response } from "node-fetch";
import fetch, { Request } from "node-fetch";
import { encodeB64 } from "./auth.js";

/** fetch() replacement that rewrites in-URL auth */
export function authfetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
  const result = headerFromRequest(url);
  if (!result) return fetch(url, init);

  const [targetURL, authHeaderExtra] = result;
  if (authHeaderExtra) init.headers["Authorization"] = authHeaderExtra;

  return fetch(targetURL, init);
}

/** Extracts and outputs a Auth-Header from a fetch-RequestInfo. */
export function headerFromRequest(url: RequestInfo): [RequestInfo, string] {
  let parsed: URL;
  let context: Request;

  if (typeof url == "string") parsed = new URL(url);
  else if (typeof url == "object" && !url.headers.has("Authorization")) parsed = new URL(url.url);
  else return; // return if url.headers.has Authorization

  const { username, password } = parsed;
  if (!username || !password) return; // return if URL is unauthenticated

  // The Authorization header
  const header = `Basic ${encodeB64(
    decodeURIComponent(username) + ":" + decodeURIComponent(password)
  )}`;

  parsed.username = "";
  parsed.password = "";

  if (typeof url == "string") return [parsed.toString(), header];
  else if (typeof url == "object") return [new Request(parsed.toString(), context), header];
  else return;
}
