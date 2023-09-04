import { createHash } from "crypto";

/** Calculate digest (hash) of any string */
export function digest(data: string, algorithm = "SHA-256"): string {
  return createHash(algorithm).update(data, "utf-8").digest("base64");
}
