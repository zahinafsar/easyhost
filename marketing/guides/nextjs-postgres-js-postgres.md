# Use Postgres.js with Next.js and Postgres

Connect a Next.js app to a free EasyHost Postgres database using Postgres.js, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Postgres.js

```
npm i postgres
```

## Create the client

```lib/db.ts
import postgres from "postgres";

export const db = postgres(process.env.DATABASE_URL!, { max: 5 });
```

Postgres.js reads `sslmode` from the connection string. `max: 5` leaves room within the limit of 20 connections.

If Next.js fails to bundle a database driver, list the package under `serverExternalPackages` in `next.config.ts`.

## Query it from a route

```app/api/users/route.ts
import { db } from "@/lib/db";
export const GET = async (request: Request) => {
  const rows = await db`select id, email from users limit 20`;
  return Response.json(rows);
};
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
ezhst db query --file schema.sql
```

Commit the migration files so every environment applies the same changes.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and Next.js shares them across requests. See the [Next.js hub](/frameworks/nextjs) for every Next.js guide, or [free Next.js hosting](/free-nextjs-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Next.js app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Postgres.js locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
