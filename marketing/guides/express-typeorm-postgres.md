# Use TypeORM with Express and Postgres

Connect a Express app to a free EasyHost Postgres database using TypeORM, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install TypeORM

```
npm i typeorm pg reflect-metadata
```

## Create the client

```src/db.ts
import "reflect-metadata";
import { DataSource } from "typeorm";

export const db = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [],
});

await db.initialize();
```

Keep `synchronize` off in production, and run migrations from your machine against the connection string. Register your entities in the `entities` array.

Express does not bundle your code, so drivers load normally from `node_modules`.

## Query it from a route

```src/index.ts
import { db } from "./db";
app.get("/api/users", async (req, res) => {
  const rows = await db.query("select id, email from users limit 20");
  res.json(rows);
});
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx typeorm migration:run -d dist/data-source.js
```

Commit the migration files so every environment applies the same changes.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and Express shares them across requests. See the [Express hub](/frameworks/express) for every Express guide, or [free Express hosting](/free-express-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Express app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use TypeORM locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
