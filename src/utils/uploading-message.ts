import type * as RDF from "@rdfjs/types";

/** A short helper function to print the right status msg */
export function InfoUploadingTo(
  printer: (message: string) => void,
  onlyGraphs: RDF.Quad_Graph[] | undefined,
  target: string
) {
  const quantifier = String(onlyGraphs?.length ?? "all");
  const quantified = onlyGraphs?.length == 1 ? "graph" : "graphs";

  printer(`Exporting ${quantifier} ${quantified} to <${target}>...`);
}
