# Use Sequelize with Hono and Postgres

Connect a Hono app to a free EasyHost Postgres database using Sequelize, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Sequelize

```
npm i sequelize pg pg-hstore
```

## Create the client

```src/db.ts
import pg from "pg";
import { Sequelize } from "sequelize";

export const db = new Sequelize(process.env.DATABASE_URL!, {
  dialect: "postgres",
  dialectModule: pg,
  pool: { max: 5 },
});
```

`dialectModule: pg` avoids dynamic require errors in bundled frameworks. A pool of 5 leaves room within the limit of 20 connections.

Hono does not bundle your code on Node.js unless you add a bundler, so drivers load normally from `node_modules`.

## Query it from a route

```src/index.ts
import { db } from "./db";
app.get("/api/users", async (c) => {
  const [rows] = await db.query("select id, email from users limit 20");
  return c.json(rows);
});
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx sequelize-cli db:migrate
```

Commit the migration files so every environment applies the same changes.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and Hono shares them across requests. See the [Hono hub](/frameworks/hono) for every Hono guide, or [free Hono hosting](/free-hono-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Hono app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Sequelize locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
