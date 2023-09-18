export const JobSourceTypes = ["file", "sparql"] as const;
export const JobStepTypes = ["construct", "shacl", "shell", "update"] as const;
export const JobTargetTypes = [
  "file",
  "laces-hub",
  "sparql-graph-store",
  "sparql-quad-store",
  "sparql",
  "triplydb",
] as const;
