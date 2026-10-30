# Migrate Remix from Netlify to EasyHost

Move your Remix app in four steps, and keep Netlify running until the new deployment works.

## Export your variables

```
netlify env:list --plain > .env
```

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Remix setup

Replace platform packages such as `@vercel/remix` with `@remix-run/node`, and start with `remix-serve`.

`netlify.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Use the default `@remix-run/serve` server. It reads `PORT` and `HOST`.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Netlify runs your app on a CDN with serverless functions, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/remix-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Netlify running until traffic has moved. Also read [why Remix may be unreachable](/errors/remix-app-unreachable) and the [Netlify overview](/migrate/netlify).
