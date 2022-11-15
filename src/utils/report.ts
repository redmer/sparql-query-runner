import chalk from "chalk";
import { noop } from "lodash";

export namespace Report {
  function reportFormat(type: "info" | "error" | "warning", message: string) {
    const color = { info: chalk.bgBlue, error: chalk.bgRed, warning: chalk.bgYellow }[type];
    return color(` ${type.toUpperCase()}: `) + message;
  }

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
   * @param end Optionally, replace the newline at the end of the message.
   */
  export function print(type: PrintTypes = "info", message: string): void {
    // What is the writing function
    typeof message == "string" ? pipe(type)(reportFormat(type, message)) : noop();
  }

  export function done(original: string) {
    const line = original.replace("\r", "");
    console.info(line + chalk.bgGreen(` DONE `));
  }
}
