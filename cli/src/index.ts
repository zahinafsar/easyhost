#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { forgotPassword, login, logout, register, resendVerification, whoami } from "./commands/auth.js";
import { createApp, deleteApp, listApps } from "./commands/apps.js";
import { createSchedule, deleteSchedule, listSchedules, scheduleLogs, setScheduleState, updateSchedule } from "./commands/schedules.js";
import { createProject, deleteProject, link, listProjects, logs, projectInfo, renameProject, start, stop } from "./commands/projects.js";
import { deploy, deploymentLog, listDeployments, redeploy } from "./commands/deploy.js";
import { importEnv, listEnv, setEnv, unsetEnv } from "./commands/env.js";
import { resetBuild, setBuild, showBuild } from "./commands/build.js";
import { addDomain, listDomains, removeDomain, verifyDomain } from "./commands/domains.js";
import {
  createStorage,
  deleteStorage,
  downloadStorage,
  listStorage,
  removeStorageObject,
  rotateStorageKeys,
  storageInfo,
  uploadStorage,
} from "./commands/storage.js";
import { createDatabase, databaseInfo, deleteDatabase, queryDatabase, resetDatabasePassword, tableRows } from "./commands/db.js";
import { createSender, deleteSender, emailInfo, emailLogs, sendEmail } from "./commands/email.js";
import { createKey, listKeys, revokeKey } from "./commands/keys.js";
import { acceptInvite, inviteMember, leaveProject, listMembers, removeMember, revokeInvite } from "./commands/members.js";
import { installSkill } from "./commands/skill.js";
import { fail, setJsonMode } from "./lib/ui.js";

const packageMetadata: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
if (!packageMetadata || typeof packageMetadata !== "object" || !("version" in packageMetadata) || typeof packageMetadata.version !== "string") {
  throw new Error("CLI package version is missing or malformed");
}

const program = new Command();

program
  .name("ezhst")
  .description("EasyHost from the terminal: deploy apps and manage storage, databases, email and API keys")
  .version(packageMetadata.version)
  .option("--json", "Print machine-readable JSON")
  .hook("preAction", (_command, action) => {
    setJsonMode(!!action.optsWithGlobals().json);
  });

const scoped = (command: Command) => command.option("-p, --project <slug>", "Project slug (defaults to the linked project)");
const appScoped = (command: Command) => scoped(command).option("-a, --app <slug>", "App slug or ID (defaults to the linked or only app)");

program
  .command("register")
  .description("Create an account")
  .option("--name <name>")
  .option("--email <email>")
  .option("--password <password>")
  .option("--api <url>", "API URL")
  .action(register);
program
  .command("login")
  .description("Log in")
  .option("--email <email>")
  .option("--password <password>")
  .option("--api <url>", "API URL")
  .action(login);
program.command("logout").description("Log out").action(logout);
program.command("whoami").description("Show the logged in user").action(whoami);
program.command("resend-verification").description("Send the verification email again").action(resendVerification);
program.command("forgot-password").description("Email a password reset link").option("--email <email>").action(forgotPassword);

const projects = program.command("projects").description("Manage projects");
projects.command("list").description("List projects").action(listProjects);
projects
  .command("create")
  .description("Create a project for apps and shared services")
  .argument("<name>")
  .option("--link", "Link the current folder to it")
  .action(createProject);
scoped(projects.command("info").description("Show project details")).action(projectInfo);
scoped(projects.command("rename").description("Rename a project").argument("<name>")).action(renameProject);
scoped(projects.command("delete").description("Delete a project and everything in it").option("--yes", "Confirm")).action(
  deleteProject,
);
appScoped(program.command("link").description("Link the current folder to a project")).action(link);

