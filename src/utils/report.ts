import chalk from "chalk";

export const DONE = chalk.bgGreen(` DONE `);
export const INFO = chalk.bgBlue(` INFO `) + " ";
export const ERROR = chalk.bgRed(` ERROR `) + " ";

type MessageLevels = "info" | "warning" | "error";

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
export function consoleMessage(type: MessageLevels, caller: string, depth = 0, fatal: boolean) {
  const indent = "·".repeat(depth);
  const flag =
    type == "warning"
      ? chalk.bgYellow(`WARNING`) + `: `
      : type == "error"
      ? chalk.bgRed(`ERROR`) + `: `
      : ``;
  /*
· jobs/my-db - Starting job
·· steps/shell - WARNING: shell scripts not allowed (curl)
·· steps/shell - ERROR: shell scripts not allowed (curl)
*/
  return (message: string) => {
    console[type](`${indent} ${caller} - ${flag}${message}`);
    if (fatal) process.exit(-1);
  };
}

export const infoMsg = (caller: string, depth = 0) => consoleMessage("info", caller, depth, false);
export const warningMsg = (caller: string, depth = 0, { fatal }: { fatal: boolean }) =>
  consoleMessage("warning", caller, depth, fatal);
export const errorMsg = (caller: string, depth = 0) => consoleMessage("error", caller, depth, true);
