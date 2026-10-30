# Use Prisma with Astro and Postgres

Connect a Astro app to a free EasyHost Postgres database using Prisma, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Prisma

```
npm i @prisma/client
npm i -D prisma
```

## Create the client

```src/lib/db.ts
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
```

`prisma migrate dev` needs a shadow database. Set `SHADOW_DATABASE_URL` locally to `shadowConnectionString` from `ezhst db info --json`. These steps use the schema-based Prisma setup, so check the Prisma docs if your major version configures its datasource elsewhere.

Add `export const prerender = false` to endpoints when your output is `static`, so they run per request.

## Query it from a route

```src/pages/api/users.ts
import { db } from "../../lib/db";
export const GET = async ({ request }: { request: Request }) => {
  const users = await db.user.findMany({ take: 20 });
  return Response.json(users);
};
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx prisma migrate dev --name init
npx prisma migrate deploy
```

Commit the migration files so every environment applies the same changes.

## Deploy

```
npx ezhst deploy
```

Generate the client during the build.

```
ezhst build set --build "prisma generate && npm run build"
```

Each database allows 20 concurrent connections, and Astro shares them across requests. See the [Astro hub](/frameworks/astro) for every Astro guide, or [free Astro hosting](/free-astro-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Astro app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Prisma locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
