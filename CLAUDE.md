Read .claude/memory.txt for more context on this project.
After work update .claude/memory.txt with new contexts.

# Reverhost - Developer Hosting Platform

## Project Overview
Hosting platform: Node.js app hosting (containers routed by Nginx Proxy Manager), public object storage (MinIO), Postgres databases (one `postgres` instance for the platform and customer databases, one database + role per customer project). Resend sends platform account emails only (verification, password reset, invites, admin notices); customers have no email sending or API keys.

## Tech Stack
- client: Vite + React 19, React Router, React Query, shadcn/ui + Tailwind v4, sonner
- server: Hono on Node, Prisma + PostgreSQL, Zod, JWT (httpOnly cookie + Bearer), MinIO, pg (customer databases), dockerode, Resend
- cli: commander, tar, @inquirer/prompts
- marketing: Astro 5 static site (`marketing/`)
- infra: docker-compose (postgres, minio, minio-init, registry, registry-init, api in prod); infra/postgres provides TLS and access rules. App images are built on Google Cloud Build and pushed to the self-hosted registry

## Commands
- `npm start` (repo root) - Production: validates `.env`, builds and starts everything via `docker-compose.prod.yml`
- `npm stop` / `npm run logs` - Stop / tail production stack
- `docker compose up -d` - Dev infra: postgres 127.0.0.1:54329, minio 127.0.0.1:19000 (console 19001), and builds the `easyhost/ai-runtime` image AI apps run on (the `ai-runtime` service exits right away; after editing `server/ai-runtime/` run `docker compose up -d --build ai-runtime`)
- `cd server && npm run dev` - API on :48710
- `cd client && npm run dev` - Dashboard on :51730 (proxies /api to :48710)
- `cd marketing && npm run dev` - Marketing site (Astro). `npm run build` also validates generated pages (duplicate titles, broken links, orphans, em dashes)
- `cd cli && npm run dev -- <command>` - Run CLI (`ezhst`) from source
- `cd server && npm run prisma -- migrate dev --name <name>` - Create/apply migration (Prisma reads root `.env`)
- `cd server && npm run prisma -- studio` - Database GUI

## Production (VPS)
- The VPS already runs Nginx Proxy Manager (NPM) on 80/443 for other sites and it does all HTTP routing (no Caddy). API and minio join NPM's docker network (`PROXY_NETWORK` in `.env`) as `easyhost-api` and `easyhost-minio`, NPM joins the `easyhost` apps network. Shared Postgres publishes port 5432 directly with TLS
- NPM terminates TLS with wildcard certificates (DNS challenge) for `reverhost.com` (platform) and `easyhost.fun` (user apps). `reverhost.com`, `www`, `app`, `api` -> `easyhost-api:48710`; `storage.` -> `easyhost-minio:9000`; `registry.` -> `easyhost-registry:5000` (advanced config `client_max_body_size 0; proxy_request_buffering off;`); `*.easyhost.fun` -> one wildcard proxy host whose advanced config sets `$server` to `eh-app-<subdomain>` (port 3000), resolved at request time
- In production the API serves by Host (`server/src/index.ts`, `PLATFORM_DOMAIN`): `reverhost.com` = `/marketing`, `www.` = redirect, `app.` = built dashboard (SPA fallback, `/api/*` same origin), anything else = API. Dashboard and marketing (Astro build stage) are baked into the api image (`server/Dockerfile`, repo root build context)
- API container mounts the Docker socket
- Reserved app names (api, app, www, storage, registry, ...) live in `server/src/lib/validations.ts`

