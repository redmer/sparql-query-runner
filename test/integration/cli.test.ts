import { describe, expect, test } from "@jest/globals";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseRdfFile } from "../helpers/rdf.js";
import { withTempDir } from "../helpers/tempdir.js";

const CLI_ENTRY = path.resolve("dist/cli/cli.js");

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Run the CLI binary as a child process. We drive `dist/cli/cli.js` (built by
 * `npm run build`) directly so we don't need to spin up ts-jest ESM tooling
 * inside the child, and so we exercise the exact code path a user would.
 */
async function runCli(args: string[], cwd: string): Promise<CliResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_ENTRY, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => (stdout += String(chunk)));
    child.stderr?.on("data", (chunk: Buffer) => (stderr += String(chunk)));
    child.on("error", reject);
    child.on("close", (code: number | null) =>
      resolve({ code, stdout, stderr })
    );
  });
}

describe("CLI (dist/cli/cli.js)", () => {
  // Guard: the build must have been produced before running these tests.
  test("dist/cli/cli.js exists (run `npm run build` first)", async () => {
    await expect(fs.stat(CLI_ENTRY)).resolves.toMatchObject({});
  });

  test("`new` writes a scaffold workflow file to the chosen output path", async () => {
    await withTempDir("cli-new", async (dir) => {
      const outPath = path.join(dir, "scaffold.sqr.yaml");
      const res = await runCli(["new", "-o", outPath], dir);
      expect(res.code).toBe(0);

      const contents = await fs.readFile(outPath, "utf-8");
      expect(contents).toContain("version: v5");
      expect(contents).toContain("jobs:");
    });
  }, 30_000);

  test("`clear-cache -f` succeeds even when no cache directory exists", async () => {
    await withTempDir("cli-clear-cache", async (dir) => {
      const res = await runCli(["clear-cache", "-f"], dir);
      // With --force, missing dirs are non-fatal.
      expect(res.code).toBe(0);
    });
  }, 30_000);

  test("`run -i <workflow>` executes a local workflow and produces the expected output file", async () => {
    await withTempDir("cli-run", async (dir) => {
      const workflowPath = path.join(dir, "workflow.sqr.yaml");
      const outPath = path.join(dir, "out.nq");
      const peoplePath = path.resolve("test/fixtures/data/people.ttl");

      const workflow = [
        "version: v5",
        "prefixes:",
        "  schema: http://schema.org/",
        "jobs:",
        "  cli-job:",
        "    sources:",
        `      - file: ${peoplePath}`,
        "    targets:",
        `      - file: ${outPath}`,
        "",
      ].join("\n");
      await fs.writeFile(workflowPath, workflow, "utf-8");

      const res = await runCli(["run", "-i", workflowPath], dir);
      expect(res.code).toBe(0);

      const quads = await parseRdfFile(outPath);
      const names = quads
        .filter((q) => q.predicate.value === "http://schema.org/name")
        .map((q) => q.object.value)
        .sort();
      expect(names).toEqual(expect.arrayContaining(["Alice", "Bob"]));
    });
  }, 60_000);
});
