# Migrate from Koyeb to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. Copy variables from the service settings in the Koyeb dashboard into a local `.env` file.
2. Remove or ignore `koyeb.yaml, if you use one`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Koyeb runs your app on serverless containers. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/koyeb/nextjs)
- [Nuxt](/migrate/koyeb/nuxt)
- [Express](/migrate/koyeb/express)
- [Fastify](/migrate/koyeb/fastify)
- [NestJS](/migrate/koyeb/nestjs)
- [Hono](/migrate/koyeb/hono)
- [Koa](/migrate/koyeb/koa)
- [AdonisJS](/migrate/koyeb/adonisjs)
- [Remix](/migrate/koyeb/remix)
- [SvelteKit](/migrate/koyeb/sveltekit)
- [Astro](/migrate/koyeb/astro)
- [Strapi](/migrate/koyeb/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
