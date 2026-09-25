Read .claude/memory.txt for more context on this project.
After work update .claude/memory.txt with new contexts.

# EasyHost - Developer Hosting Platform

## Project Overview
Hosting platform: Next.js app hosting (containers + Caddy), object storage (MinIO), SQLite databases over HTTP, and transactional email (Resend under the hood).

## Tech Stack
- client: Vite + React 19, React Router, React Query, shadcn/ui + Tailwind v4, sonner
- server: Hono on Node, Prisma + PostgreSQL, Zod, JWT (httpOnly cookie + Bearer), MinIO, better-sqlite3, dockerode, Resend
- cli: commander, tar, @inquirer/prompts
- infra: docker-compose (postgres, minio, minio-init, caddy)

## Commands
- `npm start` (repo root) - Production: validates `.env.production`, builds and starts everything via `docker-compose.prod.yml`
- `npm stop` / `npm run logs` - Stop / tail production stack
- `docker compose up -d` - Dev infra: postgres 127.0.0.1:54329, minio 127.0.0.1:19000 (console 19001), caddy :80 (admin 127.0.0.1:20190)
- `cd server && npm run dev` - API on :48710
- `cd client && npm run dev` - Dashboard on :51730 (proxies /api to :48710)
- `cd cli && npm run dev -- <command>` - Run CLI (`ezhst`) from source
- `cd server && npm run prisma -- migrate dev --name <name>` - Create/apply migration (Prisma reads root `.env`)
- `cd server && npm run prisma -- studio` - Database GUI

## Production (VPS)
- DNS: `easyhost.fun`, `www`, `app`, `api`, `storage` and wildcard `*.easyhost.fun` point to the VPS. Only ports 22/80/443 open
- `easyhost.fun` = static site in `/marketing`, `app.easyhost.fun` = built dashboard (its `/api/*` proxied to API, same origin), `api.easyhost.fun` = API for CLI and service API, `storage.easyhost.fun` = MinIO (presigned/public links), `<slug>.easyhost.fun` = customer apps
- Caddy prod config `infra/caddy/caddy.prod.json`, image `infra/caddy/Dockerfile` bundles marketing + dashboard. Admin API is a unix socket shared with the API container (customer containers cannot reach it)
- API container mounts the Docker socket and re-syncs app routes into Caddy on start and every 60s
- Reserved app names (api, app, www, storage, ...) live in `server/src/lib/validations.ts`

## Structure
- `/docker-compose.yml`, `/infra/caddy/caddy.json` - Local infra
- `/server/src/index.ts` - Hono app, exports `AppType` for the typed client
- `/server/src/routes/*` - Dashboard routes (JWT user)
- `/server/src/routes/v1/*` - Public service API (API key: storage, databases, email)
- `/server/src/lib/*` - prisma, auth, email, minio, sqlite, docker, caddy, deploy, validations
- `/server/src/middleware/*` - require-user, require-api-key
- `/client/src/pages/*` - Route pages
- `/client/src/components/ui/*` - shadcn components
- `/client/src/components/*` - Shared components
- `/client/src/lib/api` - Typed Hono client (`api`, `unwrap`, `upload`)
- `/client/src/lib/queries/*` - React Query option factories
- `/client/src/providers/*`, `/client/src/hooks/*`
- `/cli/src/commands/*` - CLI commands

## Key Patterns
- Named exports only
- Env files: one root `.env` for local (API, dashboard via Vite `envDir`, dev compose) and one root `.env.production` for the VPS. No per-package env files
- Env vars: never use fallbacks. Server reads env only through `server/src/lib/env.ts` (validates all required vars at startup), client through `client/src/lib/env.ts`, prod env lives in `.env.production` (template `.env.production.example`), passed to the api container via `env_file` and to compose interpolation via `--env-file`
- kebab-case file names
- Zod for all validation, `validate()` from `server/src/lib/validator.ts` returns `{ error }` with the first issue
- API errors are `{ error: string }` with proper status
- Client calls go through `api` + `unwrap()` from `@/lib/api`, never raw `fetch()` for JSON
- FormData uploads are the only exception: use `upload()` from `@/lib/api`
- Mutations use `useApiMutation` (toast on error, invalidate query keys)
- Try to create as few components as possible

## Hosting flow
- CLI `ezhst deploy` (npm package `ezhst`) tars the project source (skips node_modules, .next, .git, .env*) and uploads to `POST /api/apps/:id/deploy`. No project changes needed
- Server stores the tarball in MinIO `easyhost-deploys`, builds `easyhost/<slug>:<deploymentId>` from `node:22-alpine` (install by lockfile, `run build`, `next start`), app env is passed as build args and runtime env, runs container `eh-app-<slug>` on docker network `easyhost`
- Builds go through a Postgres-backed queue (`server/src/lib/build-queue.ts`): deploy creates a QUEUED row, worker claims with `FOR UPDATE SKIP LOCKED`, max `BUILD_CONCURRENCY` builds at once, never two builds for the same app, older QUEUED deploys of the same app become SUPERSEDED, BUILDING rows left by a restart are marked FAILED on boot
- Caddy route `app-<slug>` is upserted via admin API, host `<slug>.<APPS_DOMAIN>` proxies to `eh-app-<slug>:3000`
