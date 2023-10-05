import fs from "fs";

export function fileExistsLocally(path: string) {
  return fs.existsSync(path);
}

export function fileMightExistRemotely(path: string) {
  return path.match(/^https?:\/\//) !== null;
}
