# Migrate from Vercel to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. Run `vercel env pull .env`.
2. Remove or ignore `vercel.json`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Vercel runs your app on serverless functions and an edge network. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/vercel/nextjs)
- [Nuxt](/migrate/vercel/nuxt)
- [Express](/migrate/vercel/express)
- [Fastify](/migrate/vercel/fastify)
- [NestJS](/migrate/vercel/nestjs)
- [Hono](/migrate/vercel/hono)
- [Koa](/migrate/vercel/koa)
- [AdonisJS](/migrate/vercel/adonisjs)
- [Remix](/migrate/vercel/remix)
- [SvelteKit](/migrate/vercel/sveltekit)
- [Astro](/migrate/vercel/astro)
- [Strapi](/migrate/vercel/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
