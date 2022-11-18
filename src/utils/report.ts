import chalk from "chalk";
import lodash from "lodash";
const { noop } = lodash;

let GROUP_INDENT = 0;

export namespace Report {
  function reportFormat(type: "info" | "error" | "warning", message: string) {
    const color = { info: chalk.bgBlue, error: chalk.bgRed, warning: chalk.bgYellowBright }[type];
    const [lpad, rpad] = { info: [0, 3], error: [0, 2], warning: [0, 0] }[type];
    return color(" ".repeat(lpad) + ` ${type.toUpperCase()} ` + " ".repeat(rpad)) + " " + message;
  }

  /** @deprecated */
  function pipe(type: "error" | "info" | "warning" | string): typeof console.error {
    if (type == "error") return console.error;
    if (type == "warning") return console.warn;
    return console.info;
  }

  type PrintTypes = "info" | "warning" | "error";

  /**
   * Print a message to stdout or stderr
   * @param type Enter a report level (start / end) or the warning level
   * @param message The message (type will be prefixed). If left out, print() will just write `end`.
   *
   * @deprecated
   */
  export function print(type: "error", message: string): never;
  export function print(type: PrintTypes, message: string): void;
  export function print(type: PrintTypes = "info", message: string): void {
    // What is the writing function
    typeof message == "string" ? pipe(type)(reportFormat(type, message)) : noop();
    if (type === "error") process.exit(-1);
  }

  export const log = (msg: string) => nl_id_stdout(reportFormat("info", msg));
  export const info = (msg: string) => nl_id_stdout(reportFormat("info", msg));
  export const warning = (msg: string) => nl_id_stdout(reportFormat("warning", msg));
  export const error = (msg: string): never => nl_id_stderr(reportFormat("error", msg));

  export function start(msg: string) {
    nl_id_stdout(msg);
  }

  export function success(msg: string): void {
    process.stdout.write("\r" + " ".repeat(GROUP_INDENT) + msg + chalk.bgGreen(` DONE `));
  }

  export function fail(msg: string): void {
    process.stderr.write("\r" + " ".repeat(GROUP_INDENT) + msg + chalk.bgRedBright(` FAILED `));
  }

  /** Raise indentation to indicate a new report group */
  export function group(label: string): void {
    nl_id_stdout(label);
    GROUP_INDENT += 2;
  }

  /** Decrease report indentation to indicate a the end of a group */
  export function groupEnd(): void {
    GROUP_INDENT -= 2;
    if (GROUP_INDENT < 0) GROUP_INDENT = 0;
  }

  /** Put message on stdout */
  function nl_id_stdout(msg: string): void {
    process.stdout.write("\n" + " ".repeat(GROUP_INDENT) + msg);
  }

  /** Put message on stderr */
  function nl_id_stderr(msg: string): never {
    process.stderr.write("\n" + " ".repeat(GROUP_INDENT) + msg);
    process.exit(-1);
  }
}
