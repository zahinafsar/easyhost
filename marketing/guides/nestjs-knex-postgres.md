# Use Knex with NestJS and Postgres

Connect a NestJS app to a free EasyHost Postgres database using Knex, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install Knex

```
npm i knex pg
```

## Create the client

```src/db.ts
import knex from "knex";

export const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
  pool: { min: 0, max: 5 },
});
```

Run `knex migrate:latest` from your machine with `DATABASE_URL` pointing at EasyHost. Pool settings count against the limit of 20 connections.

Nest compiles with `tsc` by default, so drivers load normally from `node_modules`.

## Query it from a route

```src/app.controller.ts
import { db } from "./db";
import { Body, Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
@Controller()
export class AppController {
  @Get("api/users")
  async handle(@Headers("x-schedule-secret") secret: string, @Body() input: Record<string, string>) {
  const rows = await db("users").select("id", "email").limit(20);
  return rows;
  }
}
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npx knex migrate:latest
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

### Can I use Knex locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
