# Migrate Astro from Railway to EasyHost

Move your Astro app in four steps, and keep Railway running until the new deployment works.

## Export your variables

```
railway variables --kv > .env
```

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Astro setup

Replace `@astrojs/vercel`, `@astrojs/netlify` or `@astrojs/cloudflare` with `@astrojs/node` in standalone mode.

`railway.json or railway.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Install `@astrojs/node` in standalone mode and use on-demand rendering where you need a server.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx astro add node
npx ezhst build set --start "node ./dist/server/entry.mjs"
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Railway runs your app on long-running services billed by usage, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/astro-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Railway running until traffic has moved. Also read [why Astro may be unreachable](/errors/astro-app-unreachable) and the [Railway overview](/migrate/railway).
