import { oneOrMore } from "./array";

test("oneOrMore", () => {
  const inputSingle = "hello";
  const inputSingleArray = ["hello"];
  const inputMultipleArray = ["hello", "world"];

  expect(oneOrMore(inputSingle)).toEqual(inputSingleArray);
  expect(oneOrMore(inputSingleArray)).toEqual(inputSingleArray);
  expect(oneOrMore(inputMultipleArray)).toEqual(inputMultipleArray);
});
