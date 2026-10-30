# Migrate Next.js from Railway to EasyHost

Move your Next.js app in four steps, and keep Railway running until the new deployment works.

## Export your variables

```
railway variables --kv > .env
```

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Next.js setup

No adapter is needed. Remove `output: "export"` if you want server features, and treat incremental static regeneration as a single-container cache.

`railway.json or railway.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Nothing to change. EasyHost detects Next.js and sets `PORT` and `HOSTNAME` for you.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Railway runs your app on long-running services billed by usage, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/nextjs-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Railway running until traffic has moved. Also read [why Next.js may be unreachable](/errors/nextjs-app-unreachable) and the [Railway overview](/migrate/railway).
