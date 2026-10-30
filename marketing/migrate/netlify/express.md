# Migrate Express from Netlify to EasyHost

Move your Express app in four steps, and keep Netlify running until the new deployment works.

## Export your variables

```
netlify env:list --plain > .env
```

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Express setup

No adapter is needed. Remove any `serverless-http` wrapper and call `app.listen` directly.

`netlify.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Listen on `process.env.PORT` and bind to `0.0.0.0`.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Netlify runs your app on a CDN with serverless functions, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/express-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Netlify running until traffic has moved. Also read [why Express may be unreachable](/errors/express-app-unreachable) and the [Netlify overview](/migrate/netlify).
