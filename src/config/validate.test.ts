/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  configFromString,
  ConfigurationError,
  expandCURIE,
} from "./validate.js";

const emptySecrets = {};

async function parse(yaml: string, defaultPrefixes = false) {
  return await configFromString(yaml, {
    secrets: emptySecrets,
    defaultPrefixes,
  });
}

describe("configFromString()", () => {
  test("rejects missing version", async () => {
    await expect(
      parse(`
jobs:
  x:
    sources: []
`)
    ).rejects.toThrow(ConfigurationError);
  });

  test("rejects non-v5 version", async () => {
    await expect(
      parse(`
version: v4
jobs:
  x:
    sources: []
`)
    ).rejects.toThrow(/v5/);
  });

  test("accepts a v5 config with a single job", async () => {
    const config = await parse(`
version: v5
prefixes:
  ex: http://example.org/
jobs:
  demo:
    sources:
      - file: ./input.ttl
    steps: []
    targets:
      - file: ./output.ttl
`);
    expect(config.version).toBe("v5");
    expect(config.prefixes).toEqual({ ex: "http://example.org/" });
    expect(config.jobs).toHaveLength(1);
    const [job] = config.jobs;
    expect(job.name).toBe("demo");
    expect(job.independent).toBe(false);
    expect(job.sources).toHaveLength(1);
    expect(job.sources![0].type).toBe("sources/file");
    expect(job.sources![0].access).toBe("./input.ttl");
    expect(job.targets![0].type).toBe("targets/file");
  });

  test("throws when 'jobs' key is missing", async () => {
    await expect(parse(`version: v5`)).rejects.toThrow(/Jobs/);
  });

  test("throws when a module type cannot be inferred and no 'type' is set", async () => {
    await expect(
      parse(`
version: v5
jobs:
  demo:
    sources:
      - foo: bar
        baz: qux
`)
    ).rejects.toThrow(/could not infer type/);
  });

  test("passes through explicit 'type' when no shorthand applies", async () => {
    const config = await parse(`
version: v5
jobs:
  demo:
    sources:
      - type: sources/file
        access: ./input.ttl
`);
    expect(config.jobs[0].sources![0].type).toBe("sources/file");
    expect(config.jobs[0].sources![0].access).toBe("./input.ttl");
  });

  test("substitutes environment variables via secrets", async () => {
    const yaml = `
version: v5
jobs:
  demo:
    sources:
      - file: \${FILE_PATH}
`;
    const config = await configFromString(yaml, {
      secrets: { FILE_PATH: "./from-env.ttl" },
      defaultPrefixes: false,
    });
    expect(config.jobs[0].sources![0].access).toBe("./from-env.ttl");
  });

  test("adds default prefixes when defaultPrefixes=true", async () => {
    const config = await parse(
      `
version: v5
jobs:
  demo:
    sources: []
`,
      true
    );
    // The rdfa11 context includes common vocabs like rdf, rdfs, owl, xsd, ...
    expect(config.prefixes).toHaveProperty("rdf");
    expect(config.prefixes).toHaveProperty("xsd");
  });

  test("omits default prefixes when defaultPrefixes=false", async () => {
    const config = await parse(
      `
version: v5
prefixes:
  ex: http://example.org/
jobs:
  demo:
    sources: []
`,
      false
    );
    expect(config.prefixes).toEqual({ ex: "http://example.org/" });
  });

  test("validates Basic auth credentials on a module", async () => {
    const config = await parse(`
version: v5
jobs:
  demo:
    sources:
      - file: ./x.ttl
        with:
          credentials:
            username: alice
            password: secret
`);
    expect(config.jobs[0].sources![0].with.credentials).toEqual({
      type: "Basic",
      username: "alice",
      password: "secret",
    });
  });

  test("validates Bearer auth credentials on a module", async () => {
    const config = await parse(`
version: v5
jobs:
  demo:
    sources:
      - file: ./x.ttl
        with:
          credentials:
            token: abc123
`);
    expect(config.jobs[0].sources![0].with.credentials).toEqual({
      type: "Bearer",
      token: "abc123",
    });
  });

  test("rejects unknown credentials shape", async () => {
    await expect(
      parse(`
version: v5
jobs:
  demo:
    sources:
      - file: ./x.ttl
        with:
          credentials:
            oddball: value
`)
    ).rejects.toThrow(/authentication type/);
  });
});

describe("expandCURIE()", () => {
  const prefixes = {
    ex: "http://example.org/",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  };

  test("expands a known CURIE", () => {
    expect(expandCURIE("ex:foo", prefixes)).toBe("http://example.org/foo");
  });

  test("returns the input unchanged for an unknown prefix", () => {
    expect(expandCURIE("unknown:foo", prefixes)).toBe("unknown:foo");
  });

  test("returns full IRIs untouched", () => {
    expect(expandCURIE("http://example.org/bar", prefixes)).toBe(
      "http://example.org/bar"
    );
  });
});
