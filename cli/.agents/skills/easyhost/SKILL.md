---
name: easyhost
description: Deploy and manage apps on Reverhost (free hosting) with the ezhst CLI. Use when the user asks to deploy, host, publish or ship a Node.js app to Reverhost, or to manage its environment variables, build settings, logs, custom domains, S3 storage or Postgres database.
---

# Reverhost

Reverhost is free hosting for Node.js apps with built-in S3 storage and Postgres. Everything is done through the `ezhst` CLI. Run it with `npx ezhst <command>` (or `ezhst` if installed globally with `npm i -g ezhst`).

## Rules for agents

- Always pass `--json` and parse stdout. Progress and hints go to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`.
- The CLI never prompts without a TTY. Pass every value as a flag.
- Commands that act on a project use the project linked in `.easyhost.json`, or `--project <slug>`. App commands also use `--app <slug-or-id>` or the linked app. With multiple apps, select one explicitly.
- Destructive commands (`projects delete`, `apps delete`, `storage delete`, `db delete`) need `--yes`. Only run them when the user explicitly asks.
- Never print secrets (passwords, S3 secret keys, connection strings) back to the user unless they ask. Put them in env vars with `ezhst env set` instead.
- `.env` files are never uploaded. Environment variables must be set with `ezhst env set` or `ezhst env import .env`.

## 1. Authenticate

Check first: `npx ezhst whoami --json`. If it fails with "Not logged in":

- Existing account: ask the user for email and password, then `npx ezhst login --email <email> --password <password> --json`
- New account: ask for name, email and password, then `npx ezhst register --name <name> --email <email> --password <password> --json`. Tell the user to click the verification link in their inbox.
- CI: set `EZHST_TOKEN` instead of logging in.

## 2. Pick or create a project

A project contains up to five Node.js apps, and shared storage and database. Each app has its own slug and URL: `https://<app-slug>.easyhost.fun`. Existing project apps retain their URLs.

```
npx ezhst projects list --json
npx ezhst projects create <name> --link --json
npx ezhst link --project <slug> --json
```

## 3. Deploy

Run inside the Node.js app folder with a `package.json`. First create an app and link it (app slugs are returned by the create command). Build scripts are optional:

```
npx ezhst apps create <name> --project <project-slug> --json
npx ezhst link --project <project-slug> --app <app-slug> --json
npx ezhst env import .env --json
npx ezhst deploy --json
```

Success prints `{"deploymentId", "status": "RUNNING", "url"}`. On failure read the build log and fix the cause:

```
npx ezhst deployments log --json
```

Common fixes:
- Missing env var at build time: `ezhst env set KEY=VALUE`, then `ezhst redeploy`.
- `npm ci` says the lockfile is out of sync: delete `node_modules` and `package-lock.json`, run `npm install`, deploy again.
- Monorepo: `ezhst build set --root-dir apps/web`.
- Needs another Node version: `ezhst build set --node 22` (20, 22 or 24; default is `engines.node` or 24).

After changing env vars or build settings, run `npx ezhst redeploy --json` (rebuilds the last upload). After changing code, run `deploy` again.

## Commands

Projects and runtime:
- `projects list | info | rename <name> | delete --yes`, `projects create <name> [--link]`, `link --project <slug>`
- `apps list | create <name> | delete --yes`
- `deploy [--verbose] [--app <slug>]`, `redeploy`, `start`, `stop`
- `logs [--tail 200]` runtime logs
- `deployments list`, `deployments log [deploymentId]` build logs

Environment and build:
- `env list | set KEY=VALUE... | unset KEY... | import <file>`
- `build show`, `build set [--node <v>] [--root-dir <dir>] [--install <cmd>] [--build <cmd>] [--start <cmd>]` (`""` resets a field to auto), `build reset`
- The start command must listen on `0.0.0.0` and `$PORT`. Auto-detects `scripts.start`, Next.js, Nuxt, or a Node.js entry file. Runs the build script if present; skips building otherwise.

Custom domains:
- `domains list | add <hostname> | verify <hostname> | remove <hostname>`
- DNS: CNAME to `<slug>.easyhost.fun`, or an A record to the IP from `domains list` for a root domain. Run `verify` after DNS is set; it issues HTTPS.

Storage (S3 compatible, one bucket per project, files are public by URL):
- `storage create <name> | info | rotate-keys | ls [prefix] | upload <files...> [--prefix dir/] | download <key> [output] | rm <key> | delete --yes`
- In app code use any S3 client with endpoint `https://storage.reverhost.com`, region `us-east-1`, `forcePathStyle: true`, and the bucket name and keys from `storage info`. Public file URL: `https://storage.reverhost.com/<bucket>/<key>`.
- Typical setup: `storage create files`, then `env set S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...` from `storage info --json`.

Database (Postgres, one per project):
- `db create <name> | info | query "<sql>" | query --file <file.sql> | rows <table> [--page n] | reset-password | delete --yes`
- `db info --json` returns `connectionString` and `shadowConnectionString` (for `prisma migrate dev`). Set `DATABASE_URL` with `env set`, and run migrations from the local machine against it (for Prisma: `prisma migrate deploy`).

Account:
- `whoami`, `logout`, `resend-verification`, `forgot-password --email <email>`

## Limits

Free: 10 projects. Per project: five Node.js apps, one bucket and one database. One build at a time; 512 MB RAM and 1 CPU per app.

Docs: https://reverhost.com/docs
