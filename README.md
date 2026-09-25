# EasyHost

Hosting platform for Next.js apps with object storage, SQLite databases and transactional email.

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

## Service API

Create an API key in the dashboard and send it as `Authorization: Bearer <key>`.

- `PUT/GET/DELETE /api/v1/storage/:bucket/:key` and `GET /api/v1/storage/:bucket?prefix=`
- `POST /api/v1/databases/:name/query` with `{ "sql": "...", "params": [] }`
- `POST /api/v1/email/send` with `{ "to", "subject", "html" | "text" }`

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
