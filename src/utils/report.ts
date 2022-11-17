import chalk from "chalk";
import lodash from "lodash";
const { noop } = lodash;

export namespace Report {
  function reportFormat(type: "info" | "error" | "warning", message: string) {
    const color = { info: chalk.bgBlue, error: chalk.bgRed, warning: chalk.bgYellowBright }[type];
    const [lpad, rpad] = { info: [0, 3], error: [0, 2], warning: [0, 0] }[type];
    return color(" ".repeat(lpad) + ` ${type.toUpperCase()} ` + " ".repeat(rpad)) + " " + message;
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
  export function print(type: "error", message: string): never;
  export function print(type: PrintTypes, message: string): void;
  export function print(type: PrintTypes = "info", message: string): void {
    // What is the writing function
    typeof message == "string" ? pipe(type)(reportFormat(type, message)) : noop();
    if (type === "error") process.exit(-1);
  }

  export function done(original: string) {
    const line = original.replace("\r", "");
    console.info(line + chalk.bgGreen(` DONE `));
  }
}