## Structure
- `/docker-compose.yml` - Local infra
- `/server/src/index.ts` - Hono app, exports `AppType` for the typed client
- `/server/src/routes/projects.ts` + `/server/src/routes/apps.ts` - Projects retain root App rows; child App rows use parentProjectId, project and app limits come from the user's plan (`server/src/lib/plans.ts`, `server/src/lib/billing.ts`). Existing data stays in place.
- `/server/src/routes/*` - Dashboard routes (JWT user)
- Storage is plain S3: each bucket has its own MinIO service account (created via `mc` in `server/src/lib/minio.ts`)
- `/server/src/lib/*` - prisma, auth, email, minio, userdb (customer Postgres), docker, domains (app URLs, custom domains), npm (NPM API), deploy, build-queue, cloud-build (Google Cloud Build REST client), registry (image tags, pull, delete, garbage collection), validations
- `/server/src/middleware/*` - require-user, require-admin
- `/server/src/routes/ai-apps.ts` + `/server/src/lib/ai-apps.ts` + `/server/src/lib/ai-agent.ts` + `/client/src/pages/builder*.tsx` - AI apps: App rows with kind AI, slug = exact name. Files live in MinIO `easyhost-ai/<appId>/` and are pushed into the running `eh-app-<slug>` container (image `server/ai-runtime`: `proxy.mjs` listens on 3000, runs `node --watch server.js` on 3001 and injects the preview element selector script into HTML, plain JS + Hono). Generation is a background job (AI SDK `ToolLoopAgent`, Gemini via `@ai-sdk/google`, tools read_file, grep, edit_file, write_file, delete_file, run_sql, read_logs; opencode-style context: requests list file paths and sizes only, file logic in `/server/src/lib/ai-workspace.ts`); dashboard and CLI poll `aiStatus`. AI apps reject deploy/redeploy/build settings. New AI apps start from `/server/ai-template` (Hono serving a static welcome page, plus lib/db, auth, storage helpers). Nothing is provisioned at creation: `run_sql` connects the project database on first use (creating it if needed), `connect_storage` does the same for the bucket; each links the resource (App.aiDatabaseId / aiBucketId) and restarts the app. For a new app or big feature the AI first pauses on `ask_questions`, `propose_plan` and `choose_theme` cards (answered via `POST /api/ai-apps/:id/respond`); themes live in `/server/src/lib/ai-themes.ts` and become `public/theme.css`. The AI builder is dashboard only, not in the CLI. `/builder/:id` renders full screen (AppShell skips its chrome). Locally AI containers publish port 3000 on 127.0.0.1 and reach host services through host.docker.internal, so the preview works without routing
- `/server/src/routes/billing.ts` + `/server/src/lib/billing.ts` + `/server/src/lib/plans.ts` + `/server/src/lib/payments.ts` + `/server/src/lib/lemonsqueezy.ts` + `/client/src/pages/subscription.tsx` - Plans in `plans.ts`: Free (3 projects) and Pro ($10/mo, 10 projects), both 2 apps, 128MB DB and 256MB storage per project. Pro is one Lemon Squeezy subscription (`LEMONSQUEEZY_VARIANT_ID`), webhook at `/api/webhooks/lemonsqueezy`; provider code sits behind `PaymentProvider` in `payments.ts`. Pro tops the token balance up to 1000 on creation and every renewal (no token packs). AI builder: first AI app and first build free, then tokens (`/api/tokens` gives balance and free status to the builder, no AI Token page). `enforceUser` pauses newest projects/apps beyond the plan (App.suspended, container stopped), blocks over-size DBs (role NOLOGIN, Database.blocked, project apps stop; dashboard can truncate/drop tables) and sets MinIO bucket quotas; worker re-checks every 5 min. Failed payment falls back to Free
- `/server/src/routes/members.ts` + `/client/src/pages/members.tsx` + `/client/src/pages/invite.tsx` - Project members: owner is the root App row's userId, members in ProjectMember, email invites in ProjectInvite (7 days). Access goes through `projectAccessWhere` + `requireProject` (sets projectId, projectOwnerId). Owner only: invite, revoke, remove, rename, delete project
- Admin at `/admin` (role ADMIN): `/server/src/routes/admin.ts` (health, users, projects, detail pages, actions, audit log, blocked domains, cleanup) + `/server/src/routes/admin-analytics.ts` (overview, growth, revenue, builds, AI, resources; current vs previous period). Client: `/client/src/components/admin-layout.tsx` (sidebar, guard, shared Stat/ChartCard/Paginator/RangePicker, recharts via shadcn `chart`) + `/client/src/pages/admin-*.tsx`, range and filters live in the URL. `server/src/lib/metrics.ts` samples host + per-app usage every 5 min into MetricSample/AppMetricSample (30 day retention). Every admin action goes through `audit()` in `server/src/lib/audit.ts` (AdminAuditLog). Billing webhooks write BillingEvent rows. User.lastActiveAt updates on authenticated requests (10 min throttle, not while impersonating); Deployment.startedAt is set when a build is claimed
- `/client/src/pages/*` - Route pages
- `/client/src/components/ui/*` - shadcn components
- `/client/src/components/*` - Shared components
- `/client/src/lib/api` - Typed Hono client (`api`, `unwrap`, `upload`)
- `/client/src/lib/queries/*` - React Query option factories
- `/client/src/providers/*`, `/client/src/hooks/*`
- `/cli/src/commands/*` - CLI commands (full parity with the dashboard, `--json`, `--project <slug>`, no prompts without TTY, `EZHST_TOKEN`)
- `/marketing/src/pages/*.astro` - Hand-written marketing pages; `/marketing/src/pages/[...slug].astro` renders the generated pages built from `/marketing/src/seo/` (data.mjs, reference.mjs, pages.mjs; site.mjs holds footer, sitemap rules, held back families, validation). `.md` copies are written by an integration in `astro.config.mjs`; sitemap.xml, llms.txt, llms-index.json are endpoints
- `/cli/skill/SKILL.md` - Agent skill (`ezhst skill install`, copied to `/skill.md` on the marketing site by `server/Dockerfile`)