appScoped(program.command("deploy").description("Upload and deploy the Node.js app in this folder").option("--verbose", "Stream the build log")).action(
  deploy,
);
appScoped(program.command("redeploy").description("Rebuild the latest upload").option("--verbose", "Stream the build log")).action(redeploy);
appScoped(program.command("start").description("Start a stopped app")).action(start);
appScoped(program.command("stop").description("Stop the running app")).action(stop);
appScoped(program.command("logs").description("Show runtime logs").option("--tail <lines>", "Number of lines", "200")).action(logs);

const deployments = program.command("deployments").description("Deployments and build logs");
appScoped(deployments.command("list").description("List recent deployments")).action(listDeployments);
appScoped(deployments.command("log").description("Show a build log (latest by default)").argument("[deploymentId]")).action(deploymentLog);

const env = program.command("env").description("Environment variables (applied on the next deploy)");
appScoped(env.command("list").description("List variables")).action(listEnv);
appScoped(env.command("set").description("Set variables").argument("<pairs...>", "KEY=VALUE pairs")).action(setEnv);
appScoped(env.command("unset").description("Remove variables").argument("<keys...>")).action(unsetEnv);
appScoped(env.command("import").description("Merge variables from a .env file").argument("<file>")).action(importEnv);

const build = program.command("build").description("Build settings (empty means auto-detect)");
appScoped(build.command("show").description("Show build settings")).action(showBuild);
appScoped(
  build
    .command("set")
    .description('Change build settings (pass "" to reset one to auto)')
    .option("--node <version>", "Node.js version: 20, 22 or 24")
    .option("--root-dir <dir>", "Folder with the app's package.json")
    .option("--install <command>", "Install command")
    .option("--build <command>", "Build command")
    .option("--start <command>", "Start command, must listen on $PORT"),
).action(setBuild);
appScoped(build.command("reset").description("Reset every build setting to auto")).action(resetBuild);

const domains = program.command("domains").description("Custom domains");
appScoped(domains.command("list").description("List domains and the DNS target")).action(listDomains);
appScoped(domains.command("add").description("Add a domain").argument("<hostname>")).action(addDomain);
appScoped(domains.command("verify").description("Check DNS and issue HTTPS").argument("<hostname>")).action(verifyDomain);
appScoped(domains.command("remove").description("Remove a domain").argument("<hostname>")).action(removeDomain);

const apps = program.command("apps").description("Manage up to five Node.js apps per project");
scoped(apps.command("list").description("List apps in a project")).action(listApps);
scoped(apps.command("create").description("Create an app").argument("<name>")).action(createApp);
appScoped(apps.command("delete").description("Delete one app and its deployments").option("--yes", "Confirm")).action(deleteApp);

const schedules = program.command("schedules").description("Scheduled API calls, up to five per project");
scoped(schedules.command("list").description("List schedules and recent results")).action(listSchedules);
const scheduleOptions = (command: Command) => scoped(command)
  .option("--url <url>", "Public API URL")
  .option("--every <minutes>", "Interval in minutes, 1 to 43200")
  .option("--method <method>", "HTTP method")
  .option("--headers <json>", "Headers as a JSON object")
  .option("--body <text>", "Request body")
  .option("--paused", "Save the schedule paused");
scheduleOptions(schedules.command("create").description("Create a schedule").argument("<name>")).action(createSchedule);
scheduleOptions(schedules.command("update").description("Edit a schedule").argument("<id>").option("--name <name>")).action(updateSchedule);
scoped(schedules.command("pause").description("Pause a schedule").argument("<id>")).action((id, options) => setScheduleState(id, false, options));
scoped(schedules.command("resume").description("Resume a schedule").argument("<id>")).action((id, options) => setScheduleState(id, true, options));
scoped(schedules.command("logs").description("Show recent runs").argument("<id>")).action(scheduleLogs);
scoped(schedules.command("delete").description("Delete a schedule").argument("<id>").option("--yes", "Confirm")).action(deleteSchedule);

