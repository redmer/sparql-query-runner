import { exit } from "process";

/** Reports a fatal error. */
export function error(message: string): never {
  console.error(message);
  exit(2000);
}

/** Report warnings. If TREAT_ERROR_AS_WARNING is set, is fatal instead. */
export function warn(message: string): never | void {
  console.warn(message);
  if (process.env.TREAT_WARNINGS_AS_ERRORS !== undefined) {
    exit(1000);
  }
}

/**
 * Report warnings. If TREAT_ERROR_AS_WARNING is set, is fatal instead.
 * @deprecated
 */
export function SQRWarning(errorCode: number, message: string): never | void {
  console.warn(`W${errorCode}: ${message}`);
}
