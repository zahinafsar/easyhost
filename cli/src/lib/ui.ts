import pc from "picocolors";

export const log = {
  info: (message: string) => console.log(message),
  step: (message: string) => console.log(pc.cyan(message)),
  success: (message: string) => console.log(pc.green(message)),
  warn: (message: string) => console.log(pc.yellow(message)),
  error: (message: string) => console.error(pc.red(message)),
  dim: (message: string) => console.log(pc.dim(message)),
};

export const fail = (message: string): never => {
  log.error(message);
  process.exit(1);
};
