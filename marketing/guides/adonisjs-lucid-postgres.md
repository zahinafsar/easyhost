# Use Lucid with AdonisJS and Postgres

Connect a AdonisJS app to a free EasyHost Postgres database using Lucid, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Lucid

```
node ace add @adonisjs/lucid --db=postgres
```

## Create the client

```config/database.ts
import { defineConfig } from "@adonisjs/lucid";
import env from "#start/env";

export default defineConfig({
  connection: "postgres",
  connections: {
    postgres: {
      client: "pg",
      connection: env.get("DATABASE_URL"),
    },
  },
});
```

Lucid is the AdonisJS database layer. Add `DATABASE_URL` to `start/env.ts` so validation passes at boot.

## Query it from a route

```start/routes.ts
import db from "@adonisjs/lucid/services/db";
import router from "@adonisjs/core/services/router";
router.get("/api/users", async ({ request, response }) => {
  const rows = await db.from("users").select("id", "email").limit(20);
  return rows;
});
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
node ace migration:run --force
```

This framework handles its own schema tooling, so keep these commands in your release routine.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and AdonisJS shares them across requests. See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my AdonisJS app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Lucid locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
