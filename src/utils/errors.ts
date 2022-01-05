import { exit } from "process";

/** General exception class for Sparql Query Runner. */
export class SQRException extends Error {}

/** Reports a fatal error.  */
export function SQRError(errorCode: number, message: string): never {
  console.error(`E${errorCode}: ${message}`);
  exit(errorCode);
}

/** Report warnings. If TREAT_ERROR_AS_WARNING is set, is fatal instead. */
export function SQRWarning(errorCode: number, message: string): never | void {
  if (process.env.TREAT_WARNINGS_AS_ERRORS !== undefined) {
    exit(errorCode);
  }
}

/** Report diagnostic information. */
export function SQRInfo(message: string): void {
  console.info(message);
}
