import { mkdtemp, readFile } from "fs/promises";
import { Parser, Quad, Store, Util } from "n3";
import { tmpdir } from "os";
import { graphsToFile } from "./quads";

const EX = Util.prefix("http://example.org/test/");

const DATA = `PREFIX : <${EX("").value}>
  :a :p :b .
  :g { :a :q :c . }
  :h { :b :p :c . }
`;

describe("quads export", () => {
  let baseStore: Store;
  let trigParser: Parser;
  let originalQuads: Quad[];
  let dir = "";

  beforeAll(async () => {
    baseStore = new Store();
    trigParser = new Parser({ format: "application/trig" });
    originalQuads = trigParser.parse(DATA);
    baseStore.addQuads(originalQuads);
    dir = await mkdtemp(`${tmpdir()}/sparql-query-runner-test-`);
    console.log(dir);
  });

  test("export all graphs (default) as TriG (default)", async () => {
    const firstFile = `${dir}/complete.trig`;
    await graphsToFile(baseStore, firstFile);
    const afterWriteQuads = trigParser.parse(await readFile(firstFile, { encoding: "utf-8" }));

    expect(originalQuads).toEqual(expect.arrayContaining(afterWriteQuads));
  });

  test("export only named graphs as TriG (default)", async () => {
    const secondFile = `${dir}/namedgraphs.trig`;
    await graphsToFile(baseStore, secondFile, [EX("g"), EX("h")]);

    const afterWriteQuads = trigParser.parse(await readFile(secondFile, { encoding: "utf-8" }));
    expect(afterWriteQuads.length).toEqual(2);
  });

  test("export all graphs as Turtle", async () => {
    const thirdfile = `${dir}/complete.ttl`;
    await graphsToFile(baseStore, thirdfile, undefined, { format: "text/turtle" });
    const turtleParser = new Parser({ format: "text/turtle" });

    const afterWriteQuads = turtleParser.parse(await readFile(thirdfile, { encoding: "utf-8" }));
    const turtleStore = new Store(afterWriteQuads);
    expect(turtleStore.countQuads(null, null, null, null)).toEqual(
      baseStore.countQuads(null, null, null, null)
    );
  });
});
