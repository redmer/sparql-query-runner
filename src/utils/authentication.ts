import { IAuthentication } from "../config/types";
import process from "process";

export function authAsDictionary(data: IAuthentication) {
  if (data.type !== "Basic")
    throw new Error(`authentication type '${data.type}' not supported here`);

  return {
    username: process.env[data.user_env],
    password: process.env[data.password_env],
  };
}

export function addAuthToUrl(url: string, data: IAuthentication) {
  // We need to insert Basic authentication between URL schema and rest...
  // Source: <https://comunica.dev/docs/query/advanced/basic_auth/>
  const newUrl = new URL(url);
  const { username, password } = authAsDictionary(data);
  [newUrl.username, newUrl.password] = [username, password];
  return newUrl.href;
}

export function authAsContext(data: IAuthentication) {
  if (data.type !== "Basic")
    throw new Error(`authentication type '${data.type}' not supported here`);

  const username = process.env[data.user_env];
  const password = process.env[data.password_env];

  return `${username}:${password}`;
}

export function authenticationAsHeader(data: IAuthentication) {
  if (data.type === "Bearer") {
    const token = process.env[data.token_env];
    return {
      Authorization: `${data.type} ${token}`,
    };
  }

  if (data.type === "Basic") {
    const encoded = Buffer.from(authAsContext(data)).toString("base64");
    return {
      Authorization: `${data.type} ${encoded}`,
    };
  }

  // Other authorization tokens in the Auth header are custom
  if (data.type === "custom-value") {
    const token = process.env[data.token_env];
    return {
      Authorization: token,
    };
  }

  throw new Error(`authentication type '${data.type}' not supported`);
}
