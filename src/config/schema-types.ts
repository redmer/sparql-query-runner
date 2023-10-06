export const PartShorthandSource = ["file", "sparql", "laces-hub", "triplydb"] as const;
export const PartShorthandStep = [
  "construct",
  "update",
  "assert",
  "shell",
  "shacl",
  "infer",
] as const;
export const PartShorthandTarget = [
  "file",
  "sparql-update-endpoint",
  "sparql-graph-store",
  "sparql-quad-store",
  "laces-hub",
  "triplydb",
] as const;
