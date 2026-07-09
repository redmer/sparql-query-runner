/**
 * Create an ephemeral temporary directory and remove it after the callback resolves.
 * Returns whatever the callback returns.
 */
export declare function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T>;
/** Synchronously ensure a directory exists (test helper). */
export declare function ensureDir(p: string): void;
