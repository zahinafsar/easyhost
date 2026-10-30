# Migrate from Netlify to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. Run `netlify env:list --plain > .env`.
2. Remove or ignore `netlify.toml`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Netlify runs your app on a CDN with serverless functions. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/netlify/nextjs)
- [Nuxt](/migrate/netlify/nuxt)
- [Express](/migrate/netlify/express)
- [Fastify](/migrate/netlify/fastify)
- [NestJS](/migrate/netlify/nestjs)
- [Hono](/migrate/netlify/hono)
- [Koa](/migrate/netlify/koa)
- [AdonisJS](/migrate/netlify/adonisjs)
- [Remix](/migrate/netlify/remix)
- [SvelteKit](/migrate/netlify/sveltekit)
- [Astro](/migrate/netlify/astro)
- [Strapi](/migrate/netlify/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
