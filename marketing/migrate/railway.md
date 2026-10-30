# Migrate from Railway to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. Run `railway variables --kv > .env`.
2. Remove or ignore `railway.json or railway.toml`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Railway runs your app on long-running services billed by usage. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/railway/nextjs)
- [Nuxt](/migrate/railway/nuxt)
- [Express](/migrate/railway/express)
- [Fastify](/migrate/railway/fastify)
- [NestJS](/migrate/railway/nestjs)
- [Hono](/migrate/railway/hono)
- [Koa](/migrate/railway/koa)
- [AdonisJS](/migrate/railway/adonisjs)
- [Remix](/migrate/railway/remix)
- [SvelteKit](/migrate/railway/sveltekit)
- [Astro](/migrate/railway/astro)
- [Strapi](/migrate/railway/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
