# Free Strapi hosting

EasyHost runs Strapi, a open source headless CMS, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database, one S3 bucket and one email sender per project
- Up to five apps and five schedules per project

## How Strapi builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `strapi build`, through your package build script |
| Start | `scripts.start`, which runs `strapi start` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Use Postgres rather than SQLite, and set Strapi's secret variables before the first deploy.

```config/database.ts
export default ({ env }) => ({
  connection: {
    client: "postgres",
    connection: {
      connectionString: env("DATABASE_URL"),
    },
  },
});
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env set APP_KEYS=<a>,<b> API_TOKEN_SALT=<salt> ADMIN_JWT_SECRET=<secret> TRANSFER_TOKEN_SALT=<salt> JWT_SECRET=<secret>
npx ezhst env set DATABASE_CLIENT=postgres DATABASE_URL=<connection string>
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

Strapi's admin build is memory hungry and apps run with 512 MB of RAM, so large projects may not fit. The default local upload provider also loses files on redeploy, so use the S3 provider.

Apps run in one region, with no edge network, preview deployments or Git integration. Each project can send 20 emails per day, and one build runs at a time.

## Next steps

See the [Strapi hub](/frameworks/strapi) for every Strapi guide, or [free Strapi hosting](/free-strapi-hosting) for what is included. To let an agent do this for you, read [deploy Strapi with Claude Code](/guides/deploy-strapi-with-claude-code).

## Frequently asked questions

### Is Strapi hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Strapi app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Strapi?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
