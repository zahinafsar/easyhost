# Migrate from Heroku to EasyHost

Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.

## Steps

1. Export your variables. Run `heroku config -s > .env`.
2. Remove or ignore `Procfile`, because EasyHost does not read it.
3. Deploy with `npx ezhst deploy`, and test the `easyhost.fun` URL.
4. Move your data, then point your domain at EasyHost.

## What changes

Heroku runs your app on dynos. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

- [Next.js](/migrate/heroku/nextjs)
- [Nuxt](/migrate/heroku/nuxt)
- [Express](/migrate/heroku/express)
- [Fastify](/migrate/heroku/fastify)
- [NestJS](/migrate/heroku/nestjs)
- [Hono](/migrate/heroku/hono)
- [Koa](/migrate/heroku/koa)
- [AdonisJS](/migrate/heroku/adonisjs)
- [Remix](/migrate/heroku/remix)
- [SvelteKit](/migrate/heroku/sveltekit)
- [Astro](/migrate/heroku/astro)
- [Strapi](/migrate/heroku/strapi)

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)
