/**
 * This pipeline cache is currently non-functional.
 */
import { createHash } from "crypto";
import fs from "fs/promises";
import { ICliOptions } from "../config";
import { IConfiguration } from "../config/types";

interface Options {
  configurationDir: string;
}

interface Manifest {
  version: string;
}

/** PipelineCache is responsible for saving step output, checking modifications per pipeline, per step */
export namespace PipelineCache {
  export function enabled(data: ICliOptions) {
    return data.cacheIntermediateResults;
  }

  export function hash(data: any) {
    return createHash("sha256", { encoding: "utf-8" }).update(JSON.stringify(data)).digest("hex");
  }

  export async function cacheManifest(): Promise<Manifest> {
    const rawdata = await fs.readFile(`${PipelineCacheDirectory.path}/manifest.json`, {
      encoding: "utf-8",
    });
    return JSON.parse(rawdata);
  }

  export async function hashInCache(data: any) {
    return cacheManifest();
  }

  export function hasConfigurationChanged() {}

  export async function foo(data: IConfiguration, data2: ICliOptions, options?: Options) {
    if (!enabled(data2)) return;

    console.error("PipelineCache not implemented");
  }
}

export namespace PipelineCacheDirectory {
  export const path = ".cache/sparql-query-runner";

  /** Create new, empty cache directory */
  export async function create(configDir: string) {
    await fs.mkdir(path, { recursive: true });
  }

  /** Clear cache directory */
  export async function clear(options: ICliOptions) {
    await fs.rm(path, { recursive: true, force: true });
  }
}
