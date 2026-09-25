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

On the VPS (Docker installed, ports 80 and 443 open, DNS for `easyhost.fun`, `www`, `app`, `api`, `storage` and `*.easyhost.fun` pointing at it):

```bash
git clone <repo> easyhost && cd easyhost
cp .env.production.example .env.production
npm start
```

Fill in every value in `.env.production` first (secrets, and the passwords inside `DATABASE_URL` and `MINIO_SECRET_KEY`). `npm start` refuses to run while anything is empty or still a `<PLACEHOLDER>`. Caddy gets HTTPS certificates automatically.

- https://easyhost.fun marketing site
- https://app.easyhost.fun dashboard
- https://api.easyhost.fun API (CLI default)
- https://<app>.easyhost.fun deployed apps
