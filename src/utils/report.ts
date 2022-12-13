import chalk from "chalk";
import lodash from "lodash";
const { noop } = lodash;

export const FAIL = chalk.bgRedBright(` FAILED `);
export const DONE = chalk.bgGreen(` DONE `);

export const INFO = chalk.bgBlue(` INFO `);
export const ERROR = chalk.bgRed(` ERROR `);
export const WARNING = chalk.bgYellowBright(` WARNING `);
