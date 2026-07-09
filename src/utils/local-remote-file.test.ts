import { fileExistsLocally, fileMightExistRemotely } from "./local-remote-file.js";

describe("fileExistsLocally()", () => {
  test("returns true for an existing file", () => {
    expect(fileExistsLocally("package.json")).toBe(true);
  });
  test("returns false for a nonexisting file", () => {
    expect(fileExistsLocally("nonexistent-file-xyzzy.txt")).toBe(false);
  });
});

describe("fileMightExistRemotely()", () => {
  test.each([
    ["http://example.org/x", true],
    ["https://example.org/x", true],
    ["ftp://example.org/x", false],
    ["./local.ttl", false],
    ["/tmp/local.ttl", false],
  ])("%s -> %s", (input, expected) => {
    expect(fileMightExistRemotely(input)).toBe(expected);
  });
});
