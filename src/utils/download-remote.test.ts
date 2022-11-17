import { assert } from "console";
import { zip } from "lodash";
import { basename } from "./download-remote";

describe("download remote files", () => {
  test("basename", () => {
    const tests = ["https://example.org/sparql?q=test.exe", "file:///test.txt"];
    const answers = ["sparql", "test.txt"];

    for (const [t, a] of zip(tests, answers)) {
      assert(t);
      expect(basename(t)).toEqual(a);
    }
  });
});
