# Migrate from Fly.io to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. `fly secrets list` shows only digests, so copy values from your own records into a local `.env` file.
2. Remove or ignore `fly.toml`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Fly.io runs your app on Machines you can place in many regions. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/fly/nextjs)
- [Nuxt](/migrate/fly/nuxt)
- [Express](/migrate/fly/express)
- [Fastify](/migrate/fly/fastify)
- [NestJS](/migrate/fly/nestjs)
- [Hono](/migrate/fly/hono)
- [Koa](/migrate/fly/koa)
- [AdonisJS](/migrate/fly/adonisjs)
- [Remix](/migrate/fly/remix)
- [SvelteKit](/migrate/fly/sveltekit)
- [Astro](/migrate/fly/astro)
- [Strapi](/migrate/fly/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
