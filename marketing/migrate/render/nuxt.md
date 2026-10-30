# Migrate Nuxt from Render to EasyHost

Move your Nuxt app in four steps, and keep Render running until the new deployment works.

## Export your variables

Copy variables from the Environment tab in the Render dashboard into a local `.env` file.

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Nuxt setup

Remove any `nitro.preset` set for the old host. The default `node-server` preset is what EasyHost runs.

`render.yaml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Nothing to change. EasyHost detects Nuxt, and the Node server output reads `PORT` and `HOST`.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Render runs your app on long-running services, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/nuxt-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Render running until traffic has moved. Also read [why Nuxt may be unreachable](/errors/nuxt-app-unreachable) and the [Render overview](/migrate/render).
