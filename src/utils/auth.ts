import type { ICredentialData } from "../config/types.js";

export class AuthTypeError extends Error {}

/** Returns auth details ready for usage as an HTTP header */
export function asHeader(data: ICredentialData): { Authorization?: string } {
  if (data === undefined || data === null) return {};

  if (data.type === "Basic")
    return {
      Authorization: `Basic ${encodeB64(data.username + ":" + data.password)}`,
    };

  if (data.type === "Bearer") {
    return {
      Authorization: `Bearer ${data.token}`,
    };
  }

  if (data.type === "HTTP-Header") {
    return {
      ...data.headers,
    };
  }

  throw new AuthTypeError(`Authentication type '${JSON.stringify(data)}' not supported here`);
}

/** Base64 encode */
export function encodeB64(value: string): string {
  return Buffer.from(value).toString("base64");
}
