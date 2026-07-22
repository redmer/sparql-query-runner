import chalk from "chalk";
import { stderr, stdout } from "process";

export const DONE = chalk.bgGreen(` DONE `);
export const INFO = chalk.bgBlue(` INFO `) + " ";
export const ERROR = chalk.bgRed(` ERROR `) + " ";

type MessageLevels = "debug" | "info" | "warning" | "error";

/**
 * Custom error subclass thrown by the `error` reporter. Callers (the CLI
 * entry-point) can catch this and translate it into a `process.exit(-1)`,
 * while tests can catch it as a normal exception without tearing down the
 * whole Jest worker.
 */
export class FatalReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalReportError";
  }
}

export function consoleMessage(
  type: MessageLevels,
  caller: string,
  depth: number,
  fatal: true
): (message: string) => never;
export function consoleMessage(
  type: MessageLevels,
  caller: string,
  depth: number,
  fatal: false
): (message: string) => void;
export function consoleMessage(
  type: MessageLevels,
  caller: string,
  depth: number,
  fatal: boolean
): (message: string) => void;
export function consoleMessage(
  type: MessageLevels,
  caller: string,
  depth = 0,
  fatal: boolean
) {
  let indent = " ".repeat(depth * 2);
  if (indent) indent += "";

  const flag =
    type == "warning"
      ? fatal
        ? chalk.bgRed(` Warning `) + `: `
        : chalk.bgYellowBright(` Warning `) + `: `
      : type == "error"
      ? chalk.bgRed(` Error `) + `: `
      : type == "debug"
      ? chalk.bgBlue(` Debug `) + `: `
      : ``;

  // const which = type == "warning" ? "warn" : type;
  const which = ["debug", "info"].includes(type) ? stdout : stderr;

  /*
· jobs/my-db - Starting job
·· steps/shell - WARNING: shell scripts not allowed (curl)
·· steps/shell - ERROR: shell scripts not allowed (curl)
*/
  return (message: string) => {
    if (message.trim().length)
      which.write(`${indent}${caller} - ${flag}${message}\n`);
    else which.write(`${indent}${caller}${message}\r`);
    if (fatal) {
      // Throw a typed error rather than calling `process.exit(-1)` directly.
      //
      // Reasons:
      //   * Under Jest (esp. with `--experimental-vm-modules`) calling
      //     `process.exit` from inside a test synchronously tears down the
      //     VM realm while other async imports are still in flight, producing
      //     the “trying to import a file after the Jest environment has been
      //     torn down” + “process.exit called with -1” cascade we see on CI.
      //   * The CLI entry-point (`src/cli/cli.ts`) already installs an
      //     `uncaughtException` handler that maps this to an exit code, so
      //     production behaviour is preserved.
      throw new FatalReportError(`${caller}: ${message}`);
    }
  };
}

export const debugMsg = (caller: string, depth = 0) =>
  consoleMessage("debug", caller, depth, false);
export const infoMsg = (caller: string, depth = 0) =>
  consoleMessage("info", caller, depth, false);
export const warningMsg = (
  caller: string,
  depth = 0,
  { fatal }: { fatal: boolean }
) => consoleMessage("warning", caller, depth, fatal);
export const errorMsg = (caller: string, depth = 0) =>
  consoleMessage("error", caller, depth, true);
export const ctxMsgs = (
  caller: string,
  depth = 0,
  { fatal }: { fatal: boolean }
) => {
  return {
    error: errorMsg(caller, depth),
    info: infoMsg(caller, depth),
    warning: warningMsg(caller, depth, { fatal }),
    debug: debugMsg(caller, depth),
  };
};

export const Bye = (message: string) => {
  stdout.write(ERROR + message + "\n");
  process.exit(1);
};
export const Done = (message: string) => stdout.write(DONE + message + "\n");
