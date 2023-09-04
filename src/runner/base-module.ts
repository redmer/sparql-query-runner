/** Base for a workflow module */

import fss from "fs";
import fs from "fs/promises";
import fetch, { Response } from "node-fetch";
import path from "path";
import { digest } from "../utils/digest";
import { TEMPDIR } from "./job-supervisor";
import { CacheDependentType, ICacheableModule } from "./types";

export class BaseModule<T> implements ICacheableModule {
  data: T;
  #dependents: string[];

  /** Initialize the class with data it can handle (Called after +isQualified) */
  constructor(data: T) {
    this.data = data;
  }

  async locateFile(url_or_path: string) {
    if (!url_or_path.startsWith("http")) {
      this.addCacheInput({ type: "path", value: url_or_path });
      return url_or_path;
    }
    const response = await fetch(url_or_path, { method: "GET" });
    const filename = this.addCacheInput({ type: "url", value: url_or_path, response });
    const cachePath = path.join(TEMPDIR, "in-file", filename);
    fs.writeFile(cachePath, response.body);
    return cachePath;
  }

  /** Register that some file or url needs to stay the same to let this step remain cacheable. */
  addCacheInput({
    type,
    value,
    response,
  }: {
    type: CacheDependentType;
    value: string;
    response?: Response;
  }): string {
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
