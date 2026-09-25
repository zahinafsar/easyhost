#!/usr/bin/env node
import { Command } from "commander";
import { login, logout, whoami } from "./commands/auth.js";
import { init, listApps, listEnv, logs, setEnv, unsetEnv } from "./commands/apps.js";
import { deploy, redeploy } from "./commands/deploy.js";
import { log } from "./lib/ui.js";

const program = new Command();

program.name("ezhst").description("Deploy Next.js apps to EasyHost").version("0.1.0");

program.command("login").description("Log in to EasyHost").option("--api <url>", "API URL").action(login);
program.command("logout").description("Log out").action(logout);
program.command("whoami").description("Show the logged in user").action(whoami);

program.command("apps").description("List your apps").action(listApps);
program.command("init").description("Link this folder to an app").action(init);

program
  .command("deploy")
  .description("Upload and deploy the Next.js app in this folder")
  .option("--app <slug>", "App to deploy to")
  .option("--verbose", "Stream the full build log")
  .action(deploy);

program
  .command("redeploy")
  .description("Rebuild and redeploy the latest upload")
  .option("--app <slug>", "App slug")
  .option("--verbose", "Stream the full build log")
  .action(redeploy);

program
  .command("logs")
  .description("Show runtime logs")
  .option("--app <slug>", "App slug")
  .option("--tail <lines>", "Number of lines", "200")
  .action(logs);

const env = program.command("env").description("Manage environment variables");
env.command("list").option("--app <slug>", "App slug").action(listEnv);
env.command("set").argument("<pairs...>", "KEY=VALUE pairs").option("--app <slug>", "App slug").action(setEnv);
env.command("unset").argument("<keys...>", "Keys to remove").option("--app <slug>", "App slug").action(unsetEnv);

program.parseAsync().catch((error) => {
  if (error?.name === "ExitPromptError") {
    process.exit(130);
  }
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
