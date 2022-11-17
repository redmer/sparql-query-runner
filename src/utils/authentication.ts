import type { IAuthentication } from "../config/types";
import * as process from "node:process";

export namespace Auth {
  export class AuthTypeError extends Error {}
  export class AuthValueError extends Error {}

  export function usernamePasswordDict(data: IAuthentication): {
    username: string;
    password: string;
  } {
    if (data.type !== "Basic")
      throw new AuthTypeError(`authentication type '${data.type}' not supported here`);

    const { user_env, password_env } = data;
    const username = process.env[user_env];
    const password = process.env[password_env];

    if (!username || !password)
      throw new AuthValueError(
        `could not find environment variables '${user_env}' or '${password}'`
      );

    return {
      username,
      password,
    };
  }

  export function addToUrl(url: string, data?: IAuthentication): string {
    // We need to insert Basic authentication between URL schema and rest...
    // Source: <https://comunica.dev/docs/query/advanced/basic_auth/>
    if (!data) return url;
    const newUrl = new URL(url);
    const { username, password } = usernamePasswordDict(data);
    [newUrl.username, newUrl.password] = [username, password];
    return newUrl.href;
  }

  export function httpSyntax(data: IAuthentication): string {
    const { username, password } = usernamePasswordDict(data);
    return `${username}:${password}`;
  }

  export function asHeader(data: IAuthentication): { Authorization: string } {
    if (data.type === "Basic") {
      return {
        Authorization: `Basic ${encode(httpSyntax(data))}`,
      };
    }

    if (data.type === "Bearer") {
      const token = process.env[data.token_env];
      if (!token)
        throw new AuthValueError(`could not find environment variables '${data.token_env}'`);

      return {
        Authorization: `Bearer ${token}`,
      };
    }

    throw new AuthTypeError(`Authentication type '${JSON.stringify(data)}' not supported here`);
  }

  function encode(value: string): string {
    return Buffer.from(value).toString("base64");
  }
}
