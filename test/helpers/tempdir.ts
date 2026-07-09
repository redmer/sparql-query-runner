import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Create an ephemeral temporary directory and remove it after the callback resolves.
 * Returns whatever the callback returns.
 */
export async function withTempDir<T>(
  prefix: string,
  fn: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), `sqr-${prefix}-`));
  try {
    return await fn(dir);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

/** Synchronously ensure a directory exists (test helper). */
export function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}
