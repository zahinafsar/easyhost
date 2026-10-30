# Use node-postgres (pg) with SvelteKit and Postgres

Connect a SvelteKit app to a free EasyHost Postgres database using node-postgres (pg), from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install node-postgres (pg)

```
npm i pg
npm i -D @types/pg
```

## Create the client

```src/lib/server/db.ts
import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});
```

With no ORM, keep your schema in SQL files and apply them with `ezhst db query --file`. That command times out after 15 seconds, so use `psql` for long migrations.

Anything under `$lib/server` is blocked from browser code, which keeps database credentials safe.

## Query it from a route

```src/routes/api/users/+server.ts
import { db } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
export const GET = async ({ request }) => {
  const { rows } = await db.query("select id, email from users limit 20");
  return json(rows);
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

Each database allows 20 concurrent connections, and SvelteKit shares them across requests. See the [SvelteKit hub](/frameworks/sveltekit) for every SvelteKit guide, or [free SvelteKit hosting](/free-sveltekit-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my SvelteKit app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use node-postgres (pg) locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
