# Migrate Fastify from Vercel to EasyHost

Move your Fastify app in four steps, and keep Vercel running until the new deployment works.

## Export your variables

```
vercel env pull .env
```

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Fastify setup

No adapter is needed. Remove any serverless wrapper and call `app.listen` with `host: "0.0.0.0"`.

`vercel.json` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Fastify binds to localhost by default, so you must pass `host: "0.0.0.0"`.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Vercel runs your app on serverless functions and an edge network, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/fastify-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Vercel running until traffic has moved. Also read [why Fastify may be unreachable](/errors/fastify-app-unreachable) and the [Vercel overview](/migrate/vercel).