## Key Patterns
- Named exports only
- Fixed values live in code, not env: per-user limits in `server/src/lib/limits.ts`, API port 48710, deploy bucket, docker network `easyhost`
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
- Server stores the tarball in MinIO `easyhost-deploys`. Builds never run on the API host: the API generates a Dockerfile from the build plan in `server/src/lib/build-plan.ts` (auto-detected Node, install, build and start commands, overridable per app in the Build tab), uploads Dockerfile + source + `appenv` as a gzipped context to the GCS bucket `GCB_BUCKET`, and starts a Google Cloud Build (region us-central1, `docker:27.5.1-cli` step, `docker buildx build --push`) that pushes `registry.reverhost.com/apps/<slug>:<deploymentId>` to the self-hosted registry. The registry password comes from Secret Manager secret `registry-password`. App env reaches build steps only as a BuildKit secret (`RUN --mount=type=secret,id=appenv`), never as build args, and is runtime env in the container. The API polls the build and its GCS log (`log-<buildId>.txt`) into the deployment log, then pulls the image and runs container `eh-app-<slug>` on docker network `easyhost`. Superseded images are deleted from the host and the registry; the registry garbage collects every 6h in production when nothing is building. Local dev also builds on Cloud Build and pulls from the production registry
- Builds go through a Postgres-backed queue (`server/src/lib/build-queue.ts`): deploy creates a QUEUED row, worker claims with `FOR UPDATE SKIP LOCKED`, max `LIMITS.concurrentBuilds` builds at once, never two builds for the same app, older QUEUED deploys of the same app become SUPERSEDED. On boot, BUILDING rows with a `cloudBuildId` resume watching their cloud build; rows without one are marked FAILED
- No per-app routing step: `<slug>.<APPS_DOMAIN>` works via NPM's wildcard host once the container runs. Custom domains get their own NPM certificate + proxy host forwarding to `eh-app-<slug>:3000`. Locally apps are not routed
