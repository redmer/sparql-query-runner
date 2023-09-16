import { digest } from "./digest.js";

export const BASE_TEMPDIR = `.cache/sparql-query-runner`;

export type CacheLayerSource = { grp: "source"; typ: string; dep: string[] };
export type CacheLayerStep = {
  grp: "step";
  typ: string;
  dep: (string | CacheLayerSource | CacheLayerStep)[];
};
export type CacheLayerTarget = { grp: "target"; typ: string; dep: (string | CacheLayerStep)[] };
export type CacheLayerJob = { grp: "job"; typ: string; dep: (string | CacheLayerJob)[] };
export type CacheLayerConfig = { grp: "config"; typ: string; dep: (string | CacheLayerJob)[] };
export type CacheLayer =
  | CacheLayerSource
  | CacheLayerStep
  | CacheLayerTarget
  | CacheLayerJob
  | CacheLayerConfig;

export function recursiveInputDigest(layer: CacheLayer, depth: number): [number, string] {
  for (const dependency of layer.dep) {
    if (typeof dependency === "string") return [depth, digest(dependency)];
    if (typeof dependency === "object") return recursiveInputDigest(dependency, depth + 1);
  }
}

/** The file or folder identifier for a cache layer */
export function layerIdentifier(layer: CacheLayer): string {
  const blurb = layer.typ; // `sparql`, `file`, `job`, ...
  const [depth, hash] = recursiveInputDigest(layer, 1); // `select * where`, `./add-names.ru`, `repository/dataset`, `kg`:
  return `${depth}-${blurb}-sha256-${hash}`;
}

type CachePathForLayerArgs = { job: CacheLayerJob; layer: CacheLayer };
/** Return the folder where the layer should save */
export function cachePathForLayer({ job, layer }: CachePathForLayerArgs): string {
  return `${BASE_TEMPDIR}/${layerIdentifier(job)}/${layerIdentifier(layer)}`;
}
