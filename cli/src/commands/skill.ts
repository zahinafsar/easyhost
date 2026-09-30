import { copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log, output } from "../lib/ui.js";

const SKILL_SOURCE = fileURLToPath(new URL("../../skill/SKILL.md", import.meta.url));

export const installSkill = (options: { global?: boolean }) => {
  let base = process.cwd();
  if (options.global) {
    base = homedir();
  }
  const directory = path.join(base, ".claude", "skills", "easyhost");
  const target = path.join(directory, "SKILL.md");
  mkdirSync(directory, { recursive: true });
  copyFileSync(SKILL_SOURCE, target);
  output({ path: target }, () => {
    log.success(`Installed the EasyHost skill at ${target}`);
    log.info('Ask your agent: "Deploy this app to EasyHost."');
  });
};
