# Migrate Koa from Koyeb to EasyHost

Move your Koa app in four steps, and keep Koyeb running until the new deployment works.

## Export your variables

Copy variables from the service settings in the Koyeb dashboard into a local `.env` file.

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Koa setup

No adapter is needed. Remove any serverless wrapper and call `app.listen` directly.

`koyeb.yaml, if you use one` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Listen on `process.env.PORT` and bind to `0.0.0.0`.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Koyeb runs your app on serverless containers, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/koa-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Koyeb running until traffic has moved. Also read [why Koa may be unreachable](/errors/koa-app-unreachable) and the [Koyeb overview](/migrate/koyeb).
