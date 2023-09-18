import fs from "fs";

export function fileExistsLocally(path: string) {
  return fs.existsSync(path);
}
