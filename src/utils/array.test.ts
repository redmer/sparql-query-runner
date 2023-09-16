import { ge1, notEmpty } from "./array.js";

test("oneOrMore", () => {
  const inputSingle = "hello";
  const inputSingleArray = ["hello"];
  const inputMultipleArray = ["hello", "world"];

  expect(ge1(inputSingle)).toEqual(inputSingleArray);
  expect(ge1(inputSingleArray)).toEqual(inputSingleArray);
  expect(ge1(inputMultipleArray)).toEqual(inputMultipleArray);
  expect(ge1(undefined)).toBeUndefined();
});

test("notEmpty", () => {
  const source0 = [];
  const source1 = [null, "null"];
  const source4 = [false, "false", undefined, "undefined", null, "null"];
  const source5 = [1, 2, 3, 4, undefined, 6];

  expect(source0.filter(notEmpty)).toHaveLength(0);
  expect(source1.filter(notEmpty)).toHaveLength(1);
  expect(source4.filter(notEmpty)).toHaveLength(4);
  expect(source5.filter(notEmpty)).toHaveLength(5);
});
