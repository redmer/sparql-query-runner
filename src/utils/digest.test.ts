import { digest } from "./digest.js";

describe("digest()", () => {
  test("is deterministic", () => {
    expect(digest("hello")).toEqual(digest("hello"));
  });

  test("changes with input", () => {
    expect(digest("hello")).not.toEqual(digest("world"));
  });

  test("defaults to sha256 (64-hex chars)", () => {
    expect(digest("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  test("supports alternate algorithms", () => {
    // md5 produces 32 hex chars
    expect(digest("x", "md5")).toMatch(/^[0-9a-f]{32}$/);
  });
});
