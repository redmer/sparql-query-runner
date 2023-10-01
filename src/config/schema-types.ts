export const JobSourceTypes = ["file", "sparql", "laces-hub", "triplydb"] as const;
export const JobStepTypes = ["construct", "shacl", "shell", "update", "infer"] as const;
export const JobTargetTypes = [
  "file",
  "laces-hub",
  "sparql-graph-store",
  "sparql-quad-store",
  "sparql",
  "triplydb",
] as const;
