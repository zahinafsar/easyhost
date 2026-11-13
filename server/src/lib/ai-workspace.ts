import type { App } from "@prisma/client";
import { AiFileError, deleteAiFile, isAiAssetPath, listAiFiles, normalizeFilePath, readAiFile, writeAiFile } from "./ai-apps.js";

const READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_GREP_MATCHES = 100;
const MAX_GREP_LINE = 300;

const globToRegex = (glob: string) => {
  let pattern = "";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === "*" && glob[index + 1] === "*") {
      pattern += ".*";
      index += 1;
      if (glob[index + 1] === "/") {
        index += 1;
      }
      continue;
    }
    if (char === "*") {
      pattern += "[^/]*";
      continue;
    }
    if (char === "?") {
      pattern += "[^/]";
      continue;
    }
    if (char === "{") {
      const close = glob.indexOf("}", index);
      if (close !== -1) {
        const options = glob.slice(index + 1, close).split(",").map((option) => option.replace(/[.+^$()|[\]\\]/g, "\\$&"));
        pattern += `(${options.join("|")})`;
        index = close;
        continue;
      }
    }
    pattern += char.replace(/[.+^$()|[\]\\{}]/g, "\\$&");
  }
  if (!glob.includes("/")) {
    return new RegExp(`(^|/)${pattern}$`);
  }
  return new RegExp(`^${pattern}$`);
};

const countMatches = (content: string, search: string) => {
  let count = 0;
  let from = content.indexOf(search);
  while (from !== -1) {
    count += 1;
    from = content.indexOf(search, from + search.length);
  }
  return count;
};

const trimmedLineMatches = (content: string, search: string) => {
  const lines = content.split("\n");
  const wanted = search.replace(/\n+$/, "").split("\n").map((line) => line.trim());
  const matches: { start: number; end: number }[] = [];
  if (!wanted.length || wanted.every((line) => !line)) {
    return matches;
  }
  for (let start = 0; start + wanted.length <= lines.length; start += 1) {
    let same = true;
    for (let offset = 0; offset < wanted.length; offset += 1) {
      if (lines[start + offset].trim() !== wanted[offset]) {
        same = false;
        break;
      }
    }
    if (same) {
      matches.push({ start, end: start + wanted.length });
    }
  }
  return matches;
};

export const replaceInContent = (content: string, oldString: string, newString: string, replaceAll: boolean) => {
  if (!oldString) {
    throw new AiFileError("old_string is empty. Use write_file to create a file.");
  }
  if (oldString === newString) {
    throw new AiFileError("old_string and new_string are the same. Nothing to change.");
  }
  const exact = countMatches(content, oldString);
  if (exact === 1 || (exact > 1 && replaceAll)) {
    return content.split(oldString).join(newString);
  }
  if (exact > 1) {
    throw new AiFileError(`old_string appears ${exact} times. Add more surrounding lines to make it unique, or set replace_all.`);
  }
  const loose = trimmedLineMatches(content, oldString);
  if (loose.length === 1) {
    const lines = content.split("\n");
    const replaced = [...lines.slice(0, loose[0].start), newString.replace(/\n$/, ""), ...lines.slice(loose[0].end)];
    return replaced.join("\n");
  }
  if (loose.length > 1) {
    throw new AiFileError(`old_string appears ${loose.length} times. Add more surrounding lines to make it unique.`);
  }
  throw new AiFileError("old_string was not found in the file. Read the file again and copy the text exactly.");
};

export const createWorkspace = (app: Pick<App, "id" | "slug">) => {
  const cache = new Map<string, string>();
  const readPaths = new Set<string>();

  const content = async (filePath: string) => {
    const cached = cache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }
    let text: string;
    try {
      text = await readAiFile(app.id, filePath);
    } catch (error) {
      if ((error as { code?: string }).code === "NoSuchKey") {
        throw new AiFileError(`${filePath} does not exist.`);
      }
      throw error;
    }
    cache.set(filePath, text);
    return text;
  };

  const sourceFiles = async () => {
    const files = await listAiFiles(app.id);
    return files.filter((file) => !isAiAssetPath(file.path));
  };

  const exists = async (filePath: string) => {
    const files = await sourceFiles();
    return files.some((file) => file.path === filePath);
  };

  const requireRead = (filePath: string) => {
    if (!readPaths.has(filePath)) {
      throw new AiFileError(`Read ${filePath} with read_file before changing it.`);
    }
  };

  const read = async (input: string, offset?: number, limit?: number) => {
    const filePath = normalizeFilePath(input);
    if (isAiAssetPath(filePath)) {
      throw new AiFileError("Uploaded images cannot be read. Use them by URL only.");
    }
    const text = await content(filePath);
    readPaths.add(filePath);
    const lines = text.split("\n");
    const start = Math.max((offset ?? 1) - 1, 0);
    const end = Math.min(start + (limit ?? READ_LIMIT), lines.length);
    if (!text) {
      return `${filePath} is empty.`;
    }
    const width = String(end).length;
    const body = lines
      .slice(start, end)
      .map((line, index) => {
        let shown = line;
        if (line.length > MAX_LINE_LENGTH) {
          shown = `${line.slice(0, MAX_LINE_LENGTH)}...`;
        }
        return `${String(start + index + 1).padStart(width, " ")}| ${shown}`;
      })
      .join("\n");
    if (end < lines.length) {
      return `${body}\n\n(Showing lines ${start + 1}-${end} of ${lines.length}. Use offset ${end + 1} to read more.)`;
    }
    return body;
  };

  const grep = async (pattern: string, include?: string) => {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      throw new AiFileError(`Invalid regular expression: ${pattern}`);
    }
    let filter: RegExp | null = null;
    if (include) {
      filter = globToRegex(include);
    }
    const files = (await sourceFiles()).filter((file) => !filter || filter.test(file.path));
    const results: string[] = [];
    let total = 0;
    for (const file of files) {
      const lines = (await content(file.path)).split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        if (!regex.test(lines[index])) {
          continue;
        }
        total += 1;
        if (results.length < MAX_GREP_MATCHES) {
          results.push(`${file.path}:${index + 1}: ${lines[index].trim().slice(0, MAX_GREP_LINE)}`);
        }
      }
    }
    if (!results.length) {
      return "No matches.";
    }
    if (total > results.length) {
      return `${results.join("\n")}\n\n(${total} matches, showing the first ${results.length}. Narrow the pattern or include.)`;
    }
    return results.join("\n");
  };

  const write = async (input: string, text: string) => {
    const filePath = normalizeFilePath(input);
    if (await exists(filePath)) {
      requireRead(filePath);
    }
    const written = await writeAiFile(app, filePath, text);
    cache.set(written, text);
    readPaths.add(written);
    return written;
  };

  const edit = async (input: string, oldString: string, newString: string, replaceAll: boolean) => {
    const filePath = normalizeFilePath(input);
    requireRead(filePath);
    const updated = replaceInContent(await content(filePath), oldString, newString, replaceAll);
    const written = await writeAiFile(app, filePath, updated);
    cache.set(written, updated);
    return written;
  };

  const remove = async (input: string) => {
    const removed = await deleteAiFile(app, input);
    cache.delete(removed);
    readPaths.delete(removed);
    return removed;
  };

  const forget = (filePath: string) => {
    cache.delete(filePath);
    readPaths.delete(filePath);
  };

  return { read, grep, write, edit, remove, forget };
};
