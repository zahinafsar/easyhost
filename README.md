# EasyHost

Hosting platform for Next.js apps with object storage, SQLite databases and transactional email.

## Getting started

```bash
docker compose up -d

cd server
cp .env.example .env
npm install
npx prisma migrate dev
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
npm start
```

The first run creates `.env` with random database, storage and JWT secrets. Add `RESEND_API_KEY` to it and run `npm start` again to enable email. Caddy gets HTTPS certificates automatically.

- https://easyhost.fun marketing site
- https://app.easyhost.fun dashboard
- https://api.easyhost.fun API (CLI default)
- https://<app>.easyhost.fun deployed apps
