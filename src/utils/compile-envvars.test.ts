import { substituteVars } from "./compile-envvars.js";

test("substitute envvars", () => {
  const data = {
    DATABASE_ACCESS_TOKEN: "abc132",
  };
  const unknown = "${DATABASE_ENDPOINT}";
  const known = "${DATABASE_ACCESS_TOKEN}";
  const escaped = "\\${DATABASE_ACCESS_TOKEN}";

  expect(substituteVars(unknown, data)).toEqual(unknown);
  expect(substituteVars(known, data)).toEqual(data.DATABASE_ACCESS_TOKEN);
  expect(substituteVars(escaped, data)).toBe(escaped);
});
