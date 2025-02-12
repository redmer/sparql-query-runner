import type * as RDF from "@rdfjs/types";
import n3 from "n3";

export function convertStore(instore: RDF.Store): Promise<n3.Store> {
  const store = new n3.Store(undefined);
  return new Promise((resolve, reject) => {
    store
      .import(instore.match())
      .on("error", reject)
      .once("end", () => resolve(store));
  });
}
