---
name: easyhost
description: Deploy and manage apps on EasyHost (free hosting) with the ezhst CLI. Use when the user asks to deploy, host, publish or ship a Next.js app to EasyHost, or to manage its environment variables, build settings, logs, custom domains, S3 storage, Postgres database, transactional email or API keys.
---

# EasyHost

EasyHost is free hosting for Next.js apps with built-in S3 storage, Postgres and email. Everything is done through the `ezhst` CLI. Run it with `npx ezhst <command>` (or `ezhst` if installed globally with `npm i -g ezhst`).

## Rules for agents

- Always pass `--json` and parse stdout. Progress and hints go to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`.
- The CLI never prompts without a TTY. Pass every value as a flag.
- Commands that act on a project use the project linked in `.easyhost.json`, or `--project <slug>`.
- Destructive commands (`projects delete`, `storage delete`, `db delete`) need `--yes`. Only run them when the user explicitly asks.
- Never print secrets (passwords, S3 secret keys, API keys, connection strings) back to the user unless they ask. Put them in env vars with `ezhst env set` instead.
- `.env` files are never uploaded. Environment variables must be set with `ezhst env set` or `ezhst env import .env`.

## 1. Authenticate

Check first: `npx ezhst whoami --json`. If it fails with "Not logged in":

- Existing account: ask the user for email and password, then `npx ezhst login --email <email> --password <password> --json`
- New account: ask for name, email and password, then `npx ezhst register --name <name> --email <email> --password <password> --json`. Tell the user to click the verification link in their inbox.
- CI: set `EZHST_TOKEN` instead of logging in.

## 2. Pick or create a project

A project is one app plus its storage, database, email sender and API keys. Its slug is the subdomain: `https://<slug>.easyhost.fun`.

```
npx ezhst projects list --json
npx ezhst projects create <name> --link --json
npx ezhst link --project <slug> --json
```

## 3. Deploy

Run inside the Next.js project folder (it needs `package.json` with `next` and a `build` script):

```
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
- `deploy [--verbose]`, `redeploy`, `start`, `stop`
- `logs [--tail 200]` runtime logs
- `deployments list`, `deployments log [deploymentId]` build logs

Environment and build:
- `env list | set KEY=VALUE... | unset KEY... | import <file>`
- `build show`, `build set [--node <v>] [--root-dir <dir>] [--install <cmd>] [--build <cmd>] [--start <cmd>]` (`""` resets a field to auto), `build reset`
- The start command must listen on `0.0.0.0` and `$PORT`. Default: `next start -H 0.0.0.0 -p $PORT`.

Custom domains:
- `domains list | add <hostname> | verify <hostname> | remove <hostname>`
- DNS: CNAME to `<slug>.easyhost.fun`, or an A record to the IP from `domains list` for a root domain. Run `verify` after DNS is set; it issues HTTPS.

Storage (S3 compatible, one bucket per project, files are public by URL):
- `storage create <name> | info | rotate-keys | ls [prefix] | upload <files...> [--prefix dir/] | download <key> [output] | rm <key> | delete --yes`
- In app code use any S3 client with endpoint `https://storage.easyhost.fun`, region `us-east-1`, `forcePathStyle: true`, and the bucket name and keys from `storage info`. Public file URL: `https://storage.easyhost.fun/<bucket>/<key>`.
- Typical setup: `storage create files`, then `env set S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...` from `storage info --json`.

Database (Postgres, one per project):
- `db create <name> | info | query "<sql>" | query --file <file.sql> | rows <table> [--page n] | reset-password | delete --yes`
- `db info --json` returns `connectionString` and `shadowConnectionString` (for `prisma migrate dev`). Set `DATABASE_URL` with `env set`, and run migrations from the local machine against it (for Prisma: `prisma migrate deploy`).

Email (from `<username>@easyhost.fun`, 100 emails a day):
- `email sender create <username>`, `email info`, `email send --from <address> --to <address> --subject <text> --text <body>` (or `--html`), `email logs`, `email sender delete`
- From app code: `POST https://api.easyhost.fun/api/v1/email/send` with header `Authorization: Bearer <api key>` and JSON `{ "from", "to", "subject", "text" | "html" }`. Create the key with `keys create <name>` and store it with `env set EASYHOST_API_KEY=...`.

API keys:
- `keys list | create <name> | revoke <id>` (a key is shown only once)

Account:
- `whoami`, `logout`, `resend-verification`, `forgot-password --email <email>`

## Limits

Free: 10 projects, one bucket, one database and one email sender per project, 100 emails a day, one build at a time, 512 MB RAM and 1 CPU per app. Only Next.js apps are supported right now.

Docs: https://easyhost.fun/docs
