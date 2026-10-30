# Migrate Hono from Railway to EasyHost

Move your Hono app in four steps, and keep Railway running until the new deployment works.

## Export your variables

```
railway variables --kv > .env
```

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Hono setup

Replace the Workers or serverless export with `serve` from `@hono/node-server`.

`railway.json or railway.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Use the `@hono/node-server` adapter so Hono runs as a Node.js server.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Railway runs your app on long-running services billed by usage, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/hono-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Railway running until traffic has moved. Also read [why Hono may be unreachable](/errors/hono-app-unreachable) and the [Railway overview](/migrate/railway).
