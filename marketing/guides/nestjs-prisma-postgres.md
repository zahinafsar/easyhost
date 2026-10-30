# Use Prisma with NestJS and Postgres

Connect a NestJS app to a free EasyHost Postgres database using Prisma, from install to deployment.

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

```src/db.ts
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
```

`prisma migrate dev` needs a shadow database. Set `SHADOW_DATABASE_URL` locally to `shadowConnectionString` from `ezhst db info --json`. These steps use the schema-based Prisma setup, so check the Prisma docs if your major version configures its datasource elsewhere.

Nest compiles with `tsc` by default, so drivers load normally from `node_modules`.

## Query it from a route

```src/app.controller.ts
import { db } from "./db";
import { Body, Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
@Controller()
export class AppController {
  @Get("api/users")
  async handle(@Headers("x-schedule-secret") secret: string, @Body() input: Record<string, string>) {
  const users = await db.user.findMany({ take: 20 });
  return users;
  }
}
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

Each database allows 20 concurrent connections, and NestJS shares them across requests. See the [NestJS hub](/frameworks/nestjs) for every NestJS guide, or [free NestJS hosting](/free-nestjs-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my NestJS app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use Prisma locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
