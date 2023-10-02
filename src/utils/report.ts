import chalk from "chalk";
import { stderr, stdout } from "process";

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
  let indent = " ".repeat(depth * 2);
  if (indent) indent += "";

  const flag =
    type == "warning"
      ? fatal
        ? chalk.bgRed(` Warning `) + `: `
        : chalk.bgYellowBright(` Warning `) + `: `
      : type == "error"
      ? chalk.bgRed(` Error `) + `: `
      : ``;

  // const which = type == "warning" ? "warn" : type;
  const which = type == "info" ? stdout : stderr;

  /*
· jobs/my-db - Starting job
·· steps/shell - WARNING: shell scripts not allowed (curl)
·· steps/shell - ERROR: shell scripts not allowed (curl)
*/
  return (message: string) => {
    if (message.trim().length) which.write(`${indent}${caller} - ${flag}${message}\n`);
    else which.write(`${indent}${caller}${message}\r`);
    if (fatal) process.exit(-1);
  };
}

export const infoMsg = (caller: string, depth = 0) => consoleMessage("info", caller, depth, false);
export const warningMsg = (caller: string, depth = 0, { fatal }: { fatal: boolean }) =>
  consoleMessage("warning", caller, depth, fatal);
export const errorMsg = (caller: string, depth = 0) => consoleMessage("error", caller, depth, true);
export const ctxMsgs = (caller: string, depth = 0, { fatal }: { fatal: boolean }) => {
  return {
    error: errorMsg(caller, depth),
    info: infoMsg(caller, depth),
    warning: warningMsg(caller, depth, { fatal }),
  };
};
