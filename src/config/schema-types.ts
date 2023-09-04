export const JobSourceTypes = ["file", "laces", "msaccess", "sparql", "triplydb"] as const;
export const JobStepTypes = ["construct", "shacl", "shell", "update"] as const;
export const JobTargetTypes = [
  "file",
  "laces",
  "sparql-graph-store",
  "sparql-quad-store",
  "sparql",
  "triplydb",
] as const;
