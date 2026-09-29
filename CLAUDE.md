Read .claude/memory.txt for more context on this project.
After work update .claude/memory.txt with new contexts.

# EasyHost - Developer Hosting Platform

## Project Overview
Hosting platform: Next.js app hosting (containers + Caddy), public object storage (MinIO), Postgres databases (shared `userdb` instance, one database + role each), and transactional email (Resend under the hood).

## Tech Stack
- client: Vite + React 19, React Router, React Query, shadcn/ui + Tailwind v4, sonner
- server: Hono on Node, Prisma + PostgreSQL, Zod, JWT (httpOnly cookie + Bearer), MinIO, pg (customer databases), dockerode, Resend
- cli: commander, tar, @inquirer/prompts
- infra: docker-compose (postgres, userdb, minio, minio-init, caddy)

## Commands
- `npm start` (repo root) - Production: validates `.env`, builds and starts everything via `docker-compose.prod.yml`
- `npm stop` / `npm run logs` - Stop / tail production stack
- `docker compose up -d` - Dev infra: postgres 127.0.0.1:54329, minio 127.0.0.1:19000 (console 19001), caddy :80 (admin 127.0.0.1:20190)
- `cd server && npm run dev` - API on :48710
- `cd client && npm run dev` - Dashboard on :51730 (proxies /api to :48710)
- `cd cli && npm run dev -- <command>` - Run CLI (`ezhst`) from source
- `cd server && npm run prisma -- migrate dev --name <name>` - Create/apply migration (Prisma reads root `.env`)
- `cd server && npm run prisma -- studio` - Database GUI

## Production (VPS)
- The VPS already runs Nginx Proxy Manager (NPM) on 80/443 for other sites. EasyHost does not publish host ports: its Caddy joins NPM's docker network (`PROXY_NETWORK` in `.env`) with alias `easyhost-caddy` and listens on plain HTTP :80
- NPM terminates TLS for `easyhost.fun`, `www`, `app`, `api`, `storage` and `*.easyhost.fun` using a wildcard certificate issued through a DNS challenge. It forwards `storage.easyhost.fun` directly to `easyhost-minio:9000` and the other hosts to `easyhost-caddy:80`
- Caddy routes by Host: `easyhost.fun` = static site in `/marketing`, `app.` = built dashboard (its `/api/*` proxied to API, same origin), `api.` = API, `<slug>.` = customer apps (routes added via Caddy admin unix socket shared only with the API container)
- API container mounts the Docker socket and re-syncs app routes into Caddy on start and every 60s
- Reserved app names (api, app, www, storage, ...) live in `server/src/lib/validations.ts`

## Structure
- `/docker-compose.yml`, `/infra/caddy/caddy.json` - Local infra
- `/server/src/index.ts` - Hono app, exports `AppType` for the typed client
- `/server/src/routes/*` - Dashboard routes (JWT user)
- `/server/src/routes/v1/*` - Public service API (API key: email). Storage is plain S3: each bucket has its own MinIO service account (created via `mc` in `server/src/lib/minio.ts`)
- `/server/src/lib/*` - prisma, auth, email, minio, userdb (customer Postgres), docker, caddy, deploy, build-queue, validations
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
- Fixed values live in code, not env: per-user limits in `server/src/lib/limits.ts`, API port 48710, `EMAIL_DOMAIN` (easyhost.fun), deploy bucket, docker network `easyhost`
- Env files: one root `.env` everywhere: local (API, dashboard via Vite `envDir`, dev compose) and the VPS (prod compose). Templates: `.env.example` (local) and `.env.production.example` (VPS). No per-package env files
- Env vars: never use fallbacks. Server reads env only through `server/src/lib/env.ts` (validates all required vars at startup), client through `client/src/lib/env.ts`, on the VPS `.env` is, passed to the api container via `env_file` and to compose interpolation via `--env-file`
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
- Builds go through a Postgres-backed queue (`server/src/lib/build-queue.ts`): deploy creates a QUEUED row, worker claims with `FOR UPDATE SKIP LOCKED`, max `LIMITS.concurrentBuilds` builds at once, never two builds for the same app, older QUEUED deploys of the same app become SUPERSEDED, BUILDING rows left by a restart are marked FAILED on boot
- Caddy route `app-<slug>` is upserted via admin API (`routeApp` in `server/src/lib/routing.ts`), hosts `<slug>.<APPS_DOMAIN>` plus ACTIVE custom domains proxy to `eh-app-<slug>:3000`
