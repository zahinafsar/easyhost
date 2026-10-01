# EasyHost

Hosting platform for Next.js apps with object storage, Postgres databases and transactional email.

## Getting started

All config lives in one root `.env`, locally and on the VPS. Start from `.env.example` locally and `.env.production.example` on the VPS.

```bash
cp .env.example .env
docker compose up -d

cd server
npm install
npm run prisma -- migrate dev
npm run dev

cd ../client
npm install
npm run dev
```

Dashboard: http://localhost:51730
API: http://localhost:48710
MinIO console: http://localhost:19001 (easyhost / easyhost123)

The API provisions per-bucket S3 keys with the MinIO client, so `mc` must be on your PATH locally (`brew install minio/stable/mc`). The production API image ships it.

## Deploying an app

Any Next.js project, no config changes:

```bash
cd cli && npm install && npm run build && npm link
cd path/to/your-next-app
ezhst login --api http://localhost:48710
ezhst deploy
```

`.env` files are not uploaded. Use `ezhst env set KEY=VALUE` or `ezhst env import .env` (or the dashboard) and redeploy.

The CLI covers everything the dashboard does (projects, deploys, build logs, env, build settings, domains, storage, database, email, API keys). Every command takes `--json`, never prompts without a TTY, and accepts `EZHST_TOKEN` instead of a saved login, so AI agents can drive it. `ezhst --help` lists all commands; the agent skill lives in `cli/skill/SKILL.md` (installed with `ezhst skill install`, served at `https://easyhost.fun/skill.md`).

`ezhst skill install` asks whether to install globally or locally. Global installs to `~/.agents/skills/easyhost/SKILL.md`; Local installs to `.agents/skills/easyhost/SKILL.md` in the current directory. Pass `--global` or `--local` to skip the prompt; one is required for noninteractive use, including `--json`.

Locally apps run as containers without routing. In production they are served at `https://<app-name>.easyhost.fun`.

## Databases

One `postgres` container hosts both EasyHost's internal `easyhost` database and customer databases. Each customer gets a separate Postgres database with its own role and password, plus a `<name>_shadow` database for `prisma migrate dev`. Customer logins are blocked from `easyhost`, `postgres`, and `template1`; they can connect only over TLS, and each customer database revokes public access. Both Prisma and customer database provisioning use `DATABASE_URL`, with the `easyhost` administrator login.

In production Postgres listens publicly on `db.easyhost.fun:5432` with a trusted Let's Encrypt certificate issued by Nginx Proxy Manager, and customer connection strings use `sslmode=verify-full`. Locally the shared instance listens on `localhost:54329` with a self-signed certificate and customer connection strings use `sslmode=no-verify`. The internal `DATABASE_URL` uses `sslmode=require` in both environments.

Production certificate setup (once):

1. In NPM, SSL Certificates, add a Let's Encrypt certificate for `db.easyhost.fun`.
2. Find NPM's letsencrypt folder on the host (`docker inspect nginx-proxy-manager_app_1 -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'`, the one mounted at `/etc/letsencrypt`) and the certificate folder name (`ls <folder>/live`, e.g. `npm-7`).
3. Set `NPM_LETSENCRYPT_DIR` and `POSTGRES_CERT_NAME` in `.env`.

The `postgres` container copies the certificate in on start and checks for renewals every 6 hours. Access rules are applied on every start, including when reusing an existing `postgres_data` volume.

## Custom domains

Apps can have custom domains (Domains tab on the app page). The user points the domain at the server (CNAME to `<app>.easyhost.fun`, or an A record to `PUBLIC_IP` for a root domain) and clicks Verify. EasyHost checks DNS, then in production asks Nginx Proxy Manager's API for a Let's Encrypt certificate and a proxy host forwarding straight to the app container (`eh-app-<app>:3000`).

NPM setup (once): in NPM, Users, create a dedicated user (no two-factor) with "Item Visibility: Created Items Only" and "Manage" on Proxy Hosts and SSL Certificates, so EasyHost can only see and change what it created. Put its API URL, email, and password in `NPM_API_URL`, `NPM_API_EMAIL`, and `NPM_API_PASSWORD` in the production `.env`. Local development skips NPM.

## Storage

Storage is S3 compatible. Every bucket gets its own access key and secret (shown on the bucket page, rotatable) limited to that bucket. Use any S3 client with endpoint `https://storage.easyhost.fun`, region `us-east-1`, path-style addressing and the bucket's `eh-...` name. Files are publicly readable at `https://storage.easyhost.fun/<bucket>/<key>`.

## Service API

Create an API key in the dashboard and send it as `Authorization: Bearer <key>`.

- `POST /api/v1/email/send` with `{ "from", "to", "subject", "html" | "text" }`. `from` is required and must be one of your sender addresses (`<username>@easyhost.fun`, up to 10 per account, created on the Email page)

## Production

The VPS runs Nginx Proxy Manager (NPM) on ports 80/443. EasyHost's API and storage run behind it; the shared Postgres service publishes port 5432 directly with TLS.

1. DNS: `easyhost.fun`, `www`, `app`, `api`, `storage` and `*.easyhost.fun` point at the VPS.
2. Copy `.env.production.example` to `.env` on the server, fill it in, and set `PROXY_NETWORK` to NPM's docker network.
3. Start:

```bash
git clone <repo> easyhost && cd easyhost
npm start
```

Run `npm run restart` to rebuild and force-recreate the production services without deleting database or storage volumes.

4. Let NPM reach app containers: `docker network connect easyhost nginx-proxy-manager_app_1`, and make NPM resolve container names at request time: `docker exec nginx-proxy-manager_app_1 sh -c 'printf "resolver 127.0.0.11 ipv6=off valid=10s;\n" > /etc/nginx/conf.d/include/resolvers.conf'`.
5. In NPM, with SSL from the wildcard certificate issued through a DNS challenge:
   - `easyhost.fun`, `www.easyhost.fun`, `app.easyhost.fun`, `api.easyhost.fun`: forward to `easyhost-api` port `48710` over HTTP. The API serves the marketing site, the dashboard and redirects `www`.
   - `storage.easyhost.fun`: forward to `easyhost-minio` port `9000` over HTTP.
   - `*.easyhost.fun`: forward to `eh-app` port `3000` over HTTP with websockets on, and this advanced config so each subdomain goes to its app container:

```nginx
if ($host ~* "^([a-z0-9-]+)\.easyhost\.fun$") { set $server "eh-app-$1"; }
client_max_body_size 100m;
```

`npm start` refuses to run while any value in `.env` is empty or still a `<PLACEHOLDER>`.
