---
name: easyhost
description: Deploy and manage apps on Reverhost (free hosting) with the ezhst CLI. Use when the user asks to deploy, host, publish or ship an app (any language, built from a Dockerfile) to Reverhost, or to manage its environment variables, build settings, logs, custom domains, S3 storage or Postgres database.
---

# Reverhost

Reverhost is free hosting for apps in any language, built from a Dockerfile you write, with built-in S3 storage and Postgres. It is in beta. Everything is done through the `ezhst` CLI. Run it with `npx ezhst <command>` (or `ezhst` if installed globally with `npm i -g ezhst`).

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
- New account: ask for name, email and password, then `npx ezhst register --name <name> --email <email> --password <password> --json`. Verification is mandatory: ask the user for the 6-digit code from their inbox and run `npx ezhst verify <code> --json` before any other command (`npx ezhst resend-verification` sends a new code).
- CI: set `EZHST_TOKEN` instead of logging in.

## 2. Pick or create a project

A project contains up to 2 apps, and shared storage and database. Each app has its own slug and URL: `https://<app-slug>.easyhost.fun`. Existing project apps retain their URLs.

```
npx ezhst projects list --json
npx ezhst projects create <name> --link --json
npx ezhst link --project <slug> --json
```

## 3. Deploy

Every app builds from a Dockerfile stored on the app, not from a file in the repo. Never create, edit or upload a `Dockerfile` file in the user's project. Always write the Dockerfile straight to the app through the CLI. Run inside the app folder:

1. Inspect the repo and pick a template: `npx ezhst build dockerfile template --json` lists them, `npx ezhst build dockerfile template <id> --json` returns one. Ids include node, express, nestjs, nextjs, nuxt, sveltekit, react-router, astro, bun, elysia, fastapi, flask, django, streamlit, rails, ruby, laravel, php, go, rust, zig, vite, static. A Dockerfile already in the repo is only a reference: read it, adapt it, and send the result through the CLI like any other.
2. Adapt the template to the repo, then save it to the app by piping it through stdin with a quoted heredoc (`<<'EOF'`, so the shell does not expand `$PORT` or `$(...)`). If the template fits unchanged, `npx ezhst build dockerfile template <id> --apply --json` saves it directly.
3. The app must listen on `0.0.0.0` and `$PORT` (3000).
4. Env vars are runtime env. If the build step needs them, use `RUN --mount=type=secret,id=appenv,target=/run/secrets/appenv sh -c 'set -a; . /run/secrets/appenv; set +a; <build command>'`. Never put secrets in `ARG` or `ENV`.
5. Keep the image under 1 GB (slim bases, multi-stage builds for compiled languages). Containers get 256 MB of memory and half a CPU. Download toolchains from fast sources (package managers, official images); a slow download is billed build time and builds stop after 20 minutes.
6. Do not use `# syntax=` lines or images from the Reverhost registry; they are rejected.

```
npx ezhst apps create <name> --project <project-slug> --json
npx ezhst link --project <project-slug> --app <app-slug> --json
npx ezhst env import .env --json
npx ezhst build dockerfile set -f - --json <<'EOF'
FROM node:22-alpine
...
EOF
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
- Build fails: read the stored Dockerfile with `ezhst build dockerfile show --json`, fix it, send it back with `ezhst build dockerfile set -f - <<'EOF'`, then `ezhst redeploy` (rebuilds the last upload, even a failed one).
- App starts but the URL fails: it is not listening on `0.0.0.0:$PORT`.
- Daily build limit reached (10 per day on Free, 50 on Pro): wait or upgrade; do not loop deploys.

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
- `build show`, `build set --root-dir <dir>` (build context, `""` for the project root), `build reset`
- `build dockerfile show`, `build dockerfile set -f -` (reads stdin; agents always use this), `build dockerfile template [id] [--apply]`

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

Members:
- `members list | invite <email> | revoke <email> | remove <email> --yes | leave --yes`. Only the owner can invite, revoke, remove, rename or delete the project. Members can do everything else.
- `accept-invite <link-or-token>` joins a project. The logged-in email must match the invited email.

Account:
- `whoami`, `logout`, `verify <code>`, `resend-verification`, `forgot-password --email <email>`
- If a command fails with "Your email is not verified", ask the user for the 6-digit code from their inbox and run `verify <code>`. Codes expire after 10 minutes; `resend-verification` sends a new one (once a minute).
- Limit errors ("You can have 3 projects on the Free plan...", "This project can have 2 apps.") are plan limits: suggest deleting something the user no longer needs, or Pro for more projects.
- "This app is paused" or "This database is over its size limit": the project is over its plan, so its apps are stopped. Free space (drop tables or delete files) or, for paused projects, upgrade to Pro.

Billing:
- `billing` shows the plan, limits and usage per project. `billing upgrade` prints a Pro checkout link for the user to open (never pay for them). `billing portal` prints the link to manage or cancel.

## Limits

Free: 3 projects. Pro ($10/mo): 10 projects and the AI token balance topped up to 1,000 every month. Per project on both: 2 apps, one bucket (256 MB) and one database (128 MB). One build at a time; 512 MB RAM and 1 CPU per app. A full bucket rejects uploads; a database over its size is blocked and the project's apps stop.

Docs: https://reverhost.com/docs
