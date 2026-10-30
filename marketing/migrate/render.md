# Migrate from Render to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. Copy variables from the Environment tab in the Render dashboard into a local `.env` file.
2. Remove or ignore `render.yaml`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Render runs your app on long-running services. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/render/nextjs)
- [Nuxt](/migrate/render/nuxt)
- [Express](/migrate/render/express)
- [Fastify](/migrate/render/fastify)
- [NestJS](/migrate/render/nestjs)
- [Hono](/migrate/render/hono)
- [Koa](/migrate/render/koa)
- [AdonisJS](/migrate/render/adonisjs)
- [Remix](/migrate/render/remix)
- [SvelteKit](/migrate/render/sveltekit)
- [Astro](/migrate/render/astro)
- [Strapi](/migrate/render/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
