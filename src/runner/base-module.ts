/** Base for a workflow module */

import fss from "fs";
import fs from "fs/promises";
import fetch, { Response } from "node-fetch";
import path from "path";
import { digest } from "../utils/digest";
import { TEMPDIR } from "./pipeline-worker";

export class BaseModule<T> implements ICacheableModule {
  data: T;
  #dependents: string[];

  /** Initialize the class with data it can handle (Called after +isQualified) */
  constructor(data: T) {
    this.data = data;
  }

  async locateFile(url_or_path: string) {
    if (!url_or_path.startsWith("http")) {
      this.addCacheDependent({ type: "path", value: url_or_path });
      return url_or_path;
    }
    const response = await fetch(url_or_path, { method: "GET" });
    const filename = this.addCacheDependent({ type: "url", value: url_or_path, response });
    const cachePath = path.join(TEMPDIR, "in-file", filename);
    fs.writeFile(cachePath, response.body);
    return cachePath;
  }

  async addCacheDependent({
    type,
    value,
    response,
  }: {
    type: CacheDependentType;
    value: string;
    response?: Response;
  }): Promise<string> {
    let digestable: string;

    if (type == "url" && response)
      digestable = response.headers.get("ETag") ?? response.headers.get("Last-Modified");
    else if (type == "path") digestable = fss.statSync(value).mtime.toISOString();
    else digestable = value;

    const key = `digest:${type}:${digest(digestable)}`;
    this.#dependents.push(key);
    return digest(digestable);
  }

  hash(): string {
    return digest(JSON.stringify(this.#dependents));
  }
}

export type CacheDependentType = "auto" | "url" | "path" | "contents";

export interface ICacheableModule {
  /**
   * Add a local file or remote file or file contents to the cache. If it changes,
   * the workflow should jettison the intermediate results of next steps.
   */
  addCacheDependent(info: { type: CacheDependentType; value: string }): void;

  /**
   * A value that changes when the inputs of this module change.
   * If the modules results are indeterminable, return null.
   */
  hash(): string | null;
}
