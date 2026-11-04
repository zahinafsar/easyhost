import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = fileURLToPath(new URL("../../ai-template", import.meta.url));

const collect = (directory: string): { path: string; content: string }[] => {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      return collect(absolute);
    }
    return [{ path: path.relative(TEMPLATE_DIR, absolute).split(path.sep).join("/"), content: readFileSync(absolute, "utf8") }];
  });
};

let cached: { path: string; content: string }[] | null = null;

export const starterFiles = () => {
  if (!cached) {
    cached = collect(TEMPLATE_DIR);
  }
  return cached;
};
