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

`.env` files are not uploaded. Use `ezhst env set KEY=VALUE` (or the dashboard) and redeploy.

The app is served at `http://<app-name>.localhost`.

## Databases

Each database is a real Postgres database on a shared instance (`userdb` container), with its own role and password, plus a `<name>_shadow` database for `prisma migrate dev`. In production it listens publicly on `db.easyhost.fun:5432` with a trusted Let's Encrypt certificate issued by Nginx Proxy Manager, and connection strings use `sslmode=verify-full`. Locally it uses a self-signed certificate and `sslmode=no-verify`.

Production certificate setup (once):

1. In NPM, SSL Certificates, add a Let's Encrypt certificate for `db.easyhost.fun`.
2. Find NPM's letsencrypt folder on the host (`docker inspect nginx-proxy-manager_app_1 -f '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'`, the one mounted at `/etc/letsencrypt`) and the certificate folder name (`ls <folder>/live`, e.g. `npm-7`).
3. Set `NPM_LETSENCRYPT_DIR` and `USERDB_CERT_NAME` in `.env`.

The `userdb` container copies the certificate in on start and checks for renewals every 6 hours.

## Custom domains

Apps can have custom domains (Domains tab on the app page). The user points the domain at the server (CNAME to `<app>.easyhost.fun`, or an A record to `PUBLIC_IP` for a root domain) and clicks Verify. EasyHost checks DNS, then in production asks Nginx Proxy Manager's API for a Let's Encrypt certificate and a proxy host forwarding to `easyhost-caddy:80`, and adds the hostname to the app's Caddy route.

NPM setup (once): in NPM, Users, create a dedicated user (no two-factor) with "Item Visibility: Created Items Only" and "Manage" on Proxy Hosts and SSL Certificates, so EasyHost can only see and change what it created. Put its API URL, email, and password in `NPM_API_URL`, `NPM_API_EMAIL`, and `NPM_API_PASSWORD` in the production `.env`. Local development skips NPM.

## Storage

Storage is S3 compatible. Every bucket gets its own access key and secret (shown on the bucket page, rotatable) limited to that bucket. Use any S3 client with endpoint `https://storage.easyhost.fun`, region `us-east-1`, path-style addressing and the bucket's `eh-...` name. Files are publicly readable at `https://storage.easyhost.fun/<bucket>/<key>`.

## Service API

Create an API key in the dashboard and send it as `Authorization: Bearer <key>`.

- `POST /api/v1/email/send` with `{ "from", "to", "subject", "html" | "text" }`. `from` is required and must be one of your sender addresses (`<username>@easyhost.fun`, up to 10 per account, created on the Email page)

## Production

The VPS runs Nginx Proxy Manager (NPM) on ports 80/443. EasyHost runs behind it and publishes no host ports.

1. DNS: `easyhost.fun`, `www`, `app`, `api`, `storage` and `*.easyhost.fun` point at the VPS.
2. Copy `.env.production.example` to `.env` on the server, fill it in, and set `PROXY_NETWORK` to NPM's docker network.
3. Start:

```bash
git clone <repo> easyhost && cd easyhost
npm start
```

Run `npm run restart` to rebuild and force-recreate the production services without deleting database or storage volumes.

4. In NPM, forward `easyhost.fun`, `www.easyhost.fun`, `app.easyhost.fun`, `api.easyhost.fun` and `*.easyhost.fun` to `easyhost-caddy` port `80` over HTTP. Forward `storage.easyhost.fun` directly to `easyhost-minio` port `9000` over HTTP. Enable SSL with the wildcard certificate issued through a DNS challenge.

`npm start` refuses to run while any value in `.env` is empty or still a `<PLACEHOLDER>`.
