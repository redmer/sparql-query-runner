import type { IAuthentication } from "../config/types";
import { Auth } from "./authentication";

describe("Auth helpers", () => {
  const user_env = "AUTH_USERNAME";
  const password_env = "AUTH_PASSWORD";
  const token_env = "AUTH_TOKEN";

  const user_value = "user@example.org";
  const password_value = "sekret";
  const token_value = "my-secret-token";

  const basicData: IAuthentication = {
    type: "Basic",
    user_env: user_env,
    password_env: password_env,
  };
  const tokenData: IAuthentication = {
    type: "Bearer",
    token_env: token_env,
  };

  test("usernamePasswordDict", () => {
    process.env[user_env] = user_value;
    process.env[password_env] = password_value;
    process.env[token_env] = token_value;

    const answer = { username: user_value, password: password_value };

    expect(Auth.usernamePasswordDict(basicData)).toEqual(answer);
    expect(() => Auth.usernamePasswordDict(tokenData)).toThrow();
    expect(() =>
      Auth.usernamePasswordDict({
        type: "Basic",
        user_env: "not-existing",
        password_env: "unexisting",
      })
    ).toThrow();
  });

  test("addToUrl", () => {
    process.env[user_env] = user_value;
    process.env[password_env] = password_value;
    process.env[token_env] = token_value;

    const baseUrl = `https://example.org/sparql`;
    const authenticatedUrl = `https://${encodeURIComponent(
      user_value
    )}:${password_value}@example.org/sparql`;

    expect(Auth.addToUrl(baseUrl, basicData)).toEqual(authenticatedUrl);
    expect(() => Auth.addToUrl(baseUrl, tokenData)).toThrow();
  });
});
