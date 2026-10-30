# Use Kysely with Next.js and Postgres

Connect a Next.js app to a free EasyHost Postgres database using Kysely, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Kysely

```
npm i kysely pg
npm i -D @types/pg
```

## Create the client

```lib/db.ts
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }),
  }),
});
```

Define the `Database` interface yourself or generate it with `kysely-codegen`. A pool of 5 leaves room within the limit of 20 connections per database.

If Next.js fails to bundle a database driver, list the package under `serverExternalPackages` in `next.config.ts`.

## Query it from a route

```app/api/users/route.ts
import { db } from "@/lib/db";
export const GET = async (request: Request) => {
  const rows = await db.selectFrom("users").selectAll().limit(20).execute();
  return Response.json(rows);
};
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx kysely migrate:latest
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

### Can I use Kysely locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
