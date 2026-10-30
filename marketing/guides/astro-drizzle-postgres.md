# Use Drizzle with Astro and Postgres

Connect a Astro app to a free EasyHost Postgres database using Drizzle, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Drizzle

```
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

## Create the client

```src/lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./schema";

export const db = drizzle(process.env.DATABASE_URL!);
export { users };
```

Run `drizzle-kit migrate` from your machine with `DATABASE_URL` set to the EasyHost connection string. Import `db` and `users` together in your route.

Add `export const prerender = false` to endpoints when your output is `static`, so they run per request.

## Query it from a route

```src/pages/api/users.ts
import { db, users } from "../../lib/db";
export const GET = async ({ request }: { request: Request }) => {
  const rows = await db.select().from(users).limit(20);
  return Response.json(rows);
};
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx drizzle-kit generate
npx drizzle-kit migrate
```

Commit the migration files so every environment applies the same changes.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and Astro shares them across requests. See the [Astro hub](/frameworks/astro) for every Astro guide, or [free Astro hosting](/free-astro-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Astro app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Drizzle locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
