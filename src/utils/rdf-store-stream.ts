import type * as RDF from "@rdfjs/types";
import { storeStream } from "rdf-store-stream";

export async function storeFromResultStream(
  stream: RDF.ResultStream<RDF.Quad>
): Promise<RDF.Store> {
  return storeStream(stream);
}
