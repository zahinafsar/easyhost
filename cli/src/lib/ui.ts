import pc from "picocolors";

let jsonMode = false;

export const setJsonMode = (enabled: boolean) => {
  jsonMode = enabled;
};

export const isJsonMode = () => jsonMode;

const write = (message: string) => {
  if (jsonMode) {
    console.error(message);
    return;
  }
  console.log(message);
};

export const log = {
  info: (message: string) => write(message),
  step: (message: string) => write(pc.cyan(message)),
  success: (message: string) => write(pc.green(message)),
  warn: (message: string) => write(pc.yellow(message)),
  error: (message: string) => console.error(pc.red(message)),
  dim: (message: string) => write(pc.dim(message)),
};

export const fail = (message: string): never => {
  if (jsonMode) {
    console.log(JSON.stringify({ error: message }));
  } else {
    log.error(message);
  }
  process.exit(1);
};

export const output = (data: unknown, human: () => void) => {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  human();
};

export const isInteractive = () => !!process.stdin.isTTY && !!process.stdout.isTTY && !jsonMode;

export const required = async (value: string | undefined, flag: string, ask: () => Promise<string>) => {
  if (value !== undefined) {
    return value;
  }
  if (!isInteractive()) {
    return fail(`Missing ${flag}.`);
  }
  return ask();
};

export const confirmed = (yes: boolean | undefined, warning: string) => {
  if (!yes) {
    fail(`${warning} This cannot be undone. Rerun with --yes to confirm.`);
  }
};

export const table = (rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    log.dim("No rows.");
    return;
  }
  console.table(rows);
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
