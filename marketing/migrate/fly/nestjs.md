# Migrate NestJS from Fly.io to EasyHost

Move your NestJS app in four steps, and keep Fly.io running until the new deployment works.

## Export your variables

`fly secrets list` shows only digests, so copy values from your own records into a local `.env` file.

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the NestJS setup

No adapter is needed. Remove any serverless bootstrap and call `app.listen` in `src/main.ts`.

`fly.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Run the compiled app with `node dist/main` and listen on `process.env.PORT`.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --start "node dist/main"
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Fly.io runs your app on Machines you can place in many regions, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/nestjs-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Fly.io running until traffic has moved. Also read [why NestJS may be unreachable](/errors/nestjs-app-unreachable) and the [Fly.io overview](/migrate/fly).