const storage = program.command("storage").description("S3 compatible storage");
scoped(storage.command("info").description("Show the bucket and S3 credentials")).action(storageInfo);
scoped(storage.command("create").description("Create the project's bucket").argument("<name>")).action(createStorage);
scoped(storage.command("rotate-keys").description("Replace the S3 access keys")).action(rotateStorageKeys);
scoped(storage.command("ls").description("List files").argument("[prefix]")).action(listStorage);
scoped(
  storage.command("upload").description("Upload files").argument("<files...>").option("--prefix <path>", "Folder, e.g. images/"),
).action(uploadStorage);
scoped(storage.command("download").description("Download a file").argument("<key>").argument("[output]")).action(downloadStorage);
scoped(storage.command("rm").description("Delete a file").argument("<key>")).action(removeStorageObject);
scoped(storage.command("delete").description("Delete the bucket and all files").option("--yes", "Confirm")).action(deleteStorage);

const db = program.command("db").description("Postgres database");
scoped(db.command("info").description("Show connection strings and tables")).action(databaseInfo);
scoped(db.command("create").description("Create the project's database").argument("<name>")).action(createDatabase);
scoped(db.command("query").description("Run SQL").argument("[sql]").option("--file <file>", "Read SQL from a file")).action(queryDatabase);
scoped(db.command("rows").description("Browse a table").argument("<table>").option("--page <n>", "Page", "1")).action(tableRows);
scoped(db.command("reset-password").description("Rotate the database password")).action(resetDatabasePassword);
scoped(db.command("delete").description("Delete the database and its data").option("--yes", "Confirm")).action(deleteDatabase);

const email = program.command("email").description("Transactional email");
scoped(email.command("info").description("Show the sender address and usage")).action(emailInfo);
const sender = email.command("sender").description("Sender address");
scoped(sender.command("create").description("Create <username>@easyhost.fun").argument("<username>")).action(createSender);
scoped(sender.command("delete").description("Delete the sender address")).action(deleteSender);
scoped(
  email
    .command("send")
    .description("Send an email")
    .option("--from <address>")
    .option("--to <addresses...>")
    .option("--subject <text>")
    .option("--text <body>")
    .option("--html <html>"),
).action(sendEmail);
scoped(email.command("logs").description("Show sent emails").option("--page <n>", "Page", "1")).action(emailLogs);

const keys = program.command("keys").description("API keys for the HTTP API");
scoped(keys.command("list").description("List API keys")).action(listKeys);
scoped(keys.command("create").description("Create an API key").argument("<name>")).action(createKey);
scoped(keys.command("revoke").description("Revoke an API key").argument("<id>")).action(revokeKey);

const members = program.command("members").description("Project members and invites");
scoped(members.command("list").description("List the owner, members and pending invites")).action(listMembers);
scoped(members.command("invite").description("Invite someone by email (owner only)").argument("<email>")).action(inviteMember);
scoped(members.command("revoke").description("Revoke a pending invite (owner only)").argument("<email>")).action(revokeInvite);
scoped(members.command("remove").description("Remove a member (owner only)").argument("<email>").option("--yes", "Confirm")).action(removeMember);
scoped(members.command("leave").description("Leave a project you were invited to").option("--yes", "Confirm")).action(leaveProject);
program.command("accept-invite").description("Accept a project invite").argument("<token-or-url>", "Invite link or token from the email").action(acceptInvite);

const skill = program.command("skill").description("Agent skill");
skill
  .command("install")
  .description("Install the EasyHost agent skill")
  .option("--agent <agent>", "Target agent: claude, codex or cursor")
  .option("--global", "Install to the agent's home skills folder for all projects")
  .option("--local", "Install to the agent's skills folder in the current project")
  .action(installSkill);

program.parseAsync().catch((error) => {
  if (error?.name === "ExitPromptError") {
    process.exit(130);
  }
  let message = String(error);
  if (error instanceof Error) {
    message = error.message;
  }
  fail(message);
});
