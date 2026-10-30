# Use MikroORM with Fastify and Postgres

Connect a Fastify app to a free EasyHost Postgres database using MikroORM, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install MikroORM

```
npm i @mikro-orm/core @mikro-orm/postgresql
```

## Create the client

```src/db.ts
import { MikroORM } from "@mikro-orm/postgresql";

const orm = await MikroORM.init({
  clientUrl: process.env.DATABASE_URL,
  entities: [],
});

export const db = orm.em.fork();
```

Register your entities in the `entities` array and fork the entity manager for each request in real handlers.

Fastify does not bundle your code, so drivers load normally from `node_modules`.

## Query it from a route

```src/index.ts
import { db } from "./db";
app.get("/api/users", async (request, reply) => {
  const rows = await db.getConnection().execute("select id, email from users limit 20");
  return rows;
});
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx mikro-orm migration:up
```

Commit the migration files so every environment applies the same changes.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and Fastify shares them across requests. See the [Fastify hub](/frameworks/fastify) for every Fastify guide, or [free Fastify hosting](/free-fastify-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Fastify app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use MikroORM locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
