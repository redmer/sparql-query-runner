export const PartShorthandSource = ["file", "sparql", "laces-hub", "triplydb"] as const;
export const PartShorthandStep = ["construct", "shacl", "shell", "update", "infer"] as const;
export const PartShorthandTarget = [
  "file",
  "laces-hub",
  "sparql-graph-store",
  "sparql-quad-store",
  "sparql-update-endpoint",
  "triplydb",
] as const;
