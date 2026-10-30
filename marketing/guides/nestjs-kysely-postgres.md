# Use Kysely with NestJS and Postgres

Connect a NestJS app to a free EasyHost Postgres database using Kysely, from install to deployment.

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

```src/db.ts
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }),
  }),
});
```

Define the `Database` interface yourself or generate it with `kysely-codegen`. A pool of 5 leaves room within the limit of 20 connections per database.

Nest compiles with `tsc` by default, so drivers load normally from `node_modules`.

## Query it from a route

```src/app.controller.ts
import { db } from "./db";
import { Body, Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
@Controller()
export class AppController {
  @Get("api/users")
  async handle(@Headers("x-schedule-secret") secret: string, @Body() input: Record<string, string>) {
  const rows = await db.selectFrom("users").selectAll().limit(20).execute();
  return rows;
  }
}
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

Each database allows 20 concurrent connections, and NestJS shares them across requests. See the [NestJS hub](/frameworks/nestjs) for every NestJS guide, or [free NestJS hosting](/free-nestjs-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my NestJS app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Kysely locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
