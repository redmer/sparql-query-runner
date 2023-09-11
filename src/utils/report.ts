import chalk from "chalk";

export const DONE = chalk.bgGreen(` DONE `);
export const INFO = chalk.bgBlue(` INFO `) + " ";
export const ERROR = chalk.bgRed(` ERROR `) + " ";

export function consoleMessage(type: "info" | "warning" | "error", caller: string, depth = 0) {
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
  return (message: string) => console[type](`${indent} ${caller} - ${flag}${message}`);
}

export const infoMsg = (caller: string, depth = 0) => consoleMessage("info", caller, depth);
export const warningMsg = (caller: string, depth = 0) => consoleMessage("warning", caller, depth);
export const errorMsg = (caller: string, depth = 0) => consoleMessage("error", caller, depth);
