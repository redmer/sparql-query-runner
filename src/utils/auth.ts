import * as process from "node:process";
import type { ICredential } from "../config/types";
import { substitute } from "./compile-envvars.js";

const name = "utils/auth";

export class AuthTypeError extends Error {}
export class AuthValueError extends Error {}

/** { username, password } as an object */
export function usernamePasswordDict(data: ICredential): {
  username: string;
  password: string;
} {
  if (data.type !== "Basic")
    throw new AuthTypeError(`${name}: Authentication type '${data.type}' not supported here`);

  return {
    username: substitute(data.username, process.env),
    password: substitute(data.password, process.env),
  };
}

/** Concatenate username and password with a colon. */
export function httpSyntax(data: ICredential): string {
  if (data === undefined) return undefined;
  const { username, password } = usernamePasswordDict(data);
  return `${username}:${password}`;
}

/** Returns auth details ready for usage as an HTTP header */
export function asHeader(data: ICredential): { Authorization?: string } {
  if (data === undefined || data === null) return {};

  if (data.type === "Basic")
    return {
      Authorization: `Basic ${encodeB64(httpSyntax(data))}`,
    };

  if (data.type === "Bearer") {
    const token = substitute(data.token, process.env);

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  throw new AuthTypeError(`Authentication type '${JSON.stringify(data)}' not supported here`);
}

/** Base64 encode */
export function encodeB64(value: string): string {
  return Buffer.from(value).toString("base64");
}
