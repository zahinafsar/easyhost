# Use the Strapi database config with Strapi and Postgres

Connect a Strapi app to a free EasyHost Postgres database using the Strapi database config, from install to deployment.

## Create the database

```
npx ezhst db create main
npx ezhst db info --json
npx ezhst env set DATABASE_URL="postgresql://..."
```

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local `.env` for development.

## Install the Strapi database config

```
npm i pg
```

## Create the client

```config/database.ts
export default ({ env }) => ({
  connection: {
    client: "postgres",
    connection: {
      connectionString: env("DATABASE_URL"),
    },
    pool: { min: 0, max: 5 },
  },
});
```

Strapi manages its own tables and syncs the schema at boot. Keep `min: 0` in the pool, which helps idle connections close.

## Query it from a route

```src/api/task/controllers/task.ts
export default {
  async run(ctx) {
  const rows = await strapi.db.connection("users").select("id", "email").limit(20);
  ctx.body = rows;
  },
};
```

## Run migrations

Run migrations from your machine, with `DATABASE_URL` set to the EasyHost connection string.

```
npm run strapi -- start
```

This framework handles its own schema tooling, so keep these commands in your release routine.

## Deploy

```
npx ezhst deploy
```

Each database allows 20 concurrent connections, and Strapi shares them across requests. See the [Strapi hub](/frameworks/strapi) for every Strapi guide, or [free Strapi hosting](/free-strapi-hosting) for what is included. See also the [Postgres product page](/products/postgres).

## Frequently asked questions

### Is Postgres free for my Strapi app?

Yes. Each EasyHost project can have one Postgres 16 database with no expiry date.

### Can I use the Strapi database config locally against the same database?

Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data.
