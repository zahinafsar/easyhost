import { select } from "@inquirer/prompts";
import { copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fail, log, output, required } from "../lib/ui.js";

const SKILL_SOURCE = fileURLToPath(new URL("../../skill/SKILL.md", import.meta.url));

export const installSkill = async (options: { global?: boolean; local?: boolean }) => {
  if (options.global && options.local) {
    return fail("Choose either --global or --local, not both.");
  }

  let scope: string | undefined;
  if (options.global) {
    scope = "global";
  } else if (options.local) {
    scope = "local";
  }
  scope = await required(scope, "--global or --local", () =>
    select({
      message: "Where should the skill be installed?",
      default: "local",
      choices: [
        { name: "Global (all projects)", value: "global" },
        { name: "Local (current project)", value: "local" },
      ],
    }),
  );

  let base = process.cwd();
  if (scope === "global") {
    base = homedir();
  }
  const directory = path.join(base, ".agents", "skills", "easyhost");
  const target = path.join(directory, "SKILL.md");
  mkdirSync(directory, { recursive: true });
  copyFileSync(SKILL_SOURCE, target);
  output({ path: target }, () => {
    log.success(`Installed the EasyHost skill at ${target}`);
    log.info('Ask your agent: "Deploy this app to EasyHost."');
  });
};
