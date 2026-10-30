# Migrate AdonisJS from Koyeb to EasyHost

Move your AdonisJS app in four steps, and keep Koyeb running until the new deployment works.

## Export your variables

Copy variables from the service settings in the Koyeb dashboard into a local `.env` file.

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the AdonisJS setup

No adapter is needed. Set the build and start commands shown above.

`koyeb.yaml, if you use one` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Set the build and start commands, plus `APP_KEY`, `LOG_LEVEL` and `SESSION_DRIVER` if your `start/env.ts` requires them.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --build "node ace build" --start "node build/bin/server.js"
npx ezhst env set APP_KEY=<key> LOG_LEVEL=info
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Koyeb runs your app on serverless containers, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/adonisjs-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Koyeb running until traffic has moved. Also read [why AdonisJS may be unreachable](/errors/adonisjs-app-unreachable) and the [Koyeb overview](/migrate/koyeb).
