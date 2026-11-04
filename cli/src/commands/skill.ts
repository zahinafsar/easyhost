import { select } from "@inquirer/prompts";
import { copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fail, log, output, required } from "../lib/ui.js";

const SKILL_SOURCE = fileURLToPath(new URL("../../skill/SKILL.md", import.meta.url));

const AGENTS: Record<string, { name: string; folder: string }> = {
  claude: { name: "Claude Code", folder: ".claude" },
  codex: { name: "Codex", folder: ".agents" },
  cursor: { name: "Cursor", folder: ".cursor" },
};

export const installSkill = async (options: { agent?: string; global?: boolean; local?: boolean }) => {
  if (options.agent !== undefined && !(options.agent in AGENTS)) {
    return fail(`Unknown agent "${options.agent}". Use one of: ${Object.keys(AGENTS).join(", ")}.`);
  }
  if (options.global && options.local) {
    return fail("Choose either --global or --local, not both.");
  }

  const agentKey = await required(options.agent, "--agent <claude|codex|cursor>", () =>
    select({
      message: "Which agent should get the skill?",
      choices: Object.entries(AGENTS).map(([value, agent]) => ({ name: agent.name, value })),
    }),
  );
  const agent = AGENTS[agentKey];

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
        { name: `Global (~/${agent.folder}/skills, all projects)`, value: "global" },
        { name: `Local (${agent.folder}/skills, current project)`, value: "local" },
      ],
    }),
  );

  let base = process.cwd();
  if (scope === "global") {
    base = homedir();
  }
  const directory = path.join(base, agent.folder, "skills", "easyhost");
  const target = path.join(directory, "SKILL.md");
  mkdirSync(directory, { recursive: true });
  copyFileSync(SKILL_SOURCE, target);
  output({ agent: agentKey, scope, path: target }, () => {
    log.success(`Installed the EasyHost skill for ${agent.name} at ${target}`);
    log.info('Ask your agent: "Deploy this app to EasyHost."');
  });
};
