# Use Drizzle with Express and Postgres

Connect a Express app to a free EasyHost Postgres database using Drizzle, from install to deployment.

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

```src/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./schema";

export const db = drizzle(process.env.DATABASE_URL!);
export { users };
```

Run `drizzle-kit migrate` from your machine with `DATABASE_URL` set to the EasyHost connection string. Import `db` and `users` together in your route.

Express does not bundle your code, so drivers load normally from `node_modules`.

## Query it from a route

```src/index.ts
import { db, users } from "./db";
app.get("/api/users", async (req, res) => {
  const rows = await db.select().from(users).limit(20);
  res.json(rows);
});
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

Each database allows 20 concurrent connections, and Express shares them across requests. See the [Express hub](/frameworks/express) for every Express guide, or [free Express hosting](/free-express-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Express app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Drizzle locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
