# EasyHost

Hosting platform for Next.js apps with object storage, Postgres databases and transactional email.

## Getting started

All local config lives in one root `.env` (production uses `.env.production`).

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

## Deploying an app

Any Next.js project, no config changes:

```bash
cd cli && npm install && npm run build && npm link
cd path/to/your-next-app
ezhst login --api http://localhost:48710
ezhst deploy
```

`.env` files are not uploaded. Use `ezhst env set KEY=VALUE` (or the dashboard) and redeploy.

The app is served at `http://<app-name>.localhost`.

## Databases

Each database is a real Postgres database on a shared instance (`userdb` container), with its own role and password, plus a `<name>_shadow` database for `prisma migrate dev`. In production it listens publicly on `db.easyhost.fun:5432` with a trusted Let's Encrypt certificate issued by Nginx Proxy Manager, and connection strings use `sslmode=verify-full`. Locally it uses a self-signed certificate and `sslmode=no-verify`.

Production certificate setup (once):

1. In NPM, SSL Certificates, add a Let's Encrypt certificate for `db.easyhost.fun`.
2. Find NPM's letsencrypt folder on the host (`docker inspect nginx-proxy-manager_app_1 -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'`, the one mounted at `/etc/letsencrypt`) and the certificate folder name (`ls <folder>/live`, e.g. `npm-7`).
3. Set `NPM_LETSENCRYPT_DIR` and `USERDB_CERT_NAME` in `.env.production`.

The `userdb` container copies the certificate in on start and checks for renewals every 6 hours.

## Custom domains

Apps can have custom domains (Domains tab on the app page). The user points the domain at the server (CNAME to `<app>.easyhost.fun`, or an A record to `PUBLIC_IP` for a root domain) and clicks Verify. EasyHost checks DNS, then (with `EDGE_PROXY=npm`) asks Nginx Proxy Manager's API for a Let's Encrypt certificate and a proxy host forwarding to `easyhost-caddy:80`, and adds the hostname to the app's Caddy route.

NPM setup (once): in NPM, Users, create a dedicated user (no two-factor) with "Item Visibility: Created Items Only" and "Manage" on Proxy Hosts and SSL Certificates, so EasyHost can only see and change what it created. Put its email and password in `NPM_API_EMAIL` and `NPM_API_PASSWORD` in `.env.production`. Locally `EDGE_PROXY=none` skips NPM.

## Service API

Create an API key in the dashboard and send it as `Authorization: Bearer <key>`.

- `PUT/DELETE /api/v1/storage/:bucket/:key` and `GET /api/v1/storage/:bucket?prefix=` (upload responses include the file's public `url`; files are read directly from that public URL, no auth)
- `POST /api/v1/email/send` with `{ "from", "to", "subject", "html" | "text" }`. `from` is required and must be one of your sender addresses (`<username>@easyhost.fun`, up to 10 per account, created on the Email page)

## Production

The VPS runs Nginx Proxy Manager (NPM) on ports 80/443. EasyHost runs behind it and publishes no host ports.

1. DNS: `easyhost.fun`, `www`, `app`, `api`, `storage` and `*.easyhost.fun` point at the VPS.
2. Copy `.env.production` to the server and set `PROXY_NETWORK` to NPM's docker network.
3. Start:

```bash
git clone <repo> easyhost && cd easyhost
npm start
```

4. In NPM, forward `easyhost.fun`, `www.easyhost.fun`, `app.easyhost.fun`, `api.easyhost.fun`, `storage.easyhost.fun` and `*.easyhost.fun` to `easyhost-caddy` port `80` over HTTP, with SSL enabled (wildcard certificate via DNS challenge for `*.easyhost.fun`).

`npm start` refuses to run while any value in `.env.production` is empty or still a `<PLACEHOLDER>`.
