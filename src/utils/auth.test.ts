import type {
  IAuthBasicData,
  IAuthBearerData,
  IAuthHeaderData,
  ICredentialData,
} from "../config/types.js";
import { AuthTypeError, asHeader } from "./auth.js";
test("add credentials to header", () => {
  const basicCreds: IAuthBasicData = { type: "Basic", username: "hello", password: "world" };
  const basicData = { Authorization: "Basic aGVsbG86d29ybGQ=" };
  const bearerCreds: IAuthBearerData = { type: "Bearer", token: "helloworld" };
  const bearerData = { Authorization: "Bearer helloworld" };

  const headerCreds: IAuthHeaderData = { type: "HTTP-Header", headers: { "X-Hello": "world" } };
  const headerData = { "X-Hello": "world" };

  expect(asHeader(basicCreds)).toEqual(basicData);
  expect(asHeader(bearerCreds)).toEqual(bearerData);
  expect(asHeader(headerCreds)).toEqual(headerData);

  expect(asHeader(undefined)).toEqual({});
  expect(asHeader(null)).toEqual({});
  expect(() => asHeader({ type: "Unknown" } as unknown as ICredentialData)).toThrow(AuthTypeError);
});
