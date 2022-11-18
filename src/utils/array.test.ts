import { ge1 } from "./array";

test("oneOrMore", () => {
  const inputSingle = "hello";
  const inputSingleArray = ["hello"];
  const inputMultipleArray = ["hello", "world"];

  expect(ge1(inputSingle)).toEqual(inputSingleArray);
  expect(ge1(inputSingleArray)).toEqual(inputSingleArray);
  expect(ge1(inputMultipleArray)).toEqual(inputMultipleArray);
  expect(ge1(undefined)).toBeUndefined();
});
